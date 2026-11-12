// People without a profile photo get a real portrait photo instead of a drawn
// avatar. The pool holds 100 men and 100 women, and every person is given one
// slot that no one else gets, so two people never share a face on a page.
const FACE_COUNT = 200;
const STORAGE_KEY = 'physioguide.face-slots.v2';

// Odd slots draw from the men folder, even slots from the women folder, so the
// 200 slots map one-to-one onto the 200 available portraits.
const slotFolder = (slot) => (slot % 2 === 0 ? 'women' : 'men');
const FACE_FOLDERS = { female: 'women', male: 'men' };

const faceUrl = (slot) => {
  const index = Math.floor((slot - 1) / 2) % 100;
  return `https://randomuser.me/api/portraits/${slotFolder(slot)}/${index}.jpg`;
};

// First letters of the first and last name parts, uppercased ("Ahmad Ali" -> "AA").
export function personInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

// The full name plus the email identifies a person better than initials, and
// a record id (when the caller has one) separates people who share a name.
export function personSeed(name = '', email = '', identity = '') {
  const person = String(name).trim().toLowerCase();
  const address = String(email).trim().toLowerCase();
  const id = String(identity ?? '').trim().toLowerCase();
  if (id) return `${id}|${person}|${address}`;
  if (person || address) return `${person}|${address}`;
  return 'physioguide';
}

// Where a person would like to sit in the face pool; collisions are resolved
// below, so this only decides the starting point.
function preferredSlot(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return (hash % FACE_COUNT) + 1;
}

// seed -> slot, kept in localStorage so a face survives reloads and stays the
// same in every tab instead of reshuffling on each visit.
const slots = new Map(readStoredSlots());

function readStoredSlots() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return Object.entries(parsed).filter(([, slot]) => Number.isInteger(slot));
  } catch {
    return [];
  }
}

function persistSlots() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(slots)));
  } catch {
    // Faces still work; the assignment just is not remembered.
  }
}

// First free slot that matches the known gender, else any free slot. When the
// pool is exhausted (more people than faces) the preferred slot is reused.
function pickSlot(start, taken, folder) {
  let anyFree = null;
  for (let offset = 0; offset < FACE_COUNT; offset += 1) {
    const slot = ((start - 1 + offset) % FACE_COUNT) + 1;
    if (taken.has(slot)) continue;
    if (!folder || slotFolder(slot) === folder) return slot;
    if (anyFree === null) anyFree = slot;
  }
  return anyFree ?? start;
}

// Real face for a person. A slot already given to someone else is skipped, so
// no two people ever show the same portrait on a page or in a list. The gender
// only picks the folder; a person who already has a face keeps it.
export function personFace(name = '', email = '', identity = '', gender = '') {
  const seed = personSeed(name, email, identity);
  const known = slots.get(seed);
  if (known) return faceUrl(known);

  const folder = FACE_FOLDERS[String(gender).trim().toLowerCase()] || '';
  const slot = pickSlot(preferredSlot(seed), new Set(slots.values()), folder);

  slots.set(seed, slot);
  persistSlots();
  return faceUrl(slot);
}

// Profile photo when the record has one, real face otherwise.
export const personImage = (url, name = '', email = '', identity = '', gender = '') =>
  url || personFace(name, email, identity, gender);
