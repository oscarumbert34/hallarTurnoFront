import { Routes } from '@angular/router';

export const PERSONAL_AGENDA_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/appointment-list/appointment-list.page').then((m) => m.AppointmentListPage) },
  { path: 'new', loadComponent: () => import('./pages/appointment-form/appointment-form.page').then((m) => m.AppointmentFormPage) },
  { path: ':id/edit', loadComponent: () => import('./pages/appointment-form/appointment-form.page').then((m) => m.AppointmentFormPage) },
];
