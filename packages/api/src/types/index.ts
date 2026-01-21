export interface Job {
    jobId: number;
    title: string;
    company_name: string;
    location: string | null;
    tags: string[];
    url: string;
    posted_date: string | null;
}

export interface JobDetail extends Job {
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
    company?: string;
    tags?: string[];
    sort?: "posted_date" | "company" | "title";
}

export interface MatchParams {
    embedding: number[];
    limit?: number;
    offset?: number;
    threshold?: number;
}