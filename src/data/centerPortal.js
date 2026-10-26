import demoNote from '../assets/documents/demo-session-note.txt?url';
import { dateKey } from '../utils/centerFormat.js';
import room from '../assets/images/center/center-treatment-room.webp';
import gym from '../assets/images/center/center-gym.webp';
import reception from '../assets/images/center/center-reception.webp';
import manual from '../assets/images/landing/physiotherapy-hero.webp';
import sports from '../assets/images/center/sports-rehabilitation.webp';
import back from '../assets/images/center/back-pain.webp';
import knee from '../assets/images/center/knee-rehabilitation.webp';
import surgery from '../assets/images/center/post-surgery.webp';
import pediatric from '../assets/images/center/pediatric-therapy.webp';
import portrait1 from '../assets/images/center/portrait-01.webp';
import portrait2 from '../assets/images/center/portrait-02.webp';
import portrait3 from '../assets/images/center/portrait-03.webp';
import portrait4 from '../assets/images/center/portrait-04.webp';
import portrait5 from '../assets/images/center/portrait-05.webp';
import portrait6 from '../assets/images/center/portrait-06.webp';
const bilingual = (en, ar) => ({
  en,
  ar
});
const portraits = [portrait1, portrait2, portrait3, portrait4, portrait5, portrait6];

