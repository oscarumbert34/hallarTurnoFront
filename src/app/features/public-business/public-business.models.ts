export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  phone: string | null;
  email: string | null;
  branches: PublicBranch[];
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
}
