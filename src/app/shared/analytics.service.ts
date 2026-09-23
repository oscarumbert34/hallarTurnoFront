import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export type AnalyticsEventName =
  | 'landing_view'
  | 'landing_cta_click'
  | 'demo_business_click'
  | 'contact_click'
  | 'business_page_view'
  | 'business_booking_click'
  | 'availability_search'
  | 'booking_checkout_view'
  | 'booking_completed';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private initialized = false;

  event(name: AnalyticsEventName, params?: Record<string, unknown>): void {
    this.initialize();

    try {
      window.gtag?.('event', name, params);
    } catch {
      // Analytics must never interrupt the user flow.
    }
  }

  private initialize(): void {
    const measurementId = environment.googleAnalyticsMeasurementId.trim();

    if (this.initialized || !measurementId || typeof window === 'undefined') return;
    this.initialized = true;

    try {
      window.dataLayer = window.dataLayer ?? [];
      window.gtag =
        window.gtag ??
        function (..._args: unknown[]) {
          window.dataLayer?.push(arguments);
        };
      window.gtag('js', new Date());
      window.gtag('config', measurementId);

      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      this.document.head.appendChild(script);
    } catch {
      // A blocked script, CSP rule, or browser extension must be harmless.
    }
  }
}
