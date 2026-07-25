# DentAI Mobile - Appium E2E Testing & Excel Analysis Framework

A complete, modular Appium End-to-End (E2E) testing framework built for the **DentAI Android Mobile Application**. All testing assets, Page Objects, automated runners, and Excel report generators are encapsulated within this dedicated directory (`appium-tests/`).

---

## 📁 Directory Architecture

```
dentai-mobile/appium-tests/
├── bin/
│   └── dentai-app.apk                # Built Android application binary
├── helpers/
│   └── pageObjects.js                # Page Object Model (POM) element selectors & actions
├── reporters/
│   └── excelReporter.js              # Custom Excel generator producing test-report.xlsx
├── tests/
│   ├── 01_auth.test.js               # E2E Login & Registration test cases
│   ├── 02_dashboard.test.js          # E2E Patient Dashboard & Quick Actions
│   ├── 03_symptom_checker.test.js    # E2E AI Symptom Checker workflow
│   ├── 04_appointments.test.js       # E2E Dental Visit Booking & Listing
│   ├── 05_ai_chat.test.js            # E2E AI Consultation Assistant Chat
│   ├── 06_dental_analysis.test.js    # E2E AI Tooth Scan & Breakdown analysis
│   ├── 07_education.test.js          # E2E Educational Hub & Category Filter
│   └── 08_full_e2e_journey.test.js   # Complete End-to-End User Lifecycle Journey
├── package.json                      # Test dependencies (xlsx, mocha, webdriverio, @wdio/cli)
├── wdio.conf.js                      # WebdriverIO & Appium Android driver configuration
├── test-runner.js                    # Test runner script generating Excel analysis reports
└── test-report.xlsx                  # Generated Excel analysis report artifact
```

---

## ⚡ Prerequisites & System Setup

1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **Appium Server**:
   Install Appium globally and set up the `uiautomator2` driver:
   ```bash
   npm install -g appium
   appium driver install uiautomator2
   ```
3. **Android SDK / Emulator**:
   - Install Android Studio with Android SDK & Platform-Tools (`adb`).
   - Start an Android Virtual Device (AVD) or connect a physical Android device via USB debugging.
4. **App Build Binary (APK)**:
   - Place your compiled `dentai-app.apk` in `./bin/dentai-app.apk` (or specify via `APP_PATH` environment variable).

---

## 🚀 Running the Tests & Generating Excel Analysis

### 1. Install Dependencies
Navigate into the separate `appium-tests` directory and install dependencies:
```bash
cd appium-tests
npm install
```

### 2. Start Appium Server (in a separate terminal)
```bash
appium
```

### 3. Run E2E Test Suite & Export Excel Report
Run the test runner script to execute all test specs and automatically produce the Excel spreadsheet analysis report:
```bash
npm run test:excel
```
*Alternatively, you can run `node test-runner.js` or `npm test`.*

---

## 📊 Excel Analysis Report (`test-report.xlsx`)

The test runner automatically compiles execution metrics into `test-report.xlsx` containing two structured worksheets:

1. **Executive Summary**:
   - **Target Platform**: Android Mobile Application (UiAutomator2)
   - **Execution Timestamp**: Date & time of test run
   - **Metrics**: Total test cases, passed count, failed count, pass rate %, total duration (seconds)
   - **Target Binary**: Path to tested `.apk` file

2. **Detailed Test Results**:
   - **#**: Serial index
   - **Test Suite**: Mocha spec suite title
   - **Test Case Name**: Individual test case title
   - **Status**: `PASS` or `FAIL`
   - **Duration (ms)**: Execution duration per test
   - **Timestamp**: ISO execution timestamp
   - **Error / Failure Log**: Detailed error stack traces if failed, or `N/A` if passed.
