import { useEffect, useState } from 'react';
import { getPatientSlots } from '../../services/patientDiscoveryService.js';

export default function usePatientAvailability(actor, { centerId, therapistId, serviceId, date }, revision, onResolved) {
  const [result, setResult] = useState(null);
  const key = JSON.stringify([actor.id, centerId, therapistId, serviceId, date]);
  const enabled = Boolean(centerId && therapistId && serviceId && date);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getPatientSlots(actor, {
      centerId,
      therapistId,
      serviceId,
      date
    }).then(slots => {
      if (!Array.isArray(slots) || slots.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Invalid availability response');
      if (live) {
        onResolved?.(slots);
        setResult({
          key,
          revision,
          slots,
          error: false
        });
      }
    }).catch(() => {
      if (live) {
        onResolved?.([]);
        setResult({
          key,
          revision,
          slots: [],
          error: true
        });
      }
    });
    return () => {
      live = false;
    };
  }, [actor, centerId, therapistId, serviceId, date, revision, onResolved, key, enabled]);
  const current = enabled && result?.key === key && result.revision === revision;
  return {
    slots: current ? result.slots : [],
    loading: enabled && !current,
    error: current && result.error
  };
}
