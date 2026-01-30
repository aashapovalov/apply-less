import israeliCitiesData from "../data/israeli-cities.json" with { type: "json" };

export interface NormalizedLocation {
  country: string | null;
  region: string | null;
  normalized: string | null;
  isIsraeli: boolean;
}

interface CityData {
  name: string;
  name_he: string;
  region: string;
  district: string;
  aliases: string[];
}

// Build lookup map for faster search
const cityLookup = new Map<string, { region: string; normalized: string }>();

for (const city of israeliCitiesData.cities as CityData[]) {
  const normalized = city.name;
  const region = city.region;

  // Add main name
  cityLookup.set(city.name.toLowerCase(), { region, normalized });

  // Add Hebrew name
  cityLookup.set(city.name_he, { region, normalized });

  // Add all aliases
  for (const alias of city.aliases) {
    cityLookup.set(alias.toLowerCase(), { region, normalized });
  }
}

const countryIndicators = israeliCitiesData.countryIndicators as Record<
  string,
  string[]
>;
const remoteIndicators = israeliCitiesData.remoteIndicators as string[];

export function normalizeLocation(
  raw: string | null | undefined,
): NormalizedLocation {
  if (!raw || raw.trim() === "") {
    return { country: null, region: null, normalized: null, isIsraeli: false };
  }

  const original = raw.trim();
  const lower = original.toLowerCase();

  // Check for remote/hybrid
  for (const indicator of remoteIndicators) {
    if (lower.includes(indicator)) {
      // Check if it's Israeli remote
      for (const [cityKey, data] of cityLookup.entries()) {
        if (lower.includes(cityKey)) {
          return {
            country: "IL",
            region: "remote",
            normalized: "Remote",
            isIsraeli: true,
          };
        }
      }

      if (countryIndicators["IL"].some((ind) => lower.includes(ind))) {
        return {
          country: "IL",
          region: "remote",
          normalized: "Remote",
          isIsraeli: true,
        };
      }

      // Check other countries
      for (const [code, indicators] of Object.entries(countryIndicators)) {
        if (code !== "IL" && indicators.some((ind) => lower.includes(ind))) {
          return {
            country: code,
            region: "remote",
            normalized: original,
            isIsraeli: false,
          };
        }
      }

      // Ambiguous remote - assume Israeli (product is Israel-focused)
      return {
        country: "IL",
        region: "remote",
        normalized: "Remote",
        isIsraeli: true,
      };
    }
  }

  // Check for Israeli cities
  for (const [cityKey, data] of cityLookup.entries()) {
    if (lower.includes(cityKey)) {
      return {
        country: "IL",
        region: data.region,
        normalized: data.normalized,
        isIsraeli: true,
      };
    }
  }

  // Check for Israeli country indicators
  if (countryIndicators["IL"].some((ind) => lower.includes(ind))) {
    return {
      country: "IL",
      region: "other",
      normalized: original,
      isIsraeli: true,
    };
  }

  // Check for other countries
  for (const [code, indicators] of Object.entries(countryIndicators)) {
    if (code !== "IL" && indicators.some((ind) => lower.includes(ind))) {
      return {
        country: code,
        region: null,
        normalized: original,
        isIsraeli: false,
      };
    }
  }

  // Unknown
  return {
    country: "unknown",
    region: null,
    normalized: original,
    isIsraeli: false,
  };
}

export function isIsraeliLocation(raw: string | null | undefined): boolean {
  return normalizeLocation(raw).isIsraeli;
}

export function getRegionDisplayName(region: string | null): string {
  const names: Record<string, string> = {
    central: "Central",
    north: "North",
    south: "South",
    jerusalem: "Jerusalem",
    remote: "Remote",
    other: "Other",
  };
  return region ? names[region] || region : "Unknown";
}

export { israeliCitiesData };
