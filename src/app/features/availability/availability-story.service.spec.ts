import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AvailabilityStoryService } from './availability-story.service';

describe('AvailabilityStoryService', () => {
  let service: AvailabilityStoryService;
  let fillText: ReturnType<typeof vi.fn>;
  let drawImage: ReturnType<typeof vi.fn>;
  let httpGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    httpGet = vi.fn();
    TestBed.configureTestingModule({
      providers: [AvailabilityStoryService, { provide: HttpClient, useValue: { get: httpGet } }],
    });
    service = TestBed.inject(AvailabilityStoryService);
    const gradient = { addColorStop: vi.fn() };
    fillText = vi.fn();
    drawImage = vi.fn();
    const context = {
      createLinearGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      fillText,
      drawImage,
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,test',
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders and downloads a 1080 by 1920 daily story using real slots', async () => {
    const created: HTMLCanvasElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'canvas') created.push(element as HTMLCanvasElement);
      return element;
    }) as typeof document.createElement);

    await service.downloadDay(
      {
        date: '2026-11-09',
        status: 'AVAILABLE',
        slots: [
          {
            startsAt: '09:00:00',
            endsAt: '09:30:00',
            resourceId: 'r1',
            resourceName: 'Ana',
          },
        ],
      },
      {
        businessName: 'Espacio Calma',
        branchName: 'Centro',
        serviceName: 'Corte',
      },
    );

    expect(created[0].width).toBe(1080);
    expect(created[0].height).toBe(1920);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(fillText).not.toHaveBeenCalledWith(
      'Link en la historia',
      expect.anything(),
      expect.anything(),
    );
  });

  it('splits busy days into pages of at most ten slots', async () => {
    const anchors: HTMLAnchorElement[] = [];
    const canvases: HTMLCanvasElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'canvas') canvases.push(element as HTMLCanvasElement);
      if (tagName === 'a') anchors.push(element as HTMLAnchorElement);
      return element;
    }) as typeof document.createElement);
    const slots = Array.from({ length: 21 }, (_, index) => ({
      startsAt: `${String(8 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}:00`,
      endsAt: '20:00:00',
      resourceId: 'r1',
      resourceName: 'Ana',
    }));

    await service.downloadDay(
      { date: '2026-11-10', status: 'AVAILABLE', slots },
      { businessName: 'Espacio Calma', branchName: 'Centro', serviceName: 'Corte' },
    );

    expect(canvases).toHaveLength(3);
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'disponibilidad-2026-11-10-1-de-3.png',
      'disponibilidad-2026-11-10-2-de-3.png',
      'disponibilidad-2026-11-10-3-de-3.png',
    ]);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(3);
  });

  it('exports one weekly story with up to ten slots per day', async () => {
    const anchors: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') anchors.push(element as HTMLAnchorElement);
      return element;
    }) as typeof document.createElement);
    const slots = Array.from({ length: 10 }, (_, index) => ({
      startsAt: `${String(9 + index).padStart(2, '0')}:00:00`,
      endsAt: '20:00:00',
      resourceId: 'r1',
      resourceName: 'Ana',
    }));

    await service.downloadWeek(
      {
        businessId: 'business-1',
        branchId: 'branch-1',
        serviceOfferingId: 'service-1',
        from: '2026-11-09',
        to: '2026-11-15',
        zoneId: 'America/Argentina/Buenos_Aires',
        days: [
          { date: '2026-11-09', status: 'AVAILABLE', slots },
          {
            date: '2026-11-10',
            status: 'AVAILABLE',
            slots: [
              {
                startsAt: '10:00:00',
                endsAt: '10:30:00',
                resourceId: 'r1',
                resourceName: 'Ana',
              },
            ],
          },
        ],
      },
      { businessName: 'Espacio Calma', branchName: 'Centro', serviceName: 'Corte' },
    );

    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'disponibilidad-semana-2026-11-09.png',
    ]);
    expect(fillText).toHaveBeenCalledWith('SEMANA 9–15 NOV', 540, 780);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it('rejects a weekly story when a day has more than ten slots', async () => {
    const slots = Array.from({ length: 11 }, (_, index) => ({
      startsAt: `${String(8 + index).padStart(2, '0')}:00:00`,
      endsAt: '20:00:00',
      resourceId: 'r1',
      resourceName: 'Ana',
    }));

    await expect(
      service.downloadWeek(
        {
          businessId: 'business-1',
          branchId: 'branch-1',
          serviceOfferingId: 'service-1',
          from: '2026-11-09',
          to: '2026-11-15',
          zoneId: 'America/Argentina/Buenos_Aires',
          days: [{ date: '2026-11-09', status: 'AVAILABLE', slots }],
        },
        { businessName: 'Espacio Calma', branchName: 'Centro', serviceName: 'Corte' },
      ),
    ).rejects.toThrow('El máximo para generar la historia semanal es 10 por día.');
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it('uses the business cover and logo when the public profile provides them', async () => {
    const close = vi.fn();
    const bitmap = { width: 1200, height: 800, close } as unknown as ImageBitmap;
    httpGet.mockReturnValue(of(new Blob()));
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve(bitmap)),
    );

    await service.downloadDay(
      { date: '2026-11-09', status: 'NO_AVAILABILITY', slots: [] },
      {
        businessName: 'Espacio Calma',
        branchName: 'Centro',
        serviceName: 'Corte',
        logoUrl: 'https://assets.test/logo.png',
        coverImageUrl: 'https://assets.test/cover.png',
      },
    );

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
