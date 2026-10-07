import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { map } from 'rxjs';
import { authGuard } from './features/auth/auth.guard';
import { AuthService } from './features/auth/auth.service';
import { VirtualQueueAvailabilityService } from './shared/virtual-queue-availability.service';

const businessVirtualQueueEnabledGuard = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return inject(VirtualQueueAvailabilityService).refresh().pipe(
    map((enabled) => enabled || router.createUrlTree([auth.withBusinessSlug('/business-dashboard')])),
  );
};

export const routes: Routes = [
  {
    path: 'para-negocios',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/business-landing/business-landing.page').then(
        (m) => m.BusinessLandingPage,
      ),
  },
  {
    path: 'business/:slug',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/public-business/public-business.page').then(
        (m) => m.PublicBusinessPageComponent,
      ),
  },
  {
    path: 'turno/:token',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/appointment-action/appointment-action.page').then(
        (m) => m.AppointmentActionPage,
      ),
  },
  {
    path: 'fila/:business/:branch/espera/:entry',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/virtual-queue/public-virtual-queue.page').then(
        (m) => m.PublicVirtualQueuePage,
      ),
  },
  {
    path: 'fila/:business/:branch',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/virtual-queue/public-virtual-queue.page').then(
        (m) => m.PublicVirtualQueuePage,
      ),
  },
  {
    path: 'admin/fila',
    canMatch: [businessVirtualQueueEnabledGuard],
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/virtual-queue/admin-virtual-queue.page').then(
        (m) => m.AdminVirtualQueuePage,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
      },
    ],
  },
  {
    path: 'search',
    data: { businessScoped: true },
    loadComponent: () =>
      import('./features/public-search/public-search.page').then((m) => m.PublicSearchPage),
  },
  {
    path: ':slug/search',
    data: { businessScoped: true },
    loadComponent: () =>
      import('./features/public-search/public-search.page').then((m) => m.PublicSearchPage),
  },
  {
    path: 'booking',
    loadComponent: () => import('./features/booking/booking.page').then((m) => m.BookingPage),
  },
  {
    path: ':slug/booking',
    loadComponent: () => import('./features/booking/booking.page').then((m) => m.BookingPage),
  },
  {
    path: 'business-dashboard',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/business-dashboard/business-dashboard.page').then(
        (m) => m.BusinessDashboardPage,
      ),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'], section: 'bookings' },
    loadComponent: () =>
      import('./features/business-dashboard/business-dashboard.page').then(
        (m) => m.BusinessDashboardPage,
      ),
  },
  {
    path: 'emails',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/business-emails/business-emails.page').then(
        (m) => m.BusinessEmailsPage,
      ),
  },
  {
    path: ':slug/business-dashboard',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/business-dashboard/business-dashboard.page').then(
        (m) => m.BusinessDashboardPage,
      ),
  },
  {
    path: ':slug/bookings',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'], section: 'bookings' },
    loadComponent: () =>
      import('./features/business-dashboard/business-dashboard.page').then(
        (m) => m.BusinessDashboardPage,
      ),
  },
  {
    path: ':slug/emails',
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/business-emails/business-emails.page').then(
        (m) => m.BusinessEmailsPage,
      ),
  },
  {
    path: ':slug/admin/fila',
    canMatch: [businessVirtualQueueEnabledGuard],
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'BUSINESS'] },
    loadComponent: () =>
      import('./features/virtual-queue/admin-virtual-queue.page').then(
        (m) => m.AdminVirtualQueuePage,
      ),
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
