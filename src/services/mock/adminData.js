// Demo records for the admin portal. Shapes mirror the API mappers exactly so
// flipping VITE_DATA_MODE to "api" changes only where the data comes from.
import { ServiceError } from '../api/serviceError.js';
import { MOCK_PASSWORD } from '../auth/mockAccounts.js';

const now = Date.now();
const hoursAgo = (hours) => new Date(now - hours * 3600 * 1000).toISOString();
const daysAgo = (days) => new Date(now - days * 24 * 3600 * 1000).toISOString();

// Records are mutable in memory: moderation and status changes are visible
// until the tab reloads, like a session against the real backend.
const state = {
  centers: [
    {
      id: 'CTR-4821',
      name: 'Al Noor Rehabilitation',
      manager: 'Faisal Omar',
      location: 'Jeddah',
      therapists: 18,
      status: 'pending',
      imageUrl: null,
      fullLocation: 'Jeddah, Saudi Arabia',
      specialties: ['Orthopedic', 'Sports'],
      submittedAt: '2026-09-24',
      documents: [
        { id: 'doc-1', name: 'Commercial registration.pdf' },
        { id: 'doc-2', name: 'License certificate.pdf' },
      ],
      photos: [],
    },
    {
      id: 'CTR-4822',
      name: 'MotionCare Center',
      manager: 'Sara Khalid',
      location: 'Riyadh',
      therapists: 24,
      status: 'approved',
      imageUrl: null,
      fullLocation: 'Riyadh, Saudi Arabia',
      specialties: ['Neurology', 'Pediatrics'],
      submittedAt: '2026-08-12',
      documents: [],
      photos: [],
    },
    {
      id: 'CTR-4823',
      name: 'Healing Hands Clinic',
      manager: 'Omar Nasser',
      location: 'Dammam',
      therapists: 12,
      status: 'approved',
      imageUrl: null,
      fullLocation: 'Dammam, Saudi Arabia',
      specialties: ['Manual therapy'],
      submittedAt: '2026-07-30',
      documents: [],
      photos: [],
    },
  ],
  patients: [
    { id: 'PAT-1001', name: 'Ahmed Al-Masri', email: 'ahmed@example.com', age: 28, city: 'Jeddah', appointments: 12, lastVisit: '2026-10-10', status: 'active' },
    { id: 'PAT-1002', name: 'Layla Hassan', email: 'layla@example.com', age: 35, city: 'Riyadh', appointments: 8, lastVisit: '2026-10-08', status: 'active' },
    { id: 'PAT-1003', name: 'Mohammed Saleh', email: 'mohammed@example.com', age: 42, city: 'Dammam', appointments: 5, lastVisit: '2026-09-25', status: 'inactive' },
  ],
  therapists: [
    { id: 'TH-7482', license: 'LIC-PH-7482', name: 'Dr. Lina Haddad', email: 'lina@example.com', specialty: 'Sports rehabilitation', centerId: 'CTR-4822', center: 'MotionCare Center', rating: 4.9, reviews: 124, status: 'active', serviceIds: ['SVC-1', 'SVC-4'] },
    { id: 'TH-7483', license: 'LIC-PH-7483', name: 'Dr. Karim Nasser', email: 'karim@example.com', specialty: 'Manual therapy', centerId: 'CTR-4821', center: 'Al Noor Rehabilitation', rating: 4.8, reviews: 98, status: 'suspended', serviceIds: ['SVC-2'] },
  ],
  appointments: [
    { id: 'PO-4031', patient: 'Ahmed Al-Masri', patientId: 'PAT-1001', center: 'MotionCare Center', centerId: 'CTR-4822', therapist: 'Dr. Lina Haddad', service: 'Knee rehab', datetime: '2026-09-27T08:30', status: 'confirmed' },
    { id: 'PO-4032', patient: 'Layla Hassan', patientId: 'PAT-1002', center: 'Al Noor Rehabilitation', centerId: 'CTR-4821', therapist: 'Dr. Karim Nasser', service: 'Manual therapy', datetime: '2026-09-27T10:00', status: 'pending' },
    { id: 'PO-4033', patient: 'Mohammed Saleh', patientId: 'PAT-1003', center: 'Healing Hands Clinic', centerId: 'CTR-4823', therapist: 'Dr. Sara Ali', service: 'Sports rehab', datetime: '2026-09-28T14:00', status: 'completed' },
  ],
  services: [
    { id: 'SVC-1', name: 'Knee rehab', centerId: 'CTR-4822' },
    { id: 'SVC-2', name: 'Manual therapy', centerId: 'CTR-4821' },
    { id: 'SVC-3', name: 'Sports rehab', centerId: 'CTR-4823' },
    { id: 'SVC-4', name: 'Neuro rehab', centerId: 'CTR-4822' },
  ],
  reviews: [
    { id: 'REV-9001', patient: { id: 'PAT-1001', name: 'Ahmed Al-Masri' }, center: { id: 'CTR-4822', name: 'MotionCare Center' }, therapistName: 'Dr. Lina Haddad', rating: 5, comment: 'Excellent treatment and professional care. Highly recommended!', reply: null, isVisible: true, createdAt: daysAgo(2) },
    { id: 'REV-9002', patient: { id: 'PAT-1002', name: 'Layla Hassan' }, center: { id: 'CTR-4821', name: 'Al Noor Rehabilitation' }, therapistName: 'Dr. Karim Nasser', rating: 4, comment: 'Great experience, very attentive physiotherapist.', reply: null, isVisible: false, createdAt: daysAgo(5) },
    { id: 'REV-9003', patient: { id: 'PAT-1003', name: 'Mohammed Saleh' }, center: { id: 'CTR-4823', name: 'Healing Hands Clinic' }, therapistName: 'Dr. Sara Ali', rating: 5, comment: 'Amazing results after only three sessions, my knee feels new!', reply: 'Thank you for your kind words.', isVisible: true, createdAt: daysAgo(1) },
  ],
  // Full audit-style feed behind the dashboard's "View all": enough rows to
  // exercise the pager, newest first like the API orders them.
  activity: [
    { id: 'centerSubmitted-CTR-4821', text: { en: 'Center application submitted', ar: 'تم إرسال طلب مركز' }, at: hoursAgo(2) },
    { id: 'reviewPosted-REV-9003', text: { en: 'New patient review', ar: 'تم استلام تقييم جديد' }, at: hoursAgo(3) },
    { id: 'therapistJoined-TH-7483', text: { en: 'Physiotherapist account created', ar: 'تم إنشاء حساب معالج' }, at: hoursAgo(5) },
    { id: 'patientJoined-PAT-1003', text: { en: 'Patient registered', ar: 'تم تسجيل مريض جديد' }, at: hoursAgo(9) },
    { id: 'centerReviewed-CTR-4823', text: { en: 'Center application reviewed', ar: 'تمت مراجعة طلب مركز' }, at: hoursAgo(14) },
    { id: 'reviewPosted-REV-9002', text: { en: 'New patient review', ar: 'تم استلام تقييم جديد' }, at: daysAgo(1) },
    { id: 'centerSubmitted-CTR-4822', text: { en: 'Center application submitted', ar: 'تم إرسال طلب مركز' }, at: daysAgo(2) },
    { id: 'therapistJoined-TH-7482', text: { en: 'Physiotherapist account created', ar: 'تم إنشاء حساب معالج' }, at: daysAgo(3) },
    { id: 'patientJoined-PAT-1002', text: { en: 'Patient registered', ar: 'تم تسجيل مريض جديد' }, at: daysAgo(4) },
    { id: 'reviewPosted-REV-9001', text: { en: 'New patient review', ar: 'تم استلام تقييم جديد' }, at: daysAgo(6) },
    { id: 'centerReviewed-CTR-4822', text: { en: 'Center application reviewed', ar: 'تمت مراجعة طلب مركز' }, at: daysAgo(8) },
    { id: 'patientJoined-PAT-1001', text: { en: 'Patient registered', ar: 'تم تسجيل مريض جديد' }, at: daysAgo(11) },
  ],
  settings: {
    profile: {
      fullName: 'Maya Al-Hassan',
      verified: true,
      lastSignIn: hoursAgo(3),
      location: 'Riyadh, Saudi Arabia',
      adminId: 'ADM-0018',
    },
    security: { twoFactorEnabled: true },
    notifications: {
      approvalRequests: true,
      appointmentUpdates: true,
      reportedReviews: true,
      systemAlerts: false,
    },
  },
  dashboard: {
    metrics: {
      activeCenters: { value: 128, change: 8.2 },
      registeredPatients: { value: 8492, change: 12.4 },
      physiotherapists: { value: 346, change: 5.1 },
    },
    monthlyBookings: {
      2026: [120, 90, 100, 70, 110, 60, 95, 80, 105, 75, 85, 115],
      2025: [95, 80, 88, 64, 92, 55, 78, 70, 86, 68, 74, 101],
    },
    health: { percent: 94, approvalResponse: 2.4, satisfaction: 4.8 },
    notifications: [
      { id: 1, text: { en: 'Center approval required', ar: 'مطلوب اعتماد مركز' }, unread: true, createdAt: hoursAgo(1) },
      { id: 2, text: { en: 'Appointment cancelled', ar: 'تم إلغاء موعد' }, unread: true, createdAt: hoursAgo(3) },
      { id: 3, text: { en: 'Review reported', ar: 'تم الإبلاغ عن تقييم' }, unread: true, createdAt: hoursAgo(5) },
      { id: 4, text: { en: 'Physiotherapist verified', ar: 'تم التحقق من أخصائي علاجي' }, unread: false, createdAt: hoursAgo(9) },
    ],
    pendingApprovals: { total: 17, centers: 7, therapists: 6, reportedReviews: 4 },
    activity: [
      { id: 1, text: { en: 'Center application submitted', ar: 'تم إرسال طلب مركز' }, at: hoursAgo(2) },
      { id: 2, text: { en: 'Therapist profile verified', ar: 'تم التحقق من ملف أخصائي' }, at: hoursAgo(4) },
      { id: 3, text: { en: 'Appointment confirmed', ar: 'تم تأكيد موعد' }, at: hoursAgo(6) },
      { id: 4, text: { en: 'System alert', ar: 'تنبيه نظام' }, at: hoursAgo(8) },
    ],
  },
};

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock role checks are test behavior; the real API must authorize its own session.
function requireAdmin(actor) {
  if (actor?.role !== 'admin') throw new ServiceError('forbidden');
}

