import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getPatientDiscovery,
  getPatientSavedCenters,
  subscribePatientDiscovery
} from '../../services/patientDiscoveryService.js';

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
        // Favourites come from the patient's own rows; a list that loads
        // without them is still usable, so that call may fail quietly.
        const [data, favoriteIds] = await Promise.all([
          getPatientDiscovery(actor),
          getPatientSavedCenters(actor).catch(() => [])
        ]);
        if (live && id === request) setState({
          data: {
            ...data,
            favoriteIds: Array.isArray(favoriteIds) ? favoriteIds : data?.favoriteIds || []
          },
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
