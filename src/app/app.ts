import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { filter, map, startWith, tap } from 'rxjs';
import { AuthService } from './features/auth/auth.service';
import { clearChunkLoadRecoveryFlag } from './shared/chunk-load-recovery';

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
  protected readonly session$ = this.authService.session$;
  protected readonly showShellNavigation$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    tap(() => clearChunkLoadRecoveryFlag()),
    startWith(null),
    map(() => !this.deepestRoute().snapshot.data['standalone']),
  );
  protected readonly navItems = [
    { label: 'Busqueda', path: '/search' },
    { label: 'Reservas', path: '/bookings' },
    { label: 'Panel', path: '/business-dashboard' },
  ];

  protected searchQueryParams(): Record<string, string> | null {
    const businessId = this.router.parseUrl(this.router.url).queryParams['businessId'];

    return businessId ? { businessId } : null;
  }

  protected navigationPath(path: string): string {
    const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments ?? [];
    const slug = segments.length > 1 ? segments[0]?.path : this.authService.businessSlug;

    return slug ? `/${slug}${path}` : path;
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
