import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateComponent } from '../../shared/ui-state.component';
import { BookingService } from './booking.service';

@Component({
  selector: 'app-booking-short-link-page',
  imports: [UiStateComponent],
  template: `
    <section style="max-width: 720px; margin: 48px auto; padding: 24px">
      <app-ui-state [loading]="loading()" [error]="error()" />
      @if (loading()) {
        <p>Preparando el turno...</p>
      }
    </section>
  `,
})
export class BookingShortLinkPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.bookingService.getBookingShortLink(code).subscribe({
      next: (slot) => {
        void this.router.navigate(['/booking'], {
          queryParams: { ...slot, ownerBookingCode: code },
          replaceUrl: true,
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('El enlace no existe o ya venció. Pedile al cliente que genere uno nuevo.');
      },
    });
  }
}
