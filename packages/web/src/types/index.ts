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
  job_id: number;
  title: string;
  company_name: string;
  location: string | null;
  tags: string[];
  url: string;
  posted_date: string;
}

export interface JobDetail extends Job {
  description: string;
  requirements: string | null;
  department: string | null;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  has_more: boolean;
}

export interface JobsQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  location?: string;
  company?: string;
}
