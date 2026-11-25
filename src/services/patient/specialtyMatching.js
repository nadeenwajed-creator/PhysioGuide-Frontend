// Scores reported symptoms against specialties and applies the care-service rules.

// Label strings of a bilingual value or a list.
export const labels = value => typeof value === 'string'
  ? [value]
  : value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string') : [];
// Comparison form of a specialty name, without Arabic diacritics.
export const normalizeSpecialty = value => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();
export const careCategories = {
  general: [
    'General Physiotherapy',
    'Musculoskeletal Physiotherapy',
    'العلاج الطبيعي العام',
    'العلاج الطبيعي العضلي الهيكلي'
  ],
  musculoskeletal: [
    'Musculoskeletal Physiotherapy',
    'Manual Therapy',
    'Orthopedic Physiotherapy',
    'Orthopaedic Physiotherapy',
    'العلاج اليدوي',
    'العلاج الطبيعي العضلي الهيكلي'
  ],
  back: [
    'Back Pain Treatment',
    'Back Pain Physiotherapy',
    'Back & Spine',
    'Back and Spine Physiotherapy',
    'Spinal Physiotherapy',
    'Neck and Back Physiotherapy',
    'علاج آلام الظهر',
    'علاج الظهر والعمود الفقري',
    'العلاج الطبيعي للرقبة والظهر'
  ],
  knee: ['Knee Rehabilitation', 'Knee Physiotherapy', 'تأهيل الركبة'],
  postsurgery: [
    'Post-Surgery Rehabilitation',
    'Post-Surgery Recovery',
    'Postoperative Rehabilitation',
    'Post-Surgical Rehabilitation',
    'التأهيل بعد الجراحة'
  ],
  persistent: [
    'Persistent Pain Physiotherapy',
    'Pain Management Physiotherapy',
    'العلاج الطبيعي للألم المستمر'
  ],
  upperLimb: [
    'Upper Limb Physiotherapy',
    'Manual Therapy',
    'العلاج الطبيعي للطرف العلوي',
    'العلاج اليدوي'
  ],
  lowerLimb: [
    'Lower Limb Physiotherapy',
    'Knee Rehabilitation',
    'Knee Physiotherapy',
    'تأهيل الركبة',
    'العلاج الطبيعي للطرف السفلي'
  ]
};

// Real centres name their services freely ("Joint Mobilization", "Gait
// Training"), so a care category also collects the techniques and body areas
// that suit it plus the catalogue specialties those services belong to. That
// keeps an assessment pointing at services a clinic actually offers instead of
// only matching names that happen to equal a category title.
export const careServiceRules = {
  general: {
    specialties: ['General Physiotherapy'],
    keywords: ['general', 'joint', 'manual', 'mobility', 'massage', 'rehab', 'مفاصل', 'عام'],
  },
  musculoskeletal: {
    specialties: ['General Physiotherapy', 'Sports Injury'],
    keywords: ['muscle', 'joint', 'manual', 'mobility', 'massage', 'rehab', 'عضلي', 'مفاصل'],
  },
  back: {
    specialties: ['General Physiotherapy'],
    keywords: ['joint', 'manual', 'spine', 'back', 'mobility', 'massage', 'ظهر', 'رقبة', 'عمود فقري', 'مفاصل'],
  },
  knee: {
    specialties: ['General Physiotherapy', 'Sports Injury'],
    keywords: ['knee', 'gait', 'joint', 'mobility', 'massage', 'ركبة', 'مشي', 'مفاصل'],
  },
  postsurgery: {
    specialties: ['General Physiotherapy'],
    keywords: ['post surgery', 'post operative', 'postoperative', 'post surgical', 'recovery', 'بعد الجراحة'],
  },
  persistent: {
    specialties: ['General Physiotherapy', 'Neurological Rehabilitation'],
    keywords: ['pain', 'manual', 'joint', 'mobility', 'rehab', 'الم', 'مزمن', 'مفاصل'],
  },
  upperLimb: {
    specialties: ['General Physiotherapy', 'Sports Injury'],
    keywords: ['joint', 'manual', 'shoulder', 'massage', 'post surgery', 'كتف', 'ذراع', 'مفاصل'],
  },
  lowerLimb: {
    specialties: ['General Physiotherapy', 'Sports Injury'],
    keywords: ['gait', 'knee', 'hip', 'leg', 'joint', 'massage', 'ركبة', 'ورك', 'ساق', 'مشي'],
  },
};

