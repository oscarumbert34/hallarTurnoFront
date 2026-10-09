import { HttpErrorResponse } from '@angular/common/http';

export function authErrorMessage(error: unknown, method: 'password' | 'google' = 'password'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'No pudimos completar la operacion.';
  }

  if (error.status === 0) {
    return 'No pudimos conectar con el servidor.';
  }

  if (error.status === 400) {
    return 'Revisa los datos ingresados.';
  }

  if (error.status === 401) {
    return method === 'google'
      ? 'La cuenta de Google no corresponde a una empresa habilitada.'
      : 'Email o contrasena incorrectos.';
  }

  if (error.status === 403 && method === 'google') {
    return 'El acceso con Google solo esta disponible para empresas configuradas.';
  }

  if (error.status === 409) {
    return 'Ya existe una cuenta con ese email.';
  }

  return 'No pudimos completar la operacion.';
}
