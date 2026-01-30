export interface User {
  id: number;
  email: string;
  displayName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  description: string;
  requirements: string | null;
  salary: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  skills: string[];
  postedAt: string;
  sourceUrl: string;
}

export interface JobResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JobQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  company?: string;
}
