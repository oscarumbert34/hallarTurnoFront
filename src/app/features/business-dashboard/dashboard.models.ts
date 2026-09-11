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
  day: DayOfWeek;
  timeRanges: ScheduleTimeRange[];
}

export type BranchScheduleInterval = ScheduleTimeRange;

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
  absences?: ResourceAbsence[];
  active: boolean;
}

export interface ResourceAbsence {
  date: string;
  allDay: boolean;
  startsAt?: string;
  endsAt?: string;
}

export type BranchScheduleExceptionType = 'CLOSED' | 'CUSTOM_HOURS';

export interface BranchScheduleException {
  id: string;
  branchId: string;
  date: string;
  type: BranchScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface BranchScheduleExceptionRequest {
  date: string;
  type: BranchScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface ResourceSchedule {
  day: DayOfWeek;
  timeRanges: ScheduleTimeRange[];
}

export type ResourceScheduleInterval = ScheduleTimeRange;

export interface ScheduleTimeRange {
  start: string;
  end: string;
}

export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Booking {
  id: string;
  businessId?: string;
  serviceOfferingId?: string;
  resourceId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  resourceName?: string;
  branchId?: string;
  branchName?: string;
  startsAt: string;
  status: 'PENDING' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED' | string;
  depositStatus?: 'NOT_REQUIRED' | 'PENDING' | 'PAID';
}

export interface RescheduleBookingRequest {
  date: string;
  startTime: string;
  resourceId?: string;
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
