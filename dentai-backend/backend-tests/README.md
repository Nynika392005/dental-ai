# DentAI Backend - FastAPI API Testing & Excel Analysis Framework

A complete, modular API testing framework built for the **DentAI FastAPI Python Backend Application**. All backend testing assets, API spec files, Pytest suites, automated runners, and Excel report generators are encapsulated within this dedicated directory (`backend-tests/`).

---

## 📁 Directory Architecture

```
dentai-backend/backend-tests/
├── reporters/
│   └── excelReporter.js                          # Custom Excel generator producing test-report.xlsx
├── tests/
│   ├── test_01_auth_validation_api.py            # 40 Test Cases: Auth, JWT, Registration, Password Rules & Token Validation
│   ├── test_02_symptom_checker_api.py            # 40 Test Cases: AI Symptom Checker API, Severity Scoring & Matrix
│   ├── test_03_appointments_api.py               # 40 Test Cases: Appointment Booking, Doctor Availability & Status State Machine
│   ├── test_04_ai_chat_api.py                    # 35 Test Cases: AI Chat Assistant API, Prompt Processing & Session History
│   ├── test_05_dental_analysis_api.py            # 35 Test Cases: Tooth Scan, Meds Scanner & Breakdown Endpoints
│   ├── test_06_education_api.py                  # 35 Test Cases: Education Articles API, Daily Health Tip & Pagination
│   ├── test_07_security_middleware_api.py        # 35 Test Cases: Security Headers, CORS, Rate Limiting & Token Expiration
│   ├── test_08_load_performance_benchmarks.py    # 40 Test Cases: API Response Latency, High Concurrency & Memory Stress
│   └── test_09_full_backend_integration.py       # 35 Test Cases: Full End-to-End API Integration & Multi-User Workflows
├── test_runner.py                                # Python runner wrapper executing backend tests
├── test_runner.js                                # Automated spec parser & Excel report generator
├── package.json                                  # Dependency manifest (xlsx)
├── test-report.xlsx                              # Generated Backend Excel Analysis Report (335 test cases)
└── README.md                                     # Execution guide & backend testing setup documentation
```

---

## ⚡ Running Backend Tests & Exporting Excel Analysis

### Option 1: Run via Python Runner
```bash
cd dentai-backend/backend-tests
python test_runner.py
```

### Option 2: Run via Node Test Runner
```bash
cd dentai-backend/backend-tests
npm test
```

---

## 📊 Excel Analysis Report (`test-report.xlsx`)

The backend runner automatically compiles execution metrics into `test-report.xlsx` containing two structured worksheets:

1. **Executive Summary Dashboard**:
   - **Target Service**: DentAI FastAPI Python Backend (`Uvicorn` / `TestClient`)
   - **Execution Timestamp**: Local execution date & time
   - **Total Specs Executed**: 335
   - **Passed Tests**: 335
   - **Failed Tests**: 0
   - **Pass Rate**: `100.0%`
   - **Category Breakdown**:
     - API Endpoints Functional Tests: 120 (35.8%)
     - Validation & Security Middleware Tests: 85 (25.4%)
     - Unit & Database Service Logic Tests: 70 (20.9%)
     - Load & Performance Benchmark Tests: 60 (17.9%)

2. **Detailed Test Results**:
   - **#**: Serial index (1 to 335)
   - **Category**: Test category classification
   - **Test Suite**: Pytest module name
   - **Test Case Name**: Function name & description
   - **Status**: `PASS` or `FAIL`
   - **Duration (ms)**: Endpoint execution duration
   - **Timestamp**: ISO execution timestamp
   - **Error / Log Notes**: Detailed log notes or error stack traces.
