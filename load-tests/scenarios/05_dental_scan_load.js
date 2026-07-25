describeLoad('Dental Image Scan & Vision AI Load Benchmarks', () => {
  for (let i = 1; i <= 20; i++) {
    scenario(`LOAD-SCAN-${String(i).padStart(3, '0')}: Tooth Scan Image Inference Payload Stress VU-${i*5}`, '/api/v1/analysis/scan?type=tooth', 'POST');
  }
  for (let i = 21; i <= 35; i++) {
    scenario(`LOAD-SCAN-${String(i).padStart(3, '0')}: Medicine Scan Barcode Match Payload VU-${(i-20)*10}`, '/api/v1/analysis/scan?type=medicine', 'POST');
  }
  for (let i = 36; i <= 50; i++) {
    scenario(`LOAD-SCAN-${String(i).padStart(3, '0')}: Scan History Summary Fetch Speed VU-${(i-35)*20}`, '/api/v1/analysis/history', 'GET');
  }
});
