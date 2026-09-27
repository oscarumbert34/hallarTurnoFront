import { AvailabilitySlot } from './booking.models';

export interface WhatsappBookingInquiry {
  businessName: string;
  branchName: string;
  serviceName: string;
  slot: Pick<AvailabilitySlot, 'startsAt' | 'resourceName'>;
}

export function whatsappBookingUrl(phone: string, inquiry: WhatsappBookingInquiry): string {
  const date = inquiry.slot.startsAt.slice(0, 10);
  const time = inquiry.slot.startsAt.slice(11, 16);
  const professional = inquiry.slot.resourceName
    ? `\nProfesional: ${inquiry.slot.resourceName}`
    : '';
  const message = `Hola ${inquiry.businessName}, quiero consultar por este turno:\nServicio: ${inquiry.serviceName}\nFecha: ${date}\nHora: ${time}\nSucursal: ${inquiry.branchName}${professional}`;

  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
