import { AppointmentType } from './appointment-type.model';

export interface PersonalAppointment {
  id: number;
  type: AppointmentType;
  appointmentAt: string;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalAppointmentInput {
  appointmentTypeId: number;
  appointmentAt: string;
  title: string | null;
  notes: string | null;
}
