import axios, {AxiosInstance} from "axios";

const HF_API_URL = "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5";

export interface EmbeddingResponse {
    embedding: number[];
}

export class HuggingFaceClient {
    private httpClient: AxiosInstance;
    private token: string;

    constructor(token?: string) {
        this.token = token || process.env.HF_TOKEN || "";

        if (!this.token) {
            throw new Error("HF_TOKEN environment variable is not set");
        }

        this.httpClient = axios.create({
            timeout: 60000, // 60 seconds for model to warm up
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json",
            }
        })
    }

    /**
     * Generate embedding for a single text
     * E5 models require "passage: " prefix for documents
     */
    async embedText(text: string): Promise<number[]> {
        const prefixedText = text.startsWith("passage: ") || text.startsWith("query: ")
            ? text
            : `passage: ${text}`;

        try {
            const response = await this.httpClient.post(HF_API_URL, {
                inputs: prefixedText,
                options: {
                    wait_for_model: true, // wait if model is loading
                },
            });

            // HuggingFace returns array directly for single input
            if (Array.isArray(response.data) && response.data.length > 0) {
                // Response is [[...embedding...]] for feature extraction
                if (Array.isArray(response.data[0])) {
                    return response.data[0];
                }
                return response.data;
            }

            throw new Error("Unexpected response format from HuggingFace API");
        } catch (error: any) {
            if (error.response?.status === 503) {
                console.log("  ⏳ Model is loading, waiting...");
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 20000));
                return this.embedText(text);
            }
            if (error.response?.status === 429) {
                console.log("  ⏳ Rate limited, waiting 60s...");
                await new Promise(resolve => setTimeout(resolve, 20000));
                return this.embedText(text);
            }
            throw new Error("HuggingFace API error: " + error.message);
        }
    }

    /**
     * Generate embeddings for multiple texts (batch)
     * More efficient than colling by one
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        const prefixedText = texts.map((text) =>
            text.startsWith("passage: ") || text.startsWith("query: ")
                ? text
                : `passage: ${text}`
        );

        try {
            const responce = await this.httpClient.post(HF_API_URL, {
                inputs: prefixedText,
                options: {
                    wait_for_model: true, // wait if model is loading
                },
            });

            if (Array.isArray(responce.data)) {
            return responce.data;
            }

            throw new Error("Unexpected response format from HuggingFace API");
        } catch (error: any) {
            if (error.response?.status === 503) {
                console.log("  ⏳ Model is loading, waiting 20s...");
                await new Promise(resolve => setTimeout(resolve, 20000));
                return this.embedBatch(texts);
            }
            if (error.response?.status === 429) {
                console.log("  ⏳ Rate limited, waiting 60s...");
                await new Promise(resolve => setTimeout(resolve, 60000));
                return this.embedBatch(texts);
            }

            // If batch fails, fall back to individual requests
            if (texts.length > 1) {
                console.log("  ⚠️ Batch failed, falling back to individual requests");
                const results: number[][] = [];
                for (const text of texts) {
                    const embedding = await this.embedText(text);
                    results.push(embedding);
                    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
                }
                return results;
            }

            throw new Error("HuggingFace API error: " + error.message);
        }
    }

    /**
     * Test the connection and model availability
     */

    async testConnection(): Promise<boolean> {
        try {
            console.log("🔍 Testing HuggingFace API connection...");
            const embedding = await this.embedText("passage: test connection");
            console.log(`✅ Connection successful! Embedding dimension: ${embedding.length}`);
            return embedding.length === 768;
        } catch (error: any) {
            console.error(`❌ Connection failed: ${error.message}`);
            return false;
        }
    }
}