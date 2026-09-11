export type AppointmentActionStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';

export interface AppointmentAction {
  appointmentId: string;
  businessName: string;
  serviceName: string;
  date: string;
  time: string;
  status: AppointmentActionStatus;
  tokenValid: boolean;
}
