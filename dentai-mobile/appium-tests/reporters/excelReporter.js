const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Generates an Excel analysis report for Appium E2E test execution.
 * 
 * @param {Array} testResults List of test result objects
 * @param {Object} summary Metrics summary object
 * @param {string} outputPath Target .xlsx file path
 */
function generateExcelReport(testResults, summary, outputPath) {
  const workbook = XLSX.utils.book_new();

  // ---------------------------------------------------------
  // Sheet 1: Summary Dashboard
  // ---------------------------------------------------------
  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(1) + '%' 
    : '0%';

  const summaryData = [
    ['DENTAI MOBILE APPIUM E2E TEST ANALYSIS REPORT'],
    [''],
    ['Metric Name', 'Value', 'Notes'],
    ['Target Platform', 'Android Mobile App', 'UiAutomator2 Automation'],
    ['Execution Timestamp', new Date().toLocaleString(), 'Local Execution Time'],
    ['Total Test Cases', summary.total, 'Total executed specs'],
    ['Passed Tests', summary.passed, 'Successfully verified'],
    ['Failed Tests', summary.failed, 'Assertions or timeouts failed'],
    ['Pass Rate', passRate, 'Overall test suite stability'],
    ['Total Duration', `${(summary.duration / 1000).toFixed(2)} seconds`, 'Cumulative test execution time'],
    ['App Package Path', summary.appPath || './bin/dentai-app.apk', 'Target build binary']
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set Summary Sheet Column Widths
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // ---------------------------------------------------------
  // Sheet 2: Detailed Test Execution Breakdown
  // ---------------------------------------------------------
  const detailHeaders = ['#', 'Test Suite', 'Test Case Name', 'Status', 'Duration (ms)', 'Timestamp', 'Error / Failure Log'];
  const detailRows = testResults.map((r, index) => [
    index + 1,
    r.suite || 'Appium E2E Suite',
    r.title,
    r.status,
    r.duration || 0,
    r.timestamp,
    r.error || 'N/A'
  ]);

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

  // Set Detail Sheet Column Widths
  detailSheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 30 },  // Test Suite
    { wch: 45 },  // Test Case Name
    { wch: 12 },  // Status
    { wch: 15 },  // Duration (ms)
    { wch: 25 },  // Timestamp
    { wch: 60 }   // Error Details
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Test Results');

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write Excel file
  XLSX.writeFile(workbook, outputPath);
  console.log(`\n=========================================================`);
  console.log(`📊 Excel Analysis Report successfully generated:`);
  console.log(`📍 Location: ${outputPath}`);
  console.log(`📈 Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Pass Rate: ${passRate}`);
  console.log(`=========================================================\n`);
}

module.exports = { generateExcelReport };
