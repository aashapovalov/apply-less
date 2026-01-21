import axios, {AxiosInstance} from "axios";

const HF_API_URL = "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5";

export class HuggingFaceClient {
    private httpClient: AxiosInstance;
    private token: string;

    constructor(token?: string) {
        this.token = token || process.env.HF_TOKEN || "";

        if (!token) {
            throw new Error("HF_TOKEN environment variable is not set");
        }

        this.httpClient = axios.create({
            timeout: 40000,
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json"
            }
        });
    }

    /**
     * Generate embedding for user profile text
     * Uses "query:" prefix for search queries (matching against "passage:" documents)
     */
    async embedProfile(text: string): Promise<number[]> {
        // BGE models: use "query:" for search, documents were embedded without prefix
        const prefixedText = text.startsWith("query: ") || text.startsWith("query: ")
            ? text
            : `query: ${text}`;

        try {
            const response = await this.httpClient.post(HF_API_URL, {
                inputs: prefixedText,
                options: {
                    wait_for_model: true, // wait if model is loading
                },
            });

            if (Array.isArray(response.data) && response.data.length === 768) {
                return response.data;
            }

            throw new Error("Unexpected response format from HuggingFace API");

        } catch (error: any) {
            if (error.response?.status === 503) {
                console.log("  ⏳ Model is loading, waiting...");
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 20000));
                return this.embedProfile(text);
            }
            if (error.response?.status === 429) {
                console.log("  ⏳ Rate limited, waiting 60s...");
                await new Promise(resolve => setTimeout(resolve, 20000));
                return this.embedProfile(text);
            }
            throw new Error("HuggingFace API error: " + error.message);
        }
    }
}

// Singleton instance
let client: HuggingFaceClient | null = null;

export const getHfClient = (): HuggingFaceClient => {
    if (!client) {
        client = new HuggingFaceClient();
    }
    return client;
};