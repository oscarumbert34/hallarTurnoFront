import { authErrorMessage } from '../auth/auth-errors';

export function customerAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return authErrorMessage(error);
}
