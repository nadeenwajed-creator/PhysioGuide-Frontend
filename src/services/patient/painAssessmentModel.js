import { careCategories, serviceMatches } from './specialtyMatching.js';

export { careCategories };
// Keep answers in React memory until submit; API codes are independent of UI ids
export const painAreas = ['neck', 'shoulder', 'upper_back', 'lower_back', 'arm_hand', 'hip', 'knee', 'leg_foot'];
export const durations = ['today', 'days_2_7', 'weeks_1_4', 'months_1_3', 'months_3_plus'];
export const descriptions = ['aching', 'stiffness', 'sharp', 'burning', 'tingling', 'movement', 'other'];
export const histories = ['none', 'previous_injury', 'previous_surgery', 'recent_injury'];

export const ASSESSMENT_DISCLAIMER = 'This assessment is for guidance only and does not provide a medical diagnosis or replace evaluation by a qualified healthcare professional.';

const areaToApi = {
  neck: 'Neck',
  shoulder: 'Shoulder',
  upper_back: 'UpperBack',
  lower_back: 'LowerBack',
  arm_hand: 'ArmHand',
  hip: 'Hip',
  knee: 'Knee',
  leg_foot: 'LegFoot'
};
const durationToApi = {
  today: 'Today',
  days_2_7: 'TwoToSevenDays',
  weeks_1_4: 'OneToFourWeeks',
  months_1_3: 'OneToThreeMonths',
  months_3_plus: 'MoreThanThreeMonths'
};
const descriptionToApi = {
  aching: 'Aching',
  stiffness: 'Stiffness',
  sharp: 'Sharp',
  burning: 'Burning',
  tingling: 'NumbnessTingling',
  movement: 'PainWithMovement',
  other: 'Other'
};
const historyToApi = {
  none: 'None',
  previous_injury: 'PreviousInjury',
  previous_surgery: 'PreviousSurgery',
  recent_injury: 'RecentInjury'
};
const careMatch = {
  ProfessionalReview: 'general',
  GeneralPhysiotherapyGuidance: 'general',
  PostSurgicalRehabilitation: 'postsurgery',
  PersistentPainPhysiotherapy: 'persistent',
  SpinalPhysiotherapy: 'back',
  UpperLimbPhysiotherapy: 'upperLimb',
  LowerLimbPhysiotherapy: 'lowerLimb',
  GeneralPhysiotherapy: 'musculoskeletal'
};

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

export function toAssessmentSubmission(state) {
  if (!completeAssessment(state)) return null;
  const answers = {
    painLocation: state.painAreas.length > 1 ? 'MultipleAreas' : areaToApi[state.painAreas[0]],
    painSeverity: state.intensity,
    duration: durationToApi[state.duration],
    painDescriptions: descriptions.filter(id => state.descriptions.includes(id)).map(id => descriptionToApi[id]),
    previousInjurySurgery: historyToApi[state.relatedHistory]
  };
  const other = String(state.otherDescription || '').trim();
  if (other && state.descriptions.includes('other')) answers.otherDescription = other.slice(0, 500);
  return answers;
}

export function careMatchKey(code) {
  return careMatch[code] || 'musculoskeletal';
}

export function matchingCareKeys(result, state) {
  const keys = new Set();
  const mapped = careMatchKey(result?.suggestedCare?.code);
  if (mapped) keys.add(mapped);
  if (state?.painAreas?.every(area => ['neck', 'upper_back', 'lower_back'].includes(area)) && state.painAreas.length) {
    keys.add('back');
  }
  if (state?.painAreas?.length === 1 && state.painAreas[0] === 'knee') keys.add('knee');
  return [...keys];
}

function interpretSeverity(severity) {
  if (severity === 0) return 'NoPain';
  if (severity <= 3) return 'Mild';
  if (severity <= 6) return 'Moderate';
  return 'Severe';
}

