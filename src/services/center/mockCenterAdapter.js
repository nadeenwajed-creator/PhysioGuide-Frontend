import { dateKey } from '../../utils/centerFormat.js';
import { overlapsBooking } from './appointmentRules.js';
import { createRemainingOperations, normalizeCenterExtras } from './remainingOperations.js';

// Domain rules are enforced here as well as in the UI. A real server must enforce them atomically.
export function createMockCenterAdapter(seed, { store, now = () => new Date(), reservedEmails = () => [] } = {}) {
  let state = structuredClone(store?.read() || seed);
  let committed = structuredClone(state);
  const listeners = new Set();
  const objectUrls = new Set();
  const emit = () => {
    try { store?.write(state); } catch (error) { state = structuredClone(committed); throw error; }
    committed = structuredClone(state);
    listeners.forEach(listener => listener());
  };
  const fail = (code, fields = {}) => {
    const error = new Error(code);
    error.code = code;
    error.fields = fields;
    throw error;
  };
  const requireCenter = actor => {
    if (actor?.role !== 'center' || actor.centerId !== state.center.id) fail('forbidden');
  };
  const requireActor = actor => {
    if (!['center', 'physiotherapist'].includes(actor?.role) || actor.centerId !== state.center.id) fail('forbidden');
  };
  const find = (collection, id) => {
    const record = state[collection].find(item => item.id === id);
    if (!record) fail('notFound');
    return record;
  };
  const clone = value => structuredClone(value);
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validPhone = value => /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15;
  const clean = value => String(value ?? '').trim();
  const pair = (en, ar) => ({
    en: clean(en),
    ar: clean(ar)
  });
  function validatePerson(values, therapist = false) {
    const fields = {};
    if (!clean(values.name)) fields.name = 'required';
    if (!validEmail(clean(values.email))) fields.email = 'email';
    if (!validPhone(clean(values.phone))) fields.phone = 'phone';
    if (therapist) {
      if (!clean(values.specialty)) fields.specialty = 'required';
      if (!clean(values.experience) || !Number.isFinite(Number(values.experience)) || Number(values.experience) < 0 || Number(values.experience) > 80) fields.experience = 'number';
      if (!clean(values.price) || !Number.isFinite(Number(values.price)) || Number(values.price) < 0) fields.price = 'number';
      if (!['available', 'unavailable'].includes(values.availability)) fields.availability = 'required';
    } else {
      if (values.gender && !['male', 'female', 'unspecified'].includes(values.gender)) fields.gender = 'selection';
      if (!['active', 'inactive'].includes(values.status)) fields.status = 'required';
      if (values.birthDate && (!validDate(values.birthDate) || values.birthDate > state.today)) fields.birthDate = 'date';
    }
    if (Object.keys(fields).length) fail('validation', fields);
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function validateAppointment(values, id) {
    state.today = dateKey(now());
    const fields = {};
    const patient = state.patients.find(item => item.id === values.patientId);
    const therapist = state.therapists.find(item => item.id === values.therapistId);
    const service = state.services.find(item => item.id === values.serviceId);
    if (!patient || patient.status !== 'active') fields.patientId = 'selection';
    if (!therapist || therapist.availability !== 'available') fields.therapistId = 'selection';
    if (!service || service.status !== 'active') fields.serviceId = 'selection';
    if (!validDate(values.date) || values.date < state.today) fields.date = 'date';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) fields.time = 'required';
    if (Object.keys(fields).length) fail('validation', fields);
    if (Number(values.time.slice(0, 2)) * 60 + Number(values.time.slice(3)) + service.duration > 1440) fail('validation', { time: 'date' });
    if (overlapsBooking({ ...values, durationMinutes: service.duration }, state.appointments, state.services, id)) fail('conflict');
  }
  return {
    ...createRemainingOperations({ requireCenter, fail }),
    mode: 'mock',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reload() {
      state = structuredClone(store?.read() || committed);
      committed = structuredClone(state);
      listeners.forEach(listener => listener());
    },
    async getWorkspace(actor) {
      requireActor(actor);
      state.today = dateKey(now());
      if (actor.role === 'center') return clone({
        ...state,
        conversations: []
      });
      const conversations = state.conversations.filter(item => item.therapistId === actor.therapistId);
      const patientIds = new Set(conversations.map(item => item.patientId));
      // Return only communication/contact fields; medical notes and center management stay out.
      return clone({
        today: state.today,
        center: {
          name: state.center.name
        },
        therapists: [find('therapists', actor.therapistId)],
        patients: state.patients.filter(item => patientIds.has(item.id)).map(({
          id,
          name,
          imageUrl,
          phone,
          email
        }) => ({
          id,
          name,
          imageUrl,
          phone,
          email
        })),
        conversations,
        notifications: []
      });
    },
    async savePatient(actor, values, id) {
      requireCenter(actor);
      validatePerson(values);
      const previous = id ? find('patients', id) : {
        id: crypto.randomUUID(),
        notes: []
      };
      const record = {
        ...previous,
        name: pair(values.name, values.nameAr),
        email: clean(values.email),
        phone: clean(values.phone),
        birthDate: values.birthDate || '',
        gender: values.gender || 'unspecified',
        status: values.status,
        imageUrl: values.imageUrl || null
      };
      state.patients = id ? state.patients.map(item => item.id === id ? record : item) : [...state.patients, record];
      emit();
      return clone(record);
    },
    async saveTherapist(actor, values, id) {
      requireCenter(actor);
      validatePerson(values, true);
      if (reservedEmails().includes(clean(values.email).toLowerCase())) fail('duplicateEmail');
      if (state.therapists.some(item => item.id !== id && item.email.toLowerCase() === clean(values.email).toLowerCase())) fail('duplicateEmail');
      const previous = id ? find('therapists', id) : {
        id: crypto.randomUUID(),
        rating: 0,
        completedSessions: 0,
        about: pair('', '')
      };
      const record = {
        ...previous,
        name: pair(values.name, values.nameAr),
        email: clean(values.email),
        phone: clean(values.phone),
        specialty: pair(values.specialty, values.specialtyAr),
        experience: Number(values.experience),
        price: Number(values.price),
        availability: values.availability,
        imageUrl: values.imageUrl || null
      };
      state.therapists = id ? state.therapists.map(item => item.id === id ? record : item) : [...state.therapists, record];
      // The auth mock resolves provisioned staff identities from these records; no password is stored.
      emit();
      return clone(record);
    },
    async saveService(actor, values, id) {
      requireCenter(actor);
      const fields = {};
      if (!clean(values.name)) fields.name = 'required';
      if (!clean(values.description)) fields.description = 'required';
      if (!clean(values.price) || !Number.isFinite(Number(values.price)) || Number(values.price) < 0) fields.price = 'number';
      if (!Number.isInteger(Number(values.duration)) || Number(values.duration) < 1 || Number(values.duration) > 480) fields.duration = 'number';
      if (Object.keys(fields).length) fail('validation', fields);
      const previous = id ? find('services', id) : {
        id: crypto.randomUUID(),
        status: 'active'
      };
      const record = {
        ...previous,
        name: pair(values.name, values.nameAr),
        description: pair(values.description, values.descriptionAr),
        price: Number(values.price),
        duration: Number(values.duration),
        imageUrl: values.imageUrl || null
      };
      state.services = id ? state.services.map(item => item.id === id ? record : item) : [...state.services, record];
      emit();
      return clone(record);
    },
    async deleteService(actor, id) {
      requireCenter(actor);
      find('services', id);
      if (state.appointments.some(item => item.serviceId === id)) fail('linkedService');
      state.services = state.services.filter(item => item.id !== id);
      emit();
    },
    async saveAppointment(actor, values, id) {
      requireCenter(actor);
      const previous = id ? find('appointments', id) : {
        id: crypto.randomUUID(),
        status: 'confirmed',
        origin: 'center'
      };
      if (['completed', 'cancelled'].includes(previous.status)) fail('closedAppointment');
      validateAppointment(values, id);
      const record = {
        ...previous,
        patientId: values.patientId,
        therapistId: values.therapistId,
        serviceId: values.serviceId,
        date: values.date,
        time: values.time,
        durationMinutes: state.services.find(item => item.id === values.serviceId).duration,
        note: clean(values.note)
      };
      state.appointments = id ? state.appointments.map(item => item.id === id ? record : item) : [...state.appointments, record];
      emit();
      return clone(record);
    },
    async requestAppointment(actor, values) {
      if (actor?.role !== 'patient' || actor.patientId !== values.patientId) fail('forbidden');
      validateAppointment(values);
      const record = {
        id: crypto.randomUUID(), patientId: actor.patientId, therapistId: values.therapistId,
        serviceId: values.serviceId, date: values.date, time: values.time,
        durationMinutes: state.services.find(item => item.id === values.serviceId).duration,
        note: clean(values.note), origin: 'patient', status: 'pending',
      };
      state.appointments.push(record);
      emit();
      return clone(record);
    },
    async updateAppointmentStatus(actor, id, status) {
      requireCenter(actor);
      const appointment = find('appointments', id);
      const allowed = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };
      if (!allowed[appointment.status]?.includes(status)) fail('closedAppointment');
      if (appointment.status === 'pending' && appointment.origin !== 'patient') fail('closedAppointment');
      if (status === 'confirmed') validateAppointment(appointment, id);
      appointment.status = status;
      emit();
      return clone(appointment);
    },
    async addPatientNote(actor, patientId, text) {
      requireCenter(actor);
      if (!clean(text)) fail('required');
      find('patients', patientId).notes.push({
        id: crypto.randomUUID(),
        text: clean(text),
        date: state.today
      });
      emit();
    },
    async updateReview(actor, id, values) {
      requireCenter(actor);
      const review = find('reviews', id);
      if ('reply' in values) {
        if (!clean(values.reply)) fail('required');
        review.reply = clean(values.reply);
      }
      emit();
    },
    async saveCenter(actor, values) {
      requireCenter(actor);
      validatePerson({
        ...values,
        status: 'active'
      });
      if (!clean(values.address)) fail('validation', {
        address: 'required'
      });
      const extras = normalizeCenterExtras(values, fail);
      const hours = Object.hasOwn(values, 'hours') ? values.hours : state.center.hours;
      if (hours !== null && hours !== undefined && (typeof hours !== 'object' || !['weekStart', 'weekEnd', 'fridayStart', 'fridayEnd'].every(key => /^([01]\d|2[0-3]):[0-5]\d$/.test(hours[key])) || hours.weekStart >= hours.weekEnd || hours.fridayStart >= hours.fridayEnd)) fail('hours');
      state.center = {
        ...state.center,
        ...extras,
        name: pair(values.name, values.nameAr),
        email: clean(values.email),
        phone: clean(values.phone),
        address: pair(values.address, values.addressAr),
        about: pair(values.about, values.aboutAr),
        hours,
        imageUrl: values.imageUrl || state.center.imageUrl
      };
      emit();
    },
    async prepareImage(file) {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) fail('image');
      if (store) return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Object.assign(new Error('image'), { code: 'image' }));
        reader.readAsDataURL(file);
      });
      const url = URL.createObjectURL(file);
      objectUrls.add(url);
      return url;
    },
    async saveNotificationPreferences(actor, values) {
      requireCenter(actor);
      const keys = ['appointments', 'appointmentChanges', 'patients', 'reviews'];
      if (!values || typeof values !== 'object' || Array.isArray(values)) fail('validation');
      const provided = keys.filter(key => Object.hasOwn(values, key));
      if (!provided.length || provided.some(key => typeof values[key] !== 'boolean')) fail('validation');
      state.notificationPreferences = {
        ...state.notificationPreferences,
        ...Object.fromEntries(provided.map(key => [key, values[key]])),
      };
      emit();
    },
    async markNotificationsRead(actor, id) {
      requireCenter(actor);
      state.notifications.forEach(item => {
        if (!id || item.id === id) item.isRead = true;
      });
      emit();
    },
    async reset(actor) {
      requireCenter(actor);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
      state = clone(seed);
      emit();
    }
  };
}
