import { HttpErrorResponse } from '@angular/common/http';

export function bookingErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'No pudimos completar la operacion.';
  }

  if (error.status === 0) {
    return 'No pudimos conectar con el servidor.';
  }

  if (error.status === 401) {
    return 'El servidor no permite crear reservas publicas por ahora.';
  }

  if (error.status === 403) {
    return 'No tenés permisos para realizar esta acción.';
  }

  if (error.status === 409) {
    return 'Ese turno ya fue reservado. Actualizamos la disponibilidad para que elijas otro.';
  }

  if (error.status >= 400 && error.status < 500) {
    return 'Revisa los datos de la reserva.';
  }

  return 'Ocurrio un error inesperado. Intenta nuevamente.';
}
