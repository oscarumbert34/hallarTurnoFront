export type AgendaShareStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface AgendaShare {
  id: number;
  userId: string;
  email: string;
  status: AgendaShareStatus;
  direction: 'SENT' | 'RECEIVED';
  createdAt: string;
  respondedAt: string | null;
}
