// Auth types
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

// Job types
export interface Job {
  job_id: number;
  title: string;
  company_name: string;
  location: string | null;
  region: string | null;
  city: string | null;
  tags: string[];
  url: string;
  posted_date: string;
}

export interface JobDetail extends Job {
  country: string | null;
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
  region?: string;
  city?: string;
  company?: string;
  title?: string;
  postedAfter?: string;
}

// Job region types
export interface RegionCount {
  region: string;
  count: number;
}

export interface RegionsResponse {
  regions: RegionCount[];
}

// Job city types
export interface CityCount {
  city: string;
  count: number;
}

export interface CitiesResponse {
  cities: CityCount[];
}

// Job company types
export interface CompanyCount {
  company_name: string;
  count: number;
}

export interface CompaniesResponse {
  companies: CompanyCount[];
}

// Profile types
export interface Profile {
  userId: number;
  profileText: string | null;
  updatedAt: string;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface SaveProfileRequest {
  profile_text: string;
}

export interface SaveProfileResponse {
  profile: Profile;
  message: string;
}

export interface ParseFileResponse {
  text: string;
  filename: string;
  pages?: number;
}

// Favorites types
export interface FavoriteJob {
  favoriteId: number;
  jobId: number;
  title: string;
  companyName: string;
  location: string | null;
  tags: string[];
  url: string;
  postedDate: string | null;
  savedAt: string;
}

export interface FavoritesResponse {
  favorites: FavoriteJob[];
  count: number;
}

export interface IsFavoriteResponse {
  isFavorite: boolean;
}

export interface AddFavoriteResponse {
  message: string;
  favoriteId: number;
}

// Match types
export interface JobMatch {
  job_id: number;
  title: string;
  company_name: string;
  location: string | null;
  region: string | null;
  city: string | null;
  tags: string[];
  url: string;
  posted_date: string | null;
  score: number;
}

export interface MatchResponse {
  matches: JobMatch[];
  total: number;
  has_more: boolean;
}

export interface MatchRequest {
  limit?: number;
  offset?: number;
  threshold?: number;
}

export interface JobFilters {
  region: string;
  company: string;
  title: string;
  postedAfter: string;
}
