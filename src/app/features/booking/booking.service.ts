import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { SKIP_AUTH } from '../auth/auth.interceptor';
import {
  AvailabilityPage,
  AvailabilityPagination,
  AvailabilitySearch,
  AvailabilitySlot,
  AvailabilitySlotPage,
  BusinessSummary,
  BusinessAvailability,
  BusinessDetail,
  CreateBookingRequest,
  CustomerBooking,
  ServiceOfferingSummary,
} from './booking.models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  searchAvailability(
    search: AvailabilitySearch,
    pagination: AvailabilityPagination,
  ): Observable<AvailabilityPage> {
    let params = new HttpParams()
      .set('date', search.date)
      .set('locality', search.zone)
      .set('service', search.service)
      .set('startsFrom', search.timeFrom)
      .set('startsTo', search.timeTo)
      .set('offset', pagination.offset)
      .set('limit', pagination.limit)
      .set('maxSlotsPerService', pagination.maxSlotsPerService ?? pagination.limit);

    if (search.businessId) {
      params = params.set('businessId', search.businessId);
    }

    return this.http
      .get<AvailabilityResponse>(this.apiUrl.build('/public/availability'), {
        params,
        context: this.publicHttpContext(),
      })
      .pipe(map((response) => this.toAvailabilityPage(response, search.date, search.service)));
  }

  listAvailabilitySlots(
    availability: Pick<BusinessAvailability, 'branchId' | 'serviceId'>,
    search: AvailabilitySearch,
    pagination: AvailabilityPagination,
  ): Observable<AvailabilitySlotPage> {
    const params = new HttpParams()
      .set('branchId', availability.branchId)
      .set('date', search.date)
      .set('startsFrom', search.timeFrom)
      .set('startsTo', search.timeTo)
      .set('offset', pagination.offset)
      .set('limit', pagination.limit);

    return this.http
      .get<AvailabilitySlotsResponse>(
        this.apiUrl.build(`/public/availability/${availability.serviceId}/slots`),
        {
          params,
          context: this.publicHttpContext(),
        },
      )
      .pipe(map((response) => this.toAvailabilitySlotPage(response, search.date)));
  }

  listBusinesses(): Observable<BusinessSummary[]> {
    return this.http
      .get<BusinessListResponse>(this.apiUrl.build('/businesses'), {
        context: this.publicHttpContext(),
      })
      .pipe(map((response) => this.toBusinesses(response)));
  }

  listServiceOfferings(businessId: string): Observable<ServiceOfferingSummary[]> {
    return this.http
      .get<ServiceOfferingListResponse>(
        this.apiUrl.build(`/businesses/${businessId}/service-offerings`),
        {
          context: this.publicHttpContext(),
        },
      )
      .pipe(map((response) => this.toServiceOfferings(response)));
  }

  getBusiness(businessId: string): Observable<BusinessDetail> {
    return this.http.get<BusinessDetail>(this.apiUrl.build(`/public/businesses/${businessId}`), {
      context: this.publicHttpContext(),
    });
  }

  createBooking(request: CreateBookingRequest): Observable<CustomerBooking> {
    return this.http.post<CustomerBooking>(this.apiUrl.build('/public/bookings'), request, {
      context: this.publicHttpContext(),
    });
  }

  private toAvailabilityPage(
    response: AvailabilityResponse,
    date: string,
    serviceFilter: string,
  ): AvailabilityPage {
    const offset = response.offset ?? response.page ?? 0;
    const limit = response.limit ?? response.size ?? 0;
    const totalAvailableSlots = response.totalAvailableSlots ?? response.totalElements ?? 0;
    const results = this.toAvailabilityResults(response, date, serviceFilter);

    return {
      offset,
      limit,
      totalAvailableSlots,
      hasMore:
        response.hasMore ??
        (response.totalPages !== undefined
          ? (response.page ?? 0) + 1 < response.totalPages
          : offset + results.reduce((total, business) => total + business.slots.length, 0) <
            totalAvailableSlots),
      results,
    };
  }

  private publicHttpContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTH, true);
  }

  private toAvailabilitySlotPage(
    response: AvailabilitySlotsResponse,
    date: string,
  ): AvailabilitySlotPage {
    return {
      serviceOfferingId: response.serviceOfferingId,
      branchId: response.branchId,
      offset: response.offset,
      limit: response.limit,
      totalAvailableSlots: response.totalAvailableSlots,
      hasMore: response.hasMore,
      slots: this.toSlots(response.serviceOfferingId, response.slots ?? [], date),
    };
  }

  private toAvailabilityResults(
    response: AvailabilityResponse,
    date: string,
    serviceFilter: string,
  ): BusinessAvailability[] {
    const normalizedFilter = serviceFilter.trim().toLowerCase();

    return (response.results ?? []).flatMap((business) =>
      (business.branches ?? []).flatMap((branch) =>
        (branch.services ?? [])
          .filter((service) => service.name.toLowerCase().includes(normalizedFilter))
          .map((service) => ({
            businessId: business.id,
            businessName: business.name,
            branchId: branch.id,
            branchName: branch.name,
            address: branch.address,
            zone: branch.locality,
            serviceId: service.id,
            serviceName: service.name,
            price: service.price,
            durationMinutes: service.durationMinutes,
            slots: this.toSlots(service.id, service.slots ?? [], date),
          })),
      ),
    );
  }

  private toSlots(
    serviceId: string,
    slots: AvailabilitySlotResponse[],
    date: string,
  ): AvailabilitySlot[] {
    return slots.map((slot) => ({
      id: `${serviceId}-${slot.resourceId}-${slot.startsAt}`,
      startsAt: `${date}T${slot.startsAt}`,
      endsAt: `${date}T${slot.endsAt}`,
      resourceId: slot.resourceId,
      resourceName: slot.resourceName,
    }));
  }

  private toBusinesses(response: BusinessListResponse): BusinessSummary[] {
    const businesses = Array.isArray(response) ? response : (response.results ?? []);

    return businesses.map((business) => ({
      id: business.id,
      name: business.name,
      shortDescription: business.shortDescription,
      status: business.status,
    }));
  }

  private toServiceOfferings(response: ServiceOfferingListResponse): ServiceOfferingSummary[] {
    const serviceOfferings = Array.isArray(response) ? response : (response.results ?? []);

    return serviceOfferings.map((serviceOffering) => ({
      id: serviceOffering.id,
      name: serviceOffering.name,
      durationMinutes: serviceOffering.durationMinutes ?? serviceOffering.duration,
      price: serviceOffering.price,
      status: serviceOffering.status,
    }));
  }
}

