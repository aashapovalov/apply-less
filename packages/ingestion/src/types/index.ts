// Type definitions for ingestion pipeline

export interface Company {
  id?: number;
  company_name: string;
  normalized_name: string;
  company_website_url: string;
  snc_company_page_url: string;
  careers_page_url?: string;
  linkedin_url?: string;
  tags?: string[];
  founded_year: number;
  source_type: "snc" | "manual";
  first_seen_at?: Date;
  last_seen_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SNCCompanyRaw {
  name: string;
  website?: string;
  sncUrl: string;
  description?: string;
  tags?: string[];
  foundedYear: number | undefined;
}

export interface IngestionStats {
  stage: string;
  startTime: Date;
  endTime?: Date;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{ message: string; details?: any }>;
}

export interface CompanyDetails {
  websiteUrl?: string;
  careersUrl?: string;
  socialLinks?: {
    linkedin?: string;
  };
}

export interface JobSource {
  id?: number;
  company_id: number;
  source_type: "careers_html" | "greenhouse" | "lever" | "workable";
  base_url: string;
  ats_identifier?: string;
  api_token?: string;
  detection_method?: string;
  confidence?: number;
  last_checked_at?: Date;
  status: "active" | "failed" | "deprecated";
  created_at?: Date;
}

export interface GreenHouseJob {
  id: number;
  title: string;
  updated_at: string;
  location: {
    name: string;
  };
  absolute_url: string;
  metadata: Array<{
    id: number;
    name: string;
    value: string;
    value_type: string;
  }>;
  departments: Array<{
    id: number;
    name: string;
  }>;
  offices: Array<{
    id: number;
    name: string;
    location: string;
  }>;
}

export interface GreenHouseJobDetail {
  id: number;
  title: string;
  location: {
    name: string;
  };
  content: string; // HTML content
  updated_at: string;
  absolute_url: string;
  departments: Array<{
    id: number;
    name: string;
  }>;
}

export interface ComeetJob {
  uid: string;
  name: string;
  location: {
    name: string;
    country?: string;
    city?: string;
  };
  department: {
    name: string;
  };
  employment_type?: string;
  experience_level?: string;
  description: string;
  requirements?: string;
  url_active_page: string;
  url_comeet_page: string;
  time_updated: string;
  picture_url?: string;
}

export interface ComeetResponse {
  positions: ComeetJob[];
  company: {
    uid: string;
    name: string;
    website_url?: string;
    logo_url?: string;
  };
}

export interface Job {
  id?: number;
  company_id: number;
  title: string;
  normalized_title: string;
  location?: string;
  country?: string;
  region?: string;
  city?: string;
  normalized_location?: string;
  department?: string;
  employment_type?: string;
  description: string;
  requirements?: string;
  benefits?: string;
  canonical_url: string;
  external_id?: string;
  posted_date?: Date;
  first_seen_at?: Date;
  last_seen_at?: Date;
  status: "active" | "expired";
  created_at?: Date;
  updated_at?: Date;
}

// Embeddings
export interface JobForEmbedding {
  id: number;
  title: string;
  description: string;
  company_name: string;
  location: string;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dimension: number;
  count: number;
  time_ms: number;
}

export interface EmbedSingleResponse {
  embedding: number[];
  model: string;
  dimension: number;
  time_ms: number;
}

// Types for ATS detection
export type ATSType =
  | "greenhouse"
  | "lever"
  | "workable"
  | "comeet"
  | "ashby"
  | "bamboohr"
  | "careers_html"
  | "unknown";

export interface ATSDetectionResult {
  atsType: ATSType;
  confidence: number; //  0-1
  detectionMethod: string;
  extractedSlug?: string; // greenhouse slug or comeet UID
  extractedToken?: string; // for Comeet widget pattern
  careersUrl: string;
}

export interface ATSPattern {
  type: ATSType;
  urlPatterns?: RegExp[];
  htmlPatterns?: RegExp[];
  selectors?: string[];
  scriptPatterns?: RegExp[];
  slugExtractor?: (
    html: string,
    url: string,
  ) => { slug?: string; token?: string } | null;
}
