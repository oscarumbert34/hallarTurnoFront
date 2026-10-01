import { AUTOMATION_ORDER, automationCanEnable, automationIsEnabled, EmailStatus, preferencesFromStatus } from './business-emails.models';

describe('business email selectors', () => {
  const status = {
    automations: [
      { type: 'BOOKING_CONFIRMATION', available: true, enabled: true },
      { type: 'BUSINESS_DAILY_AGENDA', available: true, enabled: false },
      { type: 'BOOKING_REMINDER_ACTION', available: false, enabled: true },
      { type: 'BUSINESS_CANCELLATION', available: false, enabled: false },
    ],
  } as EmailStatus;

  it('distinguishes entitlement from preference', () => {
    expect(automationCanEnable(status, 'BUSINESS_DAILY_AGENDA')).toBe(true);
    expect(automationIsEnabled(status, 'BUSINESS_DAILY_AGENDA')).toBe(false);
    expect(automationIsEnabled(status, 'BOOKING_REMINDER_ACTION')).toBe(false);
  });

  it('centralizes the preference request mapping', () => {
    expect(preferencesFromStatus(status)).toEqual({
      confirmationEnabled: true,
      dailyAgendaEnabled: false,
      reminderActionEnabled: false,
      cancellationEnabled: false,
    });
  });

  it('shows confirmation and rescheduling as one preference', () => {
    expect(AUTOMATION_ORDER).toContain('BOOKING_CONFIRMATION');
    expect(AUTOMATION_ORDER).not.toContain('BOOKING_RESCHEDULE');
  });
});
