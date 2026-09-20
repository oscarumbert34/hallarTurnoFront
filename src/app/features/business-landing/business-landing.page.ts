import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface DemoBusiness {
  name: string;
  category: string;
  initials: string;
  accent: string;
  publicPageUrl: string | null;
  coverUrl?: string | null;
}

@Component({
  selector: 'app-business-landing',
  imports: [RouterLink],
  templateUrl: './business-landing.page.html',
  styleUrl: './business-landing.page.scss',
})
export class BusinessLandingPage implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private canonical?: HTMLLinkElement;

  protected readonly whatsappUrl = `https://wa.me/${environment.marketingWhatsappNumber}?text=${encodeURIComponent(
    'Hola, quiero conocer HallarTurno para administrar los turnos de mi negocio.',
  )}`;

  protected readonly demos: DemoBusiness[] = [
    {
      name: 'Barbería Malvinas',
      category: 'Barbería',
      initials: 'BM',
      accent: '#2367d1',
      publicPageUrl: '/business/barberia-malvinas',
      coverUrl: 'barberia-malvinas-portada.png',
    },
    {
      name: 'Espacio Calma',
      category: 'Bienestar',
      initials: 'EC',
      accent: '#369277',
      publicPageUrl: '/business/espacio-calma',
      coverUrl: 'espacio-calma-portada.png',
    },
    {
      name: 'Consultorio Armonía',
      category: 'Salud',
      initials: 'CA',
      accent: '#7559ad',
      publicPageUrl: '/business/consultorio-armonia',
      coverUrl: 'consultorio-armonia-portada.png',
    },
    {
      name: 'Bella Studio',
      category: 'Estética',
      initials: 'BS',
      accent: '#d45882',
      publicPageUrl: '/business/bella-studio',
      coverUrl: 'bella-studio-portada.png',
    },
    {
      name: 'Huellitas Pet',
      category: 'Mascotas',
      initials: 'HP',
      accent: '#2586a8',
      publicPageUrl: '/business/huellitas-pet',
      coverUrl: 'huellitas-pet-portada.jpg',
    },
    {
      name: 'Punto Saber',
      category: 'Educación',
      initials: 'PS',
      accent: '#e17b36',
      publicPageUrl: '/business/punto-saber',
      coverUrl: 'punto-saber-portada.jpg',
    },
  ];

  protected scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    const pageTitle = 'HallarTurno | Sistema de turnos online para negocios';
    const description =
      'Organizá tu agenda y permití que tus clientes reserven turnos online las 24 horas con HallarTurno.';
    const canonicalUrl = new URL('/para-negocios', this.document.location.origin).href;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({
      property: 'og:image',
      content: new URL('/hallarturno-logo.png', canonicalUrl).href,
    });
    this.canonical =
      this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
      this.document.createElement('link');
    this.canonical.rel = 'canonical';
    this.canonical.href = canonicalUrl;
    if (!this.canonical.parentNode) this.document.head.appendChild(this.canonical);
  }

  protected hideBrokenDemoCover(demo: DemoBusiness): void {
    demo.coverUrl = null;
  }

  ngOnDestroy(): void {
    this.canonical?.remove();
  }
}
