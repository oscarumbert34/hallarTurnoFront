export type VirtualQueueStatus = 'OPEN' | 'CLOSED';
export type VirtualQueueEntryStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'ABSENT';

export interface VirtualQueue {
  id: string;
  businessId: string;
  branchId: string;
  businessName: string;
  businessSlug: string;
  branchName: string;
  logoImageKey?: string;
  status: VirtualQueueStatus;
  waitingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicQueueEntry {
  id: string;
  queueId: string;
  position: number;
  peopleAhead: number;
  waitingAhead: number;
  beingServed: number;
  status: VirtualQueueEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QueueEntry extends Omit<PublicQueueEntry, 'queueId'> {
  customerName: string;
  phone?: string | null;
}