function matches(row, query, fields) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
}

// Same contract as the API: filters narrow the rows, `total` counts every
// match, and only the current page of items is returned.
function paginate(items, params = {}) {
  const pageSize = Math.max(1, Number(params?.pageSize) || 5);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number(params?.page) || 1), pages);
  return {
    page,
    pageSize,
    total: items.length,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

const unique = (values) => [...new Set(values.filter(Boolean))].sort();
const centerOptions = () => state.centers.map((center) => ({ id: center.id, name: center.name }));

function centerDetail(center) {
  return {
    id: center.id,
    name: center.name,
    imageUrl: center.imageUrl ?? null,
    status: center.status,
    location: center.fullLocation,
    manager: center.manager,
    therapists: center.therapists,
    specialties: center.specialties,
    submittedAt: center.submittedAt,
    documents: center.documents,
    photos: center.photos,
  };
}

function patientRow(patient) {
  return { ...patient };
}

function therapistRow(therapist) {
  return { ...therapist };
}

function reviewSummary() {
  const ratings = state.reviews.map((review) => Number(review.rating) || 0);
  const score = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
  const visible = state.reviews.filter((review) => review.isVisible).length;
  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    rating: star,
    count: state.reviews.filter((review) => Math.round(Number(review.rating)) === star).length,
  }));
  // Same summary object the API returns so the mapper serves both modes.
  return {
    total: state.reviews.length,
    visible,
    hidden: state.reviews.length - visible,
    replied: state.reviews.filter((review) => review.reply).length,
    averageRating: Math.round(score * 10) / 10,
    ratingDistribution,
  };
}

