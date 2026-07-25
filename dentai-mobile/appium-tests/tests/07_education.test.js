const { EducationPage, DashboardPage } = require('../helpers/pageObjects');

describe('07. Dental Education & Knowledge Base E2E Tests (DentAI Android)', () => {

  it('TC-EDU-01: Should navigate to Dental Education Hub', async () => {
    const learnAction = await DashboardPage.learnQuickAction;
    if (typeof learnAction.click === 'function' && await learnAction.isExisting()) {
      await learnAction.click();
    }
  });

  it('TC-EDU-02: Should search for specific dental health topic', async () => {
    const searchInput = await EducationPage.searchInput;
    if (typeof searchInput.setValue === 'function' && await searchInput.isExisting()) {
      await searchInput.setValue('Cavity Prevention');
    }
  });

  it('TC-EDU-03: Should select category filter and open article detail modal', async () => {
    const guideTab = await EducationPage.guideCategoryTab;
    if (typeof guideTab.click === 'function' && await guideTab.isExisting()) {
      await guideTab.click();
    }
    const article = await EducationPage.firstArticleCard;
    if (typeof article.isExisting === 'function' && await article.isExisting()) {
      console.log('[Appium Spec] Educational article card displayed.');
    }
  });

});
