const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('DentAI Complete End-to-End Application Testing', function () {
  this.timeout(60000); // 60 seconds timeout per test case for full flows
  let driver;

  // Shared variables
  const baseTestUrl = process.env.TEST_URL || 'https://Nynika392005.github.io/dental-ai/';
  const dentistEmail = `e2e.dr.smith-${Date.now()}@example.com`;
  const patientEmail = `e2e.patient.jones-${Date.now()}@example.com`;
  const dentistPhone = `+1555${Math.floor(1000 + Math.random() * 9000)}`;
  const patientPhone = `+1555${Math.floor(1000 + Math.random() * 9000)}`;
  const securePassword = 'SecurePass123!';
  const clinicName = `E2E Dental Studio ${Date.now()}`;

  before(async function () {
    const options = new chrome.Options();
    options.addArguments('--window-size=1920,1080');
    if (process.env.CI) {
      options.addArguments('--headless');
      options.addArguments('--disable-gpu');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
    }

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.manage().window().setRect({ width: 1920, height: 1080 });
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  // helper function to wait for redirect and clear cookies/localStorage
  async function resetSession() {
    await driver.executeScript('window.localStorage.clear();');
    await driver.executeScript('window.sessionStorage.clear();');
    await driver.manage().deleteAllCookies();
  }

  it('1. Should register a new Dentist and create a Clinic profile', async function () {
    const registerUrl = `${baseTestUrl.replace(/\/$/, '')}/#/register`;
    console.log(`Navigating to register page: ${registerUrl}`);
    await driver.get(registerUrl);

    // Fill registration form
    const roleSelect = await driver.wait(
      until.elementLocated(By.id('role')),
      10000,
      'Role select dropdown not found'
    );
    await roleSelect.sendKeys('Dentist');

    const fullNameInput = await driver.findElement(By.id('fullName'));
    await fullNameInput.sendKeys('Dr. Sarah E2E Smith');

    const emailInput = await driver.findElement(By.id('email'));
    await emailInput.sendKeys(dentistEmail);

    const phoneInput = await driver.findElement(By.id('phone'));
    await phoneInput.sendKeys(dentistPhone);

    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys(securePassword);

    // Fill Dentist-specific professional details
    const clinicNameInput = await driver.wait(
      until.elementLocated(By.id('clinicName')),
      5000,
      'Clinic Name input not found'
    );
    await clinicNameInput.sendKeys(clinicName);

    const clinicAddressInput = await driver.findElement(By.id('clinicAddress'));
    await clinicAddressInput.sendKeys('456 E2E Medical Plaza, NY');

    const specializationSelect = await driver.findElement(By.id('specialization'));
    await specializationSelect.sendKeys('General Dentistry');

    const bioInput = await driver.findElement(By.id('bio'));
    await bioInput.sendKeys('Expert Dentist dedicated to Selenium automation testing.');

    // Submit registration
    const registerButton = await driver.findElement(By.id('register-button'));
    await registerButton.click();

    // Verify redirect to Dentist Dashboard
    console.log('Waiting for redirect to dentist dashboard...');
    await driver.wait(
      until.urlContains('/dashboard'),
      15000,
      'Failed to redirect to Dentist dashboard'
    );

    const currentUrl = await driver.getCurrentUrl();
    assert.ok(currentUrl.includes('/dashboard'), 'URL does not contain /dashboard');
    console.log('Dentist registered and logged in successfully.');

    // Sign out to prepare for patient flows
    const logoutButton = await driver.wait(
      until.elementLocated(By.className('logout-btn')),
      10000,
      'Logout button not found'
    );
    await driver.executeScript("arguments[0].scrollIntoView(true);", logoutButton);
    await driver.sleep(500);
    await logoutButton.click();
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !url.includes('/dashboard');
    }, 15000, 'Logout did not clear dashboard session within 15s');
    await resetSession();
  });

  it('2. Should register a new Patient and load the Patient Portal', async function () {
    await resetSession();
    const registerUrl = `${baseTestUrl.replace(/\/$/, '')}/#/register`;
    console.log(`Navigating to register page: ${registerUrl}`);
    await driver.get(registerUrl);

    // Fill registration form for Patient
    const fullNameInput = await driver.wait(
      until.elementLocated(By.id('fullName')),
      10000,
      'Full Name input not found'
    );
    await fullNameInput.sendKeys('Alice Jones E2E');

    const emailInput = await driver.findElement(By.id('email'));
    await emailInput.sendKeys(patientEmail);

    const phoneInput = await driver.findElement(By.id('phone'));
    await phoneInput.sendKeys(patientPhone);

    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys(securePassword);

    // Submit registration
    const registerButton = await driver.findElement(By.id('register-button'));
    await registerButton.click();

    // Verify redirect to Patient Dashboard
    console.log('Waiting for redirect to patient dashboard...');
    await driver.wait(
      until.urlContains('/dashboard'),
      15000,
      'Failed to redirect to Patient dashboard'
    );

    const currentUrl = await driver.getCurrentUrl();
    assert.ok(currentUrl.includes('/dashboard'), 'URL does not contain /dashboard');
    console.log('Patient registered and logged in successfully.');
  });

  it('3. Should complete the Symptom Checker Diagnostic Wizard', async function () {
    // Navigate to Symptom Checker
    console.log('Navigating to Symptom Checker...');
    const symptomLink = await driver.wait(
      until.elementLocated(By.css('a[href="#/symptom-checker"]')),
      10000,
      'Symptom Checker navigation link not found'
    );
    await driver.executeScript("arguments[0].scrollIntoView(true);", symptomLink);
    await driver.sleep(500);
    await symptomLink.click();

    // Step 1: Select symptoms
    console.log('Selecting symptoms...');
    const symptomCards = await driver.wait(
      until.elementsLocated(By.className('symptom-checkbox')),
      10000,
      'No symptom options found'
    );
    // Click the first symptom card
    await symptomCards[0].click();

    // Click Next
    const nextBtn1 = await driver.findElement(By.className('wizard-btn-next'));
    await nextBtn1.click();

    // Step 2: Submit assessment
    console.log('Submitting assessment...');
    const runDiagnosticsBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Run Diagnostics')]")),
      5000,
      'Run Diagnostics button not found'
    );
    await runDiagnosticsBtn.click();

    // Step 3: Verify results card renders
    console.log('Verifying AI diagnostics result output...');
    const resultCard = await driver.wait(
      until.elementLocated(By.className('assessment-result-card')),
      15000,
      'Diagnostics results card not found'
    );
    
    const isDisplayed = await resultCard.isDisplayed();
    assert.ok(isDisplayed, 'Diagnostic result card is not displayed');
    console.log('Symptom diagnostics completed successfully!');
  });

  it('4. Should book a Checkup Appointment with the registered Dentist', async function () {
    // Navigate to Appointment booking
    console.log('Navigating to Appointment booking...');
    const appointmentLink = await driver.wait(
      until.elementLocated(By.css('a[href="#/appointments"]')),
      10000,
      'Book Visit navigation link not found'
    );
    await driver.executeScript("arguments[0].scrollIntoView(true);", appointmentLink);
    await driver.sleep(500);
    await appointmentLink.click();

    // Select Clinic matching clinicName
    console.log('Selecting clinic...');
    const clinicCard = await driver.wait(
      until.elementLocated(By.xpath(`//div[contains(@class, 'clinic-card')][.//span[contains(text(), '${clinicName}')]]`)),
      20000,
      `Clinic card for ${clinicName} not found`
    );
    await clinicCard.click();

    // Select Dentist
    console.log('Selecting dentist...');
    const dentistCards = await driver.wait(
      until.elementsLocated(By.className('dentist-card')),
      5000,
      'No dentists available for selected clinic'
    );
    await dentistCards[0].click();

    // Select Date
    console.log('Selecting date...');
    const dateInput = await driver.findElement(By.className('date-input'));
    
    // Set a date that is guaranteed to be a weekday (Monday-Friday) to ensure slots are available
    const targetDate = new Date();
    let daysToAdd = 2;
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    if (targetDate.getDay() === 6) { // Saturday
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (targetDate.getDay() === 0) { // Sunday
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const dateString = targetDate.toISOString().split('T')[0];
    
    // Set the value using the native input value setter so React tracks the state change
    await driver.executeScript(`
      const input = arguments[0];
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(input, '${dateString}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    `, dateInput);

    // Select Time Slot
    console.log('Selecting time slot...');
    const slotBtns = await driver.wait(
      until.elementsLocated(By.className('slot-btn')),
      5000,
      'No slot buttons available for selected date'
    );
    await slotBtns[0].click();

    // Fill appointment reason
    const reasonInput = await driver.findElement(By.xpath("//input[@placeholder='e.g., Routine cleaning, severe toothache']"));
    await reasonInput.sendKeys('Routine checkup and plaque removal');

    // Click confirm booking
    const bookButton = await driver.findElement(By.xpath("//button[contains(text(), 'Book Appointment')]"));
    await bookButton.click();

    // Verify success banner or card listing
    console.log('Verifying appointment booking success...');
    const successBanner = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Appointment booked successfully!')]")),
      10000,
      'Success banner not found'
    );
    const isDisplayed = await successBanner.isDisplayed();
    assert.ok(isDisplayed, 'Success message is not displayed');
    console.log('Appointment scheduled successfully!');
  });

  it('5. Should update personal information in Profile details', async function () {
    // Navigate to Profile page
    console.log('Navigating to Profile settings...');
    // Sidebar profile container link
    const profileLink = await driver.wait(
      until.elementLocated(By.className('sidebar-profile')),
      10000,
      'Profile navigation container not found'
    );
    await driver.executeScript("arguments[0].scrollIntoView(true);", profileLink);
    await driver.sleep(500);
    await profileLink.click();

    // Update Full Name
    console.log('Updating profile fields...');
    const fullNameInput = await driver.wait(
      until.elementLocated(By.id('profile-fullName')),
      5000,
      'Profile name input not found'
    );
    await fullNameInput.clear();
    await fullNameInput.sendKeys('Alice Jones E2E Mod');

    // Update Phone
    const phoneInput = await driver.findElement(By.id('profile-phone'));
    await phoneInput.clear();
    const newPhone = `+1555${Math.floor(100000 + Math.random() * 900000)}`;
    await phoneInput.sendKeys(newPhone);

    // Save changes
    const saveButton = await driver.findElement(By.id('profile-save'));
    await saveButton.click();

    // Verify success confirmation banner
    const successBanner = await driver.wait(
      until.elementLocated(By.xpath("//div[contains(., 'Profile updated successfully!')]")),
      15000,
      'Profile update success confirmation not found'
    );
    const isDisplayed = await successBanner.isDisplayed();
    assert.ok(isDisplayed, 'Success banner not displayed');
    console.log('Profile fields modified and saved successfully!');

    // Sign out patient
    const logoutButton = await driver.findElement(By.className('logout-btn'));
    await driver.executeScript("arguments[0].scrollIntoView(true);", logoutButton);
    await driver.sleep(500);
    await logoutButton.click();
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !url.includes('/dashboard');
    }, 15000, 'Logout did not clear dashboard session within 15s');
    await resetSession();
  });

  it('6. Dentist should log in and see the patient scheduled appointment', async function () {
    await resetSession();
    const loginUrl = `${baseTestUrl.replace(/\/$/, '')}/#/login`;
    console.log(`Navigating to login page: ${loginUrl}`);
    await driver.get(loginUrl);

    // Fill Dentist credentials
    const emailInput = await driver.wait(
      until.elementLocated(By.id('email')),
      10000,
      'Email input field not found'
    );
    await emailInput.sendKeys(dentistEmail);

    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys(securePassword);

    const loginButton = await driver.findElement(By.id('login-button'));
    await loginButton.click();

    // Verify redirect to Dentist Dashboard
    console.log('Waiting for redirect to dentist portal...');
    await driver.wait(
      until.urlContains('/dashboard'),
      30000,
      'Failed to redirect to Dentist portal'
    );

    // Navigate to Appointments
    console.log('Checking Dentist Appointments list...');
    const appLink = await driver.wait(
      until.elementLocated(By.css('a[href="#/appointments"]')),
      10000,
      'Dentist Appointments link not found'
    );
    await driver.executeScript("arguments[0].scrollIntoView(true);", appLink);
    await driver.sleep(500);
    await appLink.click();

    // Check if the scheduled appointment is displayed
    console.log('Verifying booked appointment appears in dentist appointments...');
    const patientNameCell = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Alice Jones E2E')]")),
      20000,
      'Scheduled appointment for patient Alice Jones was not found in Dentist Appointments list'
    );
    const isDisplayed = await patientNameCell.isDisplayed();
    assert.ok(isDisplayed, 'Booked appointment is not visible to the Dentist');
    console.log('End-to-End app validation verified successfully!');
  });
});
