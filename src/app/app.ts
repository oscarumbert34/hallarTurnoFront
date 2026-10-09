import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { filter, map, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from './features/auth/auth.service';
import { clearChunkLoadRecoveryFlag } from './shared/chunk-load-recovery';
import { VirtualQueueAvailabilityService } from './shared/virtual-queue-availability.service';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly virtualQueueAvailability = inject(VirtualQueueAvailabilityService);
  protected readonly session$ = this.authService.session$;
  protected readonly showShellNavigation$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    tap(() => clearChunkLoadRecoveryFlag()),
    startWith(null),
    map(() => !this.deepestRoute().snapshot.data['standalone']),
  );
  protected readonly navItems = computed(() => [
    { label: 'Busqueda', path: '/search' },
    { label: 'Reservas', path: '/bookings' },
    { label: 'Mis correos', path: '/emails' },
    ...(this.virtualQueueAvailability.enabled() ? [{ label: 'Fila', path: '/admin/fila' }] : []),
    { label: 'Panel', path: '/business-dashboard' },
  ]);

  constructor() {
    this.authService.session$
      .pipe(
        switchMap(() => this.virtualQueueAvailability.refresh()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected searchQueryParams(): Record<string, string> | null {
    const businessId = this.router.parseUrl(this.router.url).queryParams['businessId'];

    return businessId ? { businessId } : null;
  }

  protected navigationPath(path: string): string {
    const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments ?? [];
    const firstSegment = segments[0]?.path;
    const slug =
      segments.length > 1 && firstSegment !== 'admin'
        ? firstSegment
        : this.authService.businessSlug;

    return slug ? `/${slug}${path}` : path;
  }

  protected publicBusinessPath(): string | null {
    const slug = this.authService.businessSlug;
    return slug ? `/business/${slug}` : null;
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private deepestRoute(): ActivatedRoute {
    let route = this.route;

    while (route.firstChild) {
      route = route.firstChild;
    }

    return route;
  }
}
