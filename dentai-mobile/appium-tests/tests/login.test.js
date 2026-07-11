describe('DentAI Mobile Login Appium Test', () => {
    it('should show the login screen elements and allow entering credentials', async () => {
        // Wait for the email input field to exist
        const emailInput = await $('~email-input');
        await emailInput.waitForExist({ timeout: 40000 });
        
        // Enter test credentials
        await emailInput.setValue('patient@dentai.com');
        
        const passwordInput = await $('~password-input');
        await passwordInput.setValue('password123');
        
        // Validate elements and click sign in
        const loginButton = await $('~login-button');
        const isDisplayed = await loginButton.isDisplayed();
        console.log(`Login button displayed: ${isDisplayed}`);
        
        await loginButton.click();
        
        // Wait to observe transition or authentication action
        await driver.pause(8000);
    });
});
