import { useEffect, useReducer, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faCalendarDays,
  faCheck,
  faCircleInfo,
  faClock,
  faWaveSquare,
  faBolt,
  faFire,
  faPersonWalking,
  faEllipsis,
  faBan,
  faBandage,
  faBriefcaseMedical,
  faCrosshairs,
  faGrip,
  faHand,
  faPerson
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import BodyMap from '../../components/patient/pain-assessment/BodyMap.jsx';
import PainTexture from '../../components/patient/pain-assessment/PainTexture.jsx';
import AssessmentResult from '../../components/patient/pain-assessment/AssessmentResult.jsx';
import {
  initialAssessment,
  assessmentReducer,
  painAreas,
  durations,
  descriptions,
  histories,
  validStep,
  completeAssessment,
  intensityBand,
  suggestCare
} from '../../services/patient/painAssessmentModel.js';
import '../../components/patient/PatientDiscovery.css';
import '../../components/patient/pain-assessment/PainAssessment.css';

const descriptionIcons = [faWaveSquare, faGrip, faBolt, faFire, faCrosshairs, faPersonWalking, faEllipsis];
const historyIcons = [faBan, faBandage, faBriefcaseMedical, faPersonWalking];
const areaIcons = [faPerson, faPerson, faPerson, faPerson, faHand, faPerson, faPersonWalking, faPersonWalking];

// Reuse the same choice card for single and multiple answers
function Choice({
  name,
  value,
  selected,
  onChange,
  title,
  helper,
  icon,
  multiple = false
}) {
  return <label className={`pain-choice${selected ? ' is-selected' : ''}`}>
    <input
      type={multiple ? 'checkbox' : 'radio'}
      name={name}
      value={value}
      checked={selected}
      onChange={onChange}
    />
    <span className="pain-choice-icon" aria-hidden="true">
      <FontAwesomeIcon icon={icon} />
    </span>
    <span className="pain-choice-copy">
      <strong>{title}</strong>
      {helper && <small>{helper}</small>}
    </span>
    <span className="pain-choice-check" aria-hidden="true">
      {selected && <FontAwesomeIcon icon={faCheck} />}
    </span>
  </label>;
}

function Intensity({ value, onChange, t, dir }) {
  const band = intensityBand(value);
  // Draw an unset slider at zero while keeping it different from an answered zero
  // Pointer and keyboard handlers also let the patient choose that initial zero
  const shown = value ?? 0;
  return <div className="pain-intensity-visual">
    <div
      className="pain-gauge"
      style={{
        '--pain-angle': `${shown * 36}deg`
      }}
    >
      <div className="pain-gauge-inner" aria-live="polite">
        <strong>{value ?? '—'}</strong>
        <span>
          {band ? t(`band.${band}`) : t('intensityUnset')}
        </span>
      </div>
    </div>
    <div className="pain-slider" dir="ltr">
      {value !== null && <output
        className="pain-slider-value"
        htmlFor="pain-intensity"
        style={{
          left: `calc(12px + (100% - 24px) * ${shown / 10})`
        }}
    >{value}</output>}
      <input
        id="pain-intensity"
        type="range"
        min="0"
        max="10"
        step="1"
        value={shown}
        aria-label={t('intensityLabel')}
        aria-valuetext={value === null ? t('intensityUnset') : `${value}: ${t(`band.${band}`)}`}
        aria-describedby="pain-intensity-help"
        onChange={event => onChange(Number(event.target.value))}
        onPointerUp={event => onChange(Number(event.currentTarget.value))}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' ', 'Enter'].includes(event.key)) onChange(Number(event.currentTarget.value));
        }}
        style={{
          '--pain-fill': `${shown * 10}%`
        }}
      />
      <div className="pain-slider-ends">
        <span>0</span>
        <span>10</span>
      </div>
    </div>
    <p className="pain-info" id="pain-intensity-help" dir={dir}>
      <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
      {t('intensityHelp')}
    </p>
  </div>;
}

