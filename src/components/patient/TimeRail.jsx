import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faClock } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import { usePatientLabels } from './usePatientLabels.js';
import useVisibleItems from './useVisibleItems.js';
import { candidateTimes } from '../../services/patient/discoveryModel.js';

export default function TimeRail({ slots, hours, duration, date, value, onChange, loading }) {
  const { t, dir } = usePatientLabels();
  const ref = useRef(null),
    touch = useRef(null),
    swiped = useRef(false);
  const count = useVisibleItems(ref, 76, 7);
  const [offset, setOffset] = useState(0);
  // Show clinic-hour candidates, but only enable slots returned by availability
  const times = [...new Set([...candidateTimes(hours, duration, date), ...slots])].sort();
  // Keep the visible group inside the list when its size changes
  const start = Math.min(offset, Math.max(0, times.length - count));
  const move = delta => setOffset(Math.max(0, Math.min(times.length - count, start + delta)));
  return <div className="pd-time-rail" aria-busy={loading}>
    <div className="pd-time-navigation">
      <Button
        variant="ghost"
        iconOnly
        icon={dir === 'rtl' ? faChevronRight : faChevronLeft}
        aria-label={t('previousTimes')}
        disabled={start === 0}
        onClick={() => move(-count)}
      />
      <div
        ref={ref}
        className="pd-time-track"
        onClickCapture={event => {
          // Swiping through times should not also select a time
          if (swiped.current && event.detail) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerDown={event => {
          swiped.current = false;
          if (event.pointerType === 'touch') touch.current = event.clientX;
        }}
        onPointerUp={event => {
          if (touch.current !== null && Math.abs(event.clientX - touch.current) > 35) {
            swiped.current = true;
            // Move one visible group and reverse the direction in RTL
            move((event.clientX < touch.current ? count : -count) * (dir === 'rtl' ? -1 : 1));
          }
          touch.current = null;
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
      >
        {times.slice(start, start + count).map(time => <button
          type="button"
          key={time}
          className={`pd-time-marker ${value === time ? 'is-selected' : ''}`}
          disabled={loading || !slots.includes(time)}
          aria-pressed={value === time}
          aria-label={`${time} — ${t(slots.includes(time) ? 'slotAvailable' : 'slotUnavailable')}`}
          onClick={() => onChange(time)}
        >
          <span aria-hidden="true" />
          <bdi>{time}</bdi>
        </button>)}
      </div>
      <Button
        variant="ghost"
        iconOnly
        icon={dir === 'rtl' ? faChevronLeft : faChevronRight}
        aria-label={t('nextTimes')}
        disabled={start + count >= times.length}
        onClick={() => move(count)}
      />
    </div>
    <div className="pd-time-legend">
      <span>
        <i />
        {t('slotAvailable')}
      </span>
      <span>
        <i className="is-unavailable" />
        {t('slotUnavailable')}
      </span>
      {Number.isFinite(duration) && <span>
        <FontAwesomeIcon icon={faClock} aria-hidden="true" />
        {t('sessionDuration', {
          count: duration
        })}
      </span>}
    </div>
  </div>;
}
