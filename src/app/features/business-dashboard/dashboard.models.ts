export interface Branch {
  id: string;
  name: string;
  address: string;
  locality: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  zoneId: string;
  weeklySchedule: BranchSchedule[];
  active: boolean;
}

export interface BranchSchedule {
  dayOfWeek: DayOfWeek;
  intervals: BranchScheduleInterval[];
}

export interface BranchScheduleInterval {
  opensAt: string;
  closesAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  branchId: string;
  durationMinutes: number;
  price?: number;
  active: boolean;
}

export interface Resource {
  id: string;
  name: string;
  branchId?: string;
  serviceOfferingIds: string[];
  weeklySchedule: ResourceSchedule[];
  active: boolean;
}

export interface ResourceSchedule {
  dayOfWeek: DayOfWeek;
  intervals: ResourceScheduleInterval[];
}

export interface ResourceScheduleInterval {
  startsAt: string;
  endsAt: string;
}

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  resourceName?: string;
  branchId?: string;
  branchName?: string;
  startsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;
}

export interface BookingListPage {
  page: number;
  size: number;
  maxSize?: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
  results: Booking[];
}

export type EntityCollection = 'branches' | 'services' | 'resources';
