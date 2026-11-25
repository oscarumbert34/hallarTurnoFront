import { AppointmentType } from './appointment-type.model';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export interface AppointmentRecurrenceInput { appointmentTypeId:number;startDate:string;appointmentTime:string;frequency:RecurrenceFrequency;intervalValue:number;endDate:string|null;timeZone:string;title:string|null;notes:string|null; }
export interface AppointmentRecurrence { id:number;type:AppointmentType;startDate:string;appointmentTime:string;frequency:RecurrenceFrequency;intervalValue:number;endDate:string|null;timeZone:string;title:string|null;notes:string|null;active:boolean; }
