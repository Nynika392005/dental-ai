describeLoad('AI Consultation Chat Assistant Load Benchmarks', () => {
  for (let i = 1; i <= 25; i++) {
    scenario(`LOAD-CHAT-${String(i).padStart(3, '0')}: AI Chat Message Query Concurrency VU-${i*10}`, '/api/v1/chat/message', 'POST');
  }
  for (let i = 26; i <= 40; i++) {
    scenario(`LOAD-CHAT-${String(i).padStart(3, '0')}: SSE Streaming Response Throughput VU-${(i-25)*15}`, '/api/v1/chat/stream', 'GET');
  }
  for (let i = 41; i <= 50; i++) {
    scenario(`LOAD-CHAT-${String(i).padStart(3, '0')}: Chat History Fetch Latency Benchmark VU-${(i-40)*20}`, '/api/v1/chat/history', 'GET');
  }
});
