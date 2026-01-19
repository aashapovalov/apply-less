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
    errors: Array< { message: string, details?: any }>;
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
        name: string
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