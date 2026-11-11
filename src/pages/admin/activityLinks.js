// Where an activity event points: the record the event was about. Both the
// dashboard feed and the full log use this, so a new event kind only needs one
// entry here to become clickable everywhere.
export function activityPath(kind, relatedId) {
  if (!kind || relatedId == null || relatedId === '') return null;
  const id = encodeURIComponent(String(relatedId));

  switch (kind) {
    case 'centerSubmitted':
    case 'centerReviewed':
      // Centers have a real detail page.
      return `/admin/centers/${id}`;
    case 'patientJoined':
      // The profile lives in the patients list's view dialog.
      return `/admin/patients?patient=${id}`;
    case 'therapistJoined':
      return `/admin/physiotherapists?therapist=${id}`;
    case 'reviewPosted':
      return `/admin/reviews?review=${id}`;
    default:
      return null;
  }
}
