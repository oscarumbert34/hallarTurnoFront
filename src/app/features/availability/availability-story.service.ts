import { Injectable } from '@angular/core';
import { AvailabilityDayOverview, AvailabilityOverview } from './availability.models';

export interface AvailabilityStoryContext {
  businessName: string;
  branchName: string;
  serviceName: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityStoryService {
  async downloadDay(
    day: AvailabilityDayOverview,
    context: AvailabilityStoryContext,
  ): Promise<void> {
    const times = day.slots.map((slot) => this.time(slot.startsAt));
    const pages = times.length ? this.pages(times, 10) : [[]];
    const assets = await this.loadAssets(context);

    try {
      pages.forEach((pageTimes, pageIndex) =>
        this.downloadDayPage(day, context, assets, pageTimes, pageIndex, pages.length),
      );
    } finally {
      this.closeAssets(assets);
    }
  }

  private downloadDayPage(
    day: AvailabilityDayOverview,
    context: AvailabilityStoryContext,
    assets: StoryAssets,
    times: string[],
    pageIndex: number,
    pageCount: number,
  ): void {
    const canvas = this.canvas();
    const ctx = this.context(canvas);
    this.background(ctx, canvas, assets.cover);
    this.brand(ctx, context, assets.logo);
    this.centerText(ctx, 'TURNOS DISPONIBLES', 390, 78, '#102b52', 900);
    this.pill(ctx, 92, 470, 896, 142, '#dceeff');
    this.centerText(ctx, this.longDate(day.date).toUpperCase(), 562, 54, '#102b52', 800);
    this.centerText(ctx, context.serviceName, 710, 42, '#314565', 700);

    if (!times.length) {
      this.centerText(ctx, this.emptyText(day), 930, 48, '#6b7280', 700);
    } else {
      if (pageCount > 1) {
        this.centerText(ctx, `${pageIndex + 1} DE ${pageCount}`, 770, 25, '#52647e', 800);
      }
      times.forEach((time, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 94 + column * 464;
        const y = 800 + row * 142;
        this.pill(ctx, x, y, 428, 112, '#0967d8');
        this.text(ctx, time, x + 214, y + 72, 50, '#ffffff', 800, 'center');
      });
    }
    this.cta(ctx, canvas, 1600);
    const pageSuffix = pageCount > 1 ? `-${pageIndex + 1}-de-${pageCount}` : '';
    this.download(canvas, `disponibilidad-${day.date}${pageSuffix}.png`);
  }

  async downloadWeek(
    overview: AvailabilityOverview,
    context: AvailabilityStoryContext,
  ): Promise<void> {
    const assets = await this.loadAssets(context);
    const canvas = this.canvas();
    const ctx = this.context(canvas);
    this.background(ctx, canvas, assets.cover);
    this.brand(ctx, context, assets.logo);
    this.centerText(ctx, 'TURNOS DISPONIBLES', 350, 74, '#102b52', 900);
    this.centerText(ctx, this.weekLabel(overview), 458, 38, '#314565', 700);

    overview.days.forEach((day, index) => {
      const y = 535 + index * 143;
      this.pill(ctx, 72, y, 936, 118, '#ffffff');
      this.text(ctx, this.shortDate(day.date), 110, y + 72, 34, '#102b52', 800);
      const times = day.slots.slice(0, 4).map((slot) => this.time(slot.startsAt));
      const remaining = Math.max(0, day.slots.length - times.length);
      const summary = times.length
        ? `${times.join('  ·  ')}${remaining ? `  ·  +${remaining} más` : ''}`
        : this.emptyText(day);
      this.text(
        ctx,
        summary,
        370,
        y + 72,
        times.length ? (remaining ? 27 : 31) : 29,
        times.length ? '#0967d8' : '#7b8492',
        700,
      );
    });
    this.cta(ctx, canvas, 1640);
    this.download(canvas, `disponibilidad-semana-${overview.from}.png`);
    this.closeAssets(assets);
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
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return null;
      return await createImageBitmap(await response.blob());
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
    color: string,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.min(38, height / 2));
    ctx.fill();
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
    const formatter = new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
    });
    return `Semana del ${formatter.format(this.date(overview.from))} al ${formatter.format(this.date(overview.to))}`;
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
