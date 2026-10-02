export type BasePlan = 'BASIC' | 'GROWTH' | 'PRO';
export type EmailAddon = 'NONE' | 'ESSENTIAL' | 'COMPLETE';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED';
export type EmailAutomationType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_RESCHEDULE'
  | 'BUSINESS_DAILY_AGENDA'
  | 'BOOKING_REMINDER_ACTION'
  | 'BUSINESS_CANCELLATION';

export type EmailErrorCode = 'EMAIL_FEATURE_REQUIRED' | 'EMAIL_QUOTA_EXCEEDED';

export interface EmailAutomationState {
  type: EmailAutomationType;
  available: boolean;
  enabled: boolean;
}

export interface EmailUsage {
  used: number;
  limit: number;
  remaining: number;
  growthAgendaUsed: number;
  growthAgendaLimit: number;
}

export interface EmailStatus {
  basePlan: BasePlan;
  addon: EmailAddon;
  pendingAddon: EmailAddon | null;
  status: SubscriptionStatus;
  periodStartedAt: string;
  periodEndsAt: string;
  trialEndsAt: string | null;
  automations: EmailAutomationState[];
  usage: EmailUsage;
  recentFailures: number;
}

export interface EmailPreferencesRequest {
  confirmationEnabled: boolean;
  dailyAgendaEnabled: boolean;
  reminderActionEnabled: boolean;
  cancellationEnabled: boolean;
}

export const AUTOMATION_ORDER: EmailAutomationType[] = [
  'BOOKING_CONFIRMATION',
  'BUSINESS_DAILY_AGENDA',
  'BOOKING_REMINDER_ACTION',
  'BUSINESS_CANCELLATION',
];

export function automationCanEnable(status: EmailStatus, type: EmailAutomationType): boolean {
  return status.automations.some((automation) => automation.type === type && automation.available);
}

export function automationIsEnabled(status: EmailStatus, type: EmailAutomationType): boolean {
  return status.automations.some(
    (automation) => automation.type === type && automation.available && automation.enabled,
  );
}

export function preferencesFromStatus(status: EmailStatus): EmailPreferencesRequest {
  return {
    confirmationEnabled: automationIsEnabled(status, 'BOOKING_CONFIRMATION'),
    dailyAgendaEnabled: automationIsEnabled(status, 'BUSINESS_DAILY_AGENDA'),
    reminderActionEnabled: automationIsEnabled(status, 'BOOKING_REMINDER_ACTION'),
    cancellationEnabled: automationIsEnabled(status, 'BUSINESS_CANCELLATION'),
  };
}
