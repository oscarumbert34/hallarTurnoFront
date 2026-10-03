import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BusinessLandingPage } from './business-landing.page';

describe('BusinessLandingPage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [BusinessLandingPage],
      providers: [provideRouter([])],
    }),
  );

  it('renders the six configured demos and one h1', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.demo-card')).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('.card-link')).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.benefit-grid article')).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('.plan-card')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.email-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain(
      'Todo lo que necesitás para organizar tus turnos',
    );
    expect(fixture.nativeElement.textContent).toContain('Gratis durante el lanzamiento');
    expect(fixture.nativeElement.textContent).toContain('Barbería Malvinas');
    expect(fixture.nativeElement.querySelector('.demo-card img')?.alt).toBe(
      'Portada de Barbería Malvinas',
    );
    expect(fixture.nativeElement.querySelector('.demo-card img')?.getAttribute('src')).toBe(
      'barberia-malvinas-portada.png',
    );
    expect(fixture.nativeElement.querySelectorAll('.demo-card img')).toHaveLength(6);
    const demoLinks = [...fixture.nativeElement.querySelectorAll('.card-link')].map(
      (link: HTMLAnchorElement) => link.getAttribute('href'),
    );
    expect(demoLinks).toEqual([
      '/business/barberia-malvinas',
      '/business/espacio-calma',
      '/business/consultorio-armonia',
      '/business/bella-studio',
      '/business/huellitas-pet',
      '/business/punto-saber',
    ]);
  });

  it('configures every primary action and SEO metadata', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const document = TestBed.inject(DOCUMENT);
    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    const whatsappLinks = links.filter((link) => link.href.includes('wa.me'));
    expect(whatsappLinks).toHaveLength(4);
    expect(whatsappLinks[0].href).toContain(encodeURIComponent('Hola, quiero conocer HallarTurno'));
    expect(document.title).toBe('HallarTurno | Sistema de turnos online para negocios');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Organizá tu agenda',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/para-negocios',
    );
  });

  it('links the hero to the pricing section and renders the trial offer', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const pricingLink = fixture.nativeElement.querySelector(
      '.hero-actions a[href="#planes"]',
    ) as HTMLAnchorElement;
    expect(pricingLink.textContent).toContain('Ver planes');
    expect(fixture.nativeElement.querySelector('#planes')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.trial-card')?.textContent).toContain(
      '30 días gratis',
    );
  });

  it('links the hero to the product video and renders the demo', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const videoLink = fixture.nativeElement.querySelector(
      '.hero-actions a[href="#video-demo"]',
    ) as HTMLAnchorElement;
    const video = fixture.nativeElement.querySelector('#video-demo video') as HTMLVideoElement;
    const webmSource = video.querySelector('source[type="video/webm"]');
    const mp4Source = video.querySelector('source[type="video/mp4"]');
    expect(videoLink.textContent).toContain('Ver cómo funciona');
    expect(video).toBeTruthy();
    expect(webmSource?.getAttribute('src')).toBe('hallarturno-demo-mobile.webm?v=20261003-1');
    expect(mp4Source?.getAttribute('src')).toBe('hallarturno-demo-mobile.mp4?v=20261003-3');
  });

  it('offers a direct mobile link to the benefits section', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.mobile-how-button') as HTMLAnchorElement;
    expect(link.textContent).toContain('Cómo funciona');
    expect(link.getAttribute('href')).toBe('#beneficios');
  });
});
