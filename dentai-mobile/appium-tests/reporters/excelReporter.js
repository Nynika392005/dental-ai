const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Extended Excel analysis report generator for Appium E2E test execution.
 * Supports 300+ test cases categorized into E2E Functional, Validation, Unit/API, and Load/Performance.
 */
function generateExcelReport(testResults, summary, outputPath) {
  const workbook = XLSX.utils.book_new();

  // Category counts calculation
  const categories = {
    'E2E Functional': testResults.filter(r => r.category === 'E2E Functional').length,
    'Validation & Bounds': testResults.filter(r => r.category === 'Validation & Bounds').length,
    'Unit & API Integration': testResults.filter(r => r.category === 'Unit & API Integration').length,
    'Load & Performance': testResults.filter(r => r.category === 'Load & Performance').length,
  };

  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(1) + '%' 
    : '0%';

  // ---------------------------------------------------------
  // Sheet 1: Executive Summary & Category Breakdown
  // ---------------------------------------------------------
  const summaryData = [
    ['DENTAI MOBILE APPIUM E2E TEST & PERFORMANCE ANALYSIS REPORT'],
    [''],
    ['Executive Summary Metric', 'Value', 'Description'],
    ['Target Platform', 'Android Mobile Application', 'UiAutomator2 Automation Engine'],
    ['Execution Timestamp', new Date().toLocaleString(), 'Local Execution Time'],
    ['Total Test Cases Executed', summary.total, 'Total test specifications run'],
    ['Passed Tests', summary.passed, 'Successfully verified specs'],
    ['Failed Tests', summary.failed, 'Assertions or timeouts failed'],
    ['Overall Pass Rate', passRate, 'Suite stability percentage'],
    ['Total Suite Duration', `${(summary.duration / 1000).toFixed(2)} seconds`, 'Cumulative test runtime'],
    ['App Binary Path', summary.appPath || './bin/dentai-app.apk', 'Target build package'],
    [''],
    ['Test Category Breakdown', 'Total Specs', 'Percentage of Suite'],
    ['E2E Functional User Journeys', categories['E2E Functional'], `${((categories['E2E Functional'] / summary.total) * 100).toFixed(1)}%`],
    ['Input & Form Validation Tests', categories['Validation & Bounds'], `${((categories['Validation & Bounds'] / summary.total) * 100).toFixed(1)}%`],
    ['Unit & Component API Integration Tests', categories['Unit & API Integration'], `${((categories['Unit & API Integration'] / summary.total) * 100).toFixed(1)}%`],
    ['Load & Performance Benchmark Tests', categories['Load & Performance'], `${((categories['Load & Performance'] / summary.total) * 100).toFixed(1)}%`]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 38 },
    { wch: 30 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // ---------------------------------------------------------
  // Sheet 2: Detailed Test Execution Breakdown (300+ Rows)
  // ---------------------------------------------------------
  const detailHeaders = ['#', 'Category', 'Test Suite', 'Test Case Name', 'Status', 'Duration (ms)', 'Timestamp', 'Error / Log Notes'];
  const detailRows = testResults.map((r, index) => [
    index + 1,
    r.category || 'E2E Functional',
    r.suite || 'Appium Test Suite',
    r.title,
    r.status,
    r.duration || 0,
    r.timestamp,
    r.error || 'N/A'
  ]);

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  detailSheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 25 },  // Category
    { wch: 35 },  // Test Suite
    { wch: 50 },  // Test Case Name
    { wch: 12 },  // Status
    { wch: 15 },  // Duration (ms)
    { wch: 25 },  // Timestamp
    { wch: 55 }   // Error / Log Notes
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Test Results');

  // ---------------------------------------------------------
  // Sheets 3 to 8: Individual 6 Suite Tabs (300 Specs Each)
  // ---------------------------------------------------------
  const suitesMap = {};
  testResults.forEach(r => {
    const sName = r.suite || 'General';
    if (!suitesMap[sName]) suitesMap[sName] = [];
    suitesMap[sName].push(r);
  });

  Object.keys(suitesMap).forEach((sName, idx) => {
    const suiteItems = suitesMap[sName];
    const sRows = suiteItems.map((r, index) => [
      index + 1,
      r.category || 'E2E Functional',
      r.title,
      r.status,
      r.duration || 0,
      r.timestamp,
      r.error || 'N/A'
    ]);
    const sSheet = XLSX.utils.aoa_to_sheet([['#', 'Category', 'Test Case Name', 'Status', 'Duration (ms)', 'Timestamp', 'Notes'], ...sRows]);
    sSheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 55 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 30 }];
    const sheetTabTitle = `${idx + 1}- ${sName.substring(0, 25)}`;
    XLSX.utils.book_append_sheet(workbook, sSheet, sheetTabTitle);
  });

  // Ensure target folder exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write Excel file
  XLSX.writeFile(workbook, outputPath);
  console.log(`\n=========================================================`);
  console.log(`📊 Comprehensive Excel Analysis Report Generated:`);
  console.log(`📍 Location: ${outputPath}`);
  console.log(`📈 Specs Executed: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Pass Rate: ${passRate}`);
  console.log(`=========================================================\n`);
}

module.exports = { generateExcelReport };
