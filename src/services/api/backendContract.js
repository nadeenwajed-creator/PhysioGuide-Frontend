// Every operation the app can call, mapped onto the endpoints in api-contract.md.
//
// `request(...)` says how to reach the API; `response(...)` turns the payload
// into the shape the UI already renders. Operations the API does not expose yet
// fail with `unavailable` instead of pretending to succeed.

import { ServiceError } from './serviceError.js';
import { loadSession, saveSession, clearSession } from '../auth/session.js';
import * as map from './mappers.js';
import { toAssessmentResult } from '../patient/painAssessmentModel.js';

const CENTER_WORKSPACE = '/api/center/workspace';
const SCHEDULES = '/api/Schedules';
const THERAPIST_WORKSPACE = '/api/therapist/workspace';
const PATIENT = '/api/patient';
const AUTH = '/api/Auth';

// Images and attachments are stored under the API origin, not the SPA origin.
const apiRoot = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

// Rewrites every `/uploads/...` string in a payload to an absolute API URL so
// <img src> and attachments resolve without the UI knowing where the API lives.
function resolveAssets(value) {
  if (typeof value === 'string') {
    return value.startsWith('/uploads/') && apiRoot ? `${apiRoot}${value}` : value;
  }
  if (Array.isArray(value)) return value.map(resolveAssets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveAssets(item)]));
  }
  return value;
}

const resolved = (mapper) => (body, ...rest) => resolveAssets(mapper(body, ...rest));

// The backend refuses an empty payload, so a password change carries whichever
// pair of names the form happens to use.
function passwordPair(values) {
  return {
    currentPassword: values?.currentPassword ?? values?.password,
    newPassword: values?.newPassword ?? values?.confirmPassword ?? values?.password,
  };
}

// Centres register with a single free-text location but the API stores a city
// separately; the city is the last component of the address before the country.
export function cityFromAddress(address) {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Unknown';
  return parts.length === 2 ? parts[0] : parts[parts.length - 2];
}

// --- auth ------------------------------------------------------------------

function signIn(body, credentials) {
  const session = map.toSession(body, credentials);
  saveSession({
    token: body?.accessToken,
    refreshToken: body?.refreshToken,
    session,
    authenticatedAt: Date.now(),
  });
  return session;
}

const login = () => ({
  request: (credentials) => ({
    method: 'POST',
    path: `${AUTH}/login`,
    data: { email: credentials?.email, password: credentials?.password },
    auth: false,
  }),
  response: (body, credentials) => {
    const session = signIn(body, credentials);
    return { mode: 'api', status: 'authenticated', role: session.role, session };
  },
  // Bad credentials arrive as a 401 with no field details; forms render one line.
  error: (error) =>
    error?.status === 401 && !Object.keys(error?.fields || {}).length
      ? new ServiceError('invalidCredentials')
      : error,
});

export const authOperations = {
  loginPatient: login(),
  loginCenter: login(),
  // The hidden admin entry uses the same credential endpoint; only the
  // response role separates it from the other portals.
  loginAdmin: login(),

  registerPatient: {
    request: (data) => ({
      method: 'POST',
      path: `${AUTH}/register/patient`,
      data: {
        fullName: data?.fullName,
        email: data?.email,
        phoneNumber: data?.phone,
        password: data?.password,
        gender: data?.gender,
      },
      auth: false,
    }),
    response: () => ({ mode: 'api', status: 'registered', role: 'patient' }),
  },

  registerCenter: {
    request: (data) => {
      const location = data?.location;
      const address = typeof location === 'string' ? location : location?.address;
      const coordinates = typeof location === 'object' ? location?.coordinates : null;
      return {
        method: 'POST',
        path: `${AUTH}/register/center`,
        data: {
          centerName: data?.centerName,
          email: data?.email,
          phoneNumber: data?.phone,
          password: data?.password,
          location: address,
          city: cityFromAddress(address),
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        },
        auth: false,
      };
    },
    // A new centre is created Pending, so the form reports the review notice.
    response: () => ({ mode: 'api', status: 'pending-review', role: 'center' }),
  },

  // A Google sign-in response carries the same fields as password login, so
  // the session is stored and shaped exactly the same way.
  completeGoogleSession: {
    execute: async (_client, body) => {
      const session = signIn(body);
      return { mode: 'api', status: 'authenticated', role: session.role, session };
    },
  },

  // The session lives in localStorage; restoring it never touches the network.
  restoreSession: {
    execute: async () => loadSession()?.session ?? null,
  },

  logout: {
    execute: async (client) => {
      const stored = loadSession();
      if (stored?.refreshToken) {
        await client
          .post(`${AUTH}/logout`, { data: { refreshToken: stored.refreshToken } })
          .catch(() => undefined);
      }
      clearSession();
    },
  },

  listCenterApplications: {
    request: ({ status }) => ({
      method: 'GET',
      path: '/api/admin/center-applications',
      query: { status },
    }),
    response: resolved((body) => (Array.isArray(body) ? body.map(map.toApplication) : [])),
  },

  getCenterApplication: {
    request: ({ id }) => ({ method: 'GET', path: `/api/admin/center-applications/${id}` }),
    response: resolved(map.toApplication),
  },

  reviewCenterApplication: {
    request: ({ id, decision, reason }) => ({
      method: 'POST',
      path: `/api/admin/center-applications/${id}/review`,
      data: { decision, reason },
    }),
    response: resolved(map.toApplication),
  },
};

