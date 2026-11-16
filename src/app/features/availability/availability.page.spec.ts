import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BusinessDashboardService } from '../business-dashboard/business-dashboard.service';
import { AvailabilityPage } from './availability.page';
import { AvailabilityOverviewService } from './availability.service';
import { AvailabilityStoryService } from './availability-story.service';

describe('AvailabilityPage', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    TestBed.configureTestingModule({
      imports: [AvailabilityPage],
      providers: [
        {
          provide: BusinessDashboardService,
          useValue: {
            listBranches: vi.fn(() =>
              of([
                {
                  id: 'branch-1',
                  name: 'Centro',
                  active: true,
                  weeklySchedule: [],
                },
              ]),
            ),
            listServices: vi.fn(() =>
              of([
                {
                  id: 'service-1',
                  name: 'Corte de pelo',
                  branchId: 'branch-1',
                  durationMinutes: 30,
                  price: 15000,
                  active: true,
                },
              ]),
            ),
            listResources: vi.fn(() =>
              of([
                {
                  id: 'resource-1',
                  name: 'Juan',
                  branchId: 'branch-1',
                  serviceOfferingIds: ['service-1'],
                  weeklySchedule: [],
                  active: true,
                },
              ]),
            ),
            getBusinessIdentity: vi.fn(() =>
              of({ name: 'Barbería 1981', category: 'BARBERSHOP' }),
            ),
            getPublicProfile: vi.fn(() =>
              of({ publicDescription: '', aboutUs: '', whatsapp: '', instagram: '' }),
            ),
          },
        },
        {
          provide: AvailabilityOverviewService,
          useValue: {
            overview: vi.fn(() =>
              of({
                businessId: 'business-1',
                branchId: 'branch-1',
                serviceOfferingId: 'service-1',
                resourceId: 'resource-1',
                from: '2026-11-09',
                to: '2026-11-15',
                zoneId: 'America/Argentina/Buenos_Aires',
                days: [
                  {
                    date: '2026-11-09',
                    status: 'AVAILABLE',
                    slots: [
                      {
                        startsAt: '09:00:00',
                        endsAt: '09:30:00',
                        resourceId: 'resource-1',
                        resourceName: 'Juan',
                      },
                    ],
                  },
                ],
              }),
            ),
          },
        },
        { provide: AvailabilityStoryService, useValue: {} },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  it('opens booking creation with the selected availability fully prefilled', () => {
    const fixture = TestBed.createComponent(AvailabilityPage);
    fixture.detectChanges();

    const slot = fixture.nativeElement.querySelector(
      'button[title="Crear turno en este horario"]',
    ) as HTMLButtonElement;
    expect(slot).toBeTruthy();
    slot.click();

    expect(navigate).toHaveBeenCalledWith(['/booking'], {
      queryParams: {
        businessId: 'business-1',
        businessName: 'Barbería 1981',
        branchId: 'branch-1',
        branchName: 'Centro',
        serviceId: 'service-1',
        serviceName: 'Corte de pelo',
        slotId: '2026-11-09-09:00-resource-1',
        startsAt: '2026-11-09T09:00:00',
        endsAt: '2026-11-09T09:30:00',
        resourceId: 'resource-1',
        resourceName: 'Juan',
        price: 15000,
        businessCategory: 'BARBERSHOP',
        source: 'DIRECT_LINK',
      },
    });
  });
});
