export const labels = value => typeof value === 'string'
  ? [value]
  : value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string') : [];
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
    'علاج آلام الظهر',
    'علاج الظهر والعمود الفقري'
  ],
  knee: ['Knee Rehabilitation', 'Knee Physiotherapy', 'تأهيل الركبة'],
  postsurgery: [
    'Post-Surgery Rehabilitation',
    'Post-Surgery Recovery',
    'Postoperative Rehabilitation',
    'التأهيل بعد الجراحة'
  ]
};

export function serviceMatches(service, specialty) {
  const requested = specialty.startsWith('care:') ? careCategories[specialty.slice(5)] || [] : [specialty];
  const aliases = new Set(requested.map(normalizeSpecialty));
  return [...labels(service.name), ...labels(service.specialty)].some(label => aliases.has(normalizeSpecialty(label)));
}

export function centerMatchesSpecialty(center, specialty) {
  return !specialty || (center.services || []).some(service => serviceMatches(service, specialty))
    || !specialty.startsWith('care:')
    && (center.therapists || []).some(person => labels(person.specialty).some(label => normalizeSpecialty(label) === normalizeSpecialty(specialty)));
}

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
  const name = value => typeof value === 'string' ? value : value?.[language] || value?.en || value?.ar || '';
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
