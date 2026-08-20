export interface AvailabilitySearch {
  business?: string;
  businessId?: string;
  service: string;
  date: string;
  zone: string;
  timeFrom: string;
  timeTo: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  shortDescription?: string;
  status?: string;
}

export interface ServiceOfferingSummary {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number;
  status?: string;
}

export interface AvailabilitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
  resourceId?: string;
  resourceName?: string;
}

export interface BusinessAvailability {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  address: string;
  zone?: string;
  serviceId: string;
  serviceName: string;
  price?: number;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export interface BusinessDetail {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  address?: string;
  phone?: string;
}

export interface CreateBookingRequest {
  businessId: string;
  branchId: string;
  serviceOfferingId: string;
  resourceId?: string;
  date: string;
  startsAt: string;
  customerName: string;
  customerPhone: string;
}

export interface CustomerBooking {
  id: string;
  businessName: string;
  branchName?: string;
  serviceName: string;
  startsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;
  canCancel?: boolean;
  price?: number;
}

export interface SelectedSlot {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  serviceId: string;
  serviceName: string;
  slotId: string;
  startsAt: string;
  endsAt?: string;
  resourceId?: string;
  resourceName?: string;
  price?: number;
}
