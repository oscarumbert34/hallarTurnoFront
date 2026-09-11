import { Routes } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
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
    path: '',
    pathMatch: 'full',
    redirectTo: 'public-search',
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
    path: 'public-search',
    data: { standalone: true },
    loadComponent: () =>
      import('./features/public-search/public-search.page').then((m) => m.PublicSearchPage),
  },
  {
    path: 'search',
    data: { businessScoped: true },
    loadComponent: () =>
      import('./features/public-search/public-search.page').then((m) => m.PublicSearchPage),
  },
  {
    path: 'booking',
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
    path: '**',
    redirectTo: 'public-search',
  },
];
