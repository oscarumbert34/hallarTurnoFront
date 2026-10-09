import { whatsappBookingUrl } from './whatsapp-booking';

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
      'Hola Barbería Central, quiero consultar por este turno:\n' +
        'Servicio: Corte de cabello\n' +
        'El turno es para hoy\n' +
        'Hora: 15:30\n' +
        'Sucursal: Centro\n' +
        'Profesional: Martín',
    );
    expect(message).not.toContain('Fecha:');
  });

  it('keeps the date for the other WhatsApp booking flows', () => {
    expect(messageFrom(whatsappBookingUrl('5491112345678', inquiry))).toContain(
      'Fecha: 2026-10-09',
    );
  });
});

function messageFrom(url: string): string {
  return new URL(url).searchParams.get('text') ?? '';
}