// --- admin portal ----------------------------------------------------------
// Every operation below is admin-only; the bearer token carries the role the
// backend must enforce. List queries pass their filters straight through and
// the gateway drops empty values.

const ADMIN = '/api/admin';

export const adminOperations = {
  getAdminDashboard: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/dashboard`,
      query: { year: params?.year },
    }),
    response: resolved(map.toAdminDashboard),
  },

  getAdminCenters: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/centers`,
      query: {
        search: params?.search,
        status: params?.status,
        specialty: params?.specialty,
        city: params?.city,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    }),
    response: resolved(map.toAdminCenters),
  },

  getAdminCenter: {
    request: (_actor, { id } = {}) => ({
      method: 'GET',
      path: `${ADMIN}/centers/${encodeURIComponent(id)}`,
    }),
    response: resolved(map.toAdminCenter),
  },

  setAdminCenterStatus: {
    request: (_actor, { id, status, reason } = {}) => ({
      method: 'PUT',
      path: `${ADMIN}/centers/${encodeURIComponent(id)}/status`,
      data: { status, ...(reason ? { reason } : {}) },
    }),
    response: resolved(map.toAdminCenter),
  },

  getAdminPatients: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/patients`,
      query: {
        search: params?.search,
        status: params?.status,
        city: params?.city,
        sort: params?.sort,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    }),
    response: resolved(map.toAdminPatients),
  },

  setAdminPatientStatus: {
    request: (_actor, { id, status } = {}) => ({
      method: 'PUT',
      path: `${ADMIN}/patients/${encodeURIComponent(id)}/status`,
      data: { status },
    }),
    response: resolved((body) => map.toAdminPatient(body)),
  },

  getAdminPhysiotherapists: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/physiotherapists`,
      query: {
        search: params?.search,
        specialty: params?.specialty,
        center: params?.center,
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    }),
    response: resolved(map.toAdminPhysiotherapists),
  },

  setAdminPhysiotherapistStatus: {
    request: (_actor, { id, status } = {}) => ({
      method: 'PUT',
      path: `${ADMIN}/physiotherapists/${encodeURIComponent(id)}/status`,
      data: { status },
    }),
    response: resolved((body) => map.toAdminPhysiotherapist(body)),
  },

  addAdminPhysiotherapist: {
    request: (_actor, values) => ({
      method: 'POST',
      path: `${ADMIN}/physiotherapists`,
      data: {
        fullName: values?.fullName,
        email: values?.email,
        licenseId: values?.licenseId,
        specialtyId: values?.specialty,
        centerId: values?.centerId,
        password: values?.Password,
        phoneNumber: values?.PhoneNumber
      },
    }),
    response: resolved((body) => map.toAdminPhysiotherapist(body)),
  },

  getAdminAppointments: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/appointments`,
      query: {
        search: params?.search,
        status: params?.status,
        center: params?.center,
        from: params?.from,
        to: params?.to,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    }),
    response: resolved(map.toAdminAppointments),
  },

  getAdminAppointmentOptions: {
    request: () => ({ method: 'GET', path: `${ADMIN}/appointments/options` }),
    response: resolved(map.toAdminAppointmentOptions),
  },

  createAdminAppointment: {
    request: (_actor, values) => ({
      method: 'POST',
      path: `${ADMIN}/appointments`,
      data: {
        patientId: values?.patientId,
        centerId: values?.centerId,
        therapistId: values?.therapistId,
        serviceId: values?.serviceId,
        date: values?.date,
        time: values?.time,
      },
    }),
    response: resolved((body) => map.toAdminAppointment(body)),
  },

  getAdminReviews: {
    request: (_actor, params) => ({
      method: 'GET',
      path: `${ADMIN}/reviews`,
      query: {
        search: params?.search,
        rating: params?.rating,
        status: params?.status,
        sort: params?.sort,
        page: params?.page,
        pageSize: params?.pageSize,
      },
    }),
    response: resolved(map.toAdminReviews),
  },

  moderateAdminReview: {
    request: (_actor, { id, action } = {}) => ({
      method: 'POST',
      path: `${ADMIN}/reviews/${encodeURIComponent(id)}/moderate`,
      data: { action },
    }),
    response: resolved((body) => map.toAdminReview(body)),
  },

  getAdminSettings: {
    request: () => ({ method: 'GET', path: `${ADMIN}/settings` }),
    response: resolved(map.toAdminSettings),
  },

  saveAdminSettings: {
    request: (_actor, values) => ({
      method: 'PUT',
      path: `${ADMIN}/settings`,
      data: {
        ...(values?.profile
          ? {
              profile: {
                fullName: values.profile.name,
                location: values.profile.location,
              },
            }
          : {}),
        notifications: values?.notifications,
      },
    }),
    response: resolved(map.toAdminSettings),
  },

  // The admin settings page reuses the shared credential endpoint.
  changeAdminPassword: {
    request: (_actor, values) => ({
      method: 'POST',
      path: `${AUTH}/change-password`,
      data: passwordPair(values),
    }),
    response: (body) => body ?? {},
  },
};

// --- messaging helpers -----------------------------------------------------

// Loads each conversation's messages; the workspaces only carry previews.
async function hydrateMessages(client, conversations) {
  const loaded = new Map();
  await Promise.all(
    conversations.map(async (item) => {
      try {
        const body = await client.get(`/api/conversations/${item.id}/messages`);
        loaded.set(String(item.id), body?.messages || []);
      } catch {
        loaded.set(String(item.id), []);
      }
    })
  );
  return loaded;
}

async function unreadNotificationIds(client, role) {
  const path =
    role === 'patient'
      ? `${PATIENT}/messaging-workspace`
      : role === 'physiotherapist'
        ? THERAPIST_WORKSPACE
        : CENTER_WORKSPACE;
  const body = await client.get(path);
  return (body?.notifications || []).filter((item) => !item.isRead).map((item) => item.id);
}

// --- portal operations -----------------------------------------------------

export const centerOperations = {
  getWorkspace: {
    execute: async (client, actor) => {
      if (actor?.role === 'physiotherapist') {
        const [workspace, preferences] = await Promise.all([
          client.get(THERAPIST_WORKSPACE),
          client.get(`${THERAPIST_WORKSPACE}/preferences`),
        ]);
        const messages = await hydrateMessages(client, workspace?.conversations || []);
        return resolveAssets(map.toTherapistWorkspace(workspace, preferences, messages, actor));
      }
      const [workspace, preferences] = await Promise.all([
        client.get(CENTER_WORKSPACE),
        client.get(`${CENTER_WORKSPACE}/preferences`),
      ]);
      return resolveAssets(map.toCenterWorkspace(workspace, preferences, actor));
    },
  },

  getMessagingWorkspace: {
    execute: async (client, actor) => {
      if (actor?.role === 'physiotherapist') {
        const [workspace, preferences] = await Promise.all([
          client.get(THERAPIST_WORKSPACE),
          client.get(`${THERAPIST_WORKSPACE}/preferences`),
        ]);
        const messages = await hydrateMessages(client, workspace?.conversations || []);
        const full = map.toTherapistWorkspace(workspace, preferences, messages, actor);
        return resolveAssets({
          notificationPreferences: full.notificationPreferences,
          patients: full.patients,
          therapists: full.therapists,
          conversations: full.conversations,
          notifications: full.notifications,
        });
      }
      const body = await client.get(`${PATIENT}/messaging-workspace`);
      return resolveAssets(map.toMessagingWorkspace(body, actor));
    },
  },

  getPatientDiscovery: {
    request: () => ({ method: 'GET', path: '/api/centers' }),
    response: resolved(map.toDiscovery),
  },

  getPatientAppointments: {
    request: () => ({ method: 'GET', path: `${PATIENT}/appointments` }),
    response: resolved(map.toAppointments),
  },

  submitAssessment: {
    request: (_actor, answers) => ({
      method: 'POST',
      path: '/api/Assessment',
      data: {
        painLocation: answers?.painLocation,
        painSeverity: answers?.painSeverity,
        duration: answers?.duration,
        painDescriptions: answers?.painDescriptions,
        previousInjurySurgery: answers?.previousInjurySurgery,
        ...(answers?.otherDescription ? { otherDescription: answers.otherDescription } : {}),
      },
    }),
    response: (body) => toAssessmentResult(body),
  },

  getAssessmentHistory: {
    request: () => ({ method: 'GET', path: '/api/Assessment/history' }),
    response: (body) => (Array.isArray(body) ? body.map(toAssessmentResult) : []),
  },

  getAssessment: {
    request: (_actor, id) => ({ method: 'GET', path: `/api/Assessment/${id}` }),
    response: (body) => toAssessmentResult(body),
  },

  getPatientSlots: {
    request: (_actor, values) => ({
      method: 'GET',
      path: `/api/centers/${values?.centerId}/slots`,
      query: {
        therapistId: values?.therapistId,
        serviceId: values?.serviceId,
        date: values?.date,
      },
    }),
    response: (body) => (Array.isArray(body) ? body : []),
  },

  requestAppointment: {
    request: (_actor, values) => ({
      method: 'POST',
      path: '/api/appointments/request',
      data: {
        centerId: values?.centerId,
        therapistId: values?.therapistId,
        serviceId: values?.serviceId,
        date: values?.date,
        time: values?.time,
        notes: values?.note || values?.notes,
      },
    }),
    response: resolved(map.toAppointment),
  },

  getPatientAccount: {
    request: () => ({ method: 'GET', path: `${PATIENT}/account` }),
    response: (body) => ({
      profile: resolveAssets(map.toProfile(body?.profile)),
      preferences: map.toPatientPreferences(body?.preferences),
    }),
  },

  savePatientProfile: {
    request: (_actor, values) => ({
      method: 'PUT',
      path: `${PATIENT}/account/profile`,
      data: map.profileRequest(values),
    }),
    response: resolved((body) => ({
      ...map.toProfile(body?.profile),
      email: body?.profile?.email || '',
    })),
  },

  savePatientPreferences: {
    request: (_actor, values) => ({
      method: 'PUT',
      path: `${PATIENT}/account/preferences`,
      data: map.patientPreferencesRequest(values),
    }),
    response: (body) => map.toPatientPreferences(body?.preferences),
  },

  preparePatientImage: {
    request: (_actor, file) => {
      const form = new FormData();
      form.append('file', file, file?.name || 'upload');
      return { method: 'POST', path: `${PATIENT}/account/image`, data: form };
    },
    response: (body) => resolveAssets(body?.url || ''),
  },

  changePatientPassword: {
    request: (_actor, values) => ({
      method: 'POST',
      path: `${AUTH}/change-password`,
      data: passwordPair(values),
    }),
    response: (body) => body ?? {},
  },

  changeCenterPassword: {
    request: (_actor, values) => ({
      method: 'POST',
      path: `${AUTH}/change-password`,
      data: passwordPair(values),
    }),
    response: (body) => body ?? {},
  },

  // Uploading is the only image operation the API exposes for staff accounts,
  // and it also inserts a gallery row. The row is removed immediately so the
  // caller receives a usable URL without silently changing the gallery.
  prepareImage: {
    execute: async (client, file) => {
      const form = new FormData();
      form.append('file', file, file?.name || 'upload');
      const created = await client.post(`${CENTER_WORKSPACE}/images`, { data: form });
      if (created?.id) {
        await client.delete(`${CENTER_WORKSPACE}/images/${created.id}`).catch(() => undefined);
      }
      return resolveAssets(created?.url || '');
    },
  },

  addGalleryImage: {
    execute: async (client, actor, file) => {
      const form = new FormData();
      form.append('file', file, file?.name || 'upload');
      const created = await client.post(`${CENTER_WORKSPACE}/images`, { data: form });
      return resolveAssets(created?.url || '');
    },
  },

  updateCenterImages: {
    execute: async (client, _actor, values) => {
      if (values?.imageUrl) {
        await client.put(`${CENTER_WORKSPACE}/center`, {
          data: { profileImageUrl: values.imageUrl },
        });
      }
      if (values?.add) {
        const form = new FormData();
        form.append('imageUrl', values.add);
        await client.post(`${CENTER_WORKSPACE}/images`, { data: form });
      }
      // Removing a gallery image needs its id, which the workspace only exposes
      // as a URL, so a removal cannot be expressed against the API yet.
      if (values?.remove) throw new ServiceError('unavailable');
      if (!values?.imageUrl && !values?.add) throw new ServiceError('image');
      return undefined;
    },
  },

  saveCenter: {
    execute: async (client, _actor, values) => {
      await client.put(`${CENTER_WORKSPACE}/center`, {
        data: {
          nameEnglish: values?.name,
          nameArabic: values?.nameAr,
          descriptionEnglish: values?.about,
          descriptionArabic: values?.aboutAr,
          address: values?.address,
          city: values?.city,
          profileImageUrl: values?.imageUrl,
          websiteUrl: values?.websiteUrl,
          latitude: values?.coordinates?.latitude,
          longitude: values?.coordinates?.longitude,
          locationConfirmed: values?.locationConfirmed,
        },
      });
      if (values?.hours) {
        await client.put(`${CENTER_WORKSPACE}/hours`, { data: values.hours });
      }
      return undefined;
    },
  },

  saveNotificationPreferences: {
    request: (_actor, values) => ({
      method: 'PUT',
      path: `${CENTER_WORKSPACE}/preferences`,
      data: map.centerPreferencesRequest(values),
    }),
    response: (body) => map.toCenterPreferences(body),
  },

  markNotificationsRead: {
    execute: async (client, actor, id) => {
      if (id !== undefined && id !== null) {
        await client.post('/api/notifications/read', { data: { id } });
        return undefined;
      }
      // The API marks one notification at a time, so "mark all" walks the list.
      const ids = await unreadNotificationIds(client, actor?.role);
      await Promise.all(
        ids.map((item) => client.post('/api/notifications/read', { data: { id: item } }).catch(() => undefined))
      );
      return undefined;
    },
  },

  markConversationRead: {
    // The backend rejects an empty id list (MinLength 1), so an all-read
    // conversation skips the request instead of failing the read effect.
    execute: async (client, _actor, id, messageIds) => {
      const ids = [...new Set(messageIds || [])];
      if (!ids.length) return null;
      await client.post(`/api/conversations/${id}/read`, { data: { messageIds: ids } });
      return null;
    },
  },

  // Opening a conversation finds the patient+therapist pair or creates it.
  openPatientConversation: {
    request: (_actor, values) => ({
      method: 'POST',
      path: '/api/conversations',
      data: { therapistId: Number(values?.therapistId) },
    }),
    response: (body) => ({
      id: String(body?.id ?? ''),
      patientId: String(body?.patientId ?? ''),
      therapistId: String(body?.therapistId ?? ''),
    }),
  },

  sendMessage: {
    // Composed files are local Blobs, so each one is uploaded to the role's
    // image endpoint first; the message then carries the returned URL. Extra
    // attachments follow as their own messages because the API stores one
    // attachment URL per message.
    execute: async (client, actor, id, payload) => {
      const text = payload?.text || '';
      const files = (payload?.attachments || []).filter((item) => item?.sourceFile || item?.file);
      const uploadPath =
        actor?.role === 'physiotherapist'
          ? '/api/therapist/workspace/images'
          : `${PATIENT}/account/image`;

      const urls = [];
      for (const file of files) {
        const source = file.sourceFile || file.file;
        const form = new FormData();
        form.append('file', source, file.name || source.name || 'upload');
        const uploaded = await client.post(uploadPath, { data: form });
        if (uploaded?.url) urls.push(uploaded.url);
      }

      const first = await client.post(`/api/conversations/${id}/messages`, {
        data: { text, attachment: urls[0] },
      });
      for (const url of urls.slice(1)) {
        await client.post(`/api/conversations/${id}/messages`, {
          data: { text: '', attachment: url },
        });
      }

      return mapSentMessage(first, actor);
    },
  },

  savePatient: {
    execute: async (client, _actor, values, id) => {
      const payload = {
        fullName: values?.name,
        email: values?.email,
        phoneNumber: values?.phone,
        gender: values?.gender,
        dateOfBirth: values?.birthDate || null,
        profileImageUrl: values?.imageUrl || null,
        isActive: values?.status !== 'inactive',
      };

      if (id) {
        const body = await client.put(`${CENTER_WORKSPACE}/patients/${id}`, { data: payload });
        return resolveAssets({ ...values, id: String(body?.id ?? id) });
      }

      // Adding a patient creates their login account as well, so it needs the
      // temporary password the form collects.
      const body = await client.post(`${CENTER_WORKSPACE}/patients`, {
        data: { ...payload, password: values?.password },
      });
      return resolveAssets({ ...values, id: String(body?.id ?? '') });
    },
  },

  saveService: {
    execute: async (client, _actor, values, id) => {
      const specialtyId = Number(values?.specialtyId);
      if (!specialtyId) throw new ServiceError('validation', { fields: { specialtyId: 'required' } });

      const payload = {
        nameEnglish: values?.name,
        nameArabic: values?.nameAr || values?.name,
        descriptionEnglish: values?.description,
        descriptionArabic: values?.descriptionAr || values?.description,
        price: Number(values?.price) || 0,
        durationMinutes: Number(values?.duration) || 30,
        specialtyId,
        isActive: values?.status !== 'inactive',
      };
      const body = id
        ? await client.put(`${CENTER_WORKSPACE}/services/${id}`, { data: payload })
        : await client.post(`${CENTER_WORKSPACE}/services`, { data: payload });
      return resolveAssets({ ...values, id: String(body?.id ?? id ?? ''), ...body });
    },
  },

  saveTherapist: {
    execute: async (client, _actor, values, id) => {
      const specialtyId = Number(values?.specialtyId);
      if (!specialtyId) throw new ServiceError('validation', { fields: { specialtyId: 'required' } });

      const professional = {
        fullName: values?.name,
        specialtyId,
        profileImageUrl: values?.imageUrl,
        yearsOfExperience: values?.experience == null || values?.experience === ''
          ? null
          : Number(values.experience),
        isAvailable: values?.availability !== 'unavailable',
        isActive: values?.status !== 'inactive',
        serviceIds: values?.serviceIds?.map(Number),
      };

      if (id) {
        const body = await client.put(`${CENTER_WORKSPACE}/therapists/${id}`, { data: professional });
        return resolveAssets({ ...values, id: String(body?.id ?? id), ...body });
      }

      // The staff account is created by its own endpoint, which needs the
      // password the form collects for the new therapist.
      const body = await client.post('/api/center/therapists', {
        data: {
          ...professional,
          email: values?.email,
          password: values?.password,
          phoneNumber: values?.phone,
        },
      });
      return resolveAssets({ ...values, id: String(body?.therapistId ?? body?.id ?? '') });
    },
  },

  getTherapistSchedule: {
    request: (_actor, therapistId) => ({
      method: 'GET',
      path: `${SCHEDULES}/therapists/${therapistId}`,
    }),
    response: (body) => (Array.isArray(body) ? body : body?.windows ?? []).map(map.toScheduleWindow),
  },

  saveTherapistSchedule: {
    // The API manages one window per request, so the desired week is applied
    // as a diff: delete removed windows, then update kept ones, then create
    // new ones. Deletes run first so re-assigned days cannot overlap mid-save.
    execute: async (client, _actor, therapistId, desired = [], previous = []) => {
      const existing = new Map(previous.map((window) => [String(window.id), window]));
      // The Schedules binder only accepts "HH:mm:ss", while the centre-hours
      // endpoint requires the opposite ("HH:mm" exactly) — so times are widened
      // here on the wire, and toScheduleWindow slices them back for the UI.
      const time = (value) => (/^\d{2}:\d{2}$/.test(String(value)) ? `${value}:00` : value);
      const payload = (window) => ({
        dayOfWeek: window.day,
        startTime: time(window.start),
        endTime: time(window.end),
        isAvailable: window.isAvailable !== false,
      });

      for (const window of previous) {
        const kept = desired.some((item) => item.id != null && String(item.id) === String(window.id));
        if (!kept) await client.delete(`${SCHEDULES}/therapists/${therapistId}/${window.id}`);
      }
      for (const window of desired) {
        if (window.id == null) continue;
        const before = existing.get(String(window.id));
        if (!before) continue;
        if (before.day !== window.day || before.start !== window.start || before.end !== window.end) {
          await client.put(`${SCHEDULES}/therapists/${therapistId}/${window.id}`, { data: payload(window) });
        }
      }
      for (const window of desired) {
        if (window.id != null) continue;
        await client.post(`${SCHEDULES}/therapists/${therapistId}`, { data: payload(window) });
      }

      const body = await client.get(`${SCHEDULES}/therapists/${therapistId}`);
      return (Array.isArray(body) ? body : []).map(map.toScheduleWindow);
    },
  },

  saveOwnProfile: {
    execute: async (client, _actor, values) => {
      // The profile form edits contact details only, so the specialty id is
      // read back from the API before the update is sent.
      const current = await client.get('/api/Therapist/profile').catch(() => null);
      const body = await client.put('/api/Therapist/profile', {
        data: {
          fullName: values?.name,
          specialtyId: current?.specialty?.specialtyId,
          bio: values?.about,
          profileImageUrl: values?.imageUrl,
          yearsOfExperience: current?.yearsOfExperience ?? null,
          qualifications: current?.qualifications,
          languages: current?.languages,
          isAvailable: current?.isAvailable ?? true,
        },
      });
      return resolveAssets({ ...values, id: String(current?.therapistId ?? ''), ...body });
    },
  },

  updateAppointmentStatus: {
    request: (_actor, id, status) => ({
      method: 'PUT',
      path: `${CENTER_WORKSPACE}/appointments/${id}/status`,
      data: { status: map.statusToApi(status) },
    }),
    response: resolved(map.toAppointment),
  },

  addPatientNote: {
    request: (_actor, patientId, text) => ({
      method: 'POST',
      path: `${CENTER_WORKSPACE}/patients/${patientId}/notes`,
      data: { text },
    }),
    response: (body) => body ?? {},
  },

  updateReview: {
    request: (_actor, id, values) => ({
      method: 'POST',
      path: `${CENTER_WORKSPACE}/reviews/${id}/reply`,
      data: { reply: values?.reply },
    }),
    response: (body) => body ?? {},
  },
};

// The message the composer gets back: shaped like the messages the workspace
// reloads, so an optimistic render and the refreshed list agree.
function mapSentMessage(body, actor) {
  return resolveAssets({
    ...body,
    attachments: body?.attachment
      ? [{ url: body.attachment, name: String(body.attachment).split('/').pop() }]
      : [],
    direction: 'outgoing',
    status: 'sent',
    isRead: false,
    senderRole: actor?.role,
    senderId: actor?.patientId || actor?.therapistId || '',
  });
}

// Operations the API contract does not expose yet. They fail loudly rather
// than silently succeeding so the interface can show its unavailable state.
const notImplemented = () => {
  throw new ServiceError('unavailable');
};

for (const operation of [
  'setPatientFavorite',
  'saveAppointment',
]) {
  centerOperations[operation] = { execute: notImplemented };
}

export const transportOptions = {};
