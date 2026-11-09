import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { dashboardErrorMessage } from './dashboard-error';
import { BusinessDashboardService } from './business-dashboard.service';
import {
  BookingImportAnalysis,
  BookingImportRow,
  Branch,
  Resource,
  ServiceCatalogItem,
} from './dashboard.models';

export interface BookingImportDialogData {
  branches: Branch[];
  services: ServiceCatalogItem[];
  resources: Resource[];
}

@Component({
  selector: 'app-booking-import-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './booking-import-dialog.component.html',
  styleUrl: './booking-import-dialog.component.scss',
})
export class BookingImportDialogComponent {
  protected branchId = '';
  protected file: File | null = null;
  protected previewUrl = '';
  protected analysis = signal<BookingImportAnalysis | null>(null);
  protected processing = signal(false);
  protected confirming = signal(false);
  protected error = signal('');
  protected result = signal('');

  constructor(
    private readonly service: BusinessDashboardService,
    private readonly dialogRef: MatDialogRef<BookingImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) protected readonly data: BookingImportDialogData,
  ) {
    this.branchId = data.branches.length === 1 ? data.branches[0].id : '';
  }

  protected servicesForBranch(): ServiceCatalogItem[] {
    return this.data.services.filter(
      (service) => !service.branchId || service.branchId === this.branchId,
    );
  }

  protected resourcesForBranch(): Resource[] {
    return this.data.resources.filter((resource) => resource.branchId === this.branchId);
  }

  protected resourcesForRow(row: BookingImportRow): Resource[] {
    return this.resourcesForBranch().filter(
      (resource) =>
        !row.serviceOfferingId || resource.serviceOfferingIds.includes(row.serviceOfferingId),
    );
  }

  protected chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.file = file;
    this.analysis.set(null);
    this.error.set('');
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = file ? URL.createObjectURL(file) : '';
  }

  protected analyze(): void {
    if (!this.branchId || !this.file) return;
    this.processing.set(true);
    this.error.set('');
    this.service
      .analyzeBookingImage(this.branchId, this.file)
      .pipe(finalize(() => this.processing.set(false)))
      .subscribe({
        next: (analysis) => {
          analysis.rows.forEach((row) => (row.selected = row.status === 'READY'));
          this.analysis.set(analysis);
        },
        error: (error) => this.error.set(dashboardErrorMessage(error)),
      });
  }

  protected applyService(serviceId: string): void {
    this.analysis()
      ?.rows.filter((row) => !row.serviceOfferingId)
      .forEach((row) => {
        row.serviceOfferingId = serviceId;
        row.resourceId = null;
      });
  }

  protected applyResource(resourceId: string): void {
    this.analysis()
      ?.rows.filter((row) => !row.resourceId)
      .forEach((row) => (row.resourceId = resourceId));
  }

  protected isComplete(row: BookingImportRow): boolean {
    return Boolean(
      row.date && row.time && row.customerName?.trim() && row.serviceOfferingId && row.resourceId,
    );
  }

  protected selectedRows(): BookingImportRow[] {
    return this.analysis()?.rows.filter((row) => row.selected && this.isComplete(row)) ?? [];
  }

  protected confirm(): void {
    const analysis = this.analysis();
    const rows = this.selectedRows();
    if (!analysis || !rows.length) return;
    this.confirming.set(true);
    this.error.set('');
    this.service
      .confirmBookingImport(analysis.analysisId, this.branchId, rows)
      .pipe(finalize(() => this.confirming.set(false)))
      .subscribe({
        next: (response) => {
          this.result.set(
            `${response.created} turno${response.created === 1 ? '' : 's'} importado${response.created === 1 ? '' : 's'}` +
              (response.rejected ? ` · ${response.rejected} no se pudieron importar` : ''),
          );
          if (response.created) this.dialogRef.close(response.created);
        },
        error: (error) => this.error.set(dashboardErrorMessage(error)),
      });
  }
}
