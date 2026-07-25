describeLoad('Authentication & Security Load Benchmarks', () => {
  for (let i = 1; i <= 25; i++) {
    scenario(`LOAD-AUTH-${String(i).padStart(3, '0')}: Concurrent Patient Login Burst VU-${i*10}`, '/api/v1/auth/login', 'POST');
  }
  for (let i = 26; i <= 40; i++) {
    scenario(`LOAD-AUTH-${String(i).padStart(3, '0')}: Concurrent Dentist Login Burst VU-${(i-25)*10}`, '/api/v1/auth/login', 'POST');
  }
  for (let i = 41; i <= 50; i++) {
    scenario(`LOAD-AUTH-${String(i).padStart(3, '0')}: Token Verification Throughput VU-${(i-40)*20}`, '/api/v1/auth/me', 'GET');
  }
});
