const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Extended Excel analysis report generator for FastAPI Backend API test execution.
 * Supports 300+ backend test cases categorized into API Endpoints Functional, Validation & Security, Unit & Service, and Load & Performance.
 */
function generateExcelReport(testResults, summary, outputPath) {
  const workbook = XLSX.utils.book_new();

  const categories = {
    'API Endpoints Functional': testResults.filter(r => r.category === 'API Endpoints Functional').length,
    'Validation & Security': testResults.filter(r => r.category === 'Validation & Security').length,
    'Unit & Service Logic': testResults.filter(r => r.category === 'Unit & Service Logic').length,
    'Load & Performance': testResults.filter(r => r.category === 'Load & Performance').length,
  };

  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(1) + '%' 
    : '0%';

  // ---------------------------------------------------------
  // Sheet 1: Executive Summary & Category Breakdown
  // ---------------------------------------------------------
  const summaryData = [
    ['DENTAI FASTAPI BACKEND API TEST & PERFORMANCE ANALYSIS REPORT'],
    [''],
    ['Executive Summary Metric', 'Value', 'Description'],
    ['Target Service', 'DentAI FastAPI Python Backend', 'FastAPI Uvicorn / Pytest TestClient Engine'],
    ['Execution Timestamp', new Date().toLocaleString(), 'Local Execution Time'],
    ['Total Test Cases Executed', summary.total, 'Total backend test specifications run'],
    ['Passed Tests', summary.passed, 'Successfully verified specs'],
    ['Failed Tests', summary.failed, 'Assertions or timeouts failed'],
    ['Overall Pass Rate', passRate, 'Backend suite stability percentage'],
    ['Total Suite Duration', `${(summary.duration / 1000).toFixed(2)} seconds`, 'Cumulative test runtime'],
    ['Backend API Base URL', process.env.BACKEND_URL || 'http://localhost:8000', 'Target backend endpoint'],
    [''],
    ['Test Category Breakdown', 'Total Specs', 'Percentage of Suite'],
    ['API Endpoints Functional Tests', categories['API Endpoints Functional'], `${((categories['API Endpoints Functional'] / summary.total) * 100).toFixed(1)}%`],
    ['Validation & Security Middleware Tests', categories['Validation & Security'], `${((categories['Validation & Security'] / summary.total) * 100).toFixed(1)}%`],
    ['Unit & Database Service Logic Tests', categories['Unit & Service Logic'], `${((categories['Unit & Service Logic'] / summary.total) * 100).toFixed(1)}%`],
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
    r.category || 'API Endpoints Functional',
    r.suite || 'FastAPI Backend Suite',
    r.title,
    r.status,
    r.duration || 0,
    r.timestamp,
    r.error || 'N/A'
  ]);

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  detailSheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 28 },  // Category
    { wch: 35 },  // Test Suite
    { wch: 52 },  // Test Case Name
    { wch: 12 },  // Status
    { wch: 15 },  // Duration (ms)
    { wch: 25 },  // Timestamp
    { wch: 55 }   // Error / Log Notes
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Test Results');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  XLSX.writeFile(workbook, outputPath);
  console.log(`\n=========================================================`);
  console.log(`📊 Comprehensive Backend Excel Report Generated:`);
  console.log(`📍 Location: ${outputPath}`);
  console.log(`📈 Specs Executed: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Pass Rate: ${passRate}`);
  console.log(`=========================================================\n`);
}

module.exports = { generateExcelReport };
