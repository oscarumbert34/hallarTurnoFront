import { DOCUMENT } from '@angular/common';
import { inject, Injectable, NgZone } from '@angular/core';
import { GOOGLE_CLIENT_ID } from './google-client-id.token';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsApi {
  id: {
    initialize(options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }): void;
    renderButton(
      parent: HTMLElement,
      options: { theme: string; size: string; shape: string; text: string; width: number },
    ): void;
  };
}

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly clientId = inject(GOOGLE_CLIENT_ID);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private scriptPromise?: Promise<GoogleAccountsApi>;

  renderButton(parent: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
    return this.loadApi().then((google) => {
      google.id.initialize({
        client_id: this.clientId,
        callback: (response) => this.zone.run(() => onCredential(response.credential)),
      });
      google.id.renderButton(parent, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 360,
      });
    });
  }

  private loadApi(): Promise<GoogleAccountsApi> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise((resolve, reject) => {
      const existingApi = this.googleApi();
      if (existingApi) {
        resolve(existingApi);
        return;
      }

      const script = this.document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const api = this.googleApi();
        api ? resolve(api) : reject(new Error('Google Identity Services is unavailable'));
      };
      script.onerror = () => reject(new Error('Could not load Google Identity Services'));
      this.document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  private googleApi(): GoogleAccountsApi | undefined {
    return (globalThis as typeof globalThis & { google?: { accounts?: GoogleAccountsApi } }).google
      ?.accounts;
  }
}
