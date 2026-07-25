/**
 * Page Object Model (POM) Helper Module for DentAI Appium E2E Mobile Tests
 * Provides clean, robust selector wrappers and user interaction abstractions.
 */

class LoginPage {
  get emailInput() { return $('~email-input'); }
  get passwordInput() { return $('~password-input'); }
  get loginButton() { return $('~login-button'); }
  get registerLink() { return $('~register-link'); }

  async login(email, password) {
    const emailEl = await this.emailInput;
    await emailEl.waitForExist({ timeout: 20000 });
    await emailEl.setValue(email);

    const passEl = await this.passwordInput;
    await passEl.setValue(password);

    const btnEl = await this.loginButton;
    await btnEl.click();
  }
}

class RegisterPage {
  get fullNameInput() { return $('~reg-fullname-input'); }
  get emailInput() { return $('~reg-email-input'); }
  get phoneInput() { return $('~reg-phone-input'); }
  get passwordInput() { return $('~reg-password-input'); }
  get confirmPasswordInput() { return $('~reg-confirmpassword-input'); }
  get patientRoleBtn() { return $('~reg-role-patient'); }
  get dentistRoleBtn() { return $('~reg-role-dentist'); }
  get submitBtn() { return $('~reg-submit-button'); }

  async registerPatient(fullName, email, phone, password) {
    const nameEl = await this.fullNameInput;
    await nameEl.waitForExist({ timeout: 20000 });
    await nameEl.setValue(fullName);

    const emailEl = await this.emailInput;
    await emailEl.setValue(email);

    const phoneEl = await this.phoneInput;
    await phoneEl.setValue(phone);

    const passEl = await this.passwordInput;
    await passEl.setValue(password);

    const confirmPassEl = await this.confirmPasswordInput;
    await confirmPassEl.setValue(password);

    const btn = await this.submitBtn;
    await btn.click();
  }
}

class DashboardPage {
  get headerGreeting() { return $('~dashboard-greeting'); }
  get chatQuickAction() { return $('~action-chat'); }
  get bookVisitQuickAction() { return $('~action-book-visit'); }
  get checkSymptomsQuickAction() { return $('~action-check-symptoms'); }
  get learnQuickAction() { return $('~action-learn'); }
  get dailyTipTitle() { return $('~daily-tip-title'); }
  get scanMedsTool() { return $('~tool-scan-meds'); }
  get toothCheckTool() { return $('~tool-tooth-check'); }

  async openSymptomChecker() {
    const el = await this.checkSymptomsQuickAction;
    await el.waitForExist({ timeout: 15000 });
    await el.click();
  }

  async openBookVisit() {
    const el = await this.bookVisitQuickAction;
    await el.waitForExist({ timeout: 15000 });
    await el.click();
  }

  async openAIChat() {
    const el = await this.chatQuickAction;
    await el.waitForExist({ timeout: 15000 });
    await el.click();
  }
}

class SymptomCheckerPage {
  get toothacheChip() { return $('~symptom-chip-toothache'); }
  get sensitivityChip() { return $('~symptom-chip-sensitivity'); }
  get bleedingGumsChip() { return $('~symptom-chip-bleeding-gums'); }
  get notesInput() { return $('~symptom-notes-input'); }
  get analyzeButton() { return $('~symptom-analyze-button'); }
  get resultContainer() { return $('~symptom-result-container'); }
  get riskScoreText() { return $('~symptom-risk-score'); }

  async submitSymptomCheck(notes = 'Mild pain when drinking cold liquids') {
    const chip = await this.toothacheChip;
    if (await chip.isExisting()) {
      await chip.click();
    }
    const notesEl = await this.notesInput;
    if (await notesEl.isExisting()) {
      await notesEl.setValue(notes);
    }
    const btn = await this.analyzeButton;
    await btn.click();
  }
}

class AppointmentsPage {
  get bookNewButton() { return $('~book-appointment-button'); }
  get reasonInput() { return $('~appointment-reason-input'); }
  get submitBookingBtn() { return $('~submit-booking-button'); }
  get appointmentList() { return $('~appointment-list'); }
  get firstAppointmentCard() { return $('~appointment-card-0'); }

  async bookAppointment(reason = 'Routine Checkup') {
    const bookBtn = await this.bookNewButton;
    await bookBtn.waitForExist({ timeout: 15000 });
    await bookBtn.click();

    const input = await this.reasonInput;
    await input.setValue(reason);

    const submitBtn = await this.submitBookingBtn;
    await submitBtn.click();
  }
}

class AIChatPage {
  get chatInput() { return $('~chat-input'); }
  get sendButton() { return $('~chat-send-button'); }
  get lastMessageBubble() { return $('~chat-message-last'); }

  async sendMessage(messageText) {
    const input = await this.chatInput;
    await input.waitForExist({ timeout: 15000 });
    await input.setValue(messageText);

    const btn = await this.sendButton;
    await btn.click();
  }
}

class DentalAnalysisPage {
  get startScanBtn() { return $('~start-scan-button'); }
  get scanResultScore() { return $('~scan-result-score'); }
  get scanRecommendationText() { return $('~scan-recommendation-text'); }
}

class EducationPage {
  get searchInput() { return $('~education-search-input'); }
  get guideCategoryTab() { return $('~edu-tab-guides'); }
  get firstArticleCard() { return $('~edu-article-0'); }

  async searchGuide(query) {
    const input = await this.searchInput;
    await input.waitForExist({ timeout: 15000 });
    await input.setValue(query);
  }
}

module.exports = {
  LoginPage: new LoginPage(),
  RegisterPage: new RegisterPage(),
  DashboardPage: new DashboardPage(),
  SymptomCheckerPage: new SymptomCheckerPage(),
  AppointmentsPage: new AppointmentsPage(),
  AIChatPage: new AIChatPage(),
  DentalAnalysisPage: new DentalAnalysisPage(),
  EducationPage: new EducationPage()
};
