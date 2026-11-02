import { Style, Avatar } from '@dicebear/core';
import lorelei from '@dicebear/styles/lorelei.json' with { type: 'json' };

// People without a profile photo get a generated face from DiceBear instead of
// thispersondoesnotexist.com, which served a fresh random face on every load.
// DiceBear draws from a seed: the initials plus the email domain, so a person
// keeps one unique face forever and the src stays cacheable with no cache-buster.
const faceStyle = new Style(lorelei);
const faceCache = new Map();

// First letters of the first and last name parts, uppercased ("Ahmad Ali" -> "AA").
export function personInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

// "AA" + "@example.com" keeps faces unique across people who share initials.
export function personSeed(name = '', email = '') {
  const initials = personInitials(name);
  const domain = String(email).split('@')[1]?.trim().toLowerCase() ?? '';
  if (initials && domain) return `${initials}@${domain}`;
  if (initials) return initials;
  return domain || 'physioguide';
}

// Deterministic face for a person; memoized so repeated renders reuse one URI.
export function personFace(name = '', email = '') {
  const seed = personSeed(name, email);
  let uri = faceCache.get(seed);
  if (!uri) {
    uri = new Avatar(faceStyle, { seed }).toDataUri();
    faceCache.set(seed, uri);
  }
  return uri;
}

// Profile photo when the record has one, generated face otherwise.
export const personImage = (url, name = '', email = '') => url || personFace(name, email);
