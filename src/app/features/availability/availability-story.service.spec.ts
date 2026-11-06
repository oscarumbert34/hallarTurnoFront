import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AvailabilityStoryService } from './availability-story.service';

describe('AvailabilityStoryService', () => {
  let service: AvailabilityStoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AvailabilityStoryService] });
    service = TestBed.inject(AvailabilityStoryService);
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createLinearGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,test',
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders and downloads a 1080 by 1920 daily story using real slots', () => {
    const created: HTMLCanvasElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'canvas') created.push(element as HTMLCanvasElement);
      return element;
    }) as typeof document.createElement);

    service.downloadDay(
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
  });
});
