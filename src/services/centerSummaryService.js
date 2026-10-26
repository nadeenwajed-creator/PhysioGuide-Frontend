// Read model derived from the same records used by every management page.
export function getDashboardSummary(data) {
  const todayAppointments = data.appointments.filter(item => item.date === data.today && item.status !== 'cancelled');
  const upcoming = data.appointments.filter(item => item.date > data.today && ['pending', 'confirmed'].includes(item.status));
  const averageRating = data.reviews.length ? data.reviews.reduce((total, item) => total + item.rating, 0) / data.reviews.length : 0;
  return {
    todayAppointments: [...todayAppointments].sort((a, b) => a.time.localeCompare(b.time)),
    upcoming: [...upcoming].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    patientCount: data.patients.length,
    averageRating
  };
}
