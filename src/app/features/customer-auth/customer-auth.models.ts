export interface CustomerCredentials {
  email: string;
  password: string;
}

export interface CustomerRegistration extends CustomerCredentials {
  name: string;
}
