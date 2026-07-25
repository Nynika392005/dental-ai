const path = require('path');

const apkPath = process.env.APP_PATH || path.join(__dirname, 'bin', 'dentai-app.apk');
const deviceName = process.env.ANDROID_DEVICE_NAME || 'Android Emulator';

exports.config = {
    runner: 'local',
    port: parseInt(process.env.APPIUM_PORT || '4723', 10),
    specs: [
        './tests/**/*.test.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': deviceName,
        'appium:automationName': 'UiAutomator2',
        'appium:app': apkPath,
        'appium:autoGrantPermissions': true,
        'appium:newCommandTimeout': 240,
        'appium:adbExecTimeout': 60000,
        'appium:ensureWebviewsHavePages': true,
        'appium:nativeWebScreenshot': true,
        'appium:connectHardwareKeyboard': true
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 20000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 120000
    }
};
