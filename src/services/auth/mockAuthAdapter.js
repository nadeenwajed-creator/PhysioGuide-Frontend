import { AuthServiceError } from './authErrors.js';
import { MOCK_PASSWORD, MOCK_CENTER_ID, mockAccounts } from './mockAccounts.js';

// Account metadata and an expiring test-session marker are persisted; passwords never are.
export function createMockAuthAdapter({ delay = 200, failure = null, accountStore, sessionStore, getTherapists = () => [], getCenter = () => null, activateCenter = () => {}, now = () => Date.now() } = {}) {
  let accounts = [];
  let session = null;
  const readAccounts = () => accountStore?.read() || accounts;
  function allAccounts() {
    return [...mockAccounts, ...readAccounts(), ...getTherapists().map(person => ({
      id: `staff:${person.id}`, role: 'physiotherapist', therapistId: person.id,
      centerId: person.centerId || MOCK_CENTER_ID, name: person.name, email: person.email,
      status: person.accountStatus || 'active',
    }))];
  }
  async function wait() {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (failure) throw new AuthServiceError(failure);
  }
  function identity(account) {
    const { id, role, centerId, therapistId, patientId, name, email } = account;
    const profile = role === 'center' && centerId ? getCenter(centerId) : null;
    return { id, role, centerId, therapistId, patientId, name: profile?.name || name, email };
  }
  async function login(credentials, roles) {
    await wait();
    const account = allAccounts().find(item => item.email.toLowerCase() === credentials.email.trim().toLowerCase() && roles.includes(item.role));
    if (!account || credentials.password !== MOCK_PASSWORD) throw new AuthServiceError('invalidCredentials');
    if (account.status === 'pending') throw new AuthServiceError('accountPending');
    if (account.status === 'rejected') throw new AuthServiceError('accountRejected');
    if (!['active', 'approved'].includes(account.status)) throw new AuthServiceError('invalidCredentials');
    const marker = { accountId: account.id, expiresAt: now() + 12 * 60 * 60 * 1000 };
    sessionStore?.write(marker);
    session = marker;
    return { mode: 'mock', status: 'authenticated', role: account.role, session: identity(account) };
  }
  async function register(values, role) {
    await wait();
    const email = values.email.trim().toLowerCase();
    if (allAccounts().some(item => item.email.toLowerCase() === email)) throw new AuthServiceError('duplicateEmail', { email: 'invalid' });
    const name = role === 'center' ? values.centerName : values.fullName;
    if (!name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !values.password || values.password.length < 8) throw new AuthServiceError('validation');
    const id = crypto.randomUUID();
    const account = { id, role, name: name.trim(), email, status: role === 'center' ? 'pending' : 'active' };
    if (role === 'center') {
      if (!values.phone?.trim() || !values.location?.address?.trim()) throw new AuthServiceError('validation');
      const coordinates = values.location.coordinates;
      if (coordinates && (!Number.isFinite(coordinates.latitude) || Math.abs(coordinates.latitude) > 90 || !Number.isFinite(coordinates.longitude) || Math.abs(coordinates.longitude) > 180)) throw new AuthServiceError('validation');
      Object.assign(account, {
        centerId: `center-${id}`, approvalStatus: 'pending', submittedAt: new Date(now()).toISOString(),
        phone: values.phone.trim(), location: { address: values.location.address.trim(), coordinates: coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : null },
      });
    }
    const next = [...readAccounts(), account];
    accountStore?.write(next);
    accounts = next;
    return { mode: 'mock', status: role === 'center' ? 'pending-review' : 'registered', role, ...(role === 'center' ? { applicationId: id } : {}) };
  }

  function requireAdmin(actor) {
    // Mock role checks are test behavior; the real API must authorize its own session.
    if (actor?.role !== 'admin') throw new AuthServiceError('forbidden');
  }
  function application(id) {
    const record = readAccounts().find(item => item.role === 'center' && item.id === id);
    if (!record) throw new AuthServiceError('notFound');
    return record;
  }
  async function review({ actor, id, decision, reason = '' }) {
    await wait();
    requireAdmin(actor);
    if (!['approved', 'rejected'].includes(decision)) throw new AuthServiceError('validation');
    const record = application(id);
    if (record.status !== 'pending') throw new AuthServiceError('conflict');
    const updated = { ...record, centerId: record.centerId || `center-${record.id}`, status: decision, approvalStatus: decision, reviewedAt: new Date(now()).toISOString(), reviewReason: String(reason).trim() };
    if (decision === 'approved') await activateCenter(updated);
    if (application(id).status !== 'pending') throw new AuthServiceError('conflict');
    const next = readAccounts().map(item => item.id === id ? updated : item);
    accountStore?.write(next);
    accounts = next;
    return structuredClone(updated);
  }

  return {
    mode: 'mock',
    loginPatient: credentials => login(credentials, ['patient']),
    loginCenter: credentials => login(credentials, ['center', 'physiotherapist']),
    registerPatient: values => register(values, 'patient'),
    registerCenter: values => register(values, 'center'),
    async listCenterApplications({ actor, status } = {}) {
      await wait(); requireAdmin(actor);
      if (status && !['pending', 'approved', 'rejected'].includes(status)) throw new AuthServiceError('validation');
      return structuredClone(readAccounts().filter(item => item.role === 'center' && (!status || item.status === status)));
    },
    async getCenterApplication({ actor, id }) { await wait(); requireAdmin(actor); return structuredClone(application(id)); },
    reviewCenterApplication: review,
    async restoreSession() {
      const marker = sessionStore ? sessionStore.read() : session;
      if (!marker || marker.expiresAt <= now()) return null;
      const account = allAccounts().find(item => item.id === marker.accountId && ['active', 'approved'].includes(item.status));
      return account ? identity(account) : null;
    },
    async logout() {
      sessionStore?.remove();
      session = null;
    },
  };
}
