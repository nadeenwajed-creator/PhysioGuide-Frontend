// Translates API payloads into the shapes the interface already renders.
//
// The backend speaks one dialect (camelCase, string ids, `approved`/`rejected`
// statuses, plain bilingual-less strings) and the UI another (`confirmed`,
// `{ en, ar }` labels, `durationMinutes`, `origin`). Nothing outside this file
// should have to know both.

import { loadSession, saveSession } from '../auth/session.js';
import { participantKey } from '../center/messagingModel.js';

// --- status vocabulary -----------------------------------------------------

const fromApiStatus = { approved: 'confirmed', rejected: 'cancelled' };
const toApiStatus = { confirmed: 'approved', cancelled: 'cancelled' };

export const statusFromApi = (status) => fromApiStatus[status] || status;
export const statusToApi = (status) => toApiStatus[status] || status;

// --- session ---------------------------------------------------------------

// One login response feeds every portal, so the role decides which id is kept.
export function toSession(body, credentials) {
  const role = body?.role || 'patient';
  const session = {
    id: String(body?.userId ?? body?.id ?? credentials?.email ?? ''),
    role,
    name: body?.fullName || body?.email || credentials?.email || '',
    email: body?.email || credentials?.email || '',
  };
  if (body?.patientId != null) session.patientId = String(body.patientId);
  if (body?.centerId != null) session.centerId = String(body.centerId);
  if (body?.therapistId != null) session.therapistId = String(body.therapistId);
  if (body?.language) session.language = body.language;
  return session;
}

// --- notification preferences ---------------------------------------------
// The API stores four generic flags; the UI exposes three toggles per portal.
// The mapping is fixed and lossless in both directions, and `language` rides
// along in the session so a save never silently resets it to English.

const language = () => loadSession()?.language || 'en';

function rememberLanguage(value) {
  if (!value) return;
  const stored = loadSession();
  if (stored && stored.language !== value) saveSession({ ...stored, language: value });
}

const patientPreferenceMap = {
  appointmentUpdates: 'inAppEnabled',
  appointmentReminders: 'appointmentReminders',
  newMessages: 'emailEnabled',
};

const centerPreferenceMap = {
  appointments: 'appointmentReminders',
  appointmentChanges: 'inAppEnabled',
  reviews: 'emailEnabled',
};

export function toPreferences(api, map = patientPreferenceMap) {
  const result = {};
  for (const [uiKey, apiKey] of Object.entries(map)) {
    result[uiKey] = api?.[apiKey] !== false;
  }
  rememberLanguage(api?.language);
  return result;
}

export function preferencesRequest(values, map = patientPreferenceMap) {
  const body = { marketing: false, language: language() };
  for (const [uiKey, apiKey] of Object.entries(map)) {
    if (Object.hasOwn(values || {}, uiKey)) body[apiKey] = Boolean(values[uiKey]);
  }
  return body;
}

export const toPatientPreferences = (api) => toPreferences(api, patientPreferenceMap);
export const patientPreferencesRequest = (values) =>
  preferencesRequest(values, patientPreferenceMap);
export const toCenterPreferences = (api) => toPreferences(api, centerPreferenceMap);
export const centerPreferencesRequest = (values) =>
  preferencesRequest(values, centerPreferenceMap);

// --- patient account -------------------------------------------------------

export function toProfile(profile) {
  const gender = String(profile?.gender || '').toLowerCase();
  return {
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    imageUrl: profile?.imageUrl || '',
    dateOfBirth: profile?.dateOfBirth || '',
    // The backend only stores male/female, so anything else is left unset.
    gender: ['male', 'female'].includes(gender) ? gender : '',
    city: '',
  };
}

export function profileRequest(values) {
  const body = {
    fullName: String(values?.name ?? '').trim(),
    dateOfBirth: values?.dateOfBirth || null,
  };
  if (values?.phone != null) body.phoneNumber = String(values.phone).trim();
  if (values?.imageUrl) body.profileImageUrl = values.imageUrl;
  const gender = String(values?.gender || '').toLowerCase();
  if (['male', 'female'].includes(gender)) body.gender = gender;
  return body;
}

// --- appointments ----------------------------------------------------------

export function toAppointment(item) {
  const status = statusFromApi(item?.status);
  const duration = Number(item?.duration) || 0;
  return {
    ...item,
    status,
    duration,
    durationMinutes: duration,
    note: item?.note ?? '',
    // Only patients can request through the API, so a pending item always
    // came from one; everything else is managed by the centre.
    origin: status === 'pending' ? 'patient' : 'center',
  };
}

export const toAppointments = (items) => (items || []).map(toAppointment);

// --- discovery -------------------------------------------------------------

export function toDiscovery(centers) {
  return {
    mode: 'api',
    centers: (centers || []).map((center) => ({
      ...center,
      dataSource: 'api',
      approvalStatus: 'approved',
    })),
    // Favourites have no backend endpoint yet.
    favoriteIds: [],
  };
}

// --- messaging -------------------------------------------------------------

function fileName(url) {
  const [name] = String(url || '').split('?').slice(-1);
  const clean = name.split('/').pop() || '';
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

// `senderId` on the wire is a user id, but the chat UI addresses participants by
// their patient/therapist id, so each message is re-keyed to the conversation.
function toMessage(message, conversation, viewer) {
  const viewerIsPatient = viewer?.role === 'patient';
  const outgoing = String(message?.senderId) === String(viewer?.id);
  const senderRole = outgoing
    ? viewer?.role
    : viewerIsPatient
      ? 'physiotherapist'
      : 'patient';
  const senderId = outgoing
    ? (viewerIsPatient ? conversation.patientId : conversation.therapistId)
    : (viewerIsPatient ? conversation.therapistId : conversation.patientId);
  const recipient = participantKey(
    senderRole === 'patient' ? 'physiotherapist' : 'patient',
    senderRole === 'patient' ? conversation.therapistId : conversation.patientId
  );
  const isRead = outgoing ? true : Boolean(message?.isRead);
  const attachment = message?.attachment || null;

  return {
    id: String(message.id),
    conversationId: String(conversation.id),
    senderRole,
    senderId,
    senderName: message?.senderName,
    text: message?.text || '',
    attachment,
    attachments: attachment ? [{ url: attachment, name: fileName(attachment) }] : [],
    sentAt: message?.sentAt,
    isRead,
    readBy: isRead ? [recipient, participantKey(senderRole, senderId)] : [],
    notificationReadBy: isRead ? [recipient, participantKey(senderRole, senderId)] : [],
    direction: outgoing ? 'outgoing' : 'incoming',
    status: outgoing ? (isRead ? 'read' : 'sent') : 'received',
  };
}

export function toConversation(conversation, viewer) {
  const messages = (conversation?.messages || [])
    .map((message) => toMessage(message, conversation, viewer))
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  const last = messages.at(-1);

  return {
    id: String(conversation.id),
    patientId: String(conversation.patientId ?? ''),
    therapistId: String(conversation.therapistId ?? ''),
    patientName: conversation.patientName,
    patientImage: conversation.patientImage,
    therapistName: conversation.therapistName,
    therapistImage: conversation.therapistImage,
    centerId: conversation.centerId != null ? String(conversation.centerId) : undefined,
    centerName: conversation.centerName,
    lastMessage: conversation.lastMessage ?? last?.text ?? '',
    lastMessageAt: conversation.lastMessageAt ?? last?.sentAt,
    unreadCount: Number(conversation.unreadCount) || 0,
    messages,
  };
}

export function toNotification(notification) {
  return {
    id: String(notification.id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.isRead),
    createdAt: notification.date,
    relatedId: notification.relatedId ?? null,
  };
}

export function toMessagingWorkspace(body, viewer) {
  return {
    patientProfile: body?.patientProfile ? toProfile(body.patientProfile) : undefined,
    notificationPreferences: toPatientPreferences(body?.notificationPreferences),
    patients: (body?.patients || []).map((patient) => ({ ...patient })),
    therapists: (body?.therapists || []).map((therapist) => ({ ...therapist })),
    conversations: (body?.conversations || []).map((item) => toConversation(item, viewer)),
    notifications: (body?.notifications || []).map(toNotification),
  };
}

// --- workspaces ------------------------------------------------------------

// The centre edit form keeps both languages; the API returns the rendered
// string plus an explicit Arabic copy, so the two are reunited here.
function toCenterRecord(center) {
  if (!center) return center;
  const rendered = center.centerDto || center;
  return {
    ...rendered,
    nameAr: center.nameArabic ?? '',
    nameEn: rendered.name ?? '',
    aboutAr: center.descriptionArabic ?? '',
    aboutEn: rendered.about ?? '',
    addressAr: center.address ?? '',
    email: center.email ?? rendered.email,
    phone: center.phone ?? rendered.phone,
    approvalStatus: center.approvalStatus,
    reviewedAt: center.reviewedAt,
    reviewReason: center.reviewReason,
  };
}

function toCenterPatient(patient) {
  return {
    ...patient,
    birthDate: patient.dateOfBirth || '',
    status: patient.status || 'active',
    name: patient.name || '',
    notes: patient.notes || [],
  };
}

export function toCenterWorkspace(body, preferences) {
  return {
    ...body,
    today: body?.today?.date ?? '',
    center: toCenterRecord(body?.center),
    therapists: (body?.therapists || []).map((item) => ({
      ...item,
      name: item.name || '',
      specialty: item.specialty || '',
      about: item.about || '',
      status: item.isActive === false ? 'inactive' : 'active',
      availability: item.availability === 'available' ? 'available' : 'unavailable',
      serviceIds: item.serviceIds || [],
      credentials: item.credentials || '',
      languages: item.languages || '',
    })),
    services: (body?.services || []).map((item) => ({
      ...item,
      name: item.name || '',
      description: item.description || '',
      status: item.isActive === false ? 'inactive' : 'active',
      duration: Number(item.duration) || 0,
      price: Number(item.price) || 0,
      imageUrl: item.imageUrl ?? null,
      specialty: item.specialty || '',
    })),
    patients: (body?.patients || []).map(toCenterPatient),
    appointments: toAppointments(body?.appointments),
    reviews: (body?.reviews || []).map((review) => ({
      ...review,
      status: review.isVisible === false ? 'hidden' : 'visible',
      visible: review.isVisible !== false,
      text: review.text || '',
      reply: review.reply || '',
      author: review.patientName,
      authorImageUrl: null,
    })),
    notifications: (body?.notifications || []).map(toNotification),
    conversations: (body?.conversations || []).map((item) => ({
      ...item,
      unreadCount: Number(item.unreadCount) || 0,
      messages: item.messages || [],
    })),
    notificationPreferences: toCenterPreferences(preferences),
  };
}

export function toTherapistWorkspace(body, preferences, conversations, viewer) {
  const therapist = body?.therapist || {};
  const hydrated = (body?.conversations || []).map((item) => {
    const loaded = conversations?.get(String(item.id));
    return toConversation(
      { ...item, messages: loaded || [] },
      viewer
    );
  });

  return {
    today: body?.today?.date ?? '',
    center: body?.center
      ? {
          id: String(body.center.id),
          name: body.center.name,
          imageUrl: body.center.imageUrl,
        }
      : { id: '', name: '' },
    therapists: [{
      id: therapist.id,
      name: therapist.name,
      imageUrl: therapist.imageUrl,
      phone: therapist.phone,
      email: therapist.email,
      specialty: therapist.specialty,
      experience: therapist.experience,
      about: therapist.bio,
      credentials: therapist.credentials,
      languages: therapist.languages,
      availability: therapist.availability,
      status: therapist.isActive === false ? 'inactive' : 'active',
      serviceIds: therapist.serviceIds || [],
      rating: 0,
    }],
    services: (body?.services || []).map((item) => ({
      ...item,
      duration: Number(item.duration) || 0,
      price: Number(item.price) || 0,
      status: item.isActive === false ? 'inactive' : 'active',
      imageUrl: null,
      specialty: '',
    })),
    patients: (body?.patients || []).map(toCenterPatient),
    appointments: toAppointments(body?.appointments),
    conversations: hydrated,
    notifications: (body?.notifications || []).map(toNotification),
    notificationPreferences: toCenterPreferences(preferences),
    schedule: (body?.schedule || []).map((item) => ({ ...item })),
    preferences: toCenterPreferences(preferences),
  };
}

// --- admin -----------------------------------------------------------------

export function toApplication(item) {
  return {
    ...item,
    location: item?.location || { address: '', coordinates: {}, confirmed: false },
  };
}

// The admin pages read one list shape everywhere: { items, total, filters }.
// Statuses arrive in any casing ("Pending", "APPROVED") and are normalized to
// the lowercase vocabulary the badge classes and the mock records use.
const adminList = (body) => {
  const items = Array.isArray(body) ? body : body?.items ?? body?.results ?? [];
  const total = Number(
    Array.isArray(body) ? items.length : body?.total ?? body?.count ?? items?.length ?? 0
  );
  return {
    items: Array.isArray(items) ? items : [],
    total: Number.isFinite(total) ? total : 0,
    filters: (Array.isArray(body) ? null : body?.filters) || {},
  };
};

const lower = (value, fallback = '') =>
  value == null || value === '' ? fallback : String(value).toLowerCase();

const num = (value, fallback = 0) => {
  if (value == null || value === '') return fallback;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pct = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

export function toAdminDashboard(body) {
  const metric = (entry) => ({
    value: num(entry?.value ?? entry),
    change: pct(entry?.change ?? entry?.delta),
  });
  return {
    metrics: {
      centers: metric(body?.metrics?.activeCenters),
      patients: metric(body?.metrics?.registeredPatients),
      therapists: metric(body?.metrics?.physiotherapists),
    },
    monthly: (Array.isArray(body?.monthlyBookings) ? body.monthlyBookings : []).map((value) =>
      num(value)
    ),
    health: {
      percent: num(body?.health?.percent),
      approvalResponse: body?.health?.approvalResponse ?? null,
      satisfaction: num(body?.health?.satisfaction),
    },
    notifications: (Array.isArray(body?.notifications) ? body.notifications : []).map(
      (item, index) => ({
        id: item?.id ?? index,
        text: item?.text ?? '',
        unread: item?.unread !== false,
      })
    ),
    pending: {
      total: num(body?.pendingApprovals?.total),
      centers: num(body?.pendingApprovals?.centers),
      therapists: num(body?.pendingApprovals?.therapists),
      reviews: num(
        body?.pendingApprovals?.reportedReviews ?? body?.pendingApprovals?.reviews
      ),
    },
    activity: (Array.isArray(body?.activity) ? body.activity : []).map((item, index) => ({
      id: item?.id ?? index,
      text: item?.text ?? '',
      at: item?.at ?? null,
    })),
  };
}

export function toAdminCenterRow(item) {
  return {
    id: String(item?.id ?? item?.centerId ?? ''),
    name: item?.name ?? '',
    manager: item?.manager ?? item?.managerName ?? '',
    location: item?.location ?? item?.city ?? '',
    therapists: num(item?.therapists ?? item?.activeTherapists),
    status: lower(item?.status, 'pending'),
  };
}

export function toAdminCenters(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminCenterRow),
    filters: {
      cities: Array.isArray(list.filters?.cities) ? list.filters.cities : [],
      specialties: Array.isArray(list.filters?.specialties) ? list.filters.specialties : [],
    },
  };
}

export function toAdminCenter(body) {
  const specialties = body?.specialties;
  return {
    id: String(body?.id ?? body?.centerId ?? ''),
    name: body?.name ?? '',
    imageUrl: body?.imageUrl ?? null,
    status: lower(body?.status, 'pending'),
    location: body?.location ?? '',
    manager: body?.manager ?? body?.managerName ?? '',
    therapists: num(body?.therapists ?? body?.activeTherapists),
    specialties: Array.isArray(specialties)
      ? specialties
      : specialties
        ? String(specialties)
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    submittedAt: body?.submittedAt ?? null,
    documents: (Array.isArray(body?.documents) ? body.documents : []).map((item, index) =>
      typeof item === 'string'
        ? { id: String(index), name: item }
        : { id: String(item?.id ?? index), name: item?.name ?? '' }
    ),
    photos: (Array.isArray(body?.photos) ? body.photos : []).map((item, index) =>
      typeof item === 'string'
        ? { id: String(index), url: item }
        : { id: String(item?.id ?? index), url: item?.url ?? null }
    ),
  };
}

export function toAdminPatient(item) {
  return {
    id: String(item?.id ?? item?.patientId ?? ''),
    name: item?.name ?? item?.fullName ?? '',
    email: item?.email ?? '',
    age: item?.age == null || item?.age === '' ? null : num(item.age),
    city: item?.city ?? '',
    appointments: num(item?.appointments ?? item?.appointmentCount),
    lastVisit: item?.lastVisit ?? null,
    status: lower(item?.status, 'active'),
  };
}

