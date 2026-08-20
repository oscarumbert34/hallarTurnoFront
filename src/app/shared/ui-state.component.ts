import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-ui-state',
  imports: [MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="state loading" aria-live="polite">
        <mat-progress-spinner mode="indeterminate" diameter="28" />
        <span>Cargando...</span>
      </div>
    }

    @if (error()) {
      <p class="state error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .state {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
    }

    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class UiStateComponent {
  readonly loading = input(false);
  readonly error = input('');
}