// Every label a service can be matched by.
const serviceLabels = (service) => [
  ...labels(service?.name),
  ...labels(service?.specialty),
  ...labels(service?.specialtyName),
];

// 3 = the service is named for the care category, 2 = its name mentions a
// symptom/technique that suits the category, 1 = it belongs to a suitable
// specialty, 0 = unrelated.
export function serviceMatchScore(service, specialty) {
  if (!specialty) return 0;
  const careKey = specialty.startsWith('care:') ? specialty.slice(5) : null;
  const requested = careKey ? careCategories[careKey] || [] : [specialty];
  const aliases = new Set(requested.map(normalizeSpecialty).filter(Boolean));
  const texts = serviceLabels(service).map(normalizeSpecialty).filter(Boolean);

  if (texts.some((text) => aliases.has(text))) return 3;
  if (!careKey) return 0;

  const rules = careServiceRules[careKey];
  if (!rules) return 0;
  const haystack = texts.join(' ');
  if (rules.keywords.some((word) => haystack.includes(normalizeSpecialty(word)))) return 2;

  const specialties = new Set(rules.specialties.map(normalizeSpecialty));
  return texts.some((text) => specialties.has(text)) ? 1 : 0;
}

// True when a service matches the specialty at all.
export function serviceMatches(service, specialty) {
  return serviceMatchScore(service, specialty) > 0;
}

// True when one of the center's services matches the specialty.
export function centerMatchesSpecialty(center, specialty) {
  return !specialty || (center.services || []).some(service => serviceMatches(service, specialty))
    || !specialty.startsWith('care:')
    && (center.therapists || []).some(person => labels(person.specialty).some(label => normalizeSpecialty(label) === normalizeSpecialty(specialty)));
}

// Applies search, specialty, rating and care filters to the centers.
export function filterCenters(centers, {
  search = '',
  specialty = '',
  rating = '',
  price = '',
  sort = 'rating',
  savedOnly = false,
  favoriteIds = [],
  language = 'en'
} = {}) {
  // Display name of a bilingual value.
  const name = value => typeof value === 'string' ? value : value?.[language] || value?.en || value?.ar || '';
  // Lowest price among a center's assigned services.
  const lowest = center => {
    const assigned = new Set((center.therapists || []).filter(p => !specialty || labels(p.specialty).some(label => normalizeSpecialty(label) === normalizeSpecialty(specialty)))
      .flatMap(p => p.serviceIds || []));
    const prices = (center.services || []).filter(s => !specialty || serviceMatches(s, specialty) || assigned.has(s.id)).map(s => s.price)
      .filter(n => Number.isFinite(n) && n >= 0);
    return prices.length ? Math.min(...prices) : Infinity;
  };
  const query = normalizeSpecialty(search);
  return centers
    .filter(center => (!savedOnly || favoriteIds.includes(center.id))
      && normalizeSpecialty([center.name, center.city, center.address, ...(center.services || []).map(s => s.name)].flatMap(labels).join(' '))
        .includes(query)
      && centerMatchesSpecialty(center, specialty)
      && (!rating || Number.isFinite(center.rating) && center.rating >= Number(rating))
      && (!price || lowest(center) <= Number(price)))
    .sort((a, b) => sort === 'name'
      ? name(a.name).localeCompare(name(b.name), language)
      : sort === 'price' ? lowest(a) - lowest(b) : (b.rating ?? -1) - (a.rating ?? -1));
}
