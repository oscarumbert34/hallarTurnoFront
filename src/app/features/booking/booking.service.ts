import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import {
  AvailabilitySearch,
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

  searchAvailability(search: AvailabilitySearch): Observable<BusinessAvailability[]> {
    let params = new HttpParams()
      .set('date', search.date)
      .set('locality', search.zone)
      .set('startsFrom', search.timeFrom)
      .set('startsTo', search.timeTo);

    if (search.businessId) {
      params = params.set('businessId', search.businessId);
    }

    return this.http
      .get<AvailabilityResponse>(this.apiUrl.build('/public/availability'), {
        params,
      })
      .pipe(map((response) => this.toAvailability(response, search.date, search.service)));
  }

  listBusinesses(): Observable<BusinessSummary[]> {
    return this.http
      .get<BusinessListResponse>(this.apiUrl.build('/businesses'))
      .pipe(map((response) => this.toBusinesses(response)));
  }

  listServiceOfferings(businessId: string): Observable<ServiceOfferingSummary[]> {
    return this.http
      .get<ServiceOfferingListResponse>(
        this.apiUrl.build(`/businesses/${businessId}/service-offerings`),
      )
      .pipe(map((response) => this.toServiceOfferings(response)));
  }

  getBusiness(businessId: string): Observable<BusinessDetail> {
    return this.http.get<BusinessDetail>(this.apiUrl.build(`/public/businesses/${businessId}`));
  }

  createBooking(request: CreateBookingRequest): Observable<CustomerBooking> {
    return this.http.post<CustomerBooking>(this.apiUrl.build('/public/bookings'), request);
  }

  private toAvailability(
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
            slots: (service.slots ?? []).map((slot) => ({
              id: `${service.id}-${slot.resourceId}-${slot.startsAt}`,
              startsAt: `${date}T${slot.startsAt}`,
              endsAt: `${date}T${slot.endsAt}`,
              resourceId: slot.resourceId,
              resourceName: slot.resourceName,
            })),
          })),
      ),
    );
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
  | ServiceOfferingResponse[]
  | { results?: ServiceOfferingResponse[] };

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
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  results: AvailabilityBusinessResponse[];
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
