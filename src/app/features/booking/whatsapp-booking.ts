import { AvailabilitySlot, BusinessAvailability, SelectedSlot } from './booking.models';

export interface WhatsappBookingInquiry {
  businessName: string;
  branchName: string;
  serviceName: string;
  slot: Pick<AvailabilitySlot, 'startsAt' | 'resourceName'>;
  isToday?: boolean;
  ownerBookingUrl?: string;
}

export function whatsappBookingUrl(phone: string, inquiry: WhatsappBookingInquiry): string {
  const date = inquiry.slot.startsAt.slice(0, 10);
  const time = inquiry.slot.startsAt.slice(11, 16);
  const day = inquiry.isToday ? 'El turno es para hoy' : `Fecha: ${date}`;
  const professional = inquiry.slot.resourceName
    ? `\n👤 Profesional: ${inquiry.slot.resourceName}`
    : '';
  const ownerBookingLink = inquiry.ownerBookingUrl
    ? `\n\n👉 Crear este turno:\n${inquiry.ownerBookingUrl}`
    : '';
  const message = `Hola ${inquiry.businessName} 👋\n\nQuiero solicitar este turno:\n\n✂️ Servicio: ${inquiry.serviceName}\n📅 ${day}\n🕐 Hora: ${time}\n📍 Sucursal: ${inquiry.branchName}${professional}${ownerBookingLink}`;

  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function ownerBookingUrl(
  origin: string,
  business: Pick<
    BusinessAvailability,
    | 'businessId'
    | 'businessName'
    | 'branchId'
    | 'branchName'
    | 'serviceId'
    | 'serviceName'
    | 'price'
    | 'depositEnabled'
  >,
  slot: Pick<AvailabilitySlot, 'id' | 'startsAt' | 'endsAt' | 'resourceId' | 'resourceName'>,
): string {
  const selectedSlot = ownerBookingPayload(business, slot);
  const params = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(selectedSlot)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    ),
    ownerBooking: 'true',
  });

  return `${origin.replace(/\/$/, '')}/booking?${params.toString()}`;
}

export function ownerBookingPayload(
  business: Pick<
    BusinessAvailability,
    | 'businessId'
    | 'businessName'
    | 'branchId'
    | 'branchName'
    | 'serviceId'
    | 'serviceName'
    | 'price'
    | 'depositEnabled'
  >,
  slot: Pick<AvailabilitySlot, 'id' | 'startsAt' | 'endsAt' | 'resourceId' | 'resourceName'>,
): SelectedSlot {
  return {
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
    depositEnabled: business.depositEnabled,
  };
}

export function shortOwnerBookingUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/t/${code}`;
}

export interface WhatsappBookingConfirmation {
  customerName: string;
  businessName: string;
  branchName: string;
  serviceName: string;
  startsAt: string;
  resourceName?: string;
}

export function whatsappBookingConfirmationUrl(
  customerPhone: string,
  booking: WhatsappBookingConfirmation,
): string {
  const date = booking.startsAt.slice(0, 10);
  const time = booking.startsAt.slice(11, 16);
  const professional = booking.resourceName ? `\n👤 Profesional: ${booking.resourceName}` : '';
  const message = `¡Hola ${booking.customerName}! 👋\n\n✅ Tu turno en *${booking.businessName}* quedó reservado.\n\n✂️ Servicio: ${booking.serviceName}\n📅 Fecha: ${date}\n🕐 Hora: ${time}\n📍 Sucursal: ${booking.branchName}${professional}\n\n¡Te esperamos! 😊`;

  return `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
