import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  providedIn: 'root',
  factory: () => environment.googleClientId,
});
