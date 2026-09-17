import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-upload',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="image-upload" [class.cover]="variant === 'cover'">
      <div class="preview" [class.has-image]="previewUrl">
        @if (previewUrl) {
          <img [src]="previewUrl" [alt]="label + ' seleccionada'" />
        } @else {
          <mat-icon aria-hidden="true">{{
            variant === 'cover' ? 'landscape' : 'storefront'
          }}</mat-icon>
          <span>Sin imagen</span>
        }
      </div>
      <div class="upload-copy">
        <strong>{{ label }}</strong>
        <span>{{ recommendation }}</span>
        <span>Formatos: JPG, PNG o WebP.</span>
        <span>Máximo {{ maxSizeMb }} MB.</span>
        <div class="actions">
          <button mat-stroked-button type="button" (click)="fileInput.click()">
            <mat-icon aria-hidden="true">upload</mat-icon>Seleccionar imagen
          </button>
          @if (previewUrl) {
            <button mat-button type="button" (click)="remove()">Quitar</button>
          }
        </div>
        <input
          #fileInput
          class="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          (change)="selectFile($event)"
        />
        @if (error) {
          <span class="error" role="alert">{{ error }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .image-upload {
      display: grid;
      grid-template-columns: 112px 1fr;
      gap: 18px;
      align-items: center;
    }
    .preview {
      display: grid;
      place-items: center;
      align-content: center;
      gap: 6px;
      width: 112px;
      aspect-ratio: 1;
      overflow: hidden;
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: 14px;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container-low);
      font-size: 12px;
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover {
      grid-template-columns: minmax(180px, 280px) 1fr;
    }
    .cover .preview {
      width: 100%;
      aspect-ratio: 8 / 3;
    }
    .upload-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .upload-copy > span {
      color: var(--mat-sys-on-surface-variant);
      font-size: 12px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
    }
    .error {
      color: var(--mat-sys-error) !important;
    }
    @media (max-width: 600px) {
      .image-upload,
      .cover {
        grid-template-columns: 1fr;
      }
      .preview,
      .cover .preview {
        width: 100%;
        max-width: none;
      }
      .image-upload:not(.cover) .preview {
        width: 112px;
      }
    }
  `,
})
export class ImageUploadComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) label = '';
  @Input({ required: true }) recommendation = '';
  @Input({ required: true }) maxSizeMb = 1;
  @Input() variant: 'logo' | 'cover' = 'logo';
  @Input() currentUrl: string | null = null;
  @Output() readonly fileChange = new EventEmitter<File | null>();
  @Output() readonly removed = new EventEmitter<void>();

  protected previewUrl: string | null = null;
  protected error = '';
  private objectUrl: string | null = null;

  ngOnChanges(): void {
    if (!this.objectUrl) this.previewUrl = this.currentUrl;
  }

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.error = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error = 'Seleccioná una imagen JPG, PNG o WebP.';
      input.value = '';
      return;
    }
    if (file.size > this.maxSizeMb * 1024 * 1024) {
      this.error = `La imagen supera el máximo de ${this.maxSizeMb} MB.`;
      input.value = '';
      return;
    }
    this.releaseObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.previewUrl = this.objectUrl;
    this.fileChange.emit(file);
    input.value = '';
  }

  protected remove(): void {
    this.releaseObjectUrl();
    this.previewUrl = null;
    this.error = '';
    this.fileChange.emit(null);
    this.removed.emit();
  }

  ngOnDestroy(): void {
    this.releaseObjectUrl();
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
