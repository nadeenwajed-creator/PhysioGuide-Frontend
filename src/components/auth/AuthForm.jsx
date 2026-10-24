import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
  loginPatient, loginCenter, registerPatient, registerCenter,
  getAuthenticatedDestination,
} from '../../services/authService.js';
import { normalizeAuthError } from '../../services/auth/authErrors.js';
import { centerLocationService } from '../../services/auth/centerLocation.js';
import { searchCenterAddress } from '../../services/centerLocationService.js';
import { createAuthRequest, validateAuthForm } from '../../utils/authValidation.js';
import './AuthForm.css';

const operations = {
  patient: { login: loginPatient, signup: registerPatient },
  center: { login: loginCenter, signup: registerCenter },
};

const initialValues = {
  name: '', email: '', phone: '', location: '', password: '', confirmPassword: '',
};
const knownFieldErrors = ['required', 'email', 'phone', 'passwordLength', 'passwordMismatch', 'invalid', 'confirmLocation'];
const knownErrors = ['invalidCredentials', 'network', 'rateLimited', 'validation', 'unavailable', 'unexpected', 'accountPending', 'accountRejected', 'unsupportedRole', 'duplicateEmail', 'storageUnavailable'];

// Passwords stay in memory and are never saved to browser storage.
function AuthForm({ role, mode }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const registering = mode === 'signup';
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [locationChoices, setLocationChoices] = useState([]);
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const feedbackRef = useRef(null);
  const requestRef = useRef(0);
  const locationRef = useRef(0);
  const lookupRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      // Ignore requests that finish after leaving the page.
      requestRef.current += 1;
      locationRef.current += 1;
      lookupRef.current?.abort();
    };
  }, []);

  // Manual edits cancel lookup so a late response cannot replace the address.
  function changeField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFeedback(null);
    if (field === 'location') {
      setLocationConfirmed(false);
      setCoordinates(null);
      setLocationStatus('');
      setLocationChoices([]);
      locationRef.current += 1;
      lookupRef.current?.abort();
      setLocationBusy(false);
    }
  }

  function focusError(fieldErrors) {
    requestAnimationFrame(() => {
      const field = Object.keys(fieldErrors)[0];
      if (field) formRef.current?.elements.namedItem(field)?.focus();
      else feedbackRef.current?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || locationBusy) return;
    const validation = validateAuthForm(values, { role, mode, coordinates, locationConfirmed });
    // Resolve a manually entered address before sending the registration request.
    if (Object.keys(validation).length === 1 && validation.location === 'confirmLocation') {
      setErrors({});
      await findLocation(false);
      return;
    }
    setErrors(validation);
    setFeedback(null);
    if (Object.keys(validation).length) {
      focusError(validation);
      return;
    }

    submittingRef.current = true;
    setPending(true);
    const requestId = ++requestRef.current;
    try {
      const result = await operations[role][mode](createAuthRequest(values, { role, mode }, coordinates, locationConfirmed));
      if (requestId !== requestRef.current) return;

      if (result.status === 'authenticated' && !registering) {
        navigate(getAuthenticatedDestination(result.role), { replace: true });
        return;
      }

      if (registering && ['registered', 'pending-review'].includes(result.status)) {
        setFeedback({ kind: 'info', key: result.status === 'pending-review' ? 'auth.pendingReview' : 'auth.registered' });
      } else {
        throw new Error('Unexpected authentication response');
      }
      setValues((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      focusError({});
    } catch (failure) {
      if (requestId !== requestRef.current) return;
      const error = normalizeAuthError(failure);
      const fieldErrors = {};
      Object.entries(error.fieldErrors).forEach(([field, code]) => {
        if (Object.hasOwn(initialValues, field)) {
          fieldErrors[field] = knownFieldErrors.includes(code) ? code : 'invalid';
        }
      });
      setErrors(fieldErrors);
      setFeedback({ kind: 'error', key: `auth.error.${knownErrors.includes(error.code) ? error.code : 'unexpected'}` });
      focusError(fieldErrors);
    } finally {
      if (requestId === requestRef.current) {
        submittingRef.current = false;
        setPending(false);
      }
    }
  }

  async function findLocation(useDevice) {
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    const token = ++locationRef.current;
    setLocationBusy(true);
    setLocationStatus('auth.location.loading');
    setLocationChoices([]);
    try {
      let choices;
      if (useDevice) {
        const point = await centerLocationService.getCoordinates();
        if (token !== locationRef.current) return;
        setLocationStatus('auth.location.lookingUp');
        let address = values.location.trim();
        try {
          address = await centerLocationService.getAddress(point, { language, signal: controller.signal }) || address;
        } catch {
          // Device coordinates remain usable with an address supplied by the user.
        }
        choices = address ? [{ address, coordinates: point }] : [];
      } else {
        choices = await searchCenterAddress(values.location, { language, signal: controller.signal });
      }
      if (token !== locationRef.current) return;
      setLocationChoices(choices);
      setLocationStatus(choices.length ? '' : 'center.remaining.noAddressResults');
    } catch (error) {
      if (token !== locationRef.current) return;
      const code = ['unsupported', 'denied', 'timeout', 'failed', 'lookupTimeout', 'lookupUnavailable', 'lookupFailed'].includes(error?.code) ? error.code : 'failed';
      setLocationStatus(`auth.location.${code}`);
    } finally {
      if (token === locationRef.current) setLocationBusy(false);
    }
  }

  function confirmLocation(selection) {
    setValues(previous => ({ ...previous, location: selection.address }));
    setCoordinates(selection.coordinates);
    setLocationConfirmed(true);
    setErrors(previous => ({ ...previous, location: undefined }));
    setFeedback(null);
    setLocationStatus('auth.location.found');
    setLocationChoices([]);
  }

  function field(name, label, type = 'text', autoComplete = name) {
    return (
      <FormField
        id={`auth-${role}-${mode}-${name}`}
        name={name}
        label={t(label)}
        type={type}
        value={values[name]}
        onChange={(value) => changeField(name, value)}
        required
        disabled={pending || locationBusy}
        autoComplete={autoComplete}
        dir={['email', 'phone'].includes(name) ? 'ltr' : undefined}
        showPasswordToggle={type === 'password'}
        error={errors[name] ? t(`auth.validation.${errors[name]}`) : undefined}
        helperText={name === 'password' && registering ? t('auth.passwordHint') : undefined}
      />
    );
  }

  return (
    <div className="auth-form">
      <p className="auth-form__eyebrow">{t(registering ? 'auth.createEyebrow' : 'auth.welcomeEyebrow')}</p>
      <h1 ref={headingRef} tabIndex={-1}>{t(registering ? 'auth.createTitle' : 'auth.loginTitle')}</h1>
      <span className="auth-form__rule" aria-hidden="true" />

      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <div className="auth-form__fields">
          {registering && field('name', role === 'center' ? 'auth.centerName' : 'auth.fullName', 'text', role === 'center' ? 'organization' : 'name')}
          {field('email', role === 'center' ? 'auth.centerEmail' : 'auth.email', 'email', 'username')}
          {registering && field('phone', 'auth.phone', 'tel', 'tel')}
          {registering && role === 'center' && (
            <div className="auth-form__location">
              {field('location', 'auth.location', 'text', 'street-address')}
              <Button variant="ghost" size="lg" icon={faLocationCrosshairs} onClick={() => findLocation(true)} loading={locationBusy} disabled={pending}>
                {t('auth.currentLocation')}
              </Button>
              <p className="auth-form__location-status" role="status">
                {locationStatus && t(locationStatus)}
              </p>
            </div>
          )}
          {field('password', 'auth.password', 'password', registering ? 'new-password' : 'current-password')}
          {registering && field('confirmPassword', 'auth.confirmPassword', 'password', 'new-password')}
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending} disabled={locationBusy}>
          {t(registering ? 'auth.createAccount' : 'auth.signIn')}
          <FontAwesomeIcon icon={faArrowRight} className="auth-form__arrow public-directional" aria-hidden="true" />
        </Button>
        {pending && <p className="auth-form__pending" role="status">{t('auth.submitting')}</p>}
      </form>

      {locationChoices.length > 0 && (
        <Modal isOpen title={t('center.remaining.confirmClinic')} onClose={() => setLocationChoices([])}>
          {/* Selecting an address explicitly confirms its coordinates for registration. */}
          <div className="auth-form__fields">
            {locationChoices.map((selection, index) => (
              <Button key={index} variant="outline" onClick={() => confirmLocation(selection)}>
                {selection.address}
              </Button>
            ))}
          </div>
        </Modal>
      )}

      {feedback && (
        <div ref={feedbackRef} tabIndex={-1} className={`auth-form__feedback auth-form__feedback--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
          <p>{t(feedback.key)}</p>
          {registering && feedback.kind !== 'error' && <Link to={`/${role}/login`}>{t('auth.returnToLogin')}</Link>}
        </div>
      )}

      <div className="auth-form__social">
        <p className="auth-form__divider">{t('auth.continueWith')}</p>
        <div className="auth-form__social-buttons">
          {/* Google stays unavailable until OAuth is connected. */}
          <Button variant="outline" size="lg" className="auth-form__google" disabled aria-label={t('auth.googleUnavailable')} title={t('auth.googleUnavailable')}>
            <svg className="auth-form__google-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z" />
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z" />
            </svg>
            <span>Google</span>
          </Button>
        </div>
      </div>
      <p className="auth-form__switch">
        {t(registering ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
        <Link to={`/${role}/${registering ? 'login' : 'signup'}`}>{t(registering ? 'auth.signIn' : 'auth.createOne')}</Link>
      </p>
    </div>
  );
}

export default AuthForm;
