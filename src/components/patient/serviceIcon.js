import {
  faBone,
  faBriefcaseMedical,
  faChild,
  faHand,
  faPersonRunning,
  faVenus
} from '@fortawesome/free-solid-svg-icons';

// Choose the icon from the service label, not its ID
export function serviceIcon(service) {
  const label = [service.category, service.name?.en, service.name?.ar].filter(v => typeof v === 'string').join(' ');
  if (/sport|rehabilitation|رياض/i.test(label)) return faPersonRunning;
  if (/manual|massage|يدوي/i.test(label)) return faHand;
  if (/back|neck|knee|orthop|ظهر|رقبة|ركبة/i.test(label)) return faBone;
  if (/women|pelvic|نساء/i.test(label)) return faVenus;
  if (/pediatric|child|أطفال/i.test(label)) return faChild;
  return faBriefcaseMedical;
}
