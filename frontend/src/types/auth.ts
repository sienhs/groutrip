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
  /** 온보딩(동의/초기설정) 완료 여부. false면 온보딩 화면으로 보낸다. */
  onboarded: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