function DurationRings({ value, t }) {
  return <div className="pain-duration-visual">
    <div className="pain-rings" aria-hidden="true">
      {[...durations].reverse().map((id, index) => <div
        key={id}
        className={`pain-ring${value === id ? ' is-selected' : ''}`}
        style={{
          '--pain-ring-size': `${100 - index * 15}%`,
          '--pain-ring-level': index
        }}
      >
        <span>
          {t(`duration.${id}`)}
        </span>
      </div>)}
      <span className="pain-rings-icon">
        <FontAwesomeIcon icon={faCalendarDays} />
      </span>
    </div>
    <div className="pain-info pain-duration-summary" aria-live="polite">
      <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
      <div>
        <strong>
          {value ? t('selectedDuration', {
            value: t(`duration.${value}`)
          }) : t('durationUnset')}
        </strong>
        {value && <p>
          {t(`durationHelp.${value}`)}
        </p>}
      </div>
    </div>
  </div>;
}

function AssessmentContext({ state, t }) {
  return <section className="pain-context" aria-labelledby="pain-context-title">
    <div className="pain-context-heading">
      <span className="pain-choice-icon" aria-hidden="true">
        <FontAwesomeIcon icon={faClock} />
      </span>
      <div>
        <h2 id="pain-context-title">{t('context')}</h2>
        <p>{t('contextHelp')}</p>
      </div>
    </div>
    <div className="pain-context-card">
      <div>
        <small>
          {t('reportedArea')}
        </small>
        <ul>
          {state.painAreas.map(id => <li key={id}>
            {t(`area.${id}`)}
          </li>)}
        </ul>
        <p>{t('fromQ1')}</p>
      </div>
      <BodyMap selected={state.painAreas} t={t} miniature />
    </div>
    {state.relatedHistory && state.relatedHistory !== 'none' && <div className="pain-context-card" aria-live="polite">
      <div>
        <small>
          {t('relatedHistory')}
        </small>
        <h3>
          {t(`history.${state.relatedHistory}`)}
        </h3>
        <p>{t('fromQ5')}</p>
      </div>
      <span className="pain-history-icon" aria-hidden="true">
        <FontAwesomeIcon icon={historyIcons[histories.indexOf(state.relatedHistory)]} />
      </span>
    </div>}
    <p className="pain-info">
      <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
      {t('contextNote')}
    </p>
  </section>;
}

