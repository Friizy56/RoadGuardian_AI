export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface AuthResponse {
  token: string;
  user: import('./user').User;
}
