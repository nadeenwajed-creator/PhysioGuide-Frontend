import { mockAccounts } from '../auth/mockAccounts.js';
import { mockAccountStore } from '../mock/accountRepository.js';
import { getCenterStore, readMockCenter } from '../mock/centerRepository.js';
import { ServiceError } from '../api/serviceError.js';
import { patientIdentity } from './discoveryModel.js';
import { defaultPatientPreferences, preferenceKeys, profileErrors } from './accountModel.js';

export function patientProfile(actor, centerIds) {
  const record = centerIds.flatMap(id => readMockCenter(id).patients).find(p => p.id === patientIdentity(actor));
  const saved = (mockAccountStore.read() || []).find(a => a.id === actor.id && a.role === 'patient');
  const source = {
    ...record,
    ...saved?.profile
  };
  const gender = typeof source.gender === 'string' ? source.gender.toLowerCase() : '';
  const city = typeof source.city === 'string' ? source.city : source.city?.en || source.city?.ar || '';
  // Email is owned by authentication, never by a clinical contact record.
  return {
    name: source.name || actor.name,
    email: actor.email,
    phone: source.phone || '',
    imageUrl: source.imageUrl || '',
    dateOfBirth: source.dateOfBirth || source.birthDate || '',
    gender: ['male', 'female', 'other'].includes(gender) ? gender : '',
    city
  };
}

export function savePatientProfile(actor, values, centerIds) {
  const allowed = ['name', 'phone', 'dateOfBirth', 'gender', 'city', 'imageUrl'];
  if (!values || Object.keys(values).some(key => !allowed.includes(key))) throw new ServiceError('forbidden');
  const errors = profileErrors(values);
  if (Object.keys(errors).length) throw new ServiceError('validation', {
    fields: errors
  });
  const previous = patientProfile(actor, centerIds);
  const enteredName = values.name.trim();
  // Keep both name translations when only another field changes
  const name = typeof previous.name === 'object' ? Object.values(previous.name).includes(enteredName) ? previous.name : {
    ...previous.name,
    en: enteredName,
    ar: enteredName
  } : enteredName;
  const profile = {
    ...values,
    name,
    phone: values.phone.trim(),
    city: values.city.trim()
  };
  const accounts = mockAccountStore.read() || [];
  const account = accounts.find(a => a.id === actor.id) || mockAccounts.find(a => a.id === actor.id);
  if (!account || account.role !== 'patient') throw new ServiceError('forbidden');
  // Fresh synchronous writes preserve current messages/receipts; roll back if storage fails.
  // Real servers must perform these identity updates transactionally.
  const changed = [];
  try {
    for (const id of centerIds) {
      const workspace = readMockCenter(id);
      const patient = workspace.patients.find(p => p.id === patientIdentity(actor));
      if (!patient) continue;
      const store = getCenterStore(id),
        before = structuredClone(workspace);
      // Center clinical views use birthDate; Patient account views use dateOfBirth.
      // Keep both existing representations synchronized without losing notes.
      Object.assign(patient, profile, {
        birthDate: profile.dateOfBirth
      });
      store.write(workspace);
      changed.push({
        store,
        before
      });
    }
    const updated = {
      ...account,
      profile
    };
    mockAccountStore.write([...accounts.filter(a => a.id !== actor.id), updated]);
  } catch (error) {
    for (const { store, before } of changed.reverse()) store.write(before);
    throw error;
  }
  return {
    ...profile,
    email: actor.email
  };
}

export function savePatientPreferences(store, values) {
  if (!values || Object.keys(values).some(key => !preferenceKeys.includes(key))
    || preferenceKeys.some(key => typeof values[key] !== 'boolean')) throw new ServiceError('validation');
  store.write({
    ...store.read(),
    notificationPreferences: {
      ...defaultPatientPreferences,
      ...values
    }
  });
}
