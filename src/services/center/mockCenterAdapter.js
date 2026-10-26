import { dateKey } from '../../utils/centerFormat.js';
import { overlapsBooking } from './appointmentRules.js';
import { createRemainingOperations, normalizeCenterExtras } from './remainingOperations.js';
import { assignedTherapistServices, normalizeTherapistServices } from './therapistRecords.js';
import { addProfessionalNotification, getTherapistNotifications } from './therapistNotifications.js';
import { normalizeMessages, conversationView, messageNotifications } from './messagingModel.js';
import { createMessagingOperations } from './messagingOperations.js';
import { addAppointmentAlert, appointmentAlerts } from '../patient/notificationPolicy.js';

// Domain rules are enforced here as well as in the UI. A real server must enforce them atomically.
export function createMockCenterAdapter(seed, { store, now = () => new Date(), reservedEmails = () => [] } = {}) {
  const normalize = value => normalizeTherapistServices(normalizeMessages(structuredClone(value)));
  let state = normalize(store?.read() || seed);
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
    refreshState();
    if (actor?.role !== 'center' || actor.centerId !== state.center.id) fail('forbidden');
  };
  const requireActor = actor => {
    refreshState();
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
  function refreshState() {
    state = normalize(store?.read() || state);
    committed = structuredClone(state);
  }
  return {
    ...createRemainingOperations({ requireCenter, fail }),
    ...createMessagingOperations({ getState: () => state, refresh: refreshState, emit, fail, now }),
    mode: 'mock',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reload() {
      state = normalize(store?.read() || committed);
      committed = structuredClone(state);
      listeners.forEach(listener => listener());
    },
    async getWorkspace(actor) {
      requireActor(actor);
      state.today = dateKey(now());
      if (actor.role === 'center') return clone({
        ...state,
        conversations: [],
        therapistNotifications: undefined,
        therapistNotificationReadIds: undefined,
        patientNotificationReadIds: undefined,
      });
      const conversations = state.conversations.filter(item => item.therapistId === actor.therapistId);
      const patientIds = new Set(conversations.map(item => item.patientId));
      // Return only communication/contact fields; medical notes and center management stay out.
      return clone({
        today: state.today,
        center: {
          id: state.center.id,
          name: state.center.name
        },
        therapists: [find('therapists', actor.therapistId)],
        services: assignedTherapistServices(find('therapists', actor.therapistId), state.services),
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
        conversations: conversations.map(item => conversationView(item, actor)),
        notifications: getTherapistNotifications(state, actor.therapistId)
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
      const professional = ['specialty', 'specialtyAr', 'experience', 'availability', 'serviceIds'];
      const allowed = id ? professional : [...professional, 'name', 'nameAr', 'email', 'phone', 'imageUrl'];
      if (!values || Object.keys(values).some(key => !allowed.includes(key))) fail('forbidden');
      const previous = id ? find('therapists', id) : {
        id: crypto.randomUUID(),
        centerId: state.center.id,
        rating: 0,
        completedSessions: 0,
        about: pair('', '')
      };
      if (Object.hasOwn(values, 'serviceIds') && (!Array.isArray(values.serviceIds) || values.serviceIds.some(serviceId => !state.services.some(service => service.id === serviceId)))) fail('validation', { serviceIds: 'selection' });
      validatePerson(id ? { ...values, name: previous.name.en, email: previous.email, phone: previous.phone } : values, true);
      if (!id && (reservedEmails().includes(clean(values.email).toLowerCase()) || state.therapists.some(item => item.email.toLowerCase() === clean(values.email).toLowerCase()))) fail('duplicateEmail');
      const record = {
        ...previous,
        ...(!id ? {
          name: pair(values.name, values.nameAr),
          email: clean(values.email),
          phone: clean(values.phone),
          imageUrl: values.imageUrl || null,
        } : {}),
        specialty: pair(values.specialty, values.specialtyAr),
        experience: Number(values.experience),
        availability: values.availability,
        serviceIds: Object.hasOwn(values, 'serviceIds') ? [...new Set(values.serviceIds)] : previous.serviceIds || [],
      };
      state.therapists = id ? state.therapists.map(item => item.id === id ? record : item) : [...state.therapists, record];
      if (id && ['specialty', 'experience', 'availability', 'serviceIds'].some(key => JSON.stringify(previous[key]) !== JSON.stringify(record[key]))) {
        addProfessionalNotification(state, id, 'professional', now().toISOString());
      }
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
      const previousServices = state.services;
      state.services = id ? state.services.map(item => item.id === id ? record : item) : [...state.services, record];
      for (const therapist of state.therapists) {
        const before = assignedTherapistServices(therapist, previousServices);
        const after = assignedTherapistServices(therapist, state.services);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          addProfessionalNotification(state, therapist.id, 'services', now().toISOString());
        }
      }
      emit();
      return clone(record);
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
      addAppointmentAlert(state, record, now());
      emit();
      return clone(record);
    },
    async requestAppointment(actor, values) {
      refreshState();
      if (actor?.role !== 'patient' || actor.centerId !== state.center.id || actor.patientId !== values.patientId) fail('forbidden');
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
      addAppointmentAlert(state, appointment, now());
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
      if ('reportReason' in values) {
        if (!clean(values.reportReason)) fail('required');
        review.reported = true;
        review.reportReason = clean(values.reportReason);
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
    async updateCenterImages(actor, values) {
      requireCenter(actor);
      if (!values || typeof values !== 'object') fail('image');
      const extras = {};
      if (Object.hasOwn(values, 'imageUrl')) {
        if (typeof values.imageUrl !== 'string' || !values.imageUrl.trim()) fail('image');
        extras.imageUrl = values.imageUrl;
      }
      if (Object.hasOwn(values, 'add')) {
        const { gallery } = normalizeCenterExtras({ gallery: values.add }, fail);
        extras.gallery = [...new Set([...(state.center.gallery || []), ...gallery])];
      }
      if (Object.hasOwn(values, 'remove')) {
        if (typeof values.remove !== 'string' || !state.center.gallery?.includes(values.remove)) fail('notFound');
        extras.gallery = (extras.gallery || state.center.gallery).filter(src => src !== values.remove);
      }
      if (!Object.keys(extras).length) fail('image');
      state.center = { ...state.center, ...extras };
      emit();
    },
    async saveOwnProfile(actor, values) {
      requireActor(actor);
      if (actor?.role !== 'physiotherapist') fail('forbidden');
      const allowed = ['name', 'nameAr', 'phone', 'about', 'aboutAr', 'imageUrl'];
      if (!values || Object.keys(values).some(key => !allowed.includes(key))) fail('forbidden');
      const record = find('therapists', actor.therapistId);
      validatePerson({
        ...values,
        email: record.email,
        status: 'active'
      });
      const fields = {};
      if (clean(values.about).length > 500) fields.about = 'bioLength';
      if (clean(values.aboutAr).length > 500) fields.aboutAr = 'bioLength';
      if (Object.keys(fields).length) fail('validation', fields);
      const image = values.imageUrl;
      if (image && (typeof image !== 'string' || image.length > 7 * 1024 * 1024 || !/^(\/(?!\/)|https?:\/\/|data:image\/(jpeg|png|webp);base64,|blob:)/i.test(image))) fail('image');
      const updated = {
        ...record, name: pair(values.name, values.nameAr), phone: clean(values.phone),
        about: pair(values.about, values.aboutAr),
        ...(Object.hasOwn(values, 'imageUrl') ? { imageUrl: image || null } : {}),
      };
      state.therapists = state.therapists.map(item => item.id === record.id ? updated : item);
      emit();
      return clone(updated);
    },
    async addGalleryImage(actor, file) {
      requireCenter(actor);
      const url = await this.prepareImage(file);
      // FileReader yields; another tab may have saved messages or gallery items.
      requireCenter(actor);
      state.center.gallery.push(url);
      emit();
      return url;
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
      refreshState();
      if (actor?.role === 'patient') {
        if (actor.centerId !== state.center.id || !state.patients.some(person => person.id === actor.patientId)) fail('forbidden');
        const own = [...messageNotifications(state, 'patient', actor.patientId), ...appointmentAlerts(state, actor.patientId)];
        if (id !== undefined && !own.some(item => item.id === id)) fail('notFound');
        state.patientNotificationReadIds ??= {};
        state.patientNotificationReadIds[actor.patientId] = [...new Set([
          ...(state.patientNotificationReadIds[actor.patientId] || []),
          ...own.filter(item => id === undefined || item.id === id).map(item => item.id),
        ])];
        emit();
        return;
      }
      requireActor(actor);
      if (actor.role === 'center') {
        if (id !== undefined && !state.notifications.some(item => item.id === id)) fail('notFound');
        state.notifications.forEach(item => {
          if (id === undefined || item.id === id) item.isRead = true;
        });
      } else {
        find('therapists', actor.therapistId);
        const own = getTherapistNotifications(state, actor.therapistId);
        if (id !== undefined && !own.some(item => item.id === id)) fail('notFound');
        const selected = own.filter(item => id === undefined || item.id === id);
        const ids = new Set(selected.map(item => item.id));
        (state.therapistNotifications || []).forEach(item => {
          if (item.therapistId === actor.therapistId && ids.has(item.id)) item.isRead = true;
        });
        state.therapistNotificationReadIds ??= {};
        state.therapistNotificationReadIds[actor.therapistId] = [...new Set([
          ...(state.therapistNotificationReadIds[actor.therapistId] || []),
          ...selected.filter(item => item.type === 'message').map(item => item.id),
        ])];
      }
      emit();
    },
    async reset(actor) {
      requireCenter(actor);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
      state = normalize(seed);
      emit();
    }
  };
}
