import { patientProfile, savePatientProfile, savePatientPreferences } from './mockPatientAccount.js';
import { defaultPatientPreferences } from './accountModel.js';
import { mockAccounts } from '../auth/mockAccounts.js';
import { mockAccountStore } from '../mock/accountRepository.js';
import { readMockCenter, getCenterStore } from '../mock/centerRepository.js';
import { createBrowserStore } from '../mock/browserStore.js';
import { createMockCenterAdapter } from '../center/mockCenterAdapter.js';
import { ServiceError } from '../api/serviceError.js';
import { publicCenter, patientIdentity, availableSlots } from './discoveryModel.js';

export function approvedCenterIds() {
  return [...new Set([...mockAccounts, ...(mockAccountStore.read() || [])].filter(a => a.role === 'center' && a.status === 'approved' && a.centerId)
    .map(a => a.centerId))];
}

// callCenter authenticates and replaces the claimed actor before entering this mock boundary.
export async function executePatientOperation(method, actor, values, ...rest) {
  const ids = approvedCenterIds();
  const patientId = patientIdentity(actor);
  const favorites = createBrowserStore(`physioguide.mock.patient-preferences.v1:${encodeURIComponent(actor.id)}`);
  const scoped = id => ({
    ...actor,
    centerId: id,
    patientId
  });
  // Read fresh data so another tab's messages are not overwritten
  const adapter = id => createMockCenterAdapter(readMockCenter(id), {
    store: getCenterStore(id)
  });
  if (method === 'getPatientAccount') return {
    profile: patientProfile(actor, ids),
    preferences: {
      ...defaultPatientPreferences,
      ...favorites.read()?.notificationPreferences
    }
  };
  if (method === 'savePatientProfile') return savePatientProfile(actor, values, ids);
  if (method === 'savePatientPreferences') return savePatientPreferences(favorites, values);
  if (method === 'preparePatientImage') return adapter('center-demo').prepareImage(values);
  if (method === 'changePatientPassword') throw new ServiceError('passwordUnavailable');
  if (method === 'getPatientDiscovery') return {
    mode: 'mock',
    centers: ids.map(id => ({
      ...publicCenter(readMockCenter(id)),
      dataSource: 'mock',
      approvalStatus: 'approved'
    })),
    favoriteIds: (favorites.read()?.favoriteIds || []).filter(id => ids.includes(id))
  };
  if (method === 'setPatientFavorite') {
    if (!ids.includes(values.centerId) || typeof values.saved !== 'boolean') throw new ServiceError('notFound');
    const current = favorites.read() || {};
    const set = new Set(current.favoriteIds || []);
    values.saved ? set.add(values.centerId) : set.delete(values.centerId);
    favorites.write({
      ...current,
      favoriteIds: [...set]
    });
    return [...set];
  }
  if (method === 'getPatientAppointments') return ids.flatMap(id => {
    const w = readMockCenter(id);
    return w.appointments.filter(a => a.patientId === patientId).map(a => ({
      id: a.id,
      patientId: a.patientId,
      therapistId: a.therapistId,
      serviceId: a.serviceId,
      date: a.date,
      time: a.time,
      status: a.status,
      duration: a.durationMinutes ?? w.services.find(s => s.id === a.serviceId)?.duration,
      therapistImage: w.therapists.find(t => t.id === a.therapistId)?.imageUrl,
      therapistAvailable: w.therapists.some(t => t.id === a.therapistId && t.status !== 'inactive'),
      centerId: id,
      centerName: w.center.name,
      serviceName: w.services.find(s => s.id === a.serviceId)?.name,
      therapistName: w.therapists.find(t => t.id === a.therapistId)?.name
    }));
  });
  if (method === 'getMessagingWorkspace') {
    const parts = await Promise.all(ids.filter(id => readMockCenter(id).patients.some(p => p.id === patientId)).map(id => adapter(id).getMessagingWorkspace(scoped(id))));
    const unique = list => [...new Map(list.map(item => [item.id, item])).values()];
    return {
      patientProfile: patientProfile(actor, ids),
      notificationPreferences: {
        ...defaultPatientPreferences,
        ...favorites.read()?.notificationPreferences
      },
      patients: unique(parts.flatMap(p => p.patients)),
      therapists: unique(parts.flatMap(p => p.therapists)),
      conversations: parts.flatMap(p => p.conversations),
      notifications: parts.flatMap(p => p.notifications)
    };
  }
  if (['sendMessage', 'markConversationRead'].includes(method)) {
    const id = ids.find(id => readMockCenter(id).conversations.some(c => c.id === values && c.patientId === patientId));
    if (!id) throw new ServiceError('notFound');
    return adapter(id)[method](scoped(id), values, ...rest);
  }
  if (method === 'markNotificationsRead') {
    await Promise.all(ids.filter(id => readMockCenter(id).patients.some(p => p.id === patientId)).map(id => adapter(id).markNotificationsRead(scoped(id), values)));
    return;
  }
  const centerId = values.centerId;
  if (!ids.includes(centerId)) throw new ServiceError('notFound');
  const w = readMockCenter(centerId);
  if (method === 'getPatientSlots') return availableSlots(w, {
    ...values,
    patientId
  });
  if (method === 'requestAppointment') {
    if (!availableSlots(w, {
      ...values,
      patientId
    }).includes(values.time)) throw new ServiceError('conflict');
    ensurePatient(w);
    getCenterStore(centerId).write(w);
    return adapter(centerId).requestAppointment(scoped(centerId), {
      ...values,
      patientId
    });
  }
  if (method === 'openPatientConversation') {
    if (!w.therapists.some(t => t.id === values.therapistId && t.status !== 'inactive')) throw new ServiceError('notFound');
    let c = w.conversations.find(c => c.patientId === patientId && c.therapistId === values.therapistId);
    if (!c) {
      ensurePatient(w);
      c = {
        id: crypto.randomUUID(),
        patientId,
        therapistId: values.therapistId,
        messages: [],
        unreadCount: 0
      };
      w.conversations.push(c);
      getCenterStore(centerId).write(w);
    }
    return {
      id: c.id
    };
  }
  throw new ServiceError('unavailable');
  function ensurePatient(w) {
    if (!w.patients.some(p => p.id === patientId)) w.patients.push({
      id: patientId,
      accountId: actor.id,
      name: typeof actor.name === 'object' ? actor.name : {
        en: actor.name,
        ar: actor.name
      },
      email: actor.email || '',
      ...patientProfile(actor, ids),
      phone: patientProfile(actor, ids).phone,
      birthDate: patientProfile(actor, ids).dateOfBirth,
      status: 'active',
      notes: []
    });
  }
}
