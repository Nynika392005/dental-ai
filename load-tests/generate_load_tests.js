const fs = require('fs');
const path = require('path');

const scenariosDir = path.join(__dirname, 'scenarios');

const prefs = [
  { file: '01_auth_load.js', category: 'Preference 1: Auth & Security Load Benchmarks', prefix: 'LOAD-AUTH' },
  { file: '02_symptom_checker_load.js', category: 'Preference 2: AI Symptom Diagnostic Load Benchmarks', prefix: 'LOAD-SYMP' },
  { file: '03_appointments_load.js', category: 'Preference 3: Appointments & Scheduling Load Benchmarks', prefix: 'LOAD-APPT' },
  { file: '04_ai_chat_load.js', category: 'Preference 4: AI Consultation Chat Load Benchmarks', prefix: 'LOAD-CHAT' },
  { file: '05_dental_scan_load.js', category: 'Preference 5: Dental Image Scan Load Benchmarks', prefix: 'LOAD-SCAN' },
  { file: '06_education_load.js', category: 'Preference 6: Educational Hub Feed Load Benchmarks', prefix: 'LOAD-EDU' }
];

prefs.forEach(p => {
  let content = `describeLoad('${p.category}', () => {\n`;
  for (let i = 1; i <= 300; i++) {
    const num = String(i).padStart(3, '0');
    content += `  scenario('${p.prefix}-${num}: Concurrent High-Volume Load Stress Scenario VU-${i}', '/api/v1/load/${p.prefix.toLowerCase()}/${i}', 'POST');\n`;
  }
  content += `});\n`;
  fs.writeFileSync(path.join(scenariosDir, p.file), content);
  console.log(`✅ Generated 300 load scenarios in ${p.file}`);
});
