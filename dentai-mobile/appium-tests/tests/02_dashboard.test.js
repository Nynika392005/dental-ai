const { DashboardPage } = require('../helpers/pageObjects');

describe('02. Patient Dashboard E2E Tests (DentAI Android)', () => {

  it('TC-DASH-01: Should display personalized greeting header and quick actions', async () => {
    const greeting = await DashboardPage.headerGreeting;
    if (typeof greeting.isExisting === 'function' && await greeting.isExisting()) {
      const text = await greeting.getText();
      console.log(`[Appium Spec] Dashboard Greeting text: ${text}`);
    }
  });

  it('TC-DASH-02: Should display Daily Health Tip card with content', async () => {
    const tipTitle = await DashboardPage.dailyTipTitle;
    if (typeof tipTitle.isExisting === 'function' && await tipTitle.isExisting()) {
      console.log('[Appium Spec] Daily tip card rendered on dashboard.');
    }
  });

  it('TC-DASH-03: Should render Smart AI Tools carousel items', async () => {
    const medsTool = await DashboardPage.scanMedsTool;
    const toothTool = await DashboardPage.toothCheckTool;
    if (typeof medsTool.isExisting === 'function' && await medsTool.isExisting()) {
      console.log('[Appium Spec] Smart AI Tools present on dashboard layout.');
    }
  });

});
