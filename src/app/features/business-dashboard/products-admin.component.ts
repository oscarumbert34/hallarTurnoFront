import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, finalize, Observable, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UiStateComponent } from '../../shared/ui-state.component';
import { BusinessDashboardService } from './business-dashboard.service';
import { dashboardErrorMessage } from './dashboard-error';
import { Product, ProductPayload } from './dashboard.models';
import { ImageUploadComponent } from './image-upload.component';

@Component({
  selector: 'app-products-admin',
  imports: [
    CurrencyPipe,
    ImageUploadComponent,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  template: `
    <section class="products-panel">
      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      <div class="products-toolbar">
        <div>
          <h2>Catálogo de productos</h2>
          <p>Publicá productos para recibir consultas por WhatsApp.</p>
        </div>
        <button mat-flat-button type="button" (click)="startCreate()">
          <mat-icon aria-hidden="true">add_shopping_cart</mat-icon>
          Crear producto
        </button>
      </div>

      <mat-expansion-panel [expanded]="formExpanded()" (closed)="resetForm()">
        <mat-expansion-panel-header>
          <mat-panel-title>{{
            editingId() ? 'Editar producto' : 'Nuevo producto'
          }}</mat-panel-title>
        </mat-expansion-panel-header>
        <form class="product-form" [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <mat-icon matPrefix aria-hidden="true">inventory_2</mat-icon>
            <input matInput maxlength="160" formControlName="name" />
            <mat-hint align="end">{{ form.controls.name.value.length }}/160</mat-hint>
            <mat-error>Ingresá un nombre para el producto.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Precio</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" min="0" step="0.01" formControlName="price" />
            <mat-error>Ingresá un precio válido mayor o igual a cero.</mat-error>
          </mat-form-field>

          <mat-form-field class="description-field" appearance="outline">
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="4" maxlength="2000" formControlName="description"></textarea>
            <mat-hint align="end">{{ form.controls.description.value.length }}/2000</mat-hint>
          </mat-form-field>

          <div class="image-field">
            <app-image-upload
              label="Fotografía del producto"
              recommendation="Se optimizará a un máximo de 1600 × 1600 px."
              [maxSizeMb]="3"
              variant="product"
              [currentUrl]="currentImageUrl()"
              (fileChange)="selectedImage.set($event)"
              (removed)="markImageForRemoval()"
            />
          </div>

          <mat-checkbox formControlName="active">Producto activo y visible al público</mat-checkbox>

          @if (formError()) {
            <p class="form-error" role="alert">{{ formError() }}</p>
          }

          <div class="form-actions">
            <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Guardando…' : 'Guardar producto' }}
            </button>
            <button mat-button type="button" [disabled]="saving()" (click)="resetForm()">
              Cancelar
            </button>
          </div>
        </form>
      </mat-expansion-panel>

      @if (!loading() && products().length === 0) {
        <mat-card class="empty-state" appearance="outlined">
          <mat-icon aria-hidden="true">inventory_2</mat-icon>
          <h3>Todavía no hay productos</h3>
          <p>Creá el primero para empezar a mostrar tu catálogo.</p>
          <button mat-flat-button type="button" (click)="startCreate()">
            Crear primer producto
          </button>
        </mat-card>
      } @else {
        <div class="product-grid">
          @for (product of products(); track product.id) {
            <mat-card class="product-card" appearance="outlined">
              <div class="product-image">
                @if (product.imageUrl) {
                  <img [src]="product.imageUrl" [alt]="'Fotografía de ' + product.name" />
                } @else {
                  <mat-icon aria-hidden="true">image</mat-icon>
                  <span>Sin fotografía</span>
                }
              </div>
              <mat-card-content>
                <div class="product-heading">
                  <div>
                    <h3>{{ product.name }}</h3>
                    <strong>{{
                      product.price | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                    }}</strong>
                  </div>
                  <span class="status" [class.inactive]="!product.active">
                    {{ product.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                @if (product.description) {
                  <p>{{ product.description }}</p>
                }
              </mat-card-content>
              <mat-card-actions>
                <mat-slide-toggle
                  [checked]="product.active"
                  [disabled]="busyProductId() === product.id"
                  (change)="toggleActive(product, $event.checked)"
                  >Visible</mat-slide-toggle
                >
                <span class="action-spacer"></span>
                <button mat-button type="button" (click)="edit(product)">Editar</button>
                <button mat-button class="delete-button" type="button" (click)="remove(product)">
                  Eliminar
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </section>
  `,
  styleUrl: './products-admin.component.scss',
})
export class ProductsAdminComponent implements OnInit {
  private readonly dashboard = inject(BusinessDashboardService);
  private readonly fb = inject(FormBuilder);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly formExpanded = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly removeImage = signal(false);
  protected readonly busyProductId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', Validators.maxLength(2000)],
    price: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  protected startCreate(): void {
    this.resetForm();
    this.formExpanded.set(true);
  }

  protected edit(product: Product): void {
    this.editingId.set(product.id);
    this.currentImageUrl.set(product.imageUrl ?? null);
    this.selectedImage.set(null);
    this.removeImage.set(false);
    this.form.setValue({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      active: product.active,
    });
    this.formExpanded.set(true);
    this.formError.set('');
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.currentImageUrl.set(null);
    this.selectedImage.set(null);
    this.removeImage.set(false);
    this.form.reset({ name: '', description: '', price: 0, active: true });
    this.formExpanded.set(false);
    this.formError.set('');
  }

  protected markImageForRemoval(): void {
    this.selectedImage.set(null);
    this.removeImage.set(true);
    this.currentImageUrl.set(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: ProductPayload = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      price: Number(value.price),
      active: value.active,
    };
    const id = this.editingId();
    this.saving.set(true);
    this.formError.set('');
    const saveRequest = id
      ? this.dashboard.updateProduct(id, payload)
      : this.dashboard.createProduct(payload);
    saveRequest
      .pipe(
        switchMap((product) => {
          const hasPendingImage = !!this.selectedImage();
          return this.saveImage(product).pipe(
            catchError((error: unknown) => {
              if (!hasPendingImage) throw error;
              this.resetForm();
              this.load(
                'El producto se guardó, pero no pudimos subir la fotografía. Podés volver a editarlo e intentarlo más tarde.',
              );
              return EMPTY;
            }),
          );
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.load();
        },
        error: (error: unknown) => this.formError.set(dashboardErrorMessage(error)),
      });
  }

  protected toggleActive(product: Product, active: boolean): void {
    this.busyProductId.set(product.id);
    this.dashboard
      .setProductActive(product.id, active)
      .pipe(finalize(() => this.busyProductId.set(null)))
      .subscribe({
        next: (updated) => this.replaceProduct(updated),
        error: (error: unknown) => {
          this.errorMessage.set(dashboardErrorMessage(error));
          this.load();
        },
      });
  }

  protected remove(product: Product): void {
    if (!confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    this.busyProductId.set(product.id);
    this.dashboard
      .deleteProduct(product.id)
      .pipe(finalize(() => this.busyProductId.set(null)))
      .subscribe({
        next: () => this.products.update((items) => items.filter((item) => item.id !== product.id)),
        error: (error: unknown) => this.errorMessage.set(dashboardErrorMessage(error)),
      });
  }

  private load(successfulProductWarning = ''): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.dashboard
      .listProducts()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          if (successfulProductWarning) this.errorMessage.set(successfulProductWarning);
        },
        error: (error: unknown) => this.errorMessage.set(dashboardErrorMessage(error)),
      });
  }

  private saveImage(product: Product): Observable<Product> {
    const file = this.selectedImage();
    if (file) return this.dashboard.uploadProductImage(product.id, file);
    if (this.removeImage() && product.imageUrl) {
      return this.dashboard
        .deleteProductImage(product.id)
        .pipe(switchMap(() => of({ ...product, imageUrl: null })));
    }
    return of(product);
  }

  private replaceProduct(updated: Product): void {
    this.products.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }
}
