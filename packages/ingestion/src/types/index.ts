// Type definitions for ingestion pipeline

export interface Company {
    id?: number;
    company_name: string;
    normalized_name: string;
    company_website_url: string;
    snc_company_page_url: string;
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
    website: string;
    sncUrl: string;
    tags?: string[];
}