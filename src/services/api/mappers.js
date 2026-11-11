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

// The admin toggles ride the same four flags. The mapping lines up with the
// seeded defaults: system alerts off is the marketing flag (false by default).
const adminPreferenceMap = {
  approvalRequests: 'emailEnabled',
  appointmentUpdates: 'inAppEnabled',
  reportedReviews: 'appointmentReminders',
  systemAlerts: 'marketing',
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
export const toAdminPreferences = (api) => toPreferences(api, adminPreferenceMap);
export const adminPreferencesRequest = (values) =>
  preferencesRequest(values, adminPreferenceMap);

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
    therapistName: bilingual(item?.therapistName, item?.therapistNameAr),
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
      therapists: (center.therapists || []).map((therapist) => ({
        ...therapist,
        name: bilingual(therapist.name, therapist.nameAr),
        about: bilingual(therapist.about, therapist.bioAr),
      })),
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

// API notifications carry only a type and a related id; the bell rebuilds its
// navigation target from them. Mock records keep their explicit target.
function notificationTarget(notification) {
  if (notification.target) return notification.target;
  const id = notification.relatedId ?? null;
  switch (notification.type) {
    case 'message':
      return id ? { kind: 'conversation', id } : undefined;
    case 'appointment':
    case 'appointmentChange':
    case 'appointmentRequest':
    case 'appointmentReminder':
      return id ? { kind: 'appointment', id } : undefined;
    case 'professional':
    case 'services':
      return { kind: 'professional' };
    default:
      return undefined;
  }
}

export function toNotification(notification) {
  return {
    id: String(notification.id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.isRead),
    createdAt: notification.date ?? notification.createdAt ?? null,
    relatedId: notification.relatedId ?? null,
    target: notificationTarget(notification),
  };
}

export function toMessagingWorkspace(body, viewer) {
  return {
    patientProfile: body?.patientProfile ? toProfile(body.patientProfile) : undefined,
    notificationPreferences: toPatientPreferences(body?.notificationPreferences),
    patients: (body?.patients || []).map((patient) => ({ ...patient })),
    therapists: (body?.therapists || []).map((therapist) => ({
      ...therapist,
      name: bilingual(therapist.name, therapist.nameAr),
      about: bilingual(therapist.about, therapist.bioAr),
    })),
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

// A single API string still has to behave like the bilingual labels the
// interface renders, so it becomes the same value in both languages.
// An optional Arabic copy (therapist name/bio carry one) replaces that
// fallback on the `ar` side; `localized` still falls back to `en` when the
// Arabic copy is empty.
const bilingual = (value, arabic) => (value && typeof value === 'object'
  ? value
  : { en: value || '', ar: arabic ?? value ?? '' });

function toCenterPatient(patient) {
  return {
    ...patient,
    birthDate: patient.dateOfBirth || '',
    status: patient.status || 'active',
    name: bilingual(patient.name),
    notes: patient.notes || [],
  };
}

export function toCenterWorkspace(body, preferences) {
  // Creation forms pick a specialty from this list instead of guessing one
  // from an existing record.
  const specialties = (body?.specialties || []).map((item) => ({
    id: String(item.id),
    name: bilingual(item.nameEnglish || item.nameArabic),
  }));
  const specialtyName = (id, fallback) =>
    specialties.find((item) => item.id === String(id))?.name || bilingual(fallback);
  return {
    ...body,
    today: body?.today?.date ?? '',
    center: toCenterRecord(body?.center),
    specialties,
    therapists: (body?.therapists || []).map((item) => ({
      ...item,
      name: bilingual(item.name, item.nameAr),
      specialty: specialtyName(item.specialtyId, item.specialty),
      about: bilingual(item.about, item.bioAr),
      status: item.isActive === false ? 'inactive' : 'active',
      availability: item.availability === 'available' ? 'available' : 'unavailable',
      serviceIds: item.serviceIds || [],
      credentials: item.credentials || '',
      languages: item.languages || '',
    })),
    services: (body?.services || []).map((item) => ({
      ...item,
      name: bilingual(item.name),
      description: bilingual(item.description),
      status: item.isActive === false ? 'inactive' : 'active',
      duration: Number(item.duration) || 0,
      price: Number(item.price) || 0,
      imageUrl: item.imageUrl ?? null,
      specialty: specialtyName(item.specialtyId, item.specialty),
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
      name: bilingual(therapist.name, therapist.nameAr),
      imageUrl: therapist.imageUrl,
      phone: therapist.phone,
      email: therapist.email,
      specialty: therapist.specialty,
      experience: therapist.experience,
      about: bilingual(therapist.bio, therapist.bioAr),
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

// Reference fields reach us either as a plain string or as a nested object such
// as { id, name }; only a label string may ever be rendered by the UI.
const label = (value, fallback = '') => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = value.name ?? value.fullName ?? value.title ?? value.label ?? value.en ?? value.ar;
  return text == null || text === '' ? fallback : String(text);
};

// Filter collections are labels (cities, specialties) or { id, name } pairs
// (centers); normalize both so the pages can render them directly.
const labels = (value) =>
  (Array.isArray(value) ? value : []).map((item) => label(item)).filter(Boolean);

const refOptions = (value) =>
  (Array.isArray(value) ? value : []).map((item, index) =>
    typeof item === 'string' || typeof item === 'number'
      ? { id: String(index), name: String(item) }
      : { id: String(item?.id ?? item?.centerId ?? index), name: label(item) }
  );

// The specialty table can hold two rows with the same name; one entry per name
// keeps the dropdown readable while every entry still carries a real id.
const uniqueOptions = (value) =>
  refOptions(value).filter(
    (option, index, list) =>
      list.findIndex((other) => other.name === option.name) === index
  );

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

// Activity ids are built as "<kind>-<recordId>" by the API and the demo data.
// The kind says which record the event was about, so the feed can link to it.
const activityKinds = [
  'centerSubmitted',
  'centerReviewed',
  'therapistJoined',
  'reviewPosted',
  'patientJoined',
];

const splitActivityId = (id) => {
  const text = String(id ?? '');
  const kind = activityKinds.find((name) => text.startsWith(`${name}-`));
  return kind
    ? { kind, relatedId: text.slice(kind.length + 1) }
    : { kind: null, relatedId: null };
};

const toActivityEvent = (item, index) => {
  const id = String(item?.id ?? index);
  const fallback = splitActivityId(id);
  return {
    id,
    kind: item?.kind ?? fallback.kind,
    relatedId: item?.relatedId == null ? fallback.relatedId : String(item.relatedId),
    text: item?.text ?? '',
    at: item?.at ?? null,
  };
};

export function toAdminDashboard(body) {
  const metric = (entry) => ({
    value: num(entry?.value ?? entry),
    change: pct(entry?.change ?? entry?.delta),
    series: (Array.isArray(entry?.series) ? entry.series : []).map((item) => num(item)),
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
      // null means "no reviews yet" and must not render as a 0.0 score.
      satisfaction: body?.health?.satisfaction == null ? null : num(body.health.satisfaction),
    },
    notifications: (Array.isArray(body?.notifications) ? body.notifications : []).map(
      (item, index) => ({
        id: item?.id ?? index,
        type: item?.type,
        text: item?.text ?? item?.title ?? '',
        unread: item?.unread ?? item?.isRead === false,
        createdAt: item?.createdAt ?? null,
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
    activity: (Array.isArray(body?.activity) ? body.activity : []).map(toActivityEvent),
  };
}

export function toAdminCenterRow(item) {
  return {
    id: String(item?.id ?? item?.centerId ?? ''),
    name: label(item?.name ?? item?.centerName),
    manager: label(item?.manager ?? item?.managerName),
    location: label(item?.location ?? item?.city),
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
      cities: labels(list.filters?.cities),
      specialties: labels(list.filters?.specialties),
    },
  };
}

// The activity log is a plain paginated event list: bilingual text, the moment
// the event happened and the record it happened on, newest first from the API.
export function toAdminActivity(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map((item, index) =>
      toActivityEvent(
        {
          ...item,
          text: item?.text ?? item?.title ?? '',
          at: item?.at ?? item?.createdAt ?? item?.timestamp ?? null,
        },
        index
      )
    ),
  };
}

export function toAdminCenter(body) {
  const specialties = body?.specialties;
  // The endpoint sends the staff list, not a count; the header row shows how
  // many therapists actually work at the centre.
  const staff = Array.isArray(body?.therapists) ? body.therapists : null;
  return {
    id: String(body?.id ?? body?.centerId ?? ''),
    name: label(body?.name ?? body?.centerName),
    imageUrl: body?.profileImageUrl ?? null,
    status: lower(body?.status, 'pending'),
    // This endpoint reports `location` as coordinates; the place the page
    // shows is the centre's city (with the street as a fallback).
    location: label(
      typeof body?.location === 'string'
        ? body.location
        : body?.city || body?.address
    ),
    manager: label(body?.manager ?? body?.managerName),
    // Address-book fields the edit dialog fills in.
    nameEnglish: label(body?.nameEn ?? body?.nameEnglish),
    nameArabic: label(body?.nameAr ?? body?.nameArabic),
    address: label(body?.address),
    city: label(body?.city),
    websiteUrl: label(body?.websiteUrl),
    phone: label(body?.phone),
    email: label(body?.email),
    description: label(body?.descriptionEn ?? body?.description ?? body?.descriptionEnglish),
    therapists: staff
      ? staff.length
      : num(body?.therapists ?? body?.activeTherapists),
    specialties: Array.isArray(specialties)
      ? labels(specialties)
      : specialties
        ? String(label(specialties))
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    submittedAt: body?.submittedAt ?? null,
    documents: (Array.isArray(body?.documents) ? body.documents : []).map((item, index) =>
      typeof item === 'string'
        ? { id: String(index), name: item, type: '', url: '', uploadedAt: null }
        : {
            id: String(item?.id ?? item?.centerDocumentId ?? index),
            name:
              label(item?.name ?? item?.fileName ?? item?.type ?? item?.documentType) ||
              label(item),
            type: label(item?.type ?? item?.documentType),
            url: label(item?.url ?? item?.fileUrl),
            uploadedAt: item?.uploadedAt ?? null,
          }
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
    name: label(item?.name ?? item?.fullName ?? item?.patientName),
    email: label(item?.email),
    imageUrl: label(item?.imageUrl ?? item?.profileImageUrl),
    age: item?.age == null || item?.age === '' ? null : num(item.age),
    city: label(item?.city),
    appointments: num(item?.appointments ?? item?.appointmentCount),
    lastVisit: item?.lastVisit ?? null,
    // Falls back to the account flag when the payload carries only isActive.
    status: lower(item?.status, item?.isActive === false ? 'suspended' : 'active'),
  };
}

export function toAdminPatients(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminPatient),
    filters: { cities: labels(list.filters?.cities) },
  };
}

export function toAdminPhysiotherapist(item) {
  const id = String(item?.id ?? item?.therapistId ?? '');
  return {
    id,
    license: label(item?.license ?? item?.licenseId, id),
    name: label(item?.name ?? item?.fullName ?? item?.therapistName),
    imageUrl: label(item?.imageUrl ?? item?.profileImageUrl),
    specialty: label(item?.specialty ?? item?.specialization),
    center: label(item?.center ?? item?.centerName),
    rating: item?.rating == null || item?.rating === '' ? null : num(item.rating),
    reviews: num(item?.reviews ?? item?.reviewCount),
    // The list reports the account flag; the therapist keeps no status of its
    // own, so a switched-off account reads as suspended.
    status: lower(item?.status, item?.isActive === false ? 'suspended' : 'active'),
  };
}

export function toAdminPhysiotherapists(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminPhysiotherapist),
    filters: {
      // The specialty catalog keeps its ids: the filter and the add form both
      // send a specialty id to the server.
      specialties: uniqueOptions(list.filters?.specialties),
      centers: refOptions(list.filters?.centers),
    },
  };
}

export function toAdminAppointment(item) {
  return {
    id: String(item?.id ?? item?.appointmentId ?? ''),
    patient: label(item?.patient ?? item?.patientName),
    // The patient reference carries the portrait the row shows beside the name.
    patientImage: label(item?.patient?.profileImageUrl ?? item?.patientImage),
    center: label(item?.center ?? item?.centerName),
    therapist: label(item?.therapist ?? item?.therapistName),
    service: label(item?.service ?? item?.serviceName),
    // The API reports the slot as startDateTime; older payloads used datetime.
    datetime: item?.datetime ?? item?.startDateTime ?? item?.date ?? null,
    endDateTime: item?.endDateTime ?? null,
    status: lower(item?.status, 'pending'),
  };
}

// Profile payloads behind the view and edit dialogs.
export function toAdminPatientProfile(body) {
  return {
    id: String(body?.id ?? ''),
    name: label(body?.fullName ?? body?.name),
    email: label(body?.email),
    phone: label(body?.phone),
    city: label(body?.city),
    gender: lower(body?.gender),
    dateOfBirth: body?.dateOfBirth ? String(body.dateOfBirth).slice(0, 10) : '',
    imageUrl: label(body?.profileImageUrl),
    status: body?.isActive === false ? 'suspended' : 'active',
    joinedAt: body?.joinedAt ?? null,
  };
}

export function toAdminTherapistProfile(body) {
  return {
    id: String(body?.id ?? ''),
    name: label(body?.fullName ?? body?.name),
    email: label(body?.email),
    phone: label(body?.phone),
    centerId: body?.centerId == null ? '' : String(body.centerId),
    center: label(body?.centerName ?? body?.center),
    specialtyId: body?.specialtyId == null ? '' : String(body.specialtyId),
    specialty: label(body?.specialtyName ?? body?.specialty),
    bio: label(body?.bio),
    yearsOfExperience: body?.yearsOfExperience ?? '',
    imageUrl: label(body?.profileImageUrl),
    status: body?.isActive === false ? 'suspended' : 'active',
    isAvailable: body?.isAvailable !== false,
    joinedAt: body?.joinedAt ?? null,
  };
}

// Statuses arrive as plain strings from the table they were read from.
const statusOptions = (value) =>
  (Array.isArray(value) ? value : []).map((item) => lower(item)).filter(Boolean);

export function toAdminAppointments(body) {
  const list = adminList(body);
  return {
    ...list,
    items: list.items.map(toAdminAppointment),
    filters: {
      centers: refOptions(list.filters?.centers),
      // The statuses actually present in the table, so the dropdown always
      // matches the values shown in the status column.
      statuses: statusOptions(list.filters?.statuses),
    },
  };
}

// Options feed the create-appointment form: ids and names plus the center each
// therapist belongs to so the select can narrow by the chosen center.
const optionList = (value) =>
  (Array.isArray(value) ? value : []).map((item, index) =>
    typeof item === 'string' || typeof item === 'number'
      ? { id: String(index), name: String(item) }
      : {
          id: String(item?.id ?? item?.value ?? index),
          name: label(item),
          ...(item?.centerId != null ? { centerId: String(item.centerId) } : {}),
          // Therapists carry the services they provide, so the appointment forms
          // can narrow the service select to the chosen therapist's offer.
          ...(Array.isArray(item?.serviceIds)
            ? { serviceIds: item.serviceIds.map((id) => String(id)) }
            : {}),
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
  const context =
    label(item?.context) ||
    [label(item?.therapist ?? item?.therapistName), label(item?.center ?? item?.centerName)]
      .filter(Boolean)
      .join(' - ');
  return {
    id: String(item?.id ?? item?.reviewId ?? ''),
    name: label(item?.patient ?? item?.patientName ?? item?.name),
    context,
    text: label(item?.text ?? item?.comment),
    rating: num(item?.rating, 0),
    // The API stores moderation as the isVisible flag; a hidden review is the
    // only state besides published. An explicit legacy status still wins.
    status:
      item?.isVisible === false
        ? 'hidden'
        : lower(item?.status, 'published'),
    createdAt: item?.createdAt ?? null,
  };
}

export function toAdminReviews(body) {
  const list = adminList(body);
  const summary = body?.summary ?? {};
  const total = num(summary?.total ?? summary?.reviewCount ?? list.total);
  const hidden = num(summary?.hidden ?? summary?.reported);
  // Flagged = share of reviews an admin has taken out of public view.
  const flagged = total ? Math.round((hidden / total) * 1000) / 10 : 0;
  const distribution = Array.isArray(summary?.ratingDistribution)
    ? summary.ratingDistribution.map((entry) => num(entry?.count ?? entry))
    : Array.isArray(summary?.distribution)
      ? summary.distribution.map((value) => num(value))
      : [];
  return {
    total: list.total,
    filters: list.filters,
    summary: {
      score: num(summary?.score ?? summary?.overallRating ?? summary?.averageRating),
      total,
      // The summary card prints a ready-made "0.1%", numbers included.
      flaggedPercent: `${flagged}%`,
      distribution,
      published: num(summary?.published ?? summary?.visible),
      hidden,
      replied: num(summary?.replied),
    },
    items: list.items.map(toAdminReview),
  };
}

// The Schedules API returns C# names and "HH:mm:ss" times; the centre portal
// works with day numbers (0 = Sunday) and plain "HH:mm" values.
export function toScheduleWindow(body) {
  if (!body || typeof body !== 'object') return null;
  return {
    id: body.id ?? body.scheduleId ?? null,
    therapistId: String(body.therapistId ?? ''),
    day: Number(body.day ?? body.dayOfWeek),
    start: String(body.start ?? body.startTime ?? '').slice(0, 5),
    end: String(body.end ?? body.endTime ?? '').slice(0, 5),
    isAvailable: body.isAvailable !== false,
  };
}

export function toAdminSettings(body) {
  // The mock stores UI keys under `profile`; the API answers with flat
  // adminFullName/email fields at the top level.
  const profile = body?.profile ?? body ?? {};
  const rawNotifications = body?.notifications;
  // Mock settings store the four UI keys; the API returns the generic flags.
  const notifications = rawNotifications && 'emailEnabled' in rawNotifications
    ? toPreferences(rawNotifications, adminPreferenceMap)
    : {
        approvalRequests: rawNotifications?.approvalRequests === true,
        appointmentUpdates: rawNotifications?.appointmentUpdates === true,
        reportedReviews: rawNotifications?.reportedReviews === true,
        systemAlerts: rawNotifications?.systemAlerts === true,
      };
  return {
    profile: {
      // The API names the admin's own name `adminFullName`.
      name: label(profile?.fullName ?? profile?.adminFullName ?? profile?.name),
      email: label(profile?.email),
      phone: label(profile?.phone ?? profile?.phoneNumber),
      role: label(profile?.role),
      // An active account is the only verification signal the API exposes.
      verified: profile?.verified === true || profile?.isActive === true,
      lastSignIn: profile?.lastSignIn ?? null,
      location: label(profile?.location),
      adminId: profile?.adminId == null ? '' : String(profile.adminId),
    },
    security: { twoFactorEnabled: body?.security?.twoFactorEnabled === true },
    notifications,
  };
}