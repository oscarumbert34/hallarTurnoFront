import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AvailabilityDayOverview, AvailabilityOverview } from './availability.models';
import { BusinessCategory } from '../public-business/public-business.models';

export interface AvailabilityStoryContext {
  businessName: string;
  branchName: string;
  serviceName: string;
  businessCategory?: BusinessCategory | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  theme?: AvailabilityStoryTheme;
}

export type AvailabilityStoryTheme =
  'BLUE' | 'TURQUOISE' | 'GREEN' | 'PURPLE' | 'PINK' | 'ORANGE' | 'GRAPHITE';

interface StoryPalette {
  highlight: string;
  dark: string;
  start: string;
  end: string;
  deep: string;
  soft: string;
}

const STORY_PALETTES: Record<AvailabilityStoryTheme, StoryPalette> = {
  BLUE: {
    highlight: '#37b6ff',
    dark: '#072f68',
    start: '#1187ed',
    end: '#0758bd',
    deep: '#064aa9',
    soft: '#e0efff',
  },
  TURQUOISE: {
    highlight: '#35d6c7',
    dark: '#064e55',
    start: '#10afaf',
    end: '#087d86',
    deep: '#045f69',
    soft: '#ddf8f5',
  },
  GREEN: {
    highlight: '#68d391',
    dark: '#123f2b',
    start: '#2ead67',
    end: '#16834b',
    deep: '#0f6438',
    soft: '#e3f6ea',
  },
  PURPLE: {
    highlight: '#b794f4',
    dark: '#2f1b69',
    start: '#8b5cf6',
    end: '#6941c6',
    deep: '#4c2b9e',
    soft: '#eee8ff',
  },
  PINK: {
    highlight: '#f68bb7',
    dark: '#6f1d43',
    start: '#e45791',
    end: '#c43d78',
    deep: '#9e2e60',
    soft: '#fce7f1',
  },
  ORANGE: {
    highlight: '#ffb267',
    dark: '#6b2d0b',
    start: '#f47b32',
    end: '#d95d16',
    deep: '#aa410c',
    soft: '#fff0e5',
  },
  GRAPHITE: {
    highlight: '#8491a4',
    dark: '#161b24',
    start: '#3f4856',
    end: '#252b36',
    deep: '#151a22',
    soft: '#e9edf2',
  },
};

@Injectable({ providedIn: 'root' })
export class AvailabilityStoryService {
  private readonly http = inject(HttpClient);

  async downloadDay(
    day: AvailabilityDayOverview,
    context: AvailabilityStoryContext,
  ): Promise<void> {
    await this.loadMaterialIcons();
    const assets = await this.loadAssets(context);

    try {
      this.downloadDayPages(day, context, assets, `disponibilidad-${day.date}`);
    } finally {
      this.closeAssets(assets);
    }
  }

  private downloadDayPages(
    day: AvailabilityDayOverview,
    context: AvailabilityStoryContext,
    assets: StoryAssets,
    filenameBase: string,
  ): void {
    const times = day.slots.map((slot) => this.time(slot.startsAt));
    const pages = times.length ? this.pages(times, 10) : [[]];
    pages.forEach((pageTimes, pageIndex) =>
      this.downloadDayPage(day, context, assets, pageTimes, pageIndex, pages.length, filenameBase),
    );
  }

  private downloadDayPage(
    day: AvailabilityDayOverview,
    context: AvailabilityStoryContext,
    assets: StoryAssets,
    times: string[],
    pageIndex: number,
    pageCount: number,
    filenameBase: string,
  ): void {
    const canvas = this.canvas();
    const ctx = this.context(canvas);
    const dateLabel = this.longDate(day.date).toUpperCase();
    const dateSize = dateLabel.length > 27 ? 35 : dateLabel.length > 23 ? 39 : 43;
    const serviceSize = context.serviceName.length > 24 ? 34 : 42;
    const palette = this.palette(context.theme);
    this.dailyBackground(ctx, canvas, assets.cover, palette);
    this.dailyBrand(ctx, context, assets.logo);

    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.moveTo(0, 514);
    ctx.bezierCurveTo(260, 428, 720, 484, 1080, 424);
    ctx.lineTo(1080, 454);
    ctx.bezierCurveTo(720, 514, 270, 442, 0, 550);
    ctx.closePath();
    ctx.fill();
    const titleGradient = ctx.createLinearGradient(0, 450, 1080, 700);
    titleGradient.addColorStop(0, palette.dark);
    titleGradient.addColorStop(0.55, palette.deep);
    titleGradient.addColorStop(1, palette.start);
    ctx.fillStyle = titleGradient;
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.bezierCurveTo(260, 406, 710, 484, 1080, 414);
    ctx.lineTo(1080, 700);
    ctx.bezierCurveTo(770, 744, 300, 686, 0, 736);
    ctx.closePath();
    ctx.fill();
    this.calendarIcon(ctx, 172, 574, 92, '#ffffff');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.fillRect(284, 516, 4, 132);
    this.text(ctx, 'TURNOS', 330, 557, 66, '#ffffff', 900);
    this.text(ctx, 'DISPONIBLES', 330, 635, 66, '#ffffff', 900);
    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(858, 516);
    ctx.lineTo(858, 474);
    ctx.moveTo(887, 527);
    ctx.lineTo(918, 492);
    ctx.moveTo(900, 554);
    ctx.lineTo(944, 543);
    ctx.stroke();

    this.shadowedPill(ctx, 44, 674, 992, 1168, 'rgba(255, 255, 255, 0.96)', 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(48, 678, 984, 1160, 38);
    ctx.stroke();
    this.gradientPill(ctx, 112, 720, 856, 104, palette.start, palette.end);
    ctx.strokeStyle = 'rgba(120, 211, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(114, 722, 852, 100, 36);
    ctx.stroke();
    this.calendarIcon(ctx, 166, 772, 44, '#ffffff');
    this.text(ctx, dateLabel, 218, 789, dateSize, '#ffffff', 800);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(104, 882, 188, 3);
    ctx.fillRect(788, 882, 188, 3);
    this.pill(ctx, 312, 842, 64, 64, '#dceeff');
    this.categoryIcon(ctx, context.businessCategory, 344, 874, 37, '#102b52');
    this.text(ctx, context.serviceName, 398, 890, serviceSize, '#102b52', 800);

    if (!times.length) {
      this.centerText(ctx, this.emptyText(day), 1110, 48, '#6b7280', 700);
    } else {
      if (pageCount > 1) {
        this.pill(ctx, 447, 925, 186, 52, '#dceeff');
        this.centerText(ctx, `${pageIndex + 1} DE ${pageCount}`, 960, 25, '#52647e', 800);
      }
      times.forEach((time, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 116 + column * 438;
        const y = 996 + row * 126;
        this.shadowedGradientPill(ctx, x, y, 410, 96, palette.start, palette.end);
        this.text(ctx, time, x + 205, y + 63, 48, '#ffffff', 800, 'center');
      });
    }
    this.shadowedGradientPill(ctx, 98, 1660, 884, 126, palette.start, palette.deep);
    this.calendarIcon(ctx, 174, 1723, 50, '#ffffff');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.fillRect(238, 1685, 3, 76);
    this.text(ctx, 'RESERVÁ TU TURNO', 292, 1741, 45, '#ffffff', 900);
    this.text(ctx, '›', 910, 1744, 64, '#ffffff', 700, 'center');
    ctx.fillStyle = '#91a9c4';
    ctx.fillRect(170, 1872, 170, 2);
    ctx.fillRect(740, 1872, 170, 2);
    this.centerText(ctx, 'Agenda online con HallarTurno', 1882, 25, '#52647e', 600);
    const pageSuffix = pageCount > 1 ? `-${pageIndex + 1}-de-${pageCount}` : '';
    this.download(canvas, `${filenameBase}${pageSuffix}.png`);
  }

  async downloadWeek(
    overview: AvailabilityOverview,
    context: AvailabilityStoryContext,
  ): Promise<void> {
    const overflowingDay = overview.days.find((day) => day.slots.length > 10);
    if (overflowingDay) {
      throw new Error(
        `${this.longDate(overflowingDay.date)} tiene ${overflowingDay.slots.length} horarios. El máximo para generar la historia semanal es 10 por día.`,
      );
    }

    await this.loadMaterialIcons();
    const assets = await this.loadAssets(context);

    try {
      const canvas = this.canvas();
      const ctx = this.context(canvas);
      const palette = this.palette(context.theme);
      this.dailyBackground(ctx, canvas, assets.cover, palette);
      this.dailyBrand(ctx, context, assets.logo);

      const titleGradient = ctx.createLinearGradient(0, 450, 1080, 690);
      titleGradient.addColorStop(0, palette.dark);
      titleGradient.addColorStop(1, palette.start);
      ctx.fillStyle = titleGradient;
      ctx.beginPath();
      ctx.moveTo(0, 500);
      ctx.bezierCurveTo(270, 410, 720, 480, 1080, 410);
      ctx.lineTo(1080, 690);
      ctx.bezierCurveTo(760, 730, 300, 680, 0, 730);
      ctx.closePath();
      ctx.fill();
      this.calendarIcon(ctx, 154, 575, 86, '#ffffff');
      this.text(ctx, 'DISPONIBILIDAD', 245, 565, 58, '#ffffff', 900);
      this.text(ctx, 'SEMANAL', 245, 635, 58, '#ffffff', 900);

      this.shadowedPill(ctx, 34, 670, 1012, 1170, 'rgba(255, 255, 255, 0.96)', 30);
      this.gradientPill(ctx, 110, 716, 860, 98, palette.start, palette.end);
      this.centerText(ctx, this.weekLabel(overview).toUpperCase(), 780, 38, '#ffffff', 800);
      this.centerText(ctx, context.serviceName, 875, 38, '#102b52', 800);

      overview.days.slice(0, 7).forEach((day, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const x = 58 + column * 246;
        const y = 930 + row * 350;
        this.shadowedPill(ctx, x, y, 226, 322, '#f5faff', 12);
        this.gradientPill(ctx, x + 8, y + 8, 210, 58, palette.start, palette.end);
        this.text(ctx, this.shortDate(day.date), x + 113, y + 47, 25, '#ffffff', 900, 'center');

        if (!day.slots.length) {
          this.text(ctx, 'SIN TURNOS', x + 113, y + 184, 20, '#7b8492', 800, 'center');
          return;
        }

        day.slots.forEach((slot, slotIndex) => {
          const slotColumn = Math.floor(slotIndex / 5);
          const slotRow = slotIndex % 5;
          const slotX = x + 10 + slotColumn * 104;
          const slotY = y + 82 + slotRow * 45;
          this.pill(ctx, slotX, slotY, 98, 36, palette.soft);
          this.text(
            ctx,
            this.time(slot.startsAt),
            slotX + 49,
            slotY + 26,
            20,
            palette.end,
            800,
            'center',
          );
        });
      });

      this.shadowedGradientPill(ctx, 98, 1660, 884, 126, palette.start, palette.deep);
      this.centerText(ctx, 'RESERVÁ TU TURNO  ›', 1741, 44, '#ffffff', 900);
      this.centerText(ctx, 'Agenda online con HallarTurno', 1882, 25, '#52647e', 600);
      this.download(canvas, `disponibilidad-semana-${overview.from}.png`);
    } finally {
      this.closeAssets(assets);
    }
  }

  private canvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    return canvas;
  }

  private context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear la imagen');
    return context;
  }

  private background(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    cover: ImageBitmap | null,
  ): void {
    if (cover) {
      this.coverImage(ctx, cover, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(238, 247, 255, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, cover ? 'rgba(238, 247, 255, 0.35)' : '#eef7ff');
    gradient.addColorStop(0.55, cover ? 'rgba(255, 255, 255, 0.55)' : '#ffffff');
    gradient.addColorStop(1, cover ? 'rgba(217, 235, 255, 0.55)' : '#d9ebff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(9, 103, 216, 0.08)';
    ctx.beginPath();
    ctx.arc(940, 160, 310, 0, Math.PI * 2);
    ctx.fill();
  }

  private dailyBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    cover: ImageBitmap | null,
    palette: StoryPalette,
  ): void {
    const page = ctx.createLinearGradient(0, 0, 0, canvas.height);
    page.addColorStop(0, palette.soft);
    page.addColorStop(1, '#f8fbff');
    ctx.fillStyle = page;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (cover) {
      this.coverImage(ctx, cover, 0, 0, canvas.width, 590);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, canvas.width, 590);
      fallback.addColorStop(0, palette.dark);
      fallback.addColorStop(1, palette.start);
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, canvas.width, 590);
    }

    const shade = ctx.createLinearGradient(0, 80, 0, 590);
    shade.addColorStop(0, 'rgba(3, 24, 51, 0.08)');
    shade.addColorStop(0.62, 'rgba(3, 24, 51, 0.18)');
    shade.addColorStop(1, 'rgba(3, 24, 51, 0.86)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, 590);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = palette.start;
    ctx.beginPath();
    ctx.arc(1080, 1920, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = palette.start;
    ctx.beginPath();
    ctx.moveTo(940, 0);
    ctx.lineTo(1080, 0);
    ctx.lineTo(1080, 190);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.moveTo(1000, 0);
    ctx.lineTo(1080, 0);
    ctx.lineTo(1080, 100);
    ctx.closePath();
    ctx.fill();
  }

  private dailyBrand(
    ctx: CanvasRenderingContext2D,
    context: AvailabilityStoryContext,
    logo: ImageBitmap | null,
  ): void {
    const textX = logo ? 218 : 72;
    if (logo) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(132, 324, 72, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(132, 324, 64, 0, Math.PI * 2);
      ctx.clip();
      this.coverImage(ctx, logo, 68, 260, 128, 128);
      ctx.restore();
    }
    this.text(ctx, context.businessName || 'Mi negocio', textX, 326, 52, '#ffffff', 900);
    this.text(ctx, context.branchName, textX + 2, 378, 30, '#ffffff', 700);
  }

  private brand(
    ctx: CanvasRenderingContext2D,
    context: AvailabilityStoryContext,
    logo: ImageBitmap | null,
  ): void {
    const textX = logo ? 190 : 72;
    if (logo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(116, 120, 54, 0, Math.PI * 2);
      ctx.clip();
      this.coverImage(ctx, logo, 62, 66, 108, 108);
      ctx.restore();
    }
    this.text(ctx, context.businessName || 'Mi negocio', textX, 128, 48, '#102b52', 800);
    this.text(ctx, context.branchName, textX + 2, 180, 28, '#52647e', 600);
    this.text(ctx, 'HallarTurno', 1008, 128, 30, '#0967d8', 800, 'right');
  }

  private cta(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, y: number): void {
    this.pill(ctx, 92, y, 896, 126, '#0967d8');
    this.centerText(ctx, 'RESERVÁ TU TURNO', y + 80, 46, '#ffffff', 900);
    this.centerText(ctx, 'Generado con HallarTurno', canvas.height - 72, 25, '#6b7280', 600);
  }

  private pages<T>(values: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
      values.slice(index * size, (index + 1) * size),
    );
  }

  private palette(theme: AvailabilityStoryTheme | undefined): StoryPalette {
    return STORY_PALETTES[theme ?? 'BLUE'];
  }

  private async loadAssets(context: AvailabilityStoryContext): Promise<StoryAssets> {
    const [logo, cover] = await Promise.all([
      this.loadImage(context.logoUrl),
      this.loadImage(context.coverImageUrl),
    ]);
    return { logo, cover };
  }

  private async loadImage(url: string | null | undefined): Promise<ImageBitmap | null> {
    if (!url) return null;
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      return await createImageBitmap(blob);
    } catch {
      return null;
    }
  }

  private coverImage(
    ctx: CanvasRenderingContext2D,
    image: ImageBitmap,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const sourceRatio = image.width / image.height;
    const targetRatio = width / height;
    const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
    const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
    const sourceX = (image.width - sourceWidth) / 2;
    const sourceY = (image.height - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  private closeAssets(assets: StoryAssets): void {
    assets.logo?.close();
    assets.cover?.close();
  }

  private pill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string | CanvasGradient,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.min(38, height / 2));
    ctx.fill();
  }

  private gradientPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    start: string,
    end: string,
  ): void {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    this.pill(ctx, x, y, width, height, gradient);
  }

  private shadowedPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    blur: number,
  ): void {
    ctx.save();
    ctx.shadowColor = 'rgba(6, 54, 112, 0.24)';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = 12;
    this.pill(ctx, x, y, width, height, color);
    ctx.restore();
  }

  private shadowedGradientPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    start: string,
    end: string,
  ): void {
    ctx.save();
    ctx.shadowColor = 'rgba(6, 75, 162, 0.32)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    this.gradientPill(ctx, x, y, width, height, start, end);
    ctx.restore();
  }

  private calendarIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    color: string,
  ): void {
    const left = centerX - size / 2;
    const top = centerY - size / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.roundRect(left, top + size * 0.12, size, size * 0.82, size * 0.12);
    ctx.moveTo(left + size * 0.24, top);
    ctx.lineTo(left + size * 0.24, top + size * 0.26);
    ctx.moveTo(left + size * 0.76, top);
    ctx.lineTo(left + size * 0.76, top + size * 0.26);
    ctx.moveTo(left, top + size * 0.38);
    ctx.lineTo(left + size, top + size * 0.38);
    ctx.stroke();
    ctx.restore();
  }

  private categoryIcon(
    ctx: CanvasRenderingContext2D,
    category: BusinessCategory | null | undefined,
    centerX: number,
    centerY: number,
    size: number,
    color: string,
  ): void {
    const icons: Record<BusinessCategory, string> = {
      BARBERSHOP: 'content_cut',
      HAIRDRESSER: 'content_cut',
      BEAUTY: 'auto_awesome',
      HEALTH: 'monitor_heart',
      FITNESS: 'fitness_center',
      WELLNESS: 'self_improvement',
      PET_SERVICES: 'pets',
      EDUCATION: 'school',
      PROFESSIONAL_SERVICES: 'business_center',
      OTHERS: 'storefront',
    };
    const icon = icons[category ?? 'OTHERS'] ?? icons.OTHERS;
    if (icon === 'content_cut') {
      this.scissorsIcon(ctx, centerX, centerY, size, color);
      return;
    }
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px "Material Icons"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, centerX, centerY);
    ctx.restore();
  }

  private scissorsIcon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    color: string,
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.25, centerY + size * 0.23, size * 0.16, 0, Math.PI * 2);
    ctx.arc(centerX + size * 0.25, centerY + size * 0.23, size * 0.16, 0, Math.PI * 2);
    ctx.moveTo(centerX - size * 0.14, centerY + size * 0.11);
    ctx.lineTo(centerX + size * 0.4, centerY - size * 0.42);
    ctx.moveTo(centerX + size * 0.14, centerY + size * 0.11);
    ctx.lineTo(centerX - size * 0.4, centerY - size * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  private async loadMaterialIcons(): Promise<void> {
    try {
      await document.fonts?.load('37px "Material Icons"');
    } catch {
      // The category icon falls back to the browser font if the web font is unavailable.
    }
  }

  private centerText(
    ctx: CanvasRenderingContext2D,
    value: string,
    y: number,
    size: number,
    color: string,
    weight: number,
  ): void {
    this.text(ctx, value, 540, y, size, color, weight, 'center');
  }

  private text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight: number,
    align: CanvasTextAlign = 'left',
  ): void {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  private emptyText(day: AvailabilityDayOverview): string {
    return day.status === 'CLOSED' ? 'No atendés ese día' : 'Sin horarios disponibles';
  }

  private time(value: string): string {
    return value.slice(0, 5);
  }

  private date(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private longDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(this.date(value));
  }

  private shortDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: 'numeric',
    })
      .format(this.date(value))
      .replace('.', '')
      .toUpperCase();
  }

  private weekLabel(overview: AvailabilityOverview): string {
    const from = this.date(overview.from);
    const to = this.date(overview.to);
    const month = (date: Date) =>
      new Intl.DateTimeFormat('es-AR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase();
    const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    return sameMonth
      ? `SEMANA ${from.getDate()}–${to.getDate()} ${month(to)}`
      : `SEMANA ${from.getDate()} ${month(from)}–${to.getDate()} ${month(to)}`;
  }

  private download(canvas: HTMLCanvasElement, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

interface StoryAssets {
  logo: ImageBitmap | null;
  cover: ImageBitmap | null;
}
