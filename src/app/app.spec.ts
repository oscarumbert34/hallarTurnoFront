import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { API_BASE_URL } from './shared/api-base-url.token';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should navigate to login by default while public search is disabled', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/');

    expect(router.url).toBe('/auth/login');
    expect(harness.routeNativeElement?.textContent).toContain('Ingresar');
  });

  it('does not show application navigation before login', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/auth/login');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.desktop-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-nav')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Reservas');
    expect(fixture.nativeElement.textContent).not.toContain('Panel');
  });

  it('should redirect the former public search URL to login', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/public-search');

    expect(router.url).toBe('/auth/login');
    expect(harness.routeNativeElement?.textContent).toContain('Ingresar');
  });

  it('keeps the business id when building the search navigation', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/search?businessId=business-1');

    expect((fixture.componentInstance as any).searchQueryParams()).toEqual({
      businessId: 'business-1',
    });
  });
});
