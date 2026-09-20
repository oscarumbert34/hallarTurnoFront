export type BusinessCategory =
  | 'BARBERSHOP'
  | 'HAIRDRESSER'
  | 'BEAUTY'
  | 'HEALTH'
  | 'FITNESS'
  | 'WELLNESS'
  | 'PET_SERVICES'
  | 'EDUCATION'
  | 'PROFESSIONAL_SERVICES'
  | 'OTHERS';

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  publicDescription?: string | null;
  aboutUs?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  phone: string | null;
  email: string | null;
  category?: BusinessCategory | null;
  depositEnabled?: boolean;
  branches: PublicBranch[];
  services?: PublicService[];
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  country?: string;
  zoneId?: string;
  openingHours?: PublicOpeningHours[];
}

export interface PublicOpeningHours {
  day: string;
  timeRanges: Array<{ start: string; end: string }>;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
}
