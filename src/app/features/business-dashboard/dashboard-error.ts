import { HttpErrorResponse } from '@angular/common/http';

export function dashboardErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'No pudimos completar la operacion.';
  }

  if (error.status === 0) {
    return 'No pudimos conectar con el servidor.';
  }

  if (error.status === 403) {
    return 'No tenés permisos para realizar esta acción.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado no existe.';
  }

  if (error.status === 409) {
    return 'Hay un conflicto con datos existentes. Revisa duplicados u horarios superpuestos.';
  }

  if (error.status >= 400 && error.status < 500) {
    return 'Revisa los datos ingresados.';
  }

  return 'Ocurrio un error inesperado. Intenta nuevamente.';
}
