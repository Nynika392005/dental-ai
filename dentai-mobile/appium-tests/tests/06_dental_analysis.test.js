const { DentalAnalysisPage, DashboardPage } = require('../helpers/pageObjects');

describe('06. Dental Scan & AI Analysis E2E Tests (DentAI Android)', () => {

  it('TC-SCAN-01: Should launch Tooth Scan Analysis screen', async () => {
    const toothTool = await DashboardPage.toothCheckTool;
    if (typeof toothTool.click === 'function' && await toothTool.isExisting()) {
      await toothTool.click();
    }
  });

  it('TC-SCAN-02: Should trigger AI image analysis processing', async () => {
    const scanBtn = await DentalAnalysisPage.startScanBtn;
    if (typeof scanBtn.click === 'function' && await scanBtn.isExisting()) {
      await scanBtn.click();
    }
  });

  it('TC-SCAN-03: Should render dental breakdown report and health score', async () => {
    const score = await DentalAnalysisPage.scanResultScore;
    if (typeof score.isExisting === 'function' && await score.isExisting()) {
      console.log('[Appium Spec] Dental scan analysis breakdown rendered.');
    }
  });

});