export default function PainAssessment() {
  const { t: translate, dir } = useLanguage();
  const t = (key, vars) => translate(`painAssessment.${key}`, vars);
  // Keep answers and step navigation together in the assessment reducer
  const [state, dispatch] = useReducer(assessmentReducer, undefined, initialAssessment);
  const [moreHelp, setMoreHelp] = useState(false);
  const heading = useRef(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // Focus the new question or result after navigation, but skip the initial load
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus({
      preventScroll: true
    });
    heading.current?.scrollIntoView({
      block: 'start',
      behavior: 'instant'
    });
  }, [state.step, state.view]);
  const send = (type, id) => dispatch({
    type,
    id
  });
  const band = intensityBand(state.intensity);
  // Validate this step on Next, and all answers before showing the result
  const canContinue = state.step === 5 ? completeAssessment(state) : validStep(state);
  if (state.view === 'result') return <div className="pain-page" dir={dir}>
    <AssessmentResult
      care={suggestCare(state)}
      t={t}
      headingRef={heading}
      onRestart={() => {
        setMoreHelp(false);
        dispatch({
          type: 'reset'
        });
      }}
    />
  </div>;
  return <div className="pain-page" dir={dir}>
    <section className={`pain-wizard pain-step-${state.step}`} aria-labelledby="pain-question-title">
      <header className="pain-progress-header">
        <span className="pain-wizard-label">{t('title')}</span>
        <progress max="5" value={state.step} aria-label={t('progress')} />
        <span className="pain-step-count" dir="ltr">{state.step} / 5</span>
      </header>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (canContinue) dispatch({
            type: state.step === 5 ? 'complete' : 'next'
          });
        }}
      >
        <div className="pain-columns">
          <div className="pain-question">
            <p className="pain-eyebrow">
              {t('question', {
                step: state.step
              })}
            </p>
            <h1 id="pain-question-title" tabIndex={-1} ref={heading}>
              {t(`q${state.step}.title`)}
            </h1>
            <p id="pain-question-help" className="pain-question-help">
              {t(`q${state.step}.help`)}
            </p>
            <fieldset className="pain-choices" aria-describedby="pain-question-help">
              <legend className="pain-sr-only">
                {t(`q${state.step}.title`)}
              </legend>
              {state.step === 1 && <>
                {painAreas.map((id, index) => <Choice
                  key={id}
                  name="painAreas"
                  value={id}
                  multiple
                  selected={state.painAreas.includes(id)}
                  onChange={() => send('area', id)}
                  title={t(`area.${id}`)}
                  icon={areaIcons[index]}
                />)}
                <button
                  type="button"
                  className={`pain-choice${state.painAreas.length > 1 ? ' is-selected' : ''}`}
                  onClick={() => setMoreHelp(true)}
                  aria-describedby={moreHelp ? 'pain-more-help' : undefined}
                >
                  <span className="pain-choice-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faGrip} />
                  </span>
                  <span className="pain-choice-copy">{t('moreAreas')}</span>
                  <span className="pain-choice-check" aria-hidden="true">
                    {state.painAreas.length > 1 && <FontAwesomeIcon icon={faCheck} />}
                  </span>
                </button>
                {moreHelp && <p id="pain-more-help" className="pain-caption" role="status">{t('moreHelp')}</p>}
              </>}
              {state.step === 2 && <div className="pain-bands" aria-live="polite">
                {[['none', '0'], ['mild', '1–3'], ['moderate', '4–6'], ['severe', '7–10']].map(([id, range]) => <div key={id} className={`pain-choice${band === id ? ' is-selected' : ''}`}>
                  <span className="pain-band-range" dir="ltr">{range}</span>
                  <strong className="pain-choice-copy">
                    {t(`band.${id}`)}
                  </strong>
                  <span className="pain-choice-check" aria-hidden="true">
                    {band === id && <FontAwesomeIcon icon={faCheck} />}
                  </span>
                </div>)}
              </div>}
              {state.step === 3
                && durations.map(id => <Choice
                key={id}
                name="duration"
                value={id}
                selected={state.duration === id}
                onChange={() => send('duration', id)}
                title={t(`duration.${id}`)}
                helper={t(`durationHelp.${id}`)}
                icon={faCalendarDays}
              />)}
              {state.step === 4
                && descriptions.map((id, index) => <Choice
                key={id}
                name="descriptions"
                value={id}
                multiple
                selected={state.descriptions.includes(id)}
                onChange={() => send('description', id)}
                title={t(`description.${id}`)}
                icon={descriptionIcons[index]}
              />)}
              {state.step === 5
                && histories.map((id, index) => <Choice
                key={id}
                name="relatedHistory"
                value={id}
                selected={state.relatedHistory === id}
                onChange={() => send('history', id)}
                title={t(`history.${id}`)}
                helper={t(`historyHelp.${id}`)}
                icon={historyIcons[index]}
              />)}
            </fieldset>
          </div>
          <div className="pain-visual">
            {state.step === 1 && <BodyMap selected={state.painAreas} onToggle={id => send('area', id)} t={t} />}
            {state.step === 2 && <Intensity
              value={state.intensity}
              onChange={value => dispatch({
                type: 'intensity',
                value
              })}
              t={t}
              dir={dir}
            />}
            {state.step === 3 && <DurationRings value={state.duration} t={t} />}
            {state.step === 4 && <PainTexture
              selected={state.descriptions}
              preview={state.q4PreviewType}
              onPreview={id => send('preview', id)}
              t={t}
            />}
            {state.step === 5 && <AssessmentContext state={state} t={t} />}
          </div>
        </div>
        <footer className="pain-navigation">
          <Button
            variant="outline"
            icon={dir === 'rtl' ? faArrowRight : faArrowLeft}
            disabled={state.step === 1}
            onClick={() => dispatch({
              type: 'back'
            })}
          >
            {t('back')}
          </Button>
          <span id="pain-validation" className="pain-validation">{!canContinue && t('required')}</span>
          <Button
            type="submit"
            disabled={!canContinue}
            aria-describedby={!canContinue ? 'pain-validation' : undefined}
        >{t(state.step === 5 ? 'complete' : 'next')} <FontAwesomeIcon className="pain-next-arrow" icon={dir === 'rtl' ? faArrowLeft : faArrowRight} /></Button>
        </footer>
      </form>
    </section>
  </div>;
}
