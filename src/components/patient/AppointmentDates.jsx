import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import useVisibleItems from './useVisibleItems.js';
import Button from '../shared/Button/Button.jsx';
import { usePatientLabels } from './usePatientLabels.js';

// Build the date from local parts so UTC conversion does not shift the day
function localDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export default function AppointmentDates({ value, onChange }) {
  const { t, language, dir } = usePatientLabels();
  const ref = useRef(null);
  const count = useVisibleItems(ref, 55, 5);
  const [page, setPage] = useState(null);
  const today = new Date();
  const chosen = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : today;
  // Compare calendar days without daylight-saving changes affecting the gap
  const daysFromToday = Math.max(0, Math.round((Date.UTC(chosen.getFullYear(), chosen.getMonth(), chosen.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000));
  // Start with the selected date's page until the patient browses manually
  const offset = page ?? Math.floor(daysFromToday / count) * count;
  const dates = Array.from({
    length: count
  }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + index);
    return date;
  });
  return <div className="pd-date-selection">
    <div className="pd-date-picker-row">
      <label className="pd-calendar-button">
        <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
        <input
          type="date"
          min={localDate(today)}
          value={value}
          aria-label={t('pickDate')}
          onChange={event => {
            // Bring the strip back to the date picked from the calendar
            setPage(null);
            onChange(event.target.value);
          }}
        />
      </label>
    </div>
    <div className="pd-date-strip" aria-label={t('date')}>
      <Button
        variant="ghost"
        disabled={offset === 0}
        aria-label={t('previousDates')}
        onClick={() => setPage(Math.max(0, offset - count))}
      >
        {dir === 'rtl' ? '›' : '‹'}
      </Button>
      <div className="pd-date-days" ref={ref}>
        {dates.map(date => <Button
          key={localDate(date)}
          variant={value === localDate(date) ? 'primary' : 'outline'}
          aria-pressed={value === localDate(date)}
          onClick={() => onChange(localDate(date))}
        >
          <span>
            {new Intl.DateTimeFormat(language, {
              weekday: 'short'
            }).format(date)}
          </span>
          <strong>
            {new Intl.DateTimeFormat(language, {
              day: 'numeric',
              month: 'short'
            }).format(date)}
          </strong>
        </Button>)}
      </div>
      <Button variant="ghost" aria-label={t('nextDates')} onClick={() => setPage(offset + count)}>
        {dir === 'rtl' ? '‹' : '›'}
      </Button>
    </div>
  </div>;
}
