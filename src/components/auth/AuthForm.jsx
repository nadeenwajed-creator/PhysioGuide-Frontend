import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faLocationCrosshairs,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

import {
  loginPatient,
  loginCenter,
  loginAdmin,
  registerPatient,
  registerCenter,
  loginWithGoogle,
  getAuthenticatedDestination,
  authMode,
} from '../../services/authService.js';

import {
  GOOGLE_CLIENT_ID,
  createFlowValues,
  isFlowResetError,
  registerGoogleCenter,
  registerGooglePatient,
  requestChallenge,
  signInWithGoogle,
  waitForGis,
} from '../../services/auth/googleAuth.js';
import { cityFromAddress } from '../../services/api/backendContract.js';

import { normalizeAuthError } from '../../services/auth/authErrors.js';
import { centerLocationService } from '../../services/auth/centerLocation.js';
import { searchCenterAddress } from '../../services/centerLocationService.js';
import {
  createAuthRequest,
  normalizePhone,
  validateAuthForm,
} from '../../utils/authValidation.js';
import './AuthForm.css';

const operations = {
  patient: {
    login: loginPatient,
    signup: registerPatient,
  },
  center: {
    login: loginCenter,
    signup: registerCenter,
  },
  admin: {
    login: loginAdmin,
  },
};

// Defines the initial values for every possible form field.
const initialValues = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  location: '',
  password: '',
  confirmPassword: '',
};
// Lists the field validation error codes that the UI knows how to display.
const knownFieldErrors = [
  'required',
  'email',
  'phone',
  'passwordLength',
  'passwordMismatch',
  'invalid',
];

// Lists the authentication error codes that the UI can translate.
// Unknown error codes are converted to a safe generic error.
const knownErrors = [
  'invalidCredentials',
  'network',
  'timeout',
  'rateLimited',
  'validation',
  'unavailable',
  'unexpected',
  // Backend account states carried by the API's `code` field, so a rejected
  // or pending centre sees its own message instead of a generic failure.
  'accountPending',
  'accountRejected',
  'unsupportedRole',
  // Google sign-in states, each with its own guidance.
  'googleCredentials',
  'googleTicket',
  'googleConflict',
  'centerNotApproved',
  'accountUnavailable',
];

