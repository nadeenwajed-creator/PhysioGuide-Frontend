import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getPatientDiscovery, subscribePatientDiscovery } from '../../services/patientDiscoveryService.js';

export default function useDiscovery() {
  const { session: actor } = useAuth();
  const [state, setState] = useState({
    data: null,
    error: null
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    let request = 0;
    const refresh = async () => {
      const id = ++request;
      try {
        const data = await getPatientDiscovery(actor);
        if (live && id === request) setState({
          data,
          error: null,
          actorId: actor.id
        });
      } catch (error) {
        if (live && id === request) setState({
          data: null,
          error,
          actorId: actor.id
        });
      }
    };
    refresh();
    const stop = subscribePatientDiscovery(refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      live = false;
      stop();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [actor, retry]);
  return {
    ...state,
    data: state.actorId === actor.id ? state.data : null,
    error: state.actorId === actor.id ? state.error : null,
    actor,
    retry: () => setRetry(n => n + 1)
  };
}
