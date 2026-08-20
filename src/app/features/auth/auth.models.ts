export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id?: string;
  name?: string;
  email: string;
  roles: string[];
  businessId?: string;
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
  role?: string;
  roles?: string[];
}