function AuthForm({ role, mode }) {
  // Provides translation and current language information from LanguageContext.
  const { t, language } = useLanguage();

  // Allows navigation to another route after successful authentication.
  const navigate = useNavigate();

  // Reads the confirmation notice carried over from the registration screen.
  const location = useLocation();

  // Determines whether the current form is for registration or login.
  const registering = mode === 'signup';

  // Stores the current values of all form fields.
  // Passwords remain in component memory and are not saved to browser storage.
  const [values, setValues] = useState(initialValues);

  // Stores validation errors for individual fields.
  // Example: { email: 'email', password: 'passwordLength' }
  const [errors, setErrors] = useState({});

  // Indicates whether an authentication request is currently running.
  const [pending, setPending] = useState(false);

  // Stores the feedback message displayed after success or failure.
  // Example: { kind: 'error', key: 'auth.error.network' }
  const [feedback, setFeedback] = useState(() =>
    location.state?.notice
      ? { kind: 'info', key: location.state.notice }
      : null
  );

  // Stores the coordinates returned by the browser's geolocation service.
  const [coordinates, setCoordinates] = useState(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [locationChoices, setLocationChoices] = useState([]);
  const formRef = useRef(null);

  // Google sign-in: a non-null value means the server issued a registration
  // ticket and the form is collecting the missing profile fields.
  const [googleRegistration, setGoogleRegistration] = useState(null);
  // Whether the real Google button rendered; the disabled fallback shows when
  // the script is blocked, the API is unreachable, or demo mode is active.
  const [googleFailed, setGoogleFailed] = useState(false);
  // Bumped to restart the flow with a fresh challenge after a single-use
  // challenge or ticket has been consumed.
  const [googleFlowRestart, setGoogleFlowRestart] = useState(0);
  const googleButtonRef = useRef(null);
  const googleFlowRef = useRef(null);
  const credentialHandlerRef = useRef(null);

  // References the heading so keyboard and screen-reader users
  // can be moved to the beginning of the form.
  const headingRef = useRef(null);

  // References the feedback element so it can receive keyboard focus.
  const feedbackRef = useRef(null);

  // Tracks the latest authentication request.
  // Older responses are ignored if a newer request or cleanup invalidates them.
  const requestRef = useRef(0);

  // Tracks the latest location operation.
  // This prevents outdated location results from updating the form.
  const locationRef = useRef(0);

  // Holds the AbortController used to cancel an address lookup when possible.
  const lookupRef = useRef(null);

  // Prevents duplicate submissions before React finishes updating state.
  // A ref is useful here because the guard must update synchronously.
  const submittingRef = useRef(false);

  // Runs once when the component mounts and cleans up when it unmounts.
  useEffect(() => {
    // Move focus to the page heading when the form first appears.
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      // Invalidate pending authentication responses when leaving the page.
      requestRef.current += 1;

      // Invalidate pending location operations.
      locationRef.current += 1;

      // Cancel an outstanding address lookup if one exists.
      lookupRef.current?.abort();
    };
  }, []);

  // --- Google Identity Services flow ----------------------------------------
  // One flow = one server challenge. The verifier stays in the browser; only
  // its SHA-256 binding is sent, and the server's nonce goes into the ID token
  // so it can only be redeemed for this exact attempt.
  useEffect(() => {
    if (role === 'admin' || authMode !== 'api') return undefined;
    let cancelled = false;
    let generation = 0;

    async function startFlow() {
      const attempt = ++generation;
      try {
        const flowValues = await createFlowValues();
        const challenge = await requestChallenge(flowValues.binding);
        if (cancelled || attempt !== generation) return;
        googleFlowRef.current = {
          verifier: flowValues.verifier,
          challengeId: challenge.challengeId,
        };

        await waitForGis();
        if (cancelled || attempt !== generation || !googleButtonRef.current) return;

        const google = globalThis.google;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: challenge.nonce,
          callback: (response) => {
            if (!cancelled && attempt === generation) {
              credentialHandlerRef.current?.(response?.credential);
            }
          },
        });
        // A restart replaces any previously rendered button.
        googleButtonRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
        });
        setGoogleFailed(false);
      } catch {
        // Script blocked, offline, or API unreachable: keep the form usable
        // and show the disabled fallback instead of a dead button.
        if (!cancelled && attempt === generation) {
          googleFlowRef.current = null;
          setGoogleFailed(true);
        }
      }
    }

    startFlow();

    return () => {
      cancelled = true;
      generation += 1;
      googleFlowRef.current = null;
    };
    // authMode is a module constant (API vs demo) and never changes.
  }, [role, googleFlowRestart]);

  // Keep the credential callback bound to the latest render's state.
  useEffect(() => {
    credentialHandlerRef.current = handleGoogleCredential;
  });

  // Converts any Google failure into the same feedback + field-error shape
  // the password form uses, so one code path renders both.
  function reportGoogleError(failure) {
    const error = normalizeAuthError(failure);
    const fieldErrors = {};
    Object.entries(error.fieldErrors).forEach(([field, code]) => {
      if (Object.hasOwn(initialValues, field)) {
        fieldErrors[field] = knownFieldErrors.includes(code) ? code : 'invalid';
      }
    });
    setErrors(fieldErrors);
    setFeedback({
      kind: 'error',
      key: `auth.error.${
        knownErrors.includes(error.code) ? error.code : 'unexpected'
      }`,
    });
    focusError(fieldErrors);
    return error.code;
  }

  // Single-use challenges and tickets die with their attempt; a rejected
  // click restarts the flow so the next one starts from a fresh challenge.
  function restartGoogleFlow() {
    setGoogleFlowRestart((value) => value + 1);
  }

  // The fallback button must never be a silent no-op: it says why Google is
  // unavailable and, in API mode, restarts the flow so a transient failure
  // (offline, API restarting) recovers with one click.
  function handleGoogleFallbackClick() {
    setFeedback({ kind: 'error', key: 'auth.googleUnavailable' });
    focusError({});
    if (authMode === 'api' && !submittingRef.current) restartGoogleFlow();
  }

  // Abandons the registration step: the ticket is discarded locally and the
  // button returns with a fresh challenge for the next attempt.
  function cancelGoogleRegistration() {
    setGoogleRegistration(null);
    setFeedback(null);
    restartGoogleFlow();
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  // Exchanges the Google ID token for a session, or opens the profile step.
  async function handleGoogleCredential(idToken) {
    const flow = googleFlowRef.current;
    if (!idToken || !flow || submittingRef.current) return;

    submittingRef.current = true;
    setPending(true);
    setFeedback(null);
    const requestId = ++requestRef.current;
    try {
      const body = await signInWithGoogle({
        idToken,
        challengeId: flow.challengeId,
        flowVerifier: flow.verifier,
      });
      if (requestId !== requestRef.current) return;

      if (body?.requiresRegistration) {
        setGoogleRegistration({
          registrationTicket: body.registrationTicket,
          flowVerifier: flow.verifier,
          email: body.email || '',
        });
        // The profile step replaces the form; start it at its heading.
        requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
        return;
      }

      const result = await loginWithGoogle(body);
      if (requestId !== requestRef.current) return;
      navigate(getAuthenticatedDestination(result.role), { replace: true });
    } catch (failure) {
      if (requestId !== requestRef.current) return;
      const code = reportGoogleError(failure);
      if (isFlowResetError(code)) restartGoogleFlow();
    } finally {
      if (requestId === requestRef.current) {
        submittingRef.current = false;
        setPending(false);
      }
    }
  }

  // Profile fields required by the Google registration endpoints.
  function validateGoogleProfile() {
    const validation = {};
    if (!values.name?.trim()) validation.name = 'required';
    const phone = normalizePhone(values.phone || '');
    if (!phone) {
      validation.phone = 'required';
    } else if (
      !/^\+?[\d\s()-]+$/.test(phone) ||
      !/^\d{7,15}$/.test(phone.replace(/\D/g, ''))
    ) {
      validation.phone = 'phone';
    }
    if (role === 'patient' && !values.gender) validation.gender = 'required';
    // Coordinates stay optional for Google centres; the address is required.
    if (role === 'center' && !values.location?.trim()) validation.location = 'required';
    return validation;
  }

  // Completes a Google registration with the profile fields the chosen role
  // needs; a patient receives a session, a centre goes to review.
  async function handleGoogleRegistrationSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || locationBusy || !googleRegistration) return;

    const validation = validateGoogleProfile();
    setErrors(validation);
    setFeedback(null);
    if (Object.keys(validation).length) {
      focusError(validation);
      return;
    }

    submittingRef.current = true;
    setPending(true);
    const requestId = ++requestRef.current;
    const ticket = googleRegistration;
    try {
      let body;
      if (role === 'center') {
        body = await registerGoogleCenter({
          registrationTicket: ticket.registrationTicket,
          flowVerifier: ticket.flowVerifier,
          phoneNumber: normalizePhone(values.phone),
          centerName: values.name.trim(),
          city: cityFromAddress(values.location.trim()),
          location: values.location.trim(),
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        });
      } else {
        body = await registerGooglePatient({
          registrationTicket: ticket.registrationTicket,
          flowVerifier: ticket.flowVerifier,
          phoneNumber: normalizePhone(values.phone),
          fullName: values.name.trim(),
          gender: values.gender || null,
        });
      }
      if (requestId !== requestRef.current) return;

      // Only patient registration returns tokens; centres await review.
      if (body?.accessToken) {
        const result = await loginWithGoogle(body);
        if (requestId !== requestRef.current) return;
        navigate(getAuthenticatedDestination(result.role), { replace: true });
        return;
      }

      setGoogleRegistration(null);
      setFeedback({ kind: 'info', key: 'auth.pendingReview' });
      // The ticket is consumed either way; hand the button a fresh challenge.
      restartGoogleFlow();
      focusError({});
    } catch (failure) {
      if (requestId !== requestRef.current) return;
      const code = reportGoogleError(failure);
      if (isFlowResetError(code)) {
        setGoogleRegistration(null);
        restartGoogleFlow();
      }
    } finally {
      if (requestId === requestRef.current) {
        submittingRef.current = false;
        setPending(false);
      }
    }
  }

  // Updates a field and clears its previous error.
  // Editing the location also cancels any outstanding location lookup.
  function changeField(field, value) {
    // Update only the changed field while preserving the other values.
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    // Remove the error associated with the field being edited.
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    // Clear previous success or error feedback after the user edits the form.
    setFeedback(null);

    if (field === 'location') {
      setLocationConfirmed(false);
      setCoordinates(null);
      setLocationStatus('');
      setLocationChoices([]);
      locationRef.current += 1;

      // Cancel the previous reverse-geocoding request if possible.
      lookupRef.current?.abort();
      setLocationBusy(false);
    }
  }

  // Moves keyboard focus to the first invalid field.
  // If there are no field errors, focus the general feedback message instead.
  function focusError(fieldErrors) {
    // Wait until React has updated the DOM before trying to focus an element.
    requestAnimationFrame(() => {
      const field = Object.keys(fieldErrors)[0];

      if (field) {
        // Locate the form control by its name and focus it.
        formRef.current?.elements.namedItem(field)?.focus();
      } else {
        // Focus the feedback message when no individual field needs attention.
        feedbackRef.current?.focus({ preventScroll: true });
      }
    });
  }

  // Handles both login and registration form submissions.
  async function handleSubmit(event) {
    // Prevent the browser from reloading the page on form submission.
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

    // Remove any previous feedback message.
    setFeedback(null);

    // If validation found errors, focus the first invalid field and stop.
    if (Object.keys(validation).length) {
      focusError(validation);
      return;
    }

    // Lock the form synchronously to prevent duplicate requests.
    submittingRef.current = true;

    // Update the UI to indicate that the request is running.
    setPending(true);

    // Generate a unique identifier for this authentication request.
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
        // Unexpected response shapes should be handled as errors.
        throw new Error('Unexpected authentication response');
      }

      // Clear sensitive password fields after a successful response.
      // Preserve non-sensitive values so the user does not lose all their input.
      setValues((previous) => ({
        ...previous,
        password: '',
        confirmPassword: '',
      }));

      // Move focus to the newly displayed feedback message.
      focusError({});
    } catch (failure) {
      // Ignore errors belonging to an outdated request.
      if (requestId !== requestRef.current) return;

      // Convert different service/backend errors into a consistent structure.
      const error = normalizeAuthError(failure);

      // Build a safe list of field errors that the UI can display.
      const fieldErrors = {};

      Object.entries(error.fieldErrors).forEach(([field, code]) => {
        // Accept errors only for fields defined in initialValues.
        if (Object.hasOwn(initialValues, field)) {
          // Use recognized error codes; map unknown codes to "invalid".
          fieldErrors[field] = knownFieldErrors.includes(code)
            ? code
            : 'invalid';
        }
      });

      // Display the field-level errors returned by the service.
      setErrors(fieldErrors);

      // Display a translated general error message.
      // Unknown error codes fall back to the generic "unexpected" message.
      setFeedback({
        kind: 'error',
        key: `auth.error.${
          knownErrors.includes(error.code)
            ? error.code
            : 'unexpected'
        }`,
      });

      // Focus the first invalid field, or the feedback message if none exists.
      focusError(fieldErrors);
    } finally {
      // Only the latest request is allowed to unlock the form.
      if (requestId === requestRef.current) {
        submittingRef.current = false;
        setPending(false);
      }
    }
  }

  async function findLocation(useDevice) {
    lookupRef.current?.abort();

    // Create a controller so the address lookup can be cancelled.
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

  function field(
    name,
    label,
    type = "text",
    autoComplete = name,
    extraProps = {}
  ) {
    return (
      <FormField
        // Create a unique ID for this role, mode, and field combination.
        id={`auth-${role}-${mode}-${name}`}
        name={name}
        label={t(label)}
        type={type}
        value={values[name]}
        // Send input changes through the shared change handler.
        onChange={(value) => changeField(name, value)}
        required
        disabled={pending || locationBusy}
        autoComplete={autoComplete}
        // Keep email and phone inputs left-to-right in Arabic layouts.
        dir={["email", "phone"].includes(name) ? "ltr" : undefined}
        // Enable the password visibility control for password fields.
        showPasswordToggle={type === "password"}
        // Translate and display the field's current validation error.
        error={errors[name] ? t(`auth.validation.${errors[name]}`) : undefined}
        // Show password requirements only on the registration form.
        helperText={
          name === "password" && registering
            ? t("auth.passwordHint")
            : undefined
        }
        {...extraProps}
      />
    );
  }

  return (
    <div className="auth-form">
      {/* Display a short label above the main heading. */}
      <p className="auth-form__eyebrow">
        {t(registering ? "auth.createEyebrow" : "auth.welcomeEyebrow")}
      </p>

      {/* The heading changes according to login or registration mode. */}
      <h1 ref={headingRef} tabIndex={-1}>
        {t(
          googleRegistration
            ? "auth.googleProfileTitle"
            : registering
              ? "auth.createTitle"
              : "auth.loginTitle"
        )}
      </h1>

      {/* Decorative divider; hidden from assistive technology. */}
      <span className="auth-form__rule" aria-hidden="true" />

      {/* A pending Google registration replaces the password form with the
          profile step the chosen role still needs. The ticket and verifier
          stay untouched; only the fields below are collected. */}
      {googleRegistration && (
        <form
          ref={formRef}
          onSubmit={handleGoogleRegistrationSubmit}
          // Custom validation renders translated messages; no native UI.
          noValidate
          aria-busy={pending}
        >
          <p className="auth-form__google-hint">{t("auth.googleProfileHint")}</p>

          {/* The verified Google email; the backend ignores any email field. */}
          {googleRegistration.email && (
            <p className="auth-form__google-email" role="status">
              {t("auth.googleVerifiedEmail", { email: googleRegistration.email })}
            </p>
          )}

          <div className="auth-form__fields">
            {field(
              "name",
              role === "center" ? "auth.centerName" : "auth.fullName",
              "text",
              role === "center" ? "organization" : "name"
            )}

            {/* The patient endpoint takes a gender; centres have none. */}
            {role === "patient" &&
              field("gender", "auth.gender", "text", "off", {
                as: "select",
                options: [
                  { value: "", label: t("auth.gender.select") },
                  { value: "Male", label: t("auth.gender.male") },
                  { value: "Female", label: t("auth.gender.female") },
                ],
              })}

            {field("phone", "auth.phone", "tel", "tel")}

            {/* Centre registration still needs its address; coordinates
                stay optional and ride along when already confirmed. */}
            {role === "center" && (
              <div className="auth-form__location">
                {field("location", "auth.location", "text", "street-address")}
                <Button
                  variant="ghost"
                  size="lg"
                  icon={faLocationCrosshairs}
                  onClick={() => findLocation(true)}
                  loading={locationBusy}
                  disabled={pending}
                >
                  {t("auth.currentLocation")}
                </Button>

                <p className="auth-form__location-status" role="status">
                  {locationStatus && t(locationStatus)}
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            disabled={locationBusy}
          >
            {t("auth.googleContinue")}
            <FontAwesomeIcon
              icon={faArrowRight}
              className="auth-form__arrow public-directional"
              aria-hidden="true"
            />
          </Button>

          {pending && (
            <p className="auth-form__pending" role="status">
              {t("auth.submitting")}
            </p>
          )}

          {/* The ticket belongs to that verified account; switching starts
              a brand-new Google flow instead of editing the email. */}
          <p className="auth-form__switch">
            <Button
              variant="ghost"
              onClick={cancelGoogleRegistration}
              disabled={pending || locationBusy}
            >
              {t("auth.googleSwitch")}
            </Button>
          </p>
        </form>
      )}

      {!googleRegistration && (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        // Disable the browser's built-in validation UI because custom
        // validation and translated error messages are handled by this component.
        noValidate
        // Announces the form's busy state to assistive technologies.
        aria-busy={pending}
      >
        <div className="auth-form__fields">
          {/* Name is required only during registration. */}
          {registering &&
            field(
              "name",
              role === "center" ? "auth.centerName" : "auth.fullName",
              "text",
              role === "center" ? "organization" : "name"
            )}

          {/* The email label depends on whether the user is a patient or center. */}
          {field(
            "email",
            role === "center" ? "auth.centerEmail" : "auth.email",
            "email",
            "username"
          )}

          {/* Gender is required by the patient registration endpoint. */}
          {registering &&
            role === "patient" &&
            field("gender", "auth.gender", "text", "off", {
              as: "select",
              options: [
                { value: "", label: t("auth.gender.select") },
                { value: "Male", label: t("auth.gender.male") },
                { value: "Female", label: t("auth.gender.female") },
              ],
            })}

          {/* Phone number is required only during registration. */}
          {registering && field("phone", "auth.phone", "tel", "tel")}

          {/* Center registration additionally requires a location. */}
          {registering && role === "center" && (
            <div className="auth-form__location">
              {field("location", "auth.location", "text", "street-address")}
              <Button
                variant="ghost"
                size="lg"
                icon={faLocationCrosshairs}
                onClick={() => findLocation(true)}
                loading={locationBusy}
                disabled={pending}
              >
                {t("auth.currentLocation")}
              </Button>

              {/* Announces location progress and errors accessibly. */}
              <p className="auth-form__location-status" role="status">
                {locationStatus && t(locationStatus)}
              </p>
            </div>
          )}

          {/* Password is present in both login and registration forms. */}
          {field(
            "password",
            "auth.password",
            "password",
            registering ? "new-password" : "current-password"
          )}

          {/* Confirmation is required only during registration. */}
          {registering &&
            field(
              "confirmPassword",
              "auth.confirmPassword",
              "password",
              "new-password"
            )}
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending}
          disabled={locationBusy}
        >
          {t(registering ? "auth.createAccount" : "auth.signIn")}

          {/* Directional icon follows the application's directional styling. */}
          <FontAwesomeIcon
            icon={faArrowRight}
            className="auth-form__arrow public-directional"
            aria-hidden="true"
          />
        </Button>

        {/* Display an accessible status message while the request is running. */}
        {pending && (
          <p className="auth-form__pending" role="status">
            {t("auth.submitting")}
          </p>
        )}
      </form>
      )}

      {locationChoices.length > 0 && (
        <Modal
          isOpen
          title={t("center.remaining.confirmClinic")}
          onClose={() => setLocationChoices([])}
        >
          {/* Selecting an address explicitly confirms its coordinates for registration. */}
          <div className="auth-form__fields">
            {locationChoices.map((selection, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => confirmLocation(selection)}
              >
                {selection.address}
              </Button>
            ))}
          </div>
        </Modal>
      )}

      {feedback && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={`auth-form__feedback auth-form__feedback--${feedback.kind}`}
          // Errors use an alert; informational messages use a status region.
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          <p>{t(feedback.key)}</p>

          {/* Offer a login link after a successful registration response. */}
          {registering && feedback.kind !== "error" && (
            <Link to={`/${role}/login`}>{t("auth.returnToLogin")}</Link>
          )}
        </div>
      )}

      {/* Social sign-in is hidden while the Google profile step owns the
          form; the switch link below is replaced by "use a different
          account" inside that step. */}
      {role != "admin" && !googleRegistration &&
      (
        <>
          {/* Social authentication section. */}
          <div className="auth-form__social">
            <p className="auth-form__divider">{t("auth.continueWith")}</p>

            <div className="auth-form__social-buttons">
              {/* The live GIS button renders into this slot once the flow
                  is ready; before that (script blocked, API unreachable,
                  demo mode) the disabled fallback explains the state. */}
              {googleFailed || authMode !== "api" ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="auth-form__google"
                  onClick={handleGoogleFallbackClick}
                  disabled={pending}
                  aria-label={t("auth.googleUnavailable")}
                  title={t("auth.googleUnavailable")}
                >
                  {/* Inline SVG renders the Google logo without an image dependency. */}
                  <svg
                    className="auth-form__google-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"
                    />
                  </svg>

                  <span>Google</span>
                </Button>
              ) : null}

              {/* GIS appends its own iframe here; the slot stays mounted
                  even while the fallback shows so a restart can render. */}
              <div
                ref={googleButtonRef}
                className="auth-form__google-live"
              />
            </div>
          </div>

          {/* Switch between login and registration for the current role. */}
          <p className="auth-form__switch">
            {t(registering ? "auth.haveAccount" : "auth.noAccount")}{" "}
            <Link to={`/${role}/${registering ? "login" : "signup"}`}>
              {t(registering ? "auth.signIn" : "auth.createOne")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default AuthForm;