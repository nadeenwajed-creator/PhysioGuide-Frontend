// Backend validation keys are C# property names, while forms render camelCase fields.
// This module is the single translation table between the two.
//
// Anything without an entry is dropped: a key the form does not render must not
// produce a stray error message.

const aliases = {
  // auth
  fullname: 'name',
  name: 'name',
  centername: 'name',
  email: 'email',
  emailaddress: 'email',
  phonenumber: 'phone',
  phone: 'phone',
  password: 'password',
  confirmpassword: 'confirmPassword',
  currentpassword: 'currentPassword',
  newpassword: 'newPassword',
  gender: 'gender',
  location: 'location',
  city: 'city',

  // patient account
  dateofbirth: 'dateOfBirth',
  birthdate: 'birthDate',
  profileimageurl: 'imageUrl',
  imageurl: 'imageUrl',
  language: 'language',

  // booking
  date: 'date',
  time: 'time',
  centerid: 'centerId',
  therapistid: 'therapistId',
  serviceid: 'serviceId',

  // admin review
  reason: 'reason',
  decision: 'decision',

  // centre workspace
  address: 'address',
  description: 'description',
  price: 'price',
  duration: 'duration',
  specialtyid: 'specialtyId',
  serviceids: 'serviceIds',
  weekstart: 'weekStart',
  weekend: 'weekEnd',
  fridaysstart: 'fridayStart',
  fridastart: 'fridayStart',
  fridaystart: 'fridayStart',
  fridayend: 'fridayEnd',
  starttime: 'startTime',
  endtime: 'endTime',
  dayofweek: 'dayOfWeek',
  text: 'text',
  reply: 'reply',
  file: 'file',
};

// Maps one backend key onto the field the form actually renders.
export function uiFieldName(key) {
  const normalized = String(key ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return aliases[normalized] ?? null;
}

// Translates a backend message into one of the codes the form can display.
function uiFieldCode(field, messages) {
  const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');
  const message = text.toLowerCase();

  if (/already|taken|exist|duplicate/.test(message)) return 'invalid';
  if (field === 'password' && /(least|minim|length|character)/.test(message)) return 'passwordLength';
  if (field === 'confirmPassword' && /match/.test(message)) return 'passwordMismatch';
  if (field === 'email' && /valid|format|email/.test(message)) return 'email';
  if (field === 'phone' && /phone|digits|number/.test(message)) return 'phone';
  if (/required|missing|empty|selected/.test(message)) return 'required';

  return 'invalid';
}

// Reads an ASP.NET validation body (`errors`) or a business error body that
// carries `errors`, and returns { formField: fieldCode }.
export function mapFieldErrors(body) {
  const details = body?.errors ?? null;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};

  const result = {};
  for (const [key, messages] of Object.entries(details)) {
    const field = uiFieldName(key);
    if (field) result[field] = uiFieldCode(field, messages);
  }
  return result;
}

// The stable machine-readable codes the API puts on non-validation failures,
// translated to the error codes the interface already knows how to render.
const codeAliases = {
  unauthenticated: 'unauthenticated',
  token_expired: 'token_expired',
  invalid_refresh_token: 'invalid_refresh_token',
  forbidden: 'forbidden',
  not_found: 'notFound',
  conflict: 'conflict',
  duplicate_email: 'validation',
  slot_unavailable: 'conflict',
  rate_limited: 'rateLimited',
  internal_error: 'unavailable',
  invalid_upload: 'image',
  file_too_large: 'image',
  unsupported_media_type: 'image',

  // centre sign-in states, reported as one message each
  account_not_active: 'accountPending',
  account_rejected: 'accountRejected',
  account_suspended: 'accountRejected',
  center_profile_missing: 'accountPending',

  // Google sign-in states, each carrying its own guidance
  invalid_google_credentials: 'googleCredentials',
  invalid_registration_ticket: 'googleTicket',
  account_conflict: 'googleConflict',
  center_not_approved: 'centerNotApproved',
  account_unavailable: 'accountUnavailable',
  rate_limit_exceeded: 'rateLimited',
  google_auth_unavailable: 'unavailable',
};

export function uiErrorCode(body, fallback) {
  const code = typeof body?.code === 'string' ? body.code : null;
  return (code && codeAliases[code]) || fallback;
}