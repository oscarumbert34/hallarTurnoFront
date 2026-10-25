import {
  ownerBookingUrl,
  whatsappBookingConfirmationUrl,
  whatsappBookingUrl,
} from './whatsapp-booking';

describe('whatsappBookingUrl', () => {
  const inquiry = {
    businessName: 'Barbería Central',
    branchName: 'Centro',
    serviceName: 'Corte de cabello',
    slot: {
      startsAt: '2026-10-09T15:30:00',
      resourceName: 'Martín',
    },
  };

  it('describes a slot from the today card without including its date', () => {
    const message = messageFrom(
      whatsappBookingUrl('54 9 11 1234-5678', { ...inquiry, isToday: true }),
    );

    expect(message).toBe(
      'Hola Barbería Central 👋\n\n' +
        'Quiero solicitar este turno:\n\n' +
        '✂️ Servicio: Corte de cabello\n' +
        '📅 El turno es para hoy\n' +
        '🕐 Hora: 15:30\n' +
        '📍 Sucursal: Centro\n' +
        '👤 Profesional: Martín',
    );
    expect(message).not.toContain('Fecha:');
  });

  it('keeps the date for the other WhatsApp booking flows', () => {
    expect(messageFrom(whatsappBookingUrl('5491112345678', inquiry))).toContain(
      'Fecha: 2026-10-09',
    );
  });

  it('includes the link the owner can use to create the requested slot', () => {
    const ownerUrl = ownerBookingUrl(
      'https://hallarturno.com.ar/',
      {
        businessId: 'business-1',
        businessName: 'Barbería Central',
        branchId: 'branch-1',
        branchName: 'Centro',
        serviceId: 'service-1',
        serviceName: 'Corte de cabello',
        price: 15000,
      },
      {
        id: 'slot-1',
        startsAt: '2026-10-09T15:30:00',
        endsAt: '2026-10-09T16:00:00',
        resourceId: 'resource-1',
        resourceName: 'Martín',
      },
    );
    const message = messageFrom(
      whatsappBookingUrl('5491112345678', { ...inquiry, ownerBookingUrl: ownerUrl }),
    );

    expect(ownerUrl).toBe(
      'https://hallarturno.com.ar/booking?businessId=business-1&businessName=Barber%C3%ADa+Central&branchId=branch-1&branchName=Centro&serviceId=service-1&serviceName=Corte+de+cabello&slotId=slot-1&startsAt=2026-10-09T15%3A30%3A00&endsAt=2026-10-09T16%3A00%3A00&resourceId=resource-1&resourceName=Mart%C3%ADn&price=15000&ownerBooking=true',
    );
    expect(message).toContain('👉 Crear este turno:');
    expect(message).toContain(ownerUrl);
  });

  it('builds a customer confirmation message for the created booking', () => {
    const message = messageFrom(
      whatsappBookingConfirmationUrl('+54 9 11 1234-5678', {
        customerName: 'Ana',
        businessName: 'Barbería Central',
        branchName: 'Centro',
        serviceName: 'Corte',
        startsAt: '2026-10-09T15:30:00',
        resourceName: 'Martín',
      }),
    );

    expect(message).toContain('¡Hola Ana! 👋');
    expect(message).toContain('✅ Tu turno en *Barbería Central* quedó reservado.');
    expect(message).toContain('📅 Fecha: 2026-10-09');
    expect(message).toContain('🕐 Hora: 15:30');
    expect(message).toContain('👤 Profesional: Martín');
  });
});

function messageFrom(url: string): string {
  return new URL(url).searchParams.get('text') ?? '';
}
