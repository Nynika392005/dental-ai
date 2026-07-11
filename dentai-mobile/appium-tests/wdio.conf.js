exports.config = {
    runner: 'local',
    port: 4723,
    specs: [
        './tests/**/*.test.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'Medium_Phone_API_36.1',
        'appium:automationName': 'UiAutomator2',
        'appium:app': 'c:/Users/B Nynika/pdd/dentai-mobile/pdd-1/dental-ai/dentai-mobile/appium-tests/bin/dentai-app.apk',
        'appium:autoGrantPermissions': true,
        'appium:newCommandTimeout': 240,
        'appium:adbExecTimeout': 60000
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
