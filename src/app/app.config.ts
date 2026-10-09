import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { authInterceptor } from './features/auth/auth.interceptor';
import { API_BASE_URL } from './shared/api-base-url.token';
import { GOOGLE_CLIENT_ID } from './features/auth/google-client-id.token';
import { recoverFromChunkLoadError } from './shared/chunk-load-recovery';

const runtimeEnvironment = globalThis as typeof globalThis & {
  __HALLARTURNO_ENV__?: { API_BASE_URL?: string; GOOGLE_CLIENT_ID?: string };
};
const apiBaseUrl =
  runtimeEnvironment.__HALLARTURNO_ENV__?.API_BASE_URL?.trim() || environment.apiBaseUrl;
const googleClientId =
  runtimeEnvironment.__HALLARTURNO_ENV__?.GOOGLE_CLIENT_ID?.trim() || environment.googleClientId;

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
    {
      provide: GOOGLE_CLIENT_ID,
      useValue: googleClientId,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
