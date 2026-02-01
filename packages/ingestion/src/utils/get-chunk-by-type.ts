import { Chunk } from "../types/index.js";

/**
 * Retrieve a chunk by its exact type.
 *
 * Searches the provided chunks array and returns the first chunk
 * whose `type` matches the given value.
 *
 * @param chunks - Array of chunk objects returned by the ML service.
 * @param type - Chunk type to retrieve (e.g. "experience", "full").
 * @returns The matching chunk, or undefined if no match is found.
 */
export function getChunkByType(
  chunks: Chunk[],
  type: string,
): Chunk | undefined {
  return chunks.find((c) => c.type === type);
}

/**
 * Retrieve the first available chunk matching one of multiple types.
 *
 * Iterates through the provided list of types in priority order and
 * returns the first matching chunk found in the chunks array.
 *
 * Useful when multiple chunk types are acceptable fallbacks.
 *
 * @param chunks - Array of chunk objects returned by the ML service.
 * @param types - Ordered list of acceptable chunk types.
 * @returns The first matching chunk, or undefined if none are found.
 */
export function getChunkByTypes(
  chunks: Chunk[],
  types: string[],
): Chunk | undefined {
  for (const type of types) {
    const chunk = chunks.find((c) => c.type === type);
    if (chunk) return chunk;
  }
  return undefined;
}