export function toAdminPatients(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminPatient),
    filters: { cities: Array.isArray(list.filters?.cities) ? list.filters.cities : [] },
  };
}

export function toAdminPhysiotherapist(item) {
  const id = String(item?.id ?? item?.therapistId ?? '');
  return {
    id,
    license: item?.license ?? item?.licenseId ?? id,
    name: item?.name ?? item?.fullName ?? '',
    specialty: item?.specialty ?? '',
    center: item?.center ?? item?.centerName ?? '',
    rating: item?.rating == null || item?.rating === '' ? null : num(item.rating),
    reviews: num(item?.reviews ?? item?.reviewCount),
    status: lower(item?.status, 'active'),
  };
}

export function toAdminPhysiotherapists(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminPhysiotherapist),
    filters: {
      specialties: Array.isArray(list.filters?.specialties) ? list.filters.specialties : [],
      centers: Array.isArray(list.filters?.centers) ? list.filters.centers : [],
    },
  };
}

export function toAdminAppointment(item) {
  return {
    id: String(item?.id ?? item?.appointmentId ?? ''),
    patient: item?.patient ?? item?.patientName ?? '',
    center: item?.center ?? item?.centerName ?? '',
    therapist: item?.therapist ?? item?.therapistName ?? '',
    service: item?.service ?? item?.serviceName ?? '',
    datetime: item?.datetime ?? item?.date ?? null,
    status: lower(item?.status, 'pending'),
  };
}

