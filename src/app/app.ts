import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './features/auth/auth.service';

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
  protected readonly session$ = this.authService.session$;
  protected readonly navItems = [
    { label: 'Busqueda', path: '/public-search' },
    { label: 'Reserva', path: '/booking' },
    { label: 'Panel', path: '/business-dashboard' },
    { label: 'Acceso', path: '/auth' },
  ];

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
