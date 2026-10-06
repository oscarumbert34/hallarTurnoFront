import { InjectionToken } from '@angular/core';

export const VIRTUAL_QUEUE_ENABLED = new InjectionToken<boolean>('VIRTUAL_QUEUE_ENABLED', {
  providedIn: 'root',
  factory: () => false,
});
