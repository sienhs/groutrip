export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  userId: number;
  accessToken: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
