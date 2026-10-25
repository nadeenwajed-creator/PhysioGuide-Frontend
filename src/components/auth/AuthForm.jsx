import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faLocationCrosshairs,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

import {
  loginPatient,
  loginCenter,
  registerPatient,
  registerCenter,
  getAuthenticatedDestination,
} from '../../services/authService.js';

import { normalizeAuthError } from '../../services/auth/authErrors.js';
import { centerLocationService } from '../../services/auth/centerLocation.js';
import {
  createAuthRequest,
  validateAuthForm,
} from '../../utils/authValidation.js';

import './AuthForm.css';

// Maps each user role and authentication mode to its corresponding service.
// This avoids writing separate login and registration logic for each role.
const operations = {
  patient: {
    login: loginPatient,
    signup: registerPatient,
  },
  center: {
    login: loginCenter,
    signup: registerCenter,
  },
};

// Defines the initial values for every possible form field.
const initialValues = {
  name: '',
  email: '',
  phone: '',
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
  'rateLimited',
  'validation',
  'unavailable',
  'unexpected',
  'accountPending',
  'unsupportedRole',
];

function AuthForm({ role, mode }) {
  // Provides translation and current language information from LanguageContext.
  const { t, language } = useLanguage();

  // Allows navigation to another route after successful authentication.
  const navigate = useNavigate();

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
  const [feedback, setFeedback] = useState(null);

  // Stores the coordinates returned by the browser's geolocation service.
  const [coordinates, setCoordinates] = useState(null);

  // Tracks the current location operation or its result.
  const [locationStatus, setLocationStatus] = useState('');

  // References the form DOM element so we can focus its fields.
  const formRef = useRef(null);

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
      // Reset the location status because the user entered a new value.
      setLocationStatus('');

      // Invalidate the previous location operation.
      locationRef.current += 1;

      // Cancel the previous reverse-geocoding request if possible.
      lookupRef.current?.abort();
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

    // Ignore duplicate submissions while another request is in progress.
    if (submittingRef.current) return;

    // Validate the form before making any network request.
    // The validation rules depend on the current role and mode.
    const validation = validateAuthForm(values, { role, mode });

    // Display the validation errors returned by the validation utility.
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
      // Build the request payload and call the appropriate service.
      // The operations object selects the function using role and mode.
      const result = await operations[role][mode](
        createAuthRequest(values, { role, mode }, coordinates)
      );

      // Ignore the response if this request is no longer the latest one.
      if (requestId !== requestRef.current) return;

      // Navigate only when a real login returns an authenticated session.
      // Demo responses and registration responses must not open the dashboard.
      if (
        result.mode === 'live' &&
        result.status === 'authenticated' &&
        !registering
      ) {
        // Replace the current history entry so Back does not return
        // the user to the login form.
        navigate(getAuthenticatedDestination(result.role), {
          replace: true,
        });

        return;
      }

      // Handle demo-mode login or registration responses.
      if (result.mode === 'demo') {
        setFeedback({
          kind: 'info',
          key: registering
            ? 'auth.demoRegistration'
            : 'auth.demoLogin',
        });
      } else if (
        result.mode === 'live' &&
        registering &&
        ['registered', 'pending-review'].includes(result.status)
      ) {
        // Registration may succeed immediately or require manual approval.
        setFeedback({
          kind: 'info',
          key:
            result.status === 'pending-review'
              ? 'auth.pendingReview'
              : 'auth.registered',
        });
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

  // Retrieves the user's current coordinates and tries to resolve them
  // into a readable address for center registration.
  async function useCurrentLocation() {
    // Cancel any previous address lookup before starting another one.
    lookupRef.current?.abort();

    // Create a controller so the address lookup can be cancelled.
    const controller = new AbortController();
    lookupRef.current = controller;

    // Inform the UI that the browser is retrieving the user's location.
    setLocationStatus('loading');

    // Assign an identifier to this location operation.
    const requestId = ++locationRef.current;

    try {
      // Request the user's coordinates through the location service.
      const point = await centerLocationService.getCoordinates();

      // Ignore the result if another location operation has started.
      if (requestId !== locationRef.current) return;

      // Save the coordinates even if reverse geocoding does not find an address.
      setCoordinates(point);

      // Update the UI while converting coordinates into an address.
      setLocationStatus('lookingUp');

      try {
        // Reverse geocoding converts latitude/longitude into a readable address.
        // The current language controls the returned address language when supported.
        const address = await centerLocationService.getAddress(point, {
          language,
          signal: controller.signal,
        });

        // Ignore an outdated address lookup result.
        if (requestId !== locationRef.current) return;

        if (address) {
          // Fill the location field with the resolved address.
          setValues((previous) => ({
            ...previous,
            location: address,
          }));

          // Clear any validation error associated with the location field.
          setErrors((previous) => ({
            ...previous,
            location: undefined,
          }));

          // Clear previous feedback after successfully updating the location.
          setFeedback(null);
        }

        // "found" means an address was resolved.
        // "captured" means coordinates were obtained without a readable address.
        setLocationStatus(address ? 'found' : 'captured');
      } catch (error) {
        // Report address lookup errors only if this operation is still current.
        if (requestId === locationRef.current) {
          setLocationStatus(
            ['lookupTimeout', 'lookupUnavailable'].includes(error?.code)
              ? error.code
              : 'lookupFailed'
          );
        }
      }
    } catch (error) {
      // Handle errors that prevent obtaining the coordinates.
      if (requestId === locationRef.current) {
        setLocationStatus(
          ['unsupported', 'denied', 'timeout', 'failed'].includes(error?.code)
            ? error.code
            : 'failed'
        );
      }
    }
  }

  // Reusable field renderer to avoid duplicating FormField configuration.
  // It connects each input to React state, validation, and accessibility props.
  function field(name, label, type = 'text', autoComplete = name) {
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
        // Prevent edits while an authentication request is running.
        disabled={pending}
        autoComplete={autoComplete}
        // Keep email and phone inputs left-to-right in Arabic layouts.
        dir={['email', 'phone'].includes(name) ? 'ltr' : undefined}
        // Enable the password visibility control for password fields.
        showPasswordToggle={type === 'password'}
        // Translate and display the field's current validation error.
        error={
          errors[name]
            ? t(`auth.validation.${errors[name]}`)
            : undefined
        }
        // Show password requirements only on the registration form.
        helperText={
          name === 'password' && registering
            ? t('auth.passwordHint')
            : undefined
        }
      />
    );
  }

  return (
    <div className="auth-form">
      {/* Display a short label above the main heading. */}
      <p className="auth-form__eyebrow">
        {t(registering ? 'auth.createEyebrow' : 'auth.welcomeEyebrow')}
      </p>

      {/* The heading changes according to login or registration mode. */}
      <h1 ref={headingRef} tabIndex={-1}>
        {t(registering ? 'auth.createTitle' : 'auth.loginTitle')}
      </h1>

      {/* Decorative divider; hidden from assistive technology. */}
      <span className="auth-form__rule" aria-hidden="true" />

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
              'name',
              role === 'center' ? 'auth.centerName' : 'auth.fullName',
              'text',
              role === 'center' ? 'organization' : 'name'
            )}

          {/* The email label depends on whether the user is a patient or center. */}
          {field(
            'email',
            role === 'center' ? 'auth.centerEmail' : 'auth.email',
            'email',
            'username'
          )}

          {/* Phone number is required only during registration. */}
          {registering && field('phone', 'auth.phone', 'tel', 'tel')}

          {/* Center registration additionally requires a location. */}
          {registering && role === 'center' && (
            <div className="auth-form__location">
              {field('location', 'auth.location', 'text', 'street-address')}

              {/* Requests the user's location and attempts to fill the address. */}
              <Button
                variant="ghost"
                size="lg"
                icon={faLocationCrosshairs}
                onClick={useCurrentLocation}
                loading={['loading', 'lookingUp'].includes(locationStatus)}
                disabled={pending}
              >
                {t('auth.currentLocation')}
              </Button>

              {/* Announces location progress and errors accessibly. */}
              <p className="auth-form__location-status" role="status">
                {locationStatus && t(`auth.location.${locationStatus}`)}
              </p>
            </div>
          )}

          {/* Password is present in both login and registration forms. */}
          {field(
            'password',
            'auth.password',
            'password',
            registering ? 'new-password' : 'current-password'
          )}

          {/* Confirmation is required only during registration. */}
          {registering &&
            field(
              'confirmPassword',
              'auth.confirmPassword',
              'password',
              'new-password'
            )}
        </div>

        {/* Submits the form and reflects the current request state. */}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending}
          // Prevent submission while the location lookup is in progress.
          disabled={['loading', 'lookingUp'].includes(locationStatus)}
        >
          {t(registering ? 'auth.createAccount' : 'auth.signIn')}

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
            {t('auth.submitting')}
          </p>
        )}
      </form>

      {/* Display success, informational, or error feedback when available. */}
      {feedback && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={`auth-form__feedback auth-form__feedback--${feedback.kind}`}
          // Errors use an alert; informational messages use a status region.
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          <p>{t(feedback.key)}</p>

          {/* Offer a login link after a successful registration response. */}
          {registering && feedback.kind !== 'error' && (
            <Link to={`/${role}/login`}>
              {t('auth.returnToLogin')}
            </Link>
          )}
        </div>
      )}

      {/* Social authentication section. */}
      <div className="auth-form__social">
        <p className="auth-form__divider">
          {t('auth.continueWith')}
        </p>

        <div className="auth-form__social-buttons">
          {/* Google stays unavailable until OAuth is connected. */}
          <Button
            variant="outline"
            size="lg"
            className="auth-form__google"
            disabled
            aria-label={t('auth.googleUnavailable')}
            title={t('auth.googleUnavailable')}
          >
            {/* Inline SVG renders the Google logo without an image dependency. */}
            <svg
              className="auth-form__google-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
              />
              <path
                fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"
              />
              <path
                fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"
              />
            </svg>

            <span>Google</span>
          </Button>
        </div>
      </div>

      {/* Switch between login and registration for the current role. */}
      <p className="auth-form__switch">
        {t(registering ? 'auth.haveAccount' : 'auth.noAccount')}{' '}

        <Link to={`/${role}/${registering ? 'login' : 'signup'}`}>
          {t(registering ? 'auth.signIn' : 'auth.createOne')}
        </Link>
      </p>
    </div>
  );
}

export default AuthForm;