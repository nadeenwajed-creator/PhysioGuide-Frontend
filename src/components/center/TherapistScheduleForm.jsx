import { useEffect, useState } from 'react';
import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import { Feedback } from './CenterUI.jsx';
import useCenter from './useCenter.js';
import { callCenter } from '../../services/centerPortalService.js';

// The centre week runs Saturday to Thursday, with Friday shown last.
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// One row per day: days without a stored window start as a day off, and the
// window's id travels along so saving can send a diff to the API.
function rowsFromWindows(windows) {
  return DAY_ORDER.map((day) => {
    const window = windows.find((item) => Number(item.day) === day);
    return {
      day,
      id: window?.id ?? null,
      on: Boolean(window),
      start: window?.start || '09:00',
      end: window?.end || '16:00',
    };
  });
}

function TherapistScheduleForm({ therapist, onClose }) {
  const { actor, tr, name, dir, notify } = useCenter();
  const [rows, setRows] = useState([]);
  const [previous, setPrevious] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  useEffect(() => {
    let alive = true;
    callCenter('getTherapistSchedule', actor, therapist.id)
      .then((windows) => {
        if (!alive) return;
        setPrevious(windows);
        setRows(rowsFromWindows(windows));
        setLoading(false);
      })
      .catch((failure) => {
        if (!alive) return;
        setError(failure.code || 'network');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [actor, therapist.id]);

  function update(day, patch) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, ...patch } : row)));
    setFields((current) => {
      if (!current[day]) return current;
      const next = { ...current };
      delete next[day];
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || loading) return;
    // Day-level checks run before the request so a typo never reaches the API.
    const nextFields = {};
    for (const row of rows) {
      if (!row.on) continue;
      if (!TIME_PATTERN.test(row.start) || !TIME_PATTERN.test(row.end) || row.start >= row.end) {
        nextFields[row.day] = 'timeOrder';
      }
    }
    if (Object.keys(nextFields).length) {
      setFields(nextFields);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const desired = rows
        .filter((row) => row.on)
        .map((row) => ({
          id: row.id,
          day: row.day,
          start: row.start,
          end: row.end,
          isAvailable: true,
        }));
      await callCenter('saveTherapistSchedule', actor, therapist.id, desired, previous);
      notify(tr('saved'));
      onClose();
    } catch (failure) {
      // 409 means an appointment or window would be orphaned; 400 covers
      // windows outside the centre's working hours for that day.
      setError(failure.code === 'conflict'
        ? 'scheduleConflict'
        : failure.code === 'validation'
          ? 'outsideHours'
          : (failure.code || 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      className="center-modal"
      isOpen
      title={`${tr('workingHours')} · ${name(therapist.name)}`}
      dir={dir}
      size="lg"
      onClose={busy ? undefined : onClose}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>{tr('cancel')}</Button>
          <Button type="submit" form="center-schedule-form" loading={busy} disabled={loading}>{tr('save')}</Button>
        </>
      )}
    >
      <form id="center-schedule-form" onSubmit={submit} noValidate>
        <p className="center-form-help">{tr('workingHoursHelp')}</p>
        <ul className="center-schedule-days">
          {rows.map((row) => (
            <li key={row.day} className="center-schedule-day" data-off={row.on ? undefined : 'true'}>
              <label className="remaining-check center-schedule-day__toggle">
                <input
                  type="checkbox"
                  checked={row.on}
                  disabled={busy || loading}
                  onChange={(event) => update(row.day, { on: event.target.checked })}
                />
                <span>{tr(`day.${DAY_KEYS[row.day]}`)}</span>
              </label>
              <div className="center-schedule-day__times">
                {row.on ? (
                  <>
                    <label>
                      <span>{tr('startTime')}</span>
                      <input
                        type="time"
                        value={row.start}
                        disabled={busy || loading}
                        onChange={(event) => update(row.day, { start: event.target.value })}
                      />
                    </label>
                    <span aria-hidden="true">–</span>
                    <label>
                      <span>{tr('endTime')}</span>
                      <input
                        type="time"
                        value={row.end}
                        disabled={busy || loading}
                        onChange={(event) => update(row.day, { end: event.target.value })}
                      />
                    </label>
                  </>
                ) : (
                  <em>{tr('dayOff')}</em>
                )}
                {fields[row.day] && (
                  <p className="center-schedule-day__error">{tr(`error.${fields[row.day]}`)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Feedback error>{error && tr(`error.${error}`)}</Feedback>
      </form>
    </Modal>
  );
}

export default TherapistScheduleForm;
