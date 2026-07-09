const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('DentAI E2E Test Suite', function () {
  this.timeout(40000); // 40 seconds timeout
  let driver;

  before(async function () {
    const options = new chrome.Options();
    // Run in headless mode if running in a CI/CD environment (GitHub Actions)
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
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should register a new user successfully and redirect to dashboard', async function () {
    const baseTestUrl = process.env.TEST_URL || 'https://Nynika392005.github.io/dental-ai/';
    // We navigate directly to the Register hash route
    const registerUrl = `${baseTestUrl.replace(/\/$/, '')}/#/register`;
    
    console.log(`Navigating to register page: ${registerUrl}`);
    await driver.get(registerUrl);

    // 1. Wait for registration form elements to render
    const fullNameInput = await driver.wait(
      until.elementLocated(By.id('fullName')),
      15000,
      'Full Name input field not found'
    );

    // 2. Generate a unique email and valid phone to avoid database conflicts
    const uniqueEmail = `testpatient-${Date.now()}@example.com`;
    const randomPhone = `+1555${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`Filing signup form with email: ${uniqueEmail}`);
    await fullNameInput.sendKeys('Test E2E Patient');
    
    const emailInput = await driver.findElement(By.id('email'));
    await emailInput.sendKeys(uniqueEmail);

    const phoneInput = await driver.findElement(By.id('phone'));
    await phoneInput.sendKeys(randomPhone);

    const passwordInput = await driver.findElement(By.id('password'));
    // Use a secure password meeting backend complexity requirements
    await passwordInput.sendKeys('SecurePass123!');

    // 3. Click the register button
    const registerButton = await driver.findElement(By.id('register-button'));
    await registerButton.click();

    // 4. Wait for redirect to dashboard after successful registration and auto-login
    console.log('Waiting for redirect to dashboard...');
    await driver.wait(
      until.urlContains('/dashboard'),
      20000,
      'Failed to redirect to dashboard'
    );

    // 5. Verify URL matches expected dashboard route
    const currentUrl = await driver.getCurrentUrl();
    console.log(`Current URL: ${currentUrl}`);
    assert.ok(currentUrl.includes('/dashboard'), 'URL does not contain /dashboard');
  });
});
