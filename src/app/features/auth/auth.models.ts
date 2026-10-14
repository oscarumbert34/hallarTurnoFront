export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'BUSINESS';
}

export type BusinessCategory =
  | 'BARBERSHOP'
  | 'HAIRDRESSER'
  | 'BEAUTY'
  | 'WELLNESS'
  | 'HEALTH'
  | 'FITNESS'
  | 'PET_SERVICES'
  | 'EDUCATION'
  | 'PROFESSIONAL_SERVICES'
  | 'OTHERS';

export interface CreateBusinessRequest {
  name: string;
  category: BusinessCategory;
  shortDescription: string;
  aboutUs: string;
  whatsapp: string;
  instagram: string;
  phone: string;
  contactEmail: string;
  depositEnabled: boolean;
}

export interface CreatedBusiness {
  id: string;
  name: string;
  slug: string;
}

export interface AuthUser {
  id?: string;
  name?: string;
  email: string;
  roles: string[];
  businessId?: string;
  businessSlug?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: Partial<AuthUser>;
  email?: string;
  name?: string;
  businessId?: string;
  businessSlug?: string;
  role?: string;
  roles?: string[];
}
