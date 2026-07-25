describeLoad('Appointments Booking & Availability Load Benchmarks', () => {
  for (let i = 1; i <= 20; i++) {
    scenario(`LOAD-APPT-${String(i).padStart(3, '0')}: Concurrent Appointment Booking Submissions VU-${i*10}`, '/api/v1/appointments/', 'POST');
  }
  for (let i = 21; i <= 35; i++) {
    scenario(`LOAD-APPT-${String(i).padStart(3, '0')}: Patient Appointments List Fetch Throughput VU-${(i-20)*15}`, '/api/v1/appointments/patient', 'GET');
  }
  for (let i = 36; i <= 50; i++) {
    scenario(`LOAD-APPT-${String(i).padStart(3, '0')}: Doctor Time Slots Concurrency Lock VU-${(i-35)*20}`, '/api/v1/appointments/slots', 'GET');
  }
});
