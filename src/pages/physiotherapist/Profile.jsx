import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faBriefcase,
  faCamera,
  faHospital,
  faAward,
  faLayerGroup,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import FormField from '../../components/shared/FormField/FormField.jsx';
import {
  PageHeader,
  Feedback,
  RecordImage,
  RecordStatus,
  EmptyState,
} from '../../components/center/CenterUI.jsx';
import useCenter from '../../components/center/useCenter.js';
import useUnsavedChanges from '../../components/center/useUnsavedChanges.js';
import { prepareCenterImage } from '../../services/centerPortalService.js';
import { saveOwnTherapistProfile } from '../../services/therapistService.js';
import { money } from '../../utils/centerFormat.js';
import './Profile.css';

const personalValues = (person) => ({
  name: person.name?.en || '',
  nameAr: person.name?.ar || '',
  phone: person.phone || '',
  about: person.about?.en || '',
  aboutAr: person.about?.ar || '',
  imageUrl: person.imageUrl || '',
});

function ProfileContent({ person }) {
  const { data, actor, name, tr, language, dir } = useCenter();
  const text = (key, variables) => tr(`therapistProfile.${key}`, variables);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'professional' ? 'professional' : 'personal';
  function setTab(value) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', value);
      return next;
    }, { replace: true, preventScrollReset: true });
  }
  const [saved, setSaved] = useState(() => personalValues(person));
  const [draft, setDraft] = useState(saved);
  const [observed, setObserved] = useState(() => JSON.stringify(saved));
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [feedback, setFeedback] = useState(null);
  const uploadRef = useRef(null);
  const tabsRef = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const current = personalValues(person);
  // External updates refresh a clean form without discarding an unsaved draft.
  if (JSON.stringify(current) !== observed) {
    setObserved(JSON.stringify(current));
    if (!dirty) {
      setSaved(current);
      setDraft(current);
    }
  }
  useUnsavedChanges(dirty, tr('remaining.unsavedWarning'));
  useEffect(() => {
    const first = Object.keys(fields).find(key => fields[key]);
    if (!busy && first) document.getElementById(`therapist-${first}`)?.focus();
  }, [fields, busy]);

  function change(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [key]: undefined }));
    setFeedback(null);
  }
  function discard() {
    const latest = personalValues(person);
    setDraft(latest);
    setSaved(latest);
    setFields({});
    setFeedback(null);
  }
  async function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      change('imageUrl', await prepareCenterImage(file));
    } catch (error) {
      setFeedback({ error: true, message: tr(`error.${error.code || 'image'}`) });
    } finally {
      setBusy(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    setBusy(true);
    setFields({});
    setFeedback(null);
    try {
      await saveOwnTherapistProfile(actor, draft);
      // The workspace subscription supplies the saved record, including API-mode responses.
      setSaved(draft);
      setFeedback({ message: tr('saved') });
    } catch (error) {
      setFields(error.fields || {});
      setFeedback({ error: true, message: tr(`error.${error.code || 'network'}`) });
    } finally {
      setBusy(false);
    }
  }
  function field(key, options = {}) {
    return (
      <FormField
        id={`therapist-${key}`}
        label={tr(key)}
        value={draft[key]}
        onChange={(value) => change(key, value)}
        disabled={busy}
        error={fields[key] ? tr(`error.${fields[key]}`) : undefined}
        {...options}
      />
    );
  }
  function tabKeys(event) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 'personal'
        : event.key === 'End'
          ? 'professional'
          : tab === 'personal'
            ? 'professional'
            : 'personal';
    setTab(next);
    tabsRef.current.querySelector(`#therapist-tab-${next}`)?.focus();
  }
  const number = (value) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat(language).format(value)
      : text('notAvailable');
  const indicators = [
    [faBriefcase, person.experience, 'experience'],
    [faLayerGroup, person.completedSessions, 'sessions'],
    [faStar, person.rating > 0 ? person.rating : null, 'rating'],
  ];
  const details = [
    [faHospital, text('center'), name(data.center.name)],
    [faAward, text('specialty'), name(person.specialty)],
    [
      faBriefcase,
      tr('experience'),
      Number.isFinite(person.experience)
        ? tr('years', { count: person.experience })
        : text('notAvailable'),
    ],
    [null, tr('availability'), <RecordStatus key="status" value={person.availability} />],
  ];

  return (
    <div className="therapist-profile" dir={dir}>
      <PageHeader title={text('profile')} description={text('description')} />
      <div className="therapist-profile__layout">
        {/* The identity card stays in place when switching tabs. */}
        <aside className="center-panel therapist-profile__identity">
          <div className="therapist-profile__photo">
            <Avatar src={draft.imageUrl} name={name(person.name)} size="lg" />
            <Button
              className="therapist-profile__camera"
              variant="outline"
              icon={faCamera}
              iconOnly
              aria-label={text('changePhoto')}
              disabled={busy}
              onClick={() => {
                setTab('personal');
                uploadRef.current.click();
              }}
            />
            <input
              ref={uploadRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseImage}
            />
          </div>
          <h2>{name(person.name)}</h2>
          <p className="therapist-profile__role">{text('role')}</p>
          <div className="therapist-profile__summary-line">
            <FontAwesomeIcon icon={faHospital} aria-hidden="true" />
            <div>
              <strong>{name(data.center.name)}</strong>
              <span>{text('centerType')}</span>
            </div>
          </div>
          <div className="therapist-profile__summary-line">
            <FontAwesomeIcon icon={faAward} aria-hidden="true" />
            <div>
              <strong>{name(person.specialty) || text('notAvailable')}</strong>
              <span>{text('specialty')}</span>
            </div>
          </div>
          <dl className="therapist-profile__metrics">
            {indicators.map(([icon, value, label]) => (
              <div key={label}>
                <dt>
                  <FontAwesomeIcon icon={icon} aria-hidden="true" />
                  <span>{label === 'rating' ? text('rating') : tr(label)}</span>
                </dt>
                <dd>{number(value)}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <section className="center-panel therapist-profile__content">
          <div
            className="therapist-profile__tabs"
            role="tablist"
            aria-label={text('profile')}
            ref={tabsRef}
            onKeyDown={tabKeys}
          >
            {['personal', 'professional'].map((value, index) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`therapist-tab-${value}`}
                aria-controls={`therapist-panel-${value}`}
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
              >
                <FontAwesomeIcon icon={index ? faBriefcase : faUser} aria-hidden="true" />
                {text(value)}
              </button>
            ))}
          </div>

          <div
            id="therapist-panel-personal"
            role="tabpanel"
            aria-labelledby="therapist-tab-personal"
            hidden={tab !== 'personal'}
          >
            <h2>{text('personal')}</h2>
            <p className="therapist-profile__help">{text('personalHelp')}</p>
            <form onSubmit={save} noValidate>
              <div className="therapist-profile__fields">
                {field('name', { required: true, dir: 'ltr' })}
                {field('nameAr', { dir: 'rtl' })}
                {field('phone', { type: 'tel', required: true, dir: 'ltr' })}
                <FormField
                  id="therapist-email"
                  label={tr('email')}
                  value={person.email}
                  readOnly
                  dir="ltr"
                  helperText={text('readOnly')}
                />
                <div className="therapist-profile__bio">
                  {field('about', {
                    label: text('about'),
                    as: 'textarea',
                    rows: 3,
                    dir: 'ltr',
                    helperText: `${draft.about.length}/500`,
                  })}
                </div>
                <div className="therapist-profile__bio">
                  {field('aboutAr', {
                    label: text('aboutAr'),
                    as: 'textarea',
                    rows: 3,
                    dir: 'rtl',
                    helperText: `${draft.aboutAr.length}/500`,
                  })}
                </div>
              </div>
              <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.message}</Feedback>
              <div className="therapist-profile__actions">
                <Button variant="outline" disabled={!dirty || busy} onClick={discard}>
                  {tr('remaining.discardChanges')}
                </Button>
                <Button type="submit" loading={busy} disabled={!dirty}>
                  {tr('saveChanges')}
                </Button>
              </div>
            </form>
          </div>

          <div
            id="therapist-panel-professional"
            role="tabpanel"
            aria-labelledby="therapist-tab-professional"
            hidden={tab !== 'professional'}
          >
            <h2>{text('professional')}</h2>
            <p className="therapist-profile__help">{text('professionalHelp')}</p>
            <dl className="therapist-profile__professional">
              {details.map(([icon, label, value]) => (
                <div key={label}>
                  <span
                    className={`therapist-profile__info-icon${icon ? '' : ' therapist-profile__availability'}`}
                    aria-hidden="true"
                  >
                    {icon ? (
                      <FontAwesomeIcon icon={icon} />
                    ) : (
                      <span data-status={person.availability} />
                    )}
                  </span>
                  <div>
                    <dt>{label}</dt>
                    <dd>{value || text('notAvailable')}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="therapist-profile__services">
              <h2>{text('assignedServices')}</h2>
              <p className="therapist-profile__help">
                {text('servicesHelp', { center: name(data.center.name) })}
              </p>
              {data.services?.length ? (
                <div
                  className="therapist-profile__service-list"
                  role="table"
                  aria-label={text('assignedServices')}
                >
                  <div className="therapist-profile__service-head" role="row">
                    <span role="columnheader">{tr('serviceId')}</span>
                    <span role="columnheader">{tr('duration')}</span>
                    <span role="columnheader">{tr('servicePrice')}</span>
                  </div>
                  {data.services.map((service) => (
                    <div
                      className="therapist-profile__service"
                      role="row"
                      key={service.id}
                    >
                      <div role="cell">
                        <RecordImage src={service.imageUrl} alt="" />
                        <span>{name(service.name)}</span>
                      </div>
                      <span role="cell">
                        {tr('minutes', { count: service.duration })}
                      </span>
                      <span role="cell">
                        <bdi>{money(service.price, language, 'ILS')}</bdi>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>{text('noServices')}</EmptyState>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Profile() {
  const { data, actor } = useCenter();
  const person = data.therapists.find((item) => item.id === actor.therapistId);
  return <ProfileContent key={person.id} person={person} />;
}