export function toAdminAppointments(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminAppointment),
    filters: { centers: Array.isArray(list.filters?.centers) ? list.filters.centers : [] },
  };
}

// Options feed the create-appointment form: ids and names plus the center each
// therapist belongs to so the select can narrow by the chosen center.
const optionList = (value) =>
  (Array.isArray(value) ? value : []).map((item, index) =>
    typeof item === 'string'
      ? { id: String(index), name: item }
      : {
          id: String(item?.id ?? ''),
          name: item?.name ?? '',
          ...(item?.centerId != null ? { centerId: String(item.centerId) } : {}),
        }
  );

export function toAdminAppointmentOptions(body) {
  return {
    patients: optionList(body?.patients),
    centers: optionList(body?.centers),
    therapists: optionList(body?.therapists),
    services: optionList(body?.services),
  };
}

export function toAdminReview(item) {
  return {
    id: String(item?.id ?? item?.reviewId ?? ''),
    name: item?.name ?? item?.patientName ?? '',
    context: item?.context ?? '',
    text: item?.text ?? item?.comment ?? '',
    rating: num(item?.rating, 0),
    status: lower(item?.status, 'published'),
    createdAt: item?.createdAt ?? null,
  };
}

export function toAdminReviews(body) {
  const list = adminList(body);
  const summary = body?.summary ?? {};
  const flagged = summary?.flaggedPercent ?? 0;
  return {
    total: list.total,
    filters: list.filters,
    summary: {
      score: num(summary?.score ?? summary?.overallRating),
      total: num(summary?.total ?? summary?.reviewCount),
      // The summary card prints a ready-made "0.1%", numbers included.
      flaggedPercent: typeof flagged === 'number' ? `${flagged}%` : String(flagged || '0%'),
      distribution: (Array.isArray(summary?.distribution)
        ? summary.distribution
        : []
      ).map((value) => num(value)),
      published: num(summary?.published),
      pending: num(summary?.pending),
      reported: num(summary?.reported),
    },
    items: list.items.map(toAdminReview),
  };
}

export function toAdminSettings(body) {
  const profile = body?.profile ?? {};
  return {
    profile: {
      name: profile?.fullName ?? profile?.name ?? '',
      role: profile?.role ?? '',
      verified: profile?.verified === true,
      lastSignIn: profile?.lastSignIn ?? null,
      location: profile?.location ?? '',
      adminId: profile?.adminId == null ? '' : String(profile.adminId),
    },
    security: { twoFactorEnabled: body?.security?.twoFactorEnabled === true },
    notifications: {
      approvalRequests: body?.notifications?.approvalRequests === true,
      appointmentUpdates: body?.notifications?.appointmentUpdates === true,
      reportedReviews: body?.notifications?.reportedReviews === true,
      systemAlerts: body?.notifications?.systemAlerts === true,
    },
  };
}