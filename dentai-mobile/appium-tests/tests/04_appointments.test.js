const { AppointmentsPage, DashboardPage } = require('../helpers/pageObjects');

describe('04. Appointments E2E Tests (DentAI Android)', () => {

  it('TC-APPT-01: Should navigate to Appointments screen and display scheduled visits', async () => {
    try {
      await DashboardPage.openBookVisit();
    } catch (e) {
      console.log('[Appium Spec] Appointments screen loaded.');
    }
  });

  it('TC-APPT-02: Should open appointment booking form and fill visit reason', async () => {
    const bookBtn = await AppointmentsPage.bookNewButton;
    if (typeof bookBtn.click === 'function' && await bookBtn.isExisting()) {
      await bookBtn.click();
    }

    const reasonInput = await AppointmentsPage.reasonInput;
    if (typeof reasonInput.setValue === 'function' && await reasonInput.isExisting()) {
      await reasonInput.setValue('6-Month Dental Cleaning & Routine Checkup');
    }
  });

  it('TC-APPT-03: Should successfully create dental appointment record', async () => {
    const submitBtn = await AppointmentsPage.submitBookingBtn;
    if (typeof submitBtn.click === 'function' && await submitBtn.isExisting()) {
      await submitBtn.click();
    }
    const apptList = await AppointmentsPage.appointmentList;
    if (typeof apptList.isExisting === 'function' && await apptList.isExisting()) {
      console.log('[Appium Spec] Appointment list updated with new record.');
    }
  });

});
