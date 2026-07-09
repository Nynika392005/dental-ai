const Mocha = require('mocha');
const { EVENT_TEST_PASS, EVENT_TEST_FAIL } = Mocha.Runner.constants;
const XLSX = require('xlsx');
const path = require('path');

const mocha = new Mocha({
  timeout: 45000 // 45 seconds timeout for E2E tests
});

// Add the E2E test file to Mocha
mocha.addFile(path.join(__dirname, 'tests', 'full-app.test.js'));

const testResults = [];

console.log('Initializing DentAI E2E Selenium Test Runner...');

const runner = mocha.run((failures) => {
  console.log(`\nTest suite execution completed. Total failures: ${failures}`);
  
  try {
    // Generate Excel report
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Test Suite', 'Test Case Name', 'Status', 'Duration (ms)', 'Timestamp', 'Error Details']
    ];
    
    testResults.forEach(r => {
      worksheetData.push([
        r.suite,
        r.title,
        r.status,
        r.duration,
        r.timestamp,
        r.error || ''
      ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 25 }, // Test Suite
      { wch: 60 }, // Test Case Name
      { wch: 12 }, // Status
      { wch: 15 }, // Duration (ms)
      { wch: 25 }, // Timestamp
      { wch: 60 }  // Error Details
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'E2E Test Report');
    const reportPath = path.join(__dirname, 'test-report.xlsx');
    XLSX.writeFile(workbook, reportPath);
    console.log(`Excel test report successfully generated at: ${reportPath}`);
  } catch (err) {
    console.error('Failed to generate Excel report:', err.message);
  }
  
  process.exit(failures ? 1 : 0);
});

runner.on(EVENT_TEST_PASS, (test) => {
  testResults.push({
    suite: test.parent.title,
    title: test.title,
    status: 'PASS',
    duration: test.duration,
    timestamp: new Date().toISOString(),
    error: null
  });
});

runner.on(EVENT_TEST_FAIL, (test, err) => {
  testResults.push({
    suite: test.parent.title,
    title: test.title,
    status: 'FAIL',
    duration: test.duration || 0,
    timestamp: new Date().toISOString(),
    error: err.message
  });
});
