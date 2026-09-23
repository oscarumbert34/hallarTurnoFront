import { Router } from '@angular/router';
import {
  AvailabilitySearch,
  AvailabilitySlot,
  BusinessAvailability,
  SelectedSlot,
} from './booking.models';

export function navigateToBooking(
  router: Router,
  business: BusinessAvailability,
  slot: AvailabilitySlot,
  search: AvailabilitySearch,
  slug?: string,
): void {
  const selectedSlot: SelectedSlot = {
    businessId: business.businessId,
    businessName: business.businessName,
    branchId: business.branchId,
    branchName: business.branchName,
    serviceId: business.serviceId,
    serviceName: business.serviceName,
    slotId: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    resourceId: slot.resourceId,
    resourceName: slot.resourceName,
    price: business.price,
    depositEnabled: business.depositEnabled ?? false,
    businessCategory: business.category ?? 'OTHERS',
    source: slug ? 'PUBLIC' : 'DIRECT_LINK',
  };
  sessionStorage.setItem('turnero.selectedSlot', JSON.stringify(selectedSlot));
  sessionStorage.setItem('turnero.search', JSON.stringify(search));
  void router.navigate(slug ? ['/', slug, 'booking'] : ['/booking'], {
    queryParams: { ...selectedSlot, search: JSON.stringify(search) },
  });
}
