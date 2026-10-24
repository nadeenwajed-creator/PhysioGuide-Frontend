import { validCoordinates } from '../services/center/remainingOperations.js';
// Checks form fields. The backend must also validate every request.
export function validateAuthForm(values, { role, mode, coordinates = null, locationConfirmed = false }) {
  const errors = {};
  const registering = mode === 'signup';
  const required = registering
    ? ['name', 'email', 'phone', 'password', 'confirmPassword']
    : ['email', 'password'];

  // Center registration always requires a readable address.
  if (registering && role === 'center') required.push('location');
  required.forEach((field) => {
    if (!values[field]?.trim()) errors[field] = 'required';
  });

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'email';
  }

  // Applies the password and phone rules only when creating an account.
  if (registering) {
    if (values.password && values.password.length < 8) errors.password = 'passwordLength';
    if (values.confirmPassword && values.password !== values.confirmPassword) {
      errors.confirmPassword = 'passwordMismatch';
    }
    const phone = normalizePhone(values.phone || '');
    if (phone && (!/^\+?[\d\s()-]+$/.test(phone) || !/^\d{7,15}$/.test(phone.replace(/\D/g, '')))) {
      errors.phone = 'phone';
    }
  }
  if (registering && role === 'center' && !errors.location && (!validCoordinates(coordinates) || !locationConfirmed)) errors.location = 'confirmLocation';
  return errors;
}

// Converts Arabic phone digits to English digits.
export function normalizePhone(phone) {
  return phone.trim().replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}

// Prepares the request without changing the password or sending its confirmation.
export function createAuthRequest(values, { role, mode }, coordinates = null, confirmed = false) {
  const credentials = { email: values.email.trim(), password: values.password };
  if (mode === 'login') return credentials;
  const request = { ...credentials, phone: normalizePhone(values.phone) };
  if (role === 'center') {
    return {
      ...request,
      centerName: values.name.trim(),
      location: { address: values.location.trim(), coordinates, confirmed },
    };
  }
  return { ...request, fullName: values.name.trim() };
}