// Entirely fictional fixtures. The adapter is the only consumer of this seed.
export function createCenterPortalData(now = new Date()) {
  const today = dateKey(now);
  const relative = days => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  };
  const patientNames = [['Ahmad Ali', 'أحمد علي'], ['Lina Omar', 'لينا عمر'], ['Yara Nasser', 'يارا ناصر'], ['Omar Saleh', 'عمر صالح'], ['Rania Ahmad', 'رانيا أحمد'], ['Khaled Saeed', 'خالد سعيد'], ['Sara Ibrahim', 'سارة إبراهيم'], ['Mohammad Taha', 'محمد طه']];
  const patients = patientNames.map(([en, ar], index) => ({
    id: `patient-${index + 1}`,
    name: bilingual(en, ar),
    imageUrl: portraits[[0, 1, 2, 3, 4, 5, 1, 0][index]],
    email: `patient${index + 1}@example.com`,
    phone: `059000000${index + 1}`,
    birthDate: `${1990 + index}-03-15`,
    gender: ['male', 'female', 'female', 'male', 'female', 'male', 'female', 'male'][index],
    status: index === 3 ? 'inactive' : 'active',
    notes: []
  }));
  const services = [['Manual Therapy', 'العلاج اليدوي', 25, 45, manual, 'Hands-on care to support movement and comfort.', 'رعاية يدوية لدعم الحركة والراحة.'], ['Sports Rehabilitation', 'التأهيل الرياضي', 30, 60, sports, 'Individual rehabilitation and a gradual return to movement.', 'تأهيل فردي وعودة تدريجية للحركة.'], ['Back Pain Treatment', 'علاج آلام الظهر', 25, 45, back, 'Personalized care for back pain and mobility.', 'رعاية تناسب احتياجات آلام الظهر والحركة.'], ['Knee Rehabilitation', 'تأهيل الركبة', 30, 60, knee, 'Guided exercise and rehabilitation for knee function.', 'تمارين بإشراف المختص لدعم وظيفة الركبة.'], ['Post-Surgery Rehabilitation', 'التأهيل بعد الجراحة', 35, 60, surgery, 'A supervised recovery plan following surgery.', 'خطة تعافٍ بإشراف مختص بعد الجراحة.'], ['Pediatric Physiotherapy', 'العلاج الطبيعي للأطفال', 25, 45, pediatric, 'Supportive movement activities for children.', 'أنشطة حركية داعمة للأطفال.']].map(([en, ar, price, duration, imageUrl, description, descriptionAr], index) => ({
    id: `service-${index + 1}`,
    name: bilingual(en, ar),
    description: bilingual(description, descriptionAr),
    price,
    duration,
    imageUrl,
    status: 'active'
  }));
  const therapistNames = [['Dr. Sara Ahmad', 'د. سارة أحمد'], ['Dr. Ahmad Nasser', 'د. أحمد ناصر'], ['Dr. Rami Khalil', 'د. رامي خليل'], ['Dr. Lina Qasem', 'د. لينا قاسم'], ['Dr. Reem Salameh', 'د. ريم سلامة'], ['Dr. Fadi Odeh', 'د. فادي عودة']];
  const therapists = therapistNames.map(([en, ar], index) => ({
    id: `therapist-${index + 1}`,
    name: bilingual(en, ar),
    imageUrl: portraits[[1, 3, 0, 4, 2, 5][index]],
    email: `therapist${index + 1}@example.com`,
    phone: `059000001${index}`,
    specialty: services[index].name,
    experience: 4 + index,
    price: services[index].price,
    availability: index === 3 ? 'unavailable' : 'available',
    rating: [4.9, 4.9, 4.8, 4.7, 4.6, 4.5][index],
    completedSessions: 420 + index * 35,
    about: bilingual('Helping you move with confidence through thoughtful, individual care.', 'رعاية فردية مدروسة تساعدك على الحركة بثقة.')
  }));
  // Consistent IDs link schedules, patient history, reviews, and conversations.
  const appointments = Array.from({
    length: 24
  }, (_, index) => ({
    id: `appointment-${index + 1}`,
    patientId: patients[index % 8].id,
    therapistId: therapists[index % 3].id,
    serviceId: services[index % 6].id,
    date: index < 11 ? today : relative(index < 20 ? 1 + Math.floor((index - 11) / 5) : -1),
    time: `${String(9 + Math.floor(index % 11 / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
    status: index >= 20 ? 'completed' : index % 4 === 1 ? 'pending' : 'confirmed',
    origin: index % 4 === 1 ? 'patient' : 'center',
    durationMinutes: services[index % 6].duration,
    note: ''
  }));
  const reviews = [5, 5, 4, 5, 4].map((rating, index) => ({
    id: `review-${index + 1}`,
    patientId: patients[index].id,
    rating,
    date: relative(-index - 1),
    text: bilingual(['Professional and welcoming staff. Thank you for your care.', 'A comfortable center and a helpful team.', 'The team explained my appointments clearly.', 'A well-organized experience from booking to the session.', 'Friendly staff and thoughtful support.'][index], ['فريق محترف ومتعاون. شكرًا على رعايتكم.', 'مركز مريح وفريق متعاون.', 'شرح الفريق تفاصيل مواعيدي بوضوح.', 'تجربة منظمة من الحجز حتى الجلسة.', 'تعامل لطيف ودعم باهتمام.'][index]),
    reply: '',
    reported: false
  }));
  const conversations = patients.slice(0, 6).map((patient, index) => ({
    id: `conversation-${index + 1}`,
    patientId: patient.id,
    therapistId: 'therapist-3',
    unreadCount: index === 0 ? 2 : index === 1 ? 1 : 0,
    messages: [{
      id: `message-${index}-1`,
      direction: 'outgoing',
      text: bilingual('Hello. How did you feel after our last session?', 'مرحبًا، كيف شعرت بعد جلستنا الأخيرة؟'),
      sentAt: `${today}T10:12:00`,
      status: 'sent',
      attachments: []
    }, {
      id: `message-${index}-2`,
      direction: 'incoming',
      text: bilingual('Thank you. I have a few questions for our next appointment.', 'شكرًا لك. لدي بعض الأسئلة لموعدنا القادم.'),
      sentAt: `${today}T10:15:00`,
      attachments: []
    }]
  }));
  conversations[0].messages.push({
    id: 'demo-attachment-message',
    direction: 'outgoing',
    text: bilingual('A sample attachment for this demo.', 'مرفق نموذجي لهذه التجربة.'),
    sentAt: `${today}T10:18:00`,
    status: 'sent',
    attachments: [{
      id: 'demo-note',
      name: 'demo-session-note.txt',
      size: 387,
      type: 'text/plain',
      url: demoNote
    }]
  });
  return {
    today,
    center: {
      id: 'center-demo',
      name: bilingual('Nablus Physio Center', 'مركز نابلس للعلاج الطبيعي'),
      email: 'center@example.com',
      phone: '0590000020',
      address: bilingual('Nablus, Palestine', 'نابلس، فلسطين'),
      about: bilingual('A physiotherapy center providing personal care for musculoskeletal, neurological and sports rehabilitation.', 'مركز علاج طبيعي يقدم رعاية فردية لتأهيل العضلات والأعصاب والإصابات الرياضية.'),
      imageUrl: room,
      gallery: [room, gym, reception, manual],
      hours: {
        weekStart: '09:00',
        weekEnd: '20:00',
        fridayStart: '10:00',
        fridayEnd: '16:00'
      }
    },
    patients,
    therapists,
    services,
    appointments,
    reviews,
    conversations,
    notificationPreferences: {
      appointments: true,
      reviews: true,
      patients: true
    },
    notifications: [{
      id: 'notification-1',
      type: 'appointment',
      title: bilingual('New appointment request', 'طلب موعد جديد'),
      message: bilingual('An appointment is waiting for confirmation.', 'هناك موعد بانتظار التأكيد.'),
      isRead: false,
      createdAt: now.toISOString()
    }, {
      id: 'notification-2',
      type: 'review',
      title: bilingual('New patient review', 'تقييم جديد من مريض'),
      message: bilingual('Read the latest feedback from your patients.', 'اطّلع على أحدث آراء مرضاك.'),
      isRead: false,
      createdAt: now.toISOString()
    }, {
      id: 'notification-3', type: 'patient',
      title: bilingual('Patient record added', 'أُضيف سجل مريض'),
      message: bilingual('A fictional patient record is ready to review.', 'سجل مريض تجريبي جاهز للمراجعة.'),
      isRead: false, createdAt: now.toISOString()
    }],
    portraitOptions: portraits,
    serviceImageOptions: services.map(service => service.imageUrl)
  };
}
