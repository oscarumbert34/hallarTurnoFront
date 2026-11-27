import { AppointmentType } from './appointment-type.model';

export interface PersonalAppointment {
  id: number | string;
  type: AppointmentType;
  appointmentAt: string;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  recurrenceId?: number | null;
  originalOccurrenceDate?: string | null;
  recurring?: boolean;
  materialized?: boolean;
  recurrenceLabel?: string | null;
  modified?: boolean;
  ownerId: string;
  ownerEmail: string;
  ownedByCurrentUser: boolean;
}

export interface PersonalAppointmentInput {
  appointmentTypeId: number;
  appointmentAt: string;
  title: string | null;
  notes: string | null;
}