// Same precedence as AssessmentCareRules on the API. Product guidance only.
export function suggestedCareFromAnswers(answers) {
  if (!answers?.painLocation || !Number.isInteger(answers.painSeverity) || !answers.duration
    || !Array.isArray(answers.painDescriptions) || !answers.previousInjurySurgery) return null;
  const descriptions = answers.painDescriptions;
  const context = `Location: ${answers.painLocation}. Severity: ${answers.painSeverity}/10 (${interpretSeverity(answers.painSeverity)}). Duration: ${answers.duration}.`;
  if (answers.painSeverity >= 7 || answers.previousInjurySurgery === 'RecentInjury'
    || descriptions.includes('NumbnessTingling')) {
    return {
      code: 'ProfessionalReview',
      nameEnglish: 'Healthcare professional review before physiotherapy',
      nameArabic: 'تقييم مختص رعاية صحية قبل العلاج الطبيعي',
      explanation: `${context} Severe pain, a recent injury, or numbness/tingling warrants individual professional evaluation before choosing physiotherapy care.`,
      followUp: 'Arrange a qualified healthcare professional evaluation. These five questions cannot determine urgency; seek prompt medical help for sudden, worsening, or concerning symptoms.'
    };
  }
  if (answers.painSeverity === 0) {
    return {
      code: 'GeneralPhysiotherapyGuidance',
      nameEnglish: 'General physiotherapy guidance',
      nameArabic: 'إرشاد عام للعلاج الطبيعي',
      explanation: `${context} No pain is reported on the severity scale; general physiotherapy guidance may help address any remaining movement concerns.`,
      followUp: 'Discuss persistent stiffness, movement concerns, or other symptoms with a qualified professional. A zero pain score does not rule out a health problem.'
    };
  }
  if (answers.previousInjurySurgery === 'PreviousSurgery') {
    return {
      code: 'PostSurgicalRehabilitation',
      nameEnglish: 'Assessment for rehabilitation after previous surgery',
      nameArabic: 'تقييم التأهيل بعد جراحة سابقة',
      explanation: `${context} A previous surgery makes an individual rehabilitation assessment appropriate before selecting exercises or treatment.`,
      followUp: 'Discuss whether the previous surgery is relevant with your clinician or physiotherapist, and follow any existing surgical restrictions.'
    };
  }
  if (answers.duration === 'MoreThanThreeMonths') {
    return {
      code: 'PersistentPainPhysiotherapy',
      nameEnglish: 'Physiotherapy assessment for persistent pain',
      nameArabic: 'تقييم العلاج الطبيعي للألم المستمر',
      explanation: `${context} Pain reported for more than three months suggests discussing a tailored physiotherapy care plan.`,
      followUp: 'Arrange an individual physiotherapy evaluation and discuss how the symptoms affect daily activities.'
    };
  }
  const regional = {
    Neck: ['SpinalPhysiotherapy', 'Neck and back physiotherapy assessment', 'تقييم العلاج الطبيعي للرقبة والظهر'],
    UpperBack: ['SpinalPhysiotherapy', 'Neck and back physiotherapy assessment', 'تقييم العلاج الطبيعي للرقبة والظهر'],
    LowerBack: ['SpinalPhysiotherapy', 'Neck and back physiotherapy assessment', 'تقييم العلاج الطبيعي للرقبة والظهر'],
    Shoulder: ['UpperLimbPhysiotherapy', 'Upper limb physiotherapy assessment', 'تقييم العلاج الطبيعي للطرف العلوي'],
    ArmHand: ['UpperLimbPhysiotherapy', 'Upper limb physiotherapy assessment', 'تقييم العلاج الطبيعي للطرف العلوي'],
    Hip: ['LowerLimbPhysiotherapy', 'Lower limb physiotherapy assessment', 'تقييم العلاج الطبيعي للطرف السفلي'],
    Knee: ['LowerLimbPhysiotherapy', 'Lower limb physiotherapy assessment', 'تقييم العلاج الطبيعي للطرف السفلي'],
    LegFoot: ['LowerLimbPhysiotherapy', 'Lower limb physiotherapy assessment', 'تقييم العلاج الطبيعي للطرف السفلي']
  }[answers.painLocation] || ['GeneralPhysiotherapy', 'General musculoskeletal physiotherapy assessment', 'تقييم عام للعلاج الطبيعي العضلي الهيكلي'];
  return {
    code: regional[0],
    nameEnglish: regional[1],
    nameArabic: regional[2],
    explanation: `${context} The reported location guides the suggested physiotherapy care category.`,
    followUp: 'Discuss an appropriate care plan with a qualified physiotherapist if symptoms persist or affect daily activities.'
  };
}

export function buildAssessmentResult(answers, extras = {}) {
  const suggestedCare = suggestedCareFromAnswers(answers);
  return {
    assessmentId: extras.assessmentId ?? null,
    createdAt: extras.createdAt || new Date().toISOString(),
    isPainAssessment: Boolean(suggestedCare),
    answers: suggestedCare ? answers : null,
    severityInterpretation: suggestedCare ? interpretSeverity(answers.painSeverity) : null,
    suggestedCare,
    suggestedSpecialtyId: extras.suggestedSpecialtyId ?? null,
    suggestedSpecialtyName: extras.suggestedSpecialtyName ?? null,
    disclaimer: extras.disclaimer || ASSESSMENT_DISCLAIMER,
    matchKey: careMatchKey(suggestedCare?.code)
  };
}

export function toAssessmentResult(body) {
  if (!body) return null;
  const suggestedCare = body.suggestedCare ? {
    code: body.suggestedCare.code,
    nameEnglish: body.suggestedCare.nameEnglish,
    nameArabic: body.suggestedCare.nameArabic,
    explanation: body.suggestedCare.explanation,
    followUp: body.suggestedCare.followUp
  } : null;
  return {
    assessmentId: body.assessmentId ?? null,
    createdAt: body.createdAt || null,
    isPainAssessment: body.isPainAssessment !== false,
    answers: body.answers || null,
    severityInterpretation: body.severityInterpretation || null,
    suggestedCare,
    suggestedSpecialtyId: body.suggestedSpecialtyId ?? null,
    suggestedSpecialtyName: body.suggestedSpecialtyName || null,
    disclaimer: body.disclaimer || ASSESSMENT_DISCLAIMER,
    matchKey: careMatchKey(suggestedCare?.code)
  };
}

export function suggestCare(state) {
  const answers = toAssessmentSubmission(state);
  if (!answers) return null;
  return careMatchKey(suggestedCareFromAnswers(answers).code);
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
  const keys = (Array.isArray(care) ? care : [care]).filter(Boolean);
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
    matchingServices: (Array.isArray(center.services) ? center.services : []).filter(s => s.id && !['inactive', 'archived'].includes(s.status)
      && keys.some(key => serviceMatches(s, `care:${key}`)))
  })).filter(center => center.matchingServices.length > 0).filter((center, index, list) => list.findIndex(c => c.id === center.id) === index).slice(0, 2);
}
