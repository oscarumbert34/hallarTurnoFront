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
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Barbería Malvinas');
    expect(fixture.nativeElement.querySelector('.demo-card img')?.alt).toBe(
      'Logo de Barbería Malvinas',
    );
    expect(fixture.nativeElement.querySelector('.demo-card img')?.getAttribute('src')).toBe(
      'barberia-malvinas-logo.png',
    );
  });

  it('configures every primary action and SEO metadata', () => {
    const fixture = TestBed.createComponent(BusinessLandingPage);
    fixture.detectChanges();
    const document = TestBed.inject(DOCUMENT);
    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    const whatsappLinks = links.filter((link) => link.href.includes('wa.me'));
    expect(whatsappLinks).toHaveLength(3);
    expect(whatsappLinks[0].href).toContain(encodeURIComponent('Hola, quiero conocer HallarTurno'));
    expect(document.title).toBe('HallarTurno | Sistema de turnos online para negocios');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Organizá tu agenda',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/para-negocios',
    );
  });
});
