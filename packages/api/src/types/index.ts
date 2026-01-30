// JOBS AND MATCHES ROUTES TYPES
export interface Job {
    job_id: number;
    title: string;
    company_name: string;
    location: string | null;
    region: string | null;
    city: string | null;
    tags: string[];
    url: string;
    posted_date: string | null;
}

export interface JobDetail extends Job {
    country: string | null;
    description: string | null;
    requirements: string | null;
    department: string | null;
}

export interface JobMatch extends Job {
    score: number;
}

export interface JobListParams {
    limit?: number;
    offset?: number;
    location?: string;
    region?: string;
    city?: string;
    company?: string;
    tags?: string[];
    search?: string;
    sort?: "posted_date" | "company" | "title";
    countryFilter?: string; // Default: "IL"
}

export interface MatchParams {
    embedding: number[];
    limit?: number;
    offset?: number;
    threshold?: number;
    countryFilter?: string; // Default: "IL"
}

export interface MatchRequest {
    profile: string;
    limit?: number;
    offset?: number;
    threshold?: number;
}

export interface MatchResponse {
    matches: JobMatch[];
    total: number;
    has_more: boolean;
}

export interface RegionCount {
    region: string;
    count: number;
}

export interface CityCount {
    city: string;
    count: number;
}

// AUTH ROUTES TYPES
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export interface RateLimitConfig {
    maxAttempts: number;
    windowMinutes: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface User {
    id: number;
    email: string;
    display_name: string  | null;
    email_verified: string;
}

export interface UserWithPassword extends User {
    password_hash: string | null;
}

export interface AuthResult {
    user: User;
    tokens: TokenPair;
}

export interface JwtPayload {
    userId: number;
    type: string;
    iat: number;
    exp: number;
}

export interface FavoriteJob {
    favoriteId: number;
    jobId: number;
    title: string;
    companyName: string;
    location: string | null;
    tags: string[];
    url: string;
    postedDate: string | null;
    savedAt: Date;
}

export interface Profile {
    userId: number;
    profileText: string | null;
    updatedAt: Date;
}
