import axios, { AxiosInstance } from "axios";

import {
  EmbedResponse,
  EmbedSingleResponse,
  JobChunkResponse,
} from "../types/index.js";

const DEFAULT_ML_SERVICE_URL = "http://localhost:8000";

export interface EmbeddingResponse {
  embedding: number[];
}

/**
 * Embedding HTTP client.
 *
 * This client communicates with a local or remote embedding service that wraps
 * HuggingFace models (e.g. BGE, E5, MiniLM).
 *
 * Responsibilities:
 *  - Generate embeddings for single texts
 *  - Generate embeddings in batch
 *  - Handle model warm-up (503 retry logic)
 *  - Verify service and model availability
 *
 * Expected service endpoints:
 *  - POST /api/embed/single
 *  - POST /api/embed/
 *  - GET  /api/health
 */
export class EmbeddingClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 120 seconds for model to warm up
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Generate an embedding for a single text input.
   *
   * Notes:
   *  - E5-style models require a prefix:
   *      - "passage: " for documents
   *      - "query: "   for search queries
   *  - This method automatically retries when the model is still loading (HTTP 503).
   *
   * @param text - Input text to embed
   * @param textType - Semantic role of the text ("passage" | "query")
   * @returns Embedding vector as an array of numbers
   *
   * @throws Error if the ML service returns a non-recoverable error
   */
  async embedText(
    text: string,
    textType: "passage" | "query" = "passage",
  ): Promise<number[]> {
    try {
      const response = await this.httpClient.post<EmbedSingleResponse>(
        "/api/embed/single",
        {
          text,
          normalize: true,
          text_type: textType,
        },
      );
      return response.data.embedding;
    } catch (error: any) {
      if (error.response?.status === 503) {
        console.log("  ⏳ ML Service model loading, waiting 10s...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return this.embedText(text, textType);
      }
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch request.
   *
   * This method is significantly more efficient than calling `embedText`
   * repeatedly, as it minimizes network overhead and model re-initialization.
   *
   * Behavior:
   *  - Always uses "passage" mode (document embeddings)
   *  - Automatically retries if the model is still warming up (HTTP 503)
   *
   * @param texts - Array of input texts to embed
   * @returns Array of embedding vectors (one per input text)
   *
   * @throws Error if the ML service returns a non-recoverable error
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.httpClient.post<EmbedResponse>(
        "/api/embed/",
        {
          texts,
          normalize: true,
          text_type: "passage",
        },
      );
      console.log(
        `  📊 ${response.data.count} embeddings in ${response.data.time_ms}ms`,
      );
      return response.data.embeddings;
    } catch (error: any) {
      if (error.response?.status === 503) {
        console.log("  ⏳ ML Service model loading, waiting 10s...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return this.embedBatch(texts);
      }
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Chunk a job description into semantic sections with embeddings.
   *
   * Returns structured chunks (header, requirements, responsibilities, etc.)
   * each with its own embedding vector.
   *
   * @param text - Full job description text
   * @param title - Job title
   * @param company - Company name
   * @param location - Optional job location
   * @returns JobChunkResponse with chunks array and extracted skills
   */
  async chunkJob(
    text: string,
    title: string,
    company: string,
    location?: string,
  ): Promise<JobChunkResponse> {
    try {
      const response = await this.httpClient.post<JobChunkResponse>(
        "/api/embed/job",
        {
          text,
          title,
          company,
          location: location || "",
        },
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 503) {
        console.log("  ⏳ ML Service model loading, waiting 10s...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return this.chunkJob(text, title, company, location);
      }
      throw new Error(`Chunk job failed: ${error.message}`);
    }
  }

  /**
   * Test connectivity and model readiness of the ML service.
   *
   * This method:
   *  1. Calls /api/health to check service status
   *  2. Waits briefly if the model is still loading
   *  3. Generates a test embedding
   *  4. Verifies expected embedding dimension (768 by default)
   *
   * @returns `true` if the service is reachable and the model is producing valid embeddings
   */

  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing ML Service (${this.baseUrl})...`);
      const health = await this.httpClient.get("/health");
      if (!health.data?.model_loaded) {
        console.log("  ⏳ Model loading...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      const embedding = await this.embedText("test");
      console.log(`✅ Connected! Dimension: ${embedding.length}`);
      return embedding.length === 768;
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`);
      return false;
    }
  }
}
