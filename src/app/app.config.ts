import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { authInterceptor } from './features/auth/auth.interceptor';
import { API_BASE_URL } from './shared/api-base-url.token';
import { recoverFromChunkLoadError } from './shared/chunk-load-recovery';

const runtimeEnvironment = globalThis as typeof globalThis & {
  __HALLARTURNO_ENV__?: { API_BASE_URL?: string };
};
const apiBaseUrl =
  runtimeEnvironment.__HALLARTURNO_ENV__?.API_BASE_URL?.trim() || environment.apiBaseUrl;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withNavigationErrorHandler((navigationError) => {
        recoverFromChunkLoadError(navigationError.error);
      }),
    ),
    {
      provide: API_BASE_URL,
      useValue: apiBaseUrl,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
