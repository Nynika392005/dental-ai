describeLoad('Educational Knowledge Base Feed Load Benchmarks', () => {
  for (let i = 1; i <= 20; i++) {
    scenario(`LOAD-EDU-${String(i).padStart(3, '0')}: Educational Articles Feed Pagination Throughput VU-${i*15}`, '/api/v1/education/articles', 'GET');
  }
  for (let i = 21; i <= 35; i++) {
    scenario(`LOAD-EDU-${String(i).padStart(3, '0')}: Daily Health Tip Endpoint Response Speed VU-${(i-20)*20}`, '/api/v1/education/daily-tip', 'GET');
  }
  for (let i = 36; i <= 50; i++) {
    scenario(`LOAD-EDU-${String(i).padStart(3, '0')}: Live Articles Search Query Stress VU-${(i-35)*25}`, '/api/v1/education/search', 'GET');
  }
});
