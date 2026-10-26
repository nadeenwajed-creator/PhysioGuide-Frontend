import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getPatientAccount, subscribePatientAccount } from '../../services/patientAccountService.js';
import { getPatientAppointments } from '../../services/patientDiscoveryService.js';
import { localized } from '../../utils/centerFormat.js';

export default function usePatientAccount() {
  const { session: actor } = useAuth();
  const { t, language, dir } = useLanguage();
  const [state, setState] = useState({
    data: null,
    error: null
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true,
      request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const [account, appointments] = await Promise.all([getPatientAccount(actor), getPatientAppointments(actor)]);
        if (active && current === request) setState({
          data: {
            ...account,
            appointments
          },
          error: null,
          actorId: actor.id
        });
      } catch (error) {
        if (active && current === request) setState({
          data: null,
          error,
          actorId: actor.id
        });
      }
    };
    load();
    const unsubscribe = subscribePatientAccount(load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', load);
    };
  }, [actor, retry]);
  return {
    ...state,
    data: state.actorId === actor.id ? state.data : null,
    error: state.actorId === actor.id ? state.error : null,
    actor,
    language,
    dir,
    name: value => localized(value, language),
    tr: (key, vars) => t(`patientAccount.${key}`, vars),
    common: (key, vars) => t(`center.${key}`, vars),
    retry: () => setRetry(n => n + 1)
  };
}
