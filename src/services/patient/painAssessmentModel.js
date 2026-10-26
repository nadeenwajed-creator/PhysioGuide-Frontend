import { careCategories, serviceMatches } from './specialtyMatching.js';

export { careCategories };
// Keep answers in React memory; do not send or store them here
export const painAreas = ['neck', 'shoulder', 'upper_back', 'lower_back', 'arm_hand', 'hip', 'knee', 'leg_foot'];
export const durations = ['today', 'days_2_7', 'weeks_1_4', 'months_1_3', 'months_3_plus'];
export const descriptions = ['aching', 'stiffness', 'sharp', 'burning', 'tingling', 'movement', 'other'];
export const histories = ['none', 'previous_injury', 'previous_surgery', 'recent_injury'];

export function initialAssessment() {
  return {
    step: 1,
    view: 'questions',
    painAreas: [],
    intensity: null,
    duration: null,
    descriptions: [],
    relatedHistory: null,
    q4PreviewType: null
  };
}

export function intensityBand(value) {
  if (!Number.isInteger(value) || value < 0 || value > 10) return null;
  return value === 0 ? 'none' : value <= 3 ? 'mild' : value <= 6 ? 'moderate' : 'severe';
}

export function validStep(state, step = state.step) {
  const validList = (values, allowed) => Array.isArray(values) && values.length > 0 && values.every(v => allowed.includes(v));
  return [
    false,
    validList(state.painAreas, painAreas),
    intensityBand(state.intensity) !== null,
    durations.includes(state.duration),
    validList(state.descriptions, descriptions),
    histories.includes(state.relatedHistory)
  ][step] === true;
}

export function completeAssessment(state) {
  return [1, 2, 3, 4, 5].every(step => validStep(state, step));
}

export function assessmentReducer(state, action) {
  const toggle = (values, id) => values.includes(id) ? values.filter(v => v !== id) : [...values, id];
  switch (action.type) {
    case 'area':
      return painAreas.includes(action.id) ? {
        ...state,
        painAreas: toggle(state.painAreas, action.id)
      } : state;
    case 'intensity':
      return intensityBand(action.value) !== null ? {
        ...state,
        intensity: action.value
      } : state;
    case 'duration':
      return durations.includes(action.id) ? {
        ...state,
        duration: action.id
      } : state;
    case 'description': {
      if (!descriptions.includes(action.id)) return state;
      const selected = toggle(state.descriptions, action.id);
      return {
        ...state,
        descriptions: selected,
        q4PreviewType: selected.includes(action.id) ? action.id : selected.at(-1) ?? null
      };
    }
    case 'preview':
      return state.descriptions.includes(action.id) ? {
        ...state,
        q4PreviewType: action.id
      } : state;
    case 'history':
      return histories.includes(action.id) ? {
        ...state,
        relatedHistory: action.id
      } : state;
    case 'next':
      return validStep(state) && state.step < 5 ? {
        ...state,
        step: state.step + 1
      } : state;
    case 'back':
      return {
        ...state,
        step: Math.max(1, state.step - 1)
      };
    case 'complete':
      return completeAssessment(state) ? {
        ...state,
        view: 'result'
      } : state;
    case 'reset':
      return initialAssessment();
    default:
      return state;
  }
}

// Conservative, ordered navigation rules, not clinically validated diagnostic rules.
// No neurological, pediatric or demographic conclusions are inferred from symptoms.
// Exact service aliases make the mapping inspectable without guessing backend IDs.

export function suggestCare(state) {
  if (!completeAssessment(state)) return null;
  // Use general guidance for answers that need individual assessment
  if (state.intensity >= 7 || state.descriptions.includes('tingling') || state.relatedHistory === 'recent_injury'
    || state.intensity === 0) return 'general';
  if (state.relatedHistory === 'previous_surgery') return 'postsurgery';
  if (state.painAreas.length === 1 && state.painAreas[0] === 'knee') return 'knee';
  if (state.painAreas.every(area => ['upper_back', 'lower_back'].includes(area))) return 'back';
  // Use general guidance for widespread, long-lasting or unclear pain
  if (state.painAreas.length > 2 || state.duration === 'months_3_plus'
    || state.descriptions.every(id => id === 'other')) return 'general';
  return 'musculoskeletal';
}
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase();
const labels = value => typeof value === 'string'
  ? [value]
  : value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string') : [];
// Match an explicitly listed city; do not guess the location
const palestinianCities = [
  'Ramallah',
  'Al-Bireh',
  'Nablus',
  'Jenin',
  'Tulkarm',
  'Qalqilya',
  'Salfit',
  'Tubas',
  'Jericho',
  'Bethlehem',
  'Hebron',
  'Jerusalem',
  'East Jerusalem',
  'Gaza',
  'Khan Yunis',
  'Rafah',
  'Deir al-Balah',
  'رام الله',
  'البيرة',
  'نابلس',
  'جنين',
  'طولكرم',
  'قلقيلية',
  'سلفيت',
  'طوباس',
  'أريحا',
  'بيت لحم',
  'الخليل',
  'القدس',
  'غزة',
  'خان يونس',
  'رفح',
  'دير البلح'
];

export function matchingCenters(centers, care, {
  allowMock = false
} = {}) {
  return (Array.isArray(centers) ? centers : []).filter(c => c && c.id
      && (allowMock && c.dataSource === 'mock'
      || c.id !== 'center-demo' && c.isDemo !== true && c.isMock !== true && c.dataSource !== 'mock')
      && !['pending', 'rejected', 'suspended', 'inactive'].includes(c.status)
      && (!c.approvalStatus || c.approvalStatus === 'approved')
      && labels(c.name).some(Boolean)
      && (labels(c.city).some(city => palestinianCities.some(p => normalize(p) === normalize(city)))
      || labels(c.address).some(address => /palestine|فلسطين/i.test(address)
    && palestinianCities.some(city => normalize(address).includes(normalize(city)))))).map(center => ({
    ...center,
    matchingServices: (Array.isArray(center.services) ? center.services : []).filter(s => s.id && !['inactive', 'archived'].includes(s.status) && serviceMatches(s, `care:${care}`))
  })).filter(center => center.matchingServices.length > 0).filter((center, index, list) => list.findIndex(c => c.id === center.id) === index).slice(0, 2);
}
