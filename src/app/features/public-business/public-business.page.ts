import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { BookingService } from '../booking/booking.service';
import { PublicBranch, PublicBusiness, PublicService } from './public-business.models';
import { ServiceAvailabilityDialogComponent } from './service-availability-dialog.component';

@Component({
  selector: 'app-public-business-page',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './public-business.page.html',
  styleUrl: './public-business.page.scss',
})
export class PublicBusinessPageComponent implements OnInit {
  private readonly api = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private businessRequest?: Subscription;
  private servicesRequest?: Subscription;
  protected readonly business = signal<PublicBusiness | null>(null);
  protected readonly selectedBranch = signal<PublicBranch | null>(null);
  protected readonly services = signal<PublicService[]>([]);
  protected readonly loading = signal(true);
  protected readonly servicesLoading = signal(false);
  protected readonly error = signal('');
  protected readonly servicesError = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.businessRequest?.unsubscribe();
      this.servicesRequest?.unsubscribe();
      this.business.set(null);
      this.selectedBranch.set(null);
      this.services.set([]);
      this.loading.set(true);
      this.error.set('');
      this.businessRequest = this.api
        .getPublicBusiness(params.get('slug') ?? '')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (business) => {
            this.business.set(business);
            this.loading.set(false);
            if (business.branches[0]) this.selectBranch(business.branches[0]);
          },
          error: (error) => {
            this.loading.set(false);
            this.error.set(
              error.status === 404
                ? 'No encontramos este negocio o ya no está disponible.'
                : 'No pudimos cargar el negocio. Intentá nuevamente más tarde.',
            );
          },
        });
    });
  }

  protected localities(): string {
    return [
      ...new Set(
        this.business()
          ?.branches.map((branch) => branch.city)
          .filter(Boolean),
      ),
    ].join(' · ');
  }

  protected selectBranch(branch: PublicBranch): void {
    this.servicesRequest?.unsubscribe();
    this.selectedBranch.set(branch);
    this.services.set([]);
    this.servicesLoading.set(true);
    this.servicesError.set('');
    this.servicesRequest = this.api
      .listPublicServices(this.business()!.slug, branch.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (services) => {
          this.services.set(services);
          this.servicesLoading.set(false);
        },
        error: () => {
          this.servicesLoading.set(false);
          this.servicesError.set(
            'No pudimos cargar los servicios. Volvé a seleccionar la sucursal para reintentar.',
          );
        },
      });
  }

  protected price(service: PublicService): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: service.currency }).format(
      service.price,
    );
  }

  protected reserve(): void {
    void this.router.navigate(['/search'], {
      queryParams: { businessId: this.business()!.id },
    });
  }

  protected openAvailability(service: PublicService): void {
    this.dialog.open(ServiceAvailabilityDialogComponent, {
      data: { business: this.business()!, branch: this.selectedBranch()!, service },
      width: '600px',
      maxWidth: '96vw',
      maxHeight: '94dvh',
      autoFocus: 'first-heading',
    });
  }
}
