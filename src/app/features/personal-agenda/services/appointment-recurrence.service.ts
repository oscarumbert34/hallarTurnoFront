import { HttpClient } from '@angular/common/http';import { inject,Injectable } from '@angular/core';import { Observable } from 'rxjs';import { API_BASE_URL } from '../../../shared/api-base-url.token';import { AppointmentRecurrence,AppointmentRecurrenceInput } from '../models/appointment-recurrence.model';import { PersonalAppointment } from '../models/personal-appointment.model';
@Injectable({providedIn:'root'}) export class AppointmentRecurrenceService{
 private readonly http=inject(HttpClient);private readonly endpoint=`${inject(API_BASE_URL)}/personal-appointment-recurrences`;
 create(input:AppointmentRecurrenceInput):Observable<AppointmentRecurrence>{return this.http.post<AppointmentRecurrence>(this.endpoint,input);}
 get(id:number):Observable<AppointmentRecurrence>{return this.http.get<AppointmentRecurrence>(`${this.endpoint}/${id}`);}
 update(id:number,input:AppointmentRecurrenceInput):Observable<AppointmentRecurrence>{return this.http.put<AppointmentRecurrence>(`${this.endpoint}/${id}`,input);}
 updateOccurrence(id:number,date:string,input:{appointmentAt:string;title:string|null;notes:string|null},scope:'ONLY'|'FUTURE'='ONLY'):Observable<PersonalAppointment>{return this.http.put<PersonalAppointment>(`${this.endpoint}/${id}/occurrences/${date}`,input,{params:{scope}});}
 skipOccurrence(id:number,date:string,scope:'ONLY'|'FUTURE'='ONLY'):Observable<void>{return this.http.delete<void>(`${this.endpoint}/${id}/occurrences/${date}`,{params:{scope}});}
 end(id:number):Observable<void>{return this.http.delete<void>(`${this.endpoint}/${id}`);}
}
