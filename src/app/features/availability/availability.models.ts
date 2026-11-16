export type AvailabilityDayStatus = 'AVAILABLE' | 'NO_AVAILABILITY' | 'CLOSED';

export interface AvailabilitySlotOverview {
  startsAt: string;
  endsAt: string;
  resourceId: string;
  resourceName: string;
}

export interface AvailabilityDayOverview {
  date: string;
  status: AvailabilityDayStatus;
  slots: AvailabilitySlotOverview[];
}

export interface AvailabilityOverview {
  businessId: string;
  branchId: string;
  serviceOfferingId: string;
  resourceId?: string | null;
  from: string;
  to: string;
  zoneId: string;
  days: AvailabilityDayOverview[];
}
