export const MATCHING_QUERY = (
  title_weight: number,
  experience_weight: number,
  full_weight: number,
) => {
  return `
  WITH job_scores AS (
        SELECT
          j.id as job_id,
          j.title,
          c.company_name,
          j.location,
          j.region,
          j.city,
          COALESCE(c.tags, '{}') as tags,
          j.canonical_url as url,
          j.posted_date,
          -- Title similarity (40%): profile title ↔ job header
          COALESCE(1 - (j.header_embedding <=> $1), 0.5) as title_sim,
          -- Experience→Requirements similarity (35%)
          COALESCE(1 - (j.requirements_embedding <=> $2), 0.5) as exp_req_sim,
          -- Full document similarity (25%)
          COALESCE(1 - (je.embedding <=> $2), 0.5) as full_sim
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
        JOIN job_embeddings_simple je ON j.id = je.job_id
        WHERE j.country = 'IL' AND j.status = 'active'
      ),
      scored AS (
        SELECT 
          *,
          (${title_weight} * title_sim + ${experience_weight} * exp_req_sim + ${full_weight} * full_sim) as score
        FROM job_scores
      )
      SELECT * FROM scored
      WHERE score >= $3
      ORDER BY score DESC
      LIMIT $4 OFFSET $5
      `;
};
