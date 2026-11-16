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
    expect(fixture.nativeElement.querySelectorAll('.email-card')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.plan-email-features')).toHaveLength(3);
    const emailLimits = [...fixture.nativeElement.querySelectorAll('.plan-email-features p')].map(
      (element: HTMLElement) => element.textContent?.trim(),
    );
    expect(emailLimits).toEqual([
      'Hasta 180 correos mensuales',
      'Hasta 800 correos mensuales',
      'Hasta 1.300 correos mensuales',
    ]);
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
    const instagramLink = fixture.nativeElement.querySelector(
      '.instagram-link',
    ) as HTMLAnchorElement;
    expect(whatsappLinks).toHaveLength(4);
    expect(whatsappLinks[0].href).toContain(encodeURIComponent('Hola, quiero conocer HallarTurno'));
    expect(instagramLink.href).toBe('https://www.instagram.com/hallarturno/');
    expect(instagramLink.target).toBe('_blank');
    expect(instagramLink.rel).toBe('noopener');
    expect(instagramLink.getAttribute('aria-label')).toContain('@hallarturno');
    expect(fixture.nativeElement.querySelector('.mobile-instagram-link')?.href).toBe(
      'https://www.instagram.com/hallarturno/',
    );
    expect(
      fixture.nativeElement.querySelector('.mobile-instagram-link mat-icon')?.textContent,
    ).toBe('alternate_email');
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
      '60 días gratis',
    );
    const pricing = fixture.nativeElement.querySelector('#planes');
    expect(
      pricing
        .querySelector('.trial-card')
        .compareDocumentPosition(pricing.querySelector('.plan-grid')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('links the hero to the product videos and renders every walkthrough', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const videoLink = fixture.nativeElement.querySelector(
      '.hero-actions a[href="#video-demo"]',
    ) as HTMLAnchorElement;
    const videos = [...fixture.nativeElement.querySelectorAll('.video-gallery video')];
    const sources = videos.map((video) => video.querySelector('source')?.getAttribute('src'));
    expect(videoLink.textContent).toContain('Ver cómo funciona');
    expect(videos).toHaveLength(5);
    expect(sources).toEqual([
      'videos/reserva-por-whatsapp.mp4',
      'videos/reserva-pagina-publica.mp4',
      'videos/consultar-agenda.mp4',
      'videos/reprogramar-turno.mp4',
      'videos/cancelar-turno.mp4',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Así reservan tus clientes');
    expect(fixture.nativeElement.textContent).toContain('Gestioná tu agenda fácilmente');
  });

  it('offers a direct mobile link to the benefits section', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.mobile-how-button') as HTMLAnchorElement;
    expect(link.textContent).toContain('Cómo funciona');
    expect(link.getAttribute('href')).toBe('#beneficios');
  });
});
