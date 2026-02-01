/**
 * ML Service Client
 *
 * Centralized HTTP client for communicating with the local ML service (FastAPI).
 * Responsible for:
 *  - generating embeddings (single & batch)
 *  - chunking job descriptions and user profiles
 *  - extracting structured helpers from chunked results
 *
 * Used as a singleton across the backend to avoid duplicated configuration.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
  Chunk,
  JobChunkResponse,
  ProfileChunkResponse,
} from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export class MLServiceClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || ML_SERVICE_URL;
  }

  /**
   * Generates an embedding vector for a single text input.
   *
   * @param text - Raw text to embed.
   * @returns Promise resolving to a numeric embedding vector.
   * @throws Error if the ML service responds with a non-OK status.
   */
  async embedText(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embed/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`Embed failed: ${response.statusText}`);
    const data = await response.json();
    return data.embedding;
  }

  /**
   * Generates embedding vectors for multiple text inputs in a single request.
   *
   * @param texts - Array of texts to embed.
   * @returns Promise resolving to an array of embedding vectors.
   * @throws Error if the ML service responds with a non-OK status.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    if (!response.ok)
      throw new Error(`Embed batch failed: ${response.statusText}`);
    const data = await response.json();
    return data.embeddings;
  }

  /**
   * Chunks a job description into structured semantic parts.
   *
   * Typically used for indexing job postings for retrieval or matching.
   *
   * @param text - Full job description text.
   * @param title - Job title.
   * @param company - Company name.
   * @param location - Optional job location.
   * @returns Promise resolving to a structured JobChunkResponse.
   * @throws Error if the ML service responds with a non-OK status.
   */
  async chunkJob(
    text: string,
    title: string,
    company: string,
    location?: string,
  ): Promise<JobChunkResponse> {
    const response = await fetch(`${this.baseUrl}/api/chunk/job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, title, company, location: location || "" }),
    });
    if (!response.ok)
      throw new Error(`Chunk job failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Chunks a user profile (CV, LinkedIn export, free text) into semantic sections.
   *
   * Used as a preprocessing step for matching, embeddings, and relevance scoring.
   *
   * @param text - Raw profile text.
   * @returns Promise resolving to a structured ProfileChunkResponse.
   * @throws Error if the ML service responds with a non-OK status.
   */
  async chunkProfile(text: string): Promise<ProfileChunkResponse> {
    const response = await fetch(`${this.baseUrl}/api/chunk/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok)
      throw new Error(`Chunk profile failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Returns the first chunk matching a specific type.
   *
   * @param chunks - Array of chunks returned by the ML service.
   * @param type - Desired chunk type.
   * @returns The matching chunk or undefined if not found.
   */
  static getChunkByType(chunks: Chunk[], type: string): Chunk | undefined {
    return chunks.find((chunk) => chunk.type === type);
  }

  /**
   * Returns the first chunk matching any of the provided types (in priority order).
   *
   * Useful when multiple chunk types are acceptable fallbacks.
   *
   * @param chunks - Array of chunks returned by the ML service.
   * @param types - Ordered list of acceptable chunk types.
   * @returns The first matching chunk or undefined.
   */
  static getChunkByTypes(chunks: Chunk[], types: string[]): Chunk | undefined {
    for (const type of types) {
      const chunk = chunks.find((c) => c.type === type);
      if (chunk) return chunk;
    }
    return undefined;
  }

  /**
   * Attempts to extract a concise professional title from a profile text.
   *
   * Heuristics:
   *  - Prefer pipe-separated LinkedIn-style headline lines
   *  - Fallback to lines containing role-related keywords
   *  - Final fallback to the first non-empty line
   *
   * @param profile - Raw profile text.
   * @returns Extracted title, truncated to a reasonable length.
   */
  static extractProfileTitle(profile: string): string {
    const lines = profile.split("\n").filter((l) => l.trim().length > 0);

    // Pipe-separated (LinkedIn style)
    for (const line of lines.slice(0, 5)) {
      if (line.includes("|") && line.length > 20 && line.length < 200) {
        return line.trim();
      }
    }

    // Role keywords
    const roleKeywords = [
      "manager",
      "director",
      "lead",
      "engineer",
      "developer",
      "architect",
      "analyst",
      "scientist",
      "designer",
      "senior",
      "principal",
    ];
    for (const line of lines.slice(0, 10)) {
      if (
        roleKeywords.some((kw) => line.toLowerCase().includes(kw)) &&
        line.split(/\s+/).length > 2
      ) {
        return line.trim().substring(0, 200);
      }
    }

    return lines[0]?.trim().substring(0, 200) || profile.substring(0, 100);
  }

  /**
   * Generate a tailored CV for a specific job based on the user's profile.
   *
   * Sends the user's profile and job details to the ML service, which:
   *  - analyzes job requirements and profile skills
   *  - generates a job-specific CV in Markdown format
   *  - computes a skill match summary (mandatory vs preferred)
   *
   * @param params - CV generation input parameters.
   * @param params.job_title - Target job title.
   * @param params.job_company - Target company name.
   * @param params.job_location - Job location.
   * @param params.job_description - Full job description text.
   * @param params.profile_text - Full user profile / resume text.
   *
   * @returns Generated CV and match metadata.
   * @returns.cv_markdown - Generated CV content in Markdown format.
   * @returns.match_summary - Skill matching summary.
   * @returns.match_summary.matching_skills - Mandatory skills covered by the profile.
   * @returns.match_summary.missing_skills - Mandatory skills missing from the profile.
   * @returns.match_summary.preferred_skills_matched - Preferred skills covered.
   * @returns.match_summary.match_rate - Coverage ratios for mandatory and preferred skills.
   * @returns.job - Job metadata used for generation.
   * @returns.model - Name of the ML model used.
   * @returns.time_ms - Total processing time in milliseconds.
   * @returns.warning - Optional warning message (e.g. low coverage).
   *
   * @throws Error if the ML service returns a non-200 response.
   */
  async generateCV(params: {
    job_title: string;
    job_company: string;
    job_location: string;
    job_description: string;
    profile_text: string;
  }): Promise<{
    cv_markdown: string;
    match_summary: {
      matching_skills: string[];
      missing_skills: string[];
      preferred_skills_matched: string[];
      match_rate: { mandatory: string; preferred: string };
    };
    job: { title: string; company: string; location: string };
    model: string;
    time_ms: number;
    warning: string | null;
  }> {
    const response = await fetch(`${this.baseUrl}/api/generate-cv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `ML service error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Compare a CV against a job description.
   *
   * Sends the CV and job details to the ML service, which:
   *  - extracts skills from both CV and job description
   *  - checks coverage of mandatory and preferred requirements
   *  - computes a semantic similarity score between CV and job
   *
   * @param params - CV comparison input parameters.
   * @param params.cv_text - Full CV / resume text.
   * @param params.job_title - Job title (optional context).
   * @param params.job_company - Company name (optional context).
   * @param params.job_description - Full job description text.
   *
   * @returns Comparison result.
   * @returns.score - Overall semantic match score (0.0–1.0).
   * @returns.job_requirements - Job requirements grouped by priority with coverage flags.
   * @returns.summary - Aggregated coverage statistics.
   * @returns.cv_skills - List of skills extracted from the CV.
   * @returns.time_ms - Total processing time in milliseconds.
   *
   * @throws Error if the ML service returns a non-200 response.
   */
  async compareCV(params: {
    cv_text: string;
    job_title: string;
    job_company: string;
    job_description: string;
  }): Promise<{
    score: number;
    job_requirements: {
      mandatory: { skill: string; covered: boolean }[];
      preferred: { skill: string; covered: boolean }[];
    };
    summary: {
      covered_count: number;
      total_count: number;
      mandatory_covered: string;
      preferred_covered: string;
    };
    cv_skills: string[];
    time_ms: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/compare-cv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `ML service error: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Returns a singleton instance of MLServiceClient.
 *
 * Ensures consistent configuration and avoids repeated instantiation
 * across the application lifecycle.
 *
 * @returns MLServiceClient singleton instance.
 */
let client: MLServiceClient | null = null;
export const getMLClient = (): MLServiceClient => {
  if (!client) client = new MLServiceClient();
  return client;
};
