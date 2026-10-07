import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { SKIP_AUTH } from '../auth/auth.interceptor';
import { PublicQueueEntry, QueueEntry, VirtualQueue, VirtualQueueEntryStatus } from './virtual-queue.models';

@Injectable({ providedIn: 'root' })
export class VirtualQueueService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly publicContext = new HttpContext().set(SKIP_AUTH, true);

  getByBranch(branchId: string): Observable<VirtualQueue> {
    return this.http.get<VirtualQueue>(this.apiUrl.build(`/virtual-queues/branch/${branchId}`), {
      context: this.publicContext,
    });
  }

  join(branchId: string, customerName: string, phone: string): Observable<PublicQueueEntry> {
    return this.http.post<PublicQueueEntry>(
      this.apiUrl.build(`/virtual-queues/${branchId}/join`),
      { customerName, phone },
      { context: this.publicContext },
    );
  }

  getStatus(queueId: string, entryId: string): Observable<PublicQueueEntry> {
    return this.http.get<PublicQueueEntry>(
      this.apiUrl.build(`/virtual-queues/${queueId}/status/${entryId}`),
      { context: this.publicContext },
    );
  }

  open(branchId: string): Observable<VirtualQueue> {
    return this.http.post<VirtualQueue>(this.apiUrl.build(`/virtual-queues/${branchId}/open`), {});
  }

  close(branchId: string): Observable<VirtualQueue> {
    return this.http.post<VirtualQueue>(this.apiUrl.build(`/virtual-queues/${branchId}/close`), {});
  }

  entries(queueId: string): Observable<QueueEntry[]> {
    return this.http.get<QueueEntry[]>(this.apiUrl.build(`/virtual-queues/${queueId}/entries`));
  }

  addEntry(queueId: string, customerName: string, phone?: string): Observable<PublicQueueEntry> {
    return this.http.post<PublicQueueEntry>(
      this.apiUrl.build(`/virtual-queues/${queueId}/entries`),
      { customerName, phone: phone?.trim() || null },
    );
  }

  updateStatus(queueId: string, entryId: string, status: VirtualQueueEntryStatus): Observable<QueueEntry> {
    return this.http.patch<QueueEntry>(
      this.apiUrl.build(`/virtual-queues/${queueId}/entries/${entryId}/status`),
      { status },
    );
  }
}
