const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('DentAI Login E2E Test', function () {
  this.timeout(30000); // 30 seconds timeout
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

  it('should log in successfully with valid credentials and redirect to dashboard', async function () {
    // 1. Navigate to the login page (using live site or localhost if configured)
    const targetUrl = process.env.TEST_URL || 'https://Nynika392005.github.io/dental-ai/#/login';
    console.log(`Navigating to: ${targetUrl}`);
    await driver.get(targetUrl);

    // 2. Wait for the email input to be visible
    const emailInput = await driver.wait(
      until.elementLocated(By.id('email')),
      10000,
      'Email input field not found'
    );

    // 3. Enter credentials
    await emailInput.sendKeys('patient@example.com');
    
    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys('password123');

    // 4. Click the login button
    const loginButton = await driver.findElement(By.id('login-button'));
    await loginButton.click();

    // 5. Wait for the URL to change and redirect to the dashboard
    console.log('Waiting for redirect to dashboard...');
    await driver.wait(
      until.urlContains('/dashboard'),
      15000,
      'Failed to redirect to dashboard'
    );

    // 6. Verify URL matches expected dashboard route
    const currentUrl = await driver.getCurrentUrl();
    console.log(`Current URL: ${currentUrl}`);
    assert.ok(currentUrl.includes('/dashboard'), 'URL does not contain /dashboard');
  });
});