type BusinessListResponse = BusinessResponse[] | { results?: BusinessResponse[] };
type ServiceOfferingListResponse =
  ServiceOfferingResponse[] | { results?: ServiceOfferingResponse[] };

interface BusinessResponse {
  id: string;
  name: string;
  shortDescription?: string;
  status?: string;
}

interface ServiceOfferingResponse {
  id: string;
  name: string;
  durationMinutes?: number;
  duration?: number;
  price?: number;
  status?: string;
}

interface AvailabilityResponse {
  offset?: number;
  limit?: number;
  totalAvailableSlots?: number;
  hasMore?: boolean;
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  results: AvailabilityBusinessResponse[];
}

interface AvailabilitySlotsResponse {
  serviceOfferingId: string;
  branchId: string;
  offset: number;
  limit: number;
  totalAvailableSlots: number;
  hasMore: boolean;
  slots: AvailabilitySlotResponse[];
}

interface AvailabilityBusinessResponse {
  id: string;
  name: string;
  shortDescription?: string;
  branches: AvailabilityBranchResponse[];
}

interface AvailabilityBranchResponse {
  id: string;
  name: string;
  address: string;
  locality?: string;
  services: AvailabilityServiceResponse[];
}

interface AvailabilityServiceResponse {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  slots: AvailabilitySlotResponse[];
}

interface AvailabilitySlotResponse {
  startsAt: string;
  endsAt: string;
  resourceId?: string;
  resourceName?: string;
}