export const adminMockApi = {
  async getAdminDashboard(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const year = String(params?.year || new Date().getFullYear());
    return {
      metrics: state.dashboard.metrics,
      monthlyBookings: state.dashboard.monthlyBookings[year] ?? state.dashboard.monthlyBookings[2026],
      health: state.dashboard.health,
      notifications: state.dashboard.notifications,
      pendingApprovals: state.dashboard.pendingApprovals,
      activity: state.dashboard.activity,
    };
  },

  // The dashboard's activity feed and the full log share the same records.
  async getAdminActivity(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    return paginate(state.activity, params);
  },

  // The navbar bell reads the same demo notifications with their types so
  // the settings toggles filter them exactly like the API does.
  async getAdminNotifications(actor) {
    await wait();
    requireAdmin(actor);
    const types = ['centerApproval', 'appointmentCancelled', 'reviewReported', 'therapistVerified'];
    const settings = state.settings.notifications;
    return {
      notifications: state.dashboard.notifications.map((item, index) => ({
        id: String(item.id),
        type: item.type ?? types[index],
        title: item.text,
        isRead: !item.unread,
        createdAt: item.createdAt ?? null,
        relatedId: null,
      })),
      // UI keys travel as the four generic flags, like the API stores them.
      preferences: {
        emailEnabled: settings.approvalRequests !== false,
        inAppEnabled: settings.appointmentUpdates !== false,
        appointmentReminders: settings.reportedReviews !== false,
        marketing: settings.systemAlerts === true,
      },
    };
  },

  async markNotificationsRead(actor, id) {
    requireAdmin(actor);
    state.dashboard.notifications.forEach((item) => {
      if (id === undefined || id === null || String(item.id) === String(id)) item.unread = false;
    });
    return undefined;
  },

  async getAdminCenters(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const filtered = state.centers.filter(
      (center) =>
        matches(center, params.search, [center.name, center.manager, center.id, center.location]) &&
        (!params.status || center.status === params.status) &&
        (!params.city || center.location === params.city) &&
        (!params.specialty || center.specialties.includes(params.specialty))
    );
    return {
      ...paginate(filtered, params),
      filters: {
        cities: unique(state.centers.map((center) => center.location)),
        specialties: unique(state.centers.flatMap((center) => center.specialties)),
      },
    };
  },

  async getAdminCenter(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const center = state.centers.find((item) => item.id === id);
    if (!center) throw new ServiceError('notFound');
    return centerDetail(center);
  },

  async setAdminCenterStatus(actor, { id, status, reason } = {}) {
    await wait();
    requireAdmin(actor);
    if (!['approved', 'rejected', 'suspended'].includes(status)) throw new ServiceError('validation');
    const center = state.centers.find((item) => item.id === id);
    if (!center) throw new ServiceError('notFound');
    center.status = status;
    center.reviewReason = reason || '';
    return centerDetail(center);
  },

  async updateAdminCenter(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const center = state.centers.find((item) => item.id === values.id);
    if (!center) throw new ServiceError('notFound');
    const name = String(values.nameEnglish || values.nameArabic || '').trim();
    if (!name) throw new ServiceError('validation');
    center.name = name;
    state.centers = [...state.centers];
    return centerDetail(center);
  },

  async deleteAdminCenter(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const center = state.centers.find((item) => item.id === id);
    if (!center) throw new ServiceError('notFound');
    if (state.therapists.some((therapist) => therapist.centerId === id)) {
      throw new ServiceError('centerHasTherapists');
    }
    state.centers = state.centers.filter((item) => item.id !== id);
    return { id, deleted: true };
  },

  async getAdminPatients(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const filtered = state.patients.filter(
      (patient) =>
        matches(patient, params.search, [patient.name, patient.email, patient.id]) &&
        (!params.status || patient.status === params.status) &&
        (!params.city || patient.city === params.city)
    );
    if (params.sort === 'recent') {
      filtered.sort((a, b) => String(b.lastVisit).localeCompare(String(a.lastVisit)));
    }
    return {
      ...paginate(filtered, params),
      filters: { cities: unique(state.patients.map((patient) => patient.city)) },
    };
  },

  async setAdminPatientStatus(actor, { id, status } = {}) {
    await wait();
    requireAdmin(actor);
    if (!['active', 'inactive', 'suspended'].includes(status)) throw new ServiceError('validation');
    const patient = state.patients.find((item) => item.id === id);
    if (!patient) throw new ServiceError('notFound');
    patient.status = status;
    return patientRow(patient);
  },

  async getAdminPatient(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const patient = state.patients.find((item) => item.id === id);
    if (!patient) throw new ServiceError('notFound');
    return {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: '',
      city: patient.city || '',
      gender: '',
      dateOfBirth: '',
      status: patient.status,
      joinedAt: null,
    };
  },

  async updateAdminPatient(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const patient = state.patients.find((item) => item.id === values.id);
    if (!patient) throw new ServiceError('notFound');
    const name = String(values.fullName || '').trim();
    if (!name) throw new ServiceError('validation');
    patient.name = name;
    if (values.city !== undefined) patient.city = values.city || '';
    state.patients = [...state.patients];
    return patientRow(patient);
  },

  async deleteAdminPatient(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const patient = state.patients.find((item) => item.id === id);
    if (!patient) throw new ServiceError('notFound');
    state.patients = state.patients.filter((item) => item.id !== id);
    state.appointments = state.appointments.filter((appointment) => appointment.patientId !== id);
    return { id, deleted: true };
  },

  async getAdminPhysiotherapists(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const filtered = state.therapists.filter(
      (therapist) =>
        matches(therapist, params.search, [therapist.name, therapist.specialty, therapist.center, therapist.license]) &&
        (!params.specialty || therapist.specialty === params.specialty) &&
        (!params.center || therapist.centerId === params.center) &&
        (!params.status || therapist.status === params.status)
    );
    return {
      ...paginate(filtered, params),
      filters: {
        // The catalog carries ids so the list filter and the add form send the
        // same thing the API expects; demo records use their name as the id.
        specialties: unique(state.therapists.map((therapist) => therapist.specialty)).map(
          (name) => ({ id: name, name })
        ),
        centers: centerOptions(),
      },
    };
  },

  async setAdminPhysiotherapistStatus(actor, { id, status } = {}) {
    await wait();
    requireAdmin(actor);
    if (!['active', 'pending', 'inactive'].includes(status)) throw new ServiceError('validation');
    const therapist = state.therapists.find((item) => item.id === id);
    if (!therapist) throw new ServiceError('notFound');
    therapist.status = status;
    return therapistRow(therapist);
  },

  async getAdminPhysiotherapist(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const therapist = state.therapists.find((item) => item.id === id);
    if (!therapist) throw new ServiceError('notFound');
    return {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      phone: '',
      centerId: therapist.centerId || '',
      center: therapist.center || '',
      specialtyId: therapist.specialty || '',
      specialty: therapist.specialty || '',
      bio: '',
      yearsOfExperience: '',
      imageUrl: therapist.imageUrl || '',
      status: therapist.status,
      isAvailable: true,
      joinedAt: null,
    };
  },

  async updateAdminPhysiotherapist(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const therapist = state.therapists.find((item) => item.id === values.id);
    if (!therapist) throw new ServiceError('notFound');
    const name = String(values.fullName || '').trim();
    if (!name) throw new ServiceError('validation');
    therapist.name = name;
    if (values.centerId) {
      const center = state.centers.find((item) => item.id === values.centerId);
      if (!center) throw new ServiceError('selection');
      therapist.centerId = center.id;
      therapist.center = center.name;
    }
    if (values.specialtyId) therapist.specialty = values.specialtyId;
    state.therapists = [...state.therapists];
    return therapistRow(therapist);
  },

  async deleteAdminPhysiotherapist(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const therapist = state.therapists.find((item) => item.id === id);
    if (!therapist) throw new ServiceError('notFound');
    state.therapists = state.therapists.filter((item) => item.id !== id);
    return { id, deleted: true };
  },

  async addAdminPhysiotherapist(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const name = String(values?.fullName || '').trim();
    const email = String(values?.email || '').trim();
    const license = String(values?.licenseId || '').trim();
    const specialty = String(values?.specialty || '').trim();
    const center = state.centers.find((item) => item.id === values?.centerId);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !license || !specialty || !center) {
      throw new ServiceError('validation');
    }
    if (state.therapists.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      throw new ServiceError('duplicateEmail');
    }
    const sequence = 7483 + state.therapists.length;
    const therapist = {
      id: `TH-${sequence}`,
      license,
      name,
      email,
      specialty,
      centerId: center.id,
      center: center.name,
      rating: null,
      reviews: 0,
      status: 'pending',
    };
    state.therapists.push(therapist);
    return therapistRow(therapist);
  },

  async getAdminAppointments(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const filtered = state.appointments.filter(
      (appointment) =>
        matches(appointment, params.search, [
          appointment.id,
          appointment.patient,
          appointment.center,
          appointment.therapist,
          appointment.service,
        ]) &&
        (!params.status || appointment.status === params.status) &&
        (!params.center || appointment.centerId === params.center) &&
        (!params.date || String(appointment.datetime).slice(0, 10) === params.date)
    );
    return {
      ...paginate(filtered, params),
      filters: {
        centers: centerOptions(),
        statuses: unique(state.appointments.map((appointment) => appointment.status)),
      },
    };
  },

  async getAdminAppointmentOptions(actor) {
    await wait();
    requireAdmin(actor);
    return {
      patients: state.patients.map((patient) => ({ id: patient.id, name: patient.name })),
      centers: centerOptions(),
      therapists: state.therapists.map((therapist) => ({
        id: therapist.id,
        name: therapist.name,
        centerId: therapist.centerId,
        serviceIds: therapist.serviceIds ?? [],
      })),
      services: state.services.map((service) => ({ ...service })),
    };
  },

  async createAdminAppointment(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const patient = state.patients.find((item) => item.id === values?.patientId);
    const center = state.centers.find((item) => item.id === values?.centerId);
    const therapist = state.therapists.find((item) => item.id === values?.therapistId);
    const service = state.services.find((item) => item.id === values?.serviceId);
    if (!patient || !center || !service || !values?.date || !values?.time) {
      throw new ServiceError('validation');
    }
    if (therapist && therapist.centerId !== center.id) throw new ServiceError('selection');
    const sequence = 4033 + state.appointments.length;
    const appointment = {
      id: `PO-${sequence}`,
      patient: patient.name,
      patientId: patient.id,
      center: center.name,
      centerId: center.id,
      therapist: therapist?.name || '',
      service: service.name,
      datetime: `${values.date}T${values.time}`,
      status: 'pending',
    };
    state.appointments.push(appointment);
    return { ...appointment };
  },

  async updateAdminAppointment(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    const appointment = state.appointments.find((item) => item.id === values.id);
    if (!appointment) throw new ServiceError('notFound');
    if (values.centerId) {
      const center = state.centers.find((item) => item.id === values.centerId);
      if (!center) throw new ServiceError('selection');
      appointment.centerId = center.id;
      appointment.center = center.name;
    }
    if (values.therapistId) {
      const therapist = state.therapists.find((item) => item.id === values.therapistId);
      if (therapist) appointment.therapist = therapist.name;
    }
    if (values.serviceId) {
      const service = state.services.find((item) => item.id === values.serviceId);
      if (service) appointment.service = service.name;
    }
    if (values.startDateTime) {
      appointment.datetime = String(values.startDateTime).slice(0, 16);
    }
    if (values.status) appointment.status = values.status;
    state.appointments = [...state.appointments];
    return { ...appointment };
  },

  async deleteAdminAppointment(actor, { id } = {}) {
    await wait();
    requireAdmin(actor);
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment) throw new ServiceError('notFound');
    state.appointments = state.appointments.filter((item) => item.id !== id);
    return { id, deleted: true };
  },

  async getAdminReviews(actor, params = {}) {
    await wait();
    requireAdmin(actor);
    const filtered = state.reviews.filter(
      (review) =>
        matches(review, params.search, [
          review.patient?.name,
          review.center?.name,
          review.therapistName,
          review.comment,
        ]) &&
        (!params.rating || Math.round(Number(review.rating)) === Number(params.rating)) &&
        (!params.reviewId || String(review.id) === String(params.reviewId)) &&
        (!params.status || (params.status === 'published' ? review.isVisible : !review.isVisible))
    );
    if (params.sort === 'oldest') {
      filtered.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    } else if (params.sort === 'highest') {
      filtered.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else {
      filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    return {
      total: filtered.length,
      filters: {},
      summary: reviewSummary(),
      items: paginate(filtered, params).items,
    };
  },

  async moderateAdminReview(actor, { id, action } = {}) {
    await wait();
    requireAdmin(actor);
    if (!['hide', 'show', 'remove'].includes(action)) throw new ServiceError('validation');
    const review = state.reviews.find((item) => item.id === id);
    if (!review) throw new ServiceError('notFound');
    if (action === 'remove') {
      state.reviews = state.reviews.filter((item) => item.id !== id);
      return { id, action };
    }
    review.isVisible = action === 'show';
    return { id, isVisible: review.isVisible, action };
  },

  async getAdminSettings(actor) {
    await wait();
    requireAdmin(actor);
    return { ...state.settings, profile: { ...state.settings.profile } };
  },

  async saveAdminSettings(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    if (values?.profile) {
      state.settings.profile = {
        ...state.settings.profile,
        ...(values.profile.name != null ? { fullName: values.profile.name } : {}),
        ...(values.profile.location != null ? { location: values.profile.location } : {}),
      };
    }
    if (values?.notifications) {
      state.settings.notifications = { ...state.settings.notifications, ...values.notifications };
    }
    return { ...state.settings, profile: { ...state.settings.profile } };
  },

  async changeAdminPassword(actor, values = {}) {
    await wait();
    requireAdmin(actor);
    if (values?.currentPassword !== MOCK_PASSWORD) throw new ServiceError('invalidCredentials');
    const next = String(values?.newPassword || '');
    if (next.length < 8) throw new ServiceError('password');
    return {};
  },
};
