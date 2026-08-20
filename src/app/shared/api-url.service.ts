import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url.token';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private readonly apiBaseUrl = inject(API_BASE_URL);

  build(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${this.apiBaseUrl}${normalizedPath}`;
  }
}
