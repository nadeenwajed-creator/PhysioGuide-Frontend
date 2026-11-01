// People without a profile photo (patients, therapists, admins) show a
// generated face from thispersondoesnotexist.com. The bare domain serves an
// HTML page; the image itself lives at /random-person.jpeg, and every request
// returns a fresh face, so the src stays plain with no cache-buster.
export const PERSON_PLACEHOLDER_IMAGE = 'https://thispersondoesnotexist.com/random-person.jpeg';

// Profile photo when the record has one, generated face otherwise.
export const personImage = (url) => url || PERSON_PLACEHOLDER_IMAGE;
