# HallarTurno Frontend

Base responsive/PWA para el frontend de HallarTurno.

## Stack

- Angular 21 standalone components
- Angular Material
- Angular Router
- HttpClient
- Service worker/PWA con `@angular/pwa`
- Tests unitarios con Vitest
- Formato con Prettier

## Requisitos

- Node.js compatible con Angular 21: `^20.19.0 || ^22.12.0 || ^24.0.0`
- npm

## Comandos

```bash
npm install
npm start
npm test
npm run build
npm run format:check
```

La app queda disponible en `http://localhost:4200/` durante desarrollo. En modo dev, las llamadas HTTP apuntan directo a `http://localhost:8080/api/v1`.

## Estructura

```text
src/app/features/auth
src/app/features/public-search
src/app/features/booking
src/app/features/business-dashboard
src/app/shared
src/environments
```

Las rutas iniciales son placeholders y se cargan de forma lazy:

- `/public-search`
- `/booking`
- `/business-dashboard`
- `/auth`

## API

La URL base de API se configura por environment:

- Desarrollo: `src/environments/environment.ts`
- Produccion: `src/environments/environment.prod.ts`

No hay URL productiva hardcodeada. El valor de produccion queda vacio por defecto para permitir despliegues con proxy o misma origin.

## Autenticacion

La feature `auth` incluye:

- Login en `/auth/login`
- Registro en `/auth/register`
- `AuthService`
- Interceptor bearer token
- Guard para rutas protegidas
- Logout desde el layout

Endpoints esperados por defecto:

- `POST /auth/login`
- `POST /auth/register`

En desarrollo, el frontend llama directo a `http://localhost:8080/api/v1/auth/login` y `http://localhost:8080/api/v1/auth/register`. El backend local debe permitir CORS desde `http://localhost:4200`.

Endpoints principales usados por el MVP:

- `GET/POST /businesses/{businessId}/branches`
- `GET/POST /businesses/{businessId}/service-offerings`
- `GET/POST /branches/{branchId}/resources`
- `GET /businesses/{businessId}/bookings?page=0&size=20`
- `GET /public/availability?date=YYYY-MM-DD&locality=...&startsFrom=HH:mm&startsTo=HH:mm`

El token se mantiene en memoria mientras la app esta abierta y se persiste en `localStorage` para recuperar la sesion al refrescar. Para el MVP es simple y funcional, pero tiene riesgo ante XSS: si se inyecta JavaScript malicioso en la app, podria leer el token. No se guarda la contrasena. Para endurecer esta decision, priorizar CSP estricta, sanitizacion de entradas/salidas y evaluar cookies `HttpOnly`/`Secure` cuando el backend lo soporte.

## PWA

El service worker se registra solo en builds de produccion. La configuracion esta en:

- `ngsw-config.json`
- `public/manifest.webmanifest`

## Flujo Manual E2E Del Panel

Con backend local en `http://localhost:8080`:

1. Ejecutar `npm start`.
2. Ingresar en `/auth/login` con un usuario propietario o administrador.
3. Confirmar redireccion a `/business-dashboard`.
4. Crear una sucursal y verificar que aparece en la lista.
5. Crear un servicio y verificar que aparece en la lista.
6. Crear un recurso asociado a una sucursal.
7. Crear un horario o bloqueo.
8. Buscar reservas por fecha.
9. Cancelar una reserva y confirmar que la lista se refresca.
10. Forzar casos `403` y `409` desde backend para validar mensajes claros.

## Flujo Manual E2E De Reserva

1. Ejecutar `npm start`.
2. Entrar a `/public-search`.
3. Buscar por servicio, fecha, zona y rango horario.
4. Elegir un slot de un negocio disponible.
5. Confirmar reserva sin sesion.
6. Verificar que el backend crea la reserva desde el endpoint publico.
7. Ver la reserva desde `Panel > Reservas` con un usuario administrador o negocio.
8. Cancelar la reserva desde el panel y verificar que la lista se refresca.
9. Simular `409` desde backend para validar el mensaje de conflicto y refresco de disponibilidad.
