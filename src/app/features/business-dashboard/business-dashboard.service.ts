import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { AuthService } from '../auth/auth.service';
import {
  Booking,
  Branch,
  BranchSchedule,
  DayOfWeek,
  Resource,
  ResourceSchedule,
  ServiceCatalogItem,
} from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class BusinessDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly authService = inject(AuthService);

  listBranches(): Observable<Branch[]> {
    return this.http
      .get<EntityListResponse<BranchResponse>>(
        this.apiUrl.build(`/businesses/${this.currentBusinessId}/branches`),
      )
      .pipe(map((response) => this.getResults(response).map((branch) => this.toBranch(branch))));
  }

  createBranch(payload: Omit<Branch, 'id'>): Observable<Branch> {
    return this.http.post<BranchResponse>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/branches`),
      this.toBranchRequest(payload),
    ).pipe(map((branch) => this.toBranch(branch)));
  }

  updateBranch(id: string, payload: Omit<Branch, 'id'>): Observable<Branch> {
    return this.http.put<BranchResponse>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/branches/${id}`),
      this.toBranchRequest(payload),
    ).pipe(map((branch) => this.toBranch(branch)));
  }

  deleteBranch(id: string): Observable<void> {
    return this.http.delete<void>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/branches/${id}`),
    );
  }

  listServices(): Observable<ServiceCatalogItem[]> {
    return this.http
      .get<EntityListResponse<ServiceOfferingResponse>>(
        this.apiUrl.build(`/businesses/${this.currentBusinessId}/service-offerings`),
      )
      .pipe(map((response) => this.getResults(response).map((service) => this.toService(service))));
  }

  createService(payload: Omit<ServiceCatalogItem, 'id'>): Observable<ServiceCatalogItem> {
    return this.http.post<ServiceOfferingResponse>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/service-offerings`),
      this.toServiceRequest(payload),
    ).pipe(map((service) => this.toService(service, payload.branchId)));
  }

  updateService(
    id: string,
    payload: Omit<ServiceCatalogItem, 'id'>,
  ): Observable<ServiceCatalogItem> {
    return this.http.put<ServiceOfferingResponse>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/service-offerings/${id}`),
      this.toServiceRequest(payload),
    ).pipe(map((service) => this.toService(service, payload.branchId)));
  }

  deleteService(id: string): Observable<void> {
    return this.http.delete<void>(
      this.apiUrl.build(`/businesses/${this.currentBusinessId}/service-offerings/${id}`),
    );
  }

  listResources(): Observable<Resource[]> {
    return this.listBranches().pipe(
      switchMap((branches) => {
        if (!branches.length) {
          return of([]);
        }

        return forkJoin(
          branches.map((branch) =>
            this.http
              .get<EntityListResponse<ResourceResponse>>(
                this.apiUrl.build(`/branches/${branch.id}/resources`),
              )
              .pipe(
                map((response) =>
                  this.getResults(response).map((resource) =>
                    this.toResource(resource, resource.branchId ?? branch.id),
                  ),
                ),
              ),
          ),
        ).pipe(map((groups) => groups.flat()));
      }),
    );
  }

  createResource(payload: Omit<Resource, 'id'>): Observable<Resource> {
    const branchId = this.requireBranchId(payload);

    return this.http.post<ResourceResponse>(
      this.apiUrl.build(`/branches/${branchId}/resources`),
      this.toResourceRequest(payload),
    ).pipe(map((resource) => this.toResource(resource, branchId)));
  }

  updateResource(id: string, payload: Omit<Resource, 'id'>): Observable<Resource> {
    const branchId = this.requireBranchId(payload);

    return this.http.put<ResourceResponse>(
      this.apiUrl.build(`/resources/${id}`),
      this.toResourceRequest(payload),
    ).pipe(map((resource) => this.toResource(resource, branchId)));
  }

  deleteResource(branchId: string, id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl.build(`/resources/${id}`));
  }

  listBookings(date: string): Observable<Booking[]> {
    const params = new HttpParams().set('page', 0).set('size', 20);

    return this.http
      .get<BookingsResponse>(this.apiUrl.build(`/businesses/${this.currentBusinessId}/bookings`), {
        params,
      })
      .pipe(map((response) => this.toBookings(response)));
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl.build(`/bookings/${id}/cancel`), {});
  }

  private get currentBusinessId(): string {
    const businessId = this.authService.businessId;

    if (!businessId) {
      throw new Error('Authenticated session has no businessId');
    }

    return businessId;
  }

  private toBranch(branch: BranchResponse): Branch {
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      locality: branch.locality,
      province: branch.province,
      country: branch.country,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      zoneId: branch.zoneId,
      weeklySchedule: branch.weeklySchedule ?? [],
      active: branch.active ?? branch.status === 'ACTIVE',
    };
  }

  private toBranchRequest(branch: Omit<Branch, 'id'>): BranchRequest {
    return {
      name: branch.name,
      address: branch.address,
      locality: branch.locality,
      province: branch.province,
      country: branch.country,
      latitude: branch.latitude,
      longitude: branch.longitude,
      zoneId: branch.zoneId,
      status: branch.active ? 'ACTIVE' : 'INACTIVE',
      weeklySchedule: branch.weeklySchedule,
    };
  }

  private toService(service: ServiceOfferingResponse, fallbackBranchId = ''): ServiceCatalogItem {
    return {
      id: service.id,
      name: service.name,
      branchId: this.serviceBranchId(service) || fallbackBranchId,
      durationMinutes: service.durationMinutes ?? service.duration ?? 30,
      price: service.price,
      active: service.active ?? service.status === 'ACTIVE',
    };
  }

  private toServiceRequest(service: Omit<ServiceCatalogItem, 'id'>): ServiceOfferingRequest {
    return {
      name: service.name,
      branchId: service.branchId,
      durationMinutes: service.durationMinutes,
      price: service.price,
      status: service.active ? 'ACTIVE' : 'INACTIVE',
    };
  }

  private toResource(resource: ResourceResponse, branchId: string): Resource {
    return {
      id: resource.id,
      name: resource.name ?? resource.visibleName,
      branchId,
      serviceOfferingIds: resource.serviceOfferingIds ?? [],
      weeklySchedule: resource.weeklySchedule ?? [],
      active: resource.active ?? resource.status === 'ACTIVE',
    };
  }

  private toResourceRequest(resource: Omit<Resource, 'id'>): ResourceRequest {
    return {
      visibleName: resource.name,
      type: 'EMPLOYEE',
      status: resource.active ? 'ACTIVE' : 'INACTIVE',
      serviceOfferingIds: resource.serviceOfferingIds,
      weeklySchedule: resource.weeklySchedule,
      absences: [],
    };
  }

  private requireBranchId(resource: Omit<Resource, 'id'>): string {
    if (!resource.branchId) {
      throw new Error('Resource branchId is required');
    }

    return resource.branchId;
  }

  private toBookings(response: BookingsResponse): Booking[] {
    const bookings = this.getResults(response);

    return bookings.map((booking) => ({
      id: booking.id,
      customerName:
        this.firstText(booking.customerName, booking.customerNameSnapshot, booking.customerEmail) ??
        'Sin nombre',
      customerPhone: this.firstText(booking.customerPhone, booking.customerPhoneSnapshot),
      customerEmail: booking.customerEmail,
      serviceName: booking.serviceName,
      resourceName: booking.resourceName,
      branchId: booking.branchId,
      branchName: booking.branchName,
      startsAt: booking.startsAt,
      status: booking.status,
    }));
  }

  private getResults<T>(response: EntityListResponse<T>): T[] {
    return Array.isArray(response) ? response : (response.results ?? []);
  }

  private firstText(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => value?.trim())?.trim();
  }

  private serviceBranchId(service: ServiceOfferingResponse): string {
    if (service.branchId) {
      return service.branchId;
    }

    if (service.branches?.length) {
      return service.branches.find((branch) => branch.id)?.id ?? '';
    }

    return service.branch?.id ?? '';
  }
}

type EntityListResponse<T> = T[] | { results?: T[] };

interface BranchResponse {
  id: string;
  name: string;
  address: string;
  locality: string;
  province: string;
  country: string;
  latitude: number | string;
  longitude: number | string;
  zoneId: string;
  weeklySchedule?: BranchSchedule[];
  active?: boolean;
  status?: string;
}

interface BranchRequest {
  name: string;
  address: string;
  locality: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  zoneId: string;
  status: 'ACTIVE' | 'INACTIVE';
  weeklySchedule: BranchSchedule[];
}

interface ServiceOfferingResponse {
  id: string;
  name: string;
  branchId?: string;
  branch?: { id?: string };
  branches?: Array<{ id?: string }>;
  durationMinutes?: number;
  duration?: number;
  price?: number;
  active?: boolean;
  status?: string;
}

interface ServiceOfferingRequest {
  name: string;
  branchId: string;
  durationMinutes: number;
  price?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ResourceResponse {
  id: string;
  name?: string;
  visibleName: string;
  branchId?: string;
  serviceOfferingIds?: string[];
  weeklySchedule?: ResourceSchedule[];
  active?: boolean;
  status?: string;
}

interface ResourceRequest {
  visibleName: string;
  type: 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  serviceOfferingIds: string[];
  weeklySchedule: ResourceScheduleRequest[];
  absences: [];
}

interface ResourceScheduleRequest {
  dayOfWeek: DayOfWeek;
  intervals: ResourceIntervalRequest[];
}

interface ResourceIntervalRequest {
  startsAt: string;
  endsAt: string;
}

type BookingsResponse = EntityListResponse<BookingResponse>;

interface BookingResponse {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerNameSnapshot?: string;
  customerPhoneSnapshot?: string;
  customerId?: string;
  customerEmail?: string;
  serviceName: string;
  resourceName?: string;
  branchId?: string;
  branchName?: string;
  startsAt: string;
  status: string;
}
