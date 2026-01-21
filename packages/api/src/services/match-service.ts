import pg from "pg";

import {JobService} from "./job-service.js";
import {MatchRequest, MatchResponse} from "../types/index.js";
import {getHfClient, HuggingFaceClient} from "../clients/hugging-face-client.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class MatchService {
    private jobService: JobService;

    constructor(private db: PoolType) {
        this.jobService = new JobService(db);
    }

    /**
     * POST /api/match
     * Match a user profile against all jobs
     */
    async matchProfile(request: MatchRequest): Promise<MatchResponse> {
        const {
            profile,
            limit = 20,
            offset = 0,
            threshold = 0.0,
        } = request;

        if (!profile || profile.trim().length === 0) {
            throw new Error("Profile text is required");
        }

        // Truncate profile to avoid token limits (~1500 chars ≈ 375 tokens)
        const truncateProfile = profile.length > 2000
            ? profile.substring(0, 2000) + "..."
            : profile;

        console.log(`🔍 Matching profile (${truncateProfile.length} chars)...`);

        // Generate embeddings for truncated profile
        const hfClient = getHfClient();
        const embedding = await hfClient.embedProfile(truncateProfile);

        console.log(`✅ Profile embedding generated (${embedding.length} dimensions)`);

        // Find matching jobs
        const { matches, total } = await this.jobService.findMatchingJobs({
            embedding,
            limit,
            offset,
            threshold,
        });

        console.log(`✅ Found ${total} matches (returning ${matches.length})`);

        return {
            matches,
            total,
            has_more: offset + matches.length < total,
        }
    }
}