import israeliCitiesData from "../data/israeli-cities.json" with { type: "json" };

export interface NormalizedLocation {
  country: string | undefined;
  region: string | undefined;
  city: string | undefined;
  normalized: string | undefined;
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
const cityLookup = new Map<string, { region: string; city: string }>();

for (const cityData of israeliCitiesData.cities as CityData[]) {
  const city = cityData.name;
  const region = cityData.region;

  // Add main name (lowercase)
  cityLookup.set(cityData.name.toLowerCase(), { region, city });

  // Add Hebrew name
  cityLookup.set(cityData.name_he, { region, city });

  // Add all aliases
  for (const alias of cityData.aliases) {
    cityLookup.set(alias.toLowerCase(), { region, city });
  }
}

const countryIndicators = israeliCitiesData.countryIndicators as Record<string, string[]>;
const remoteIndicators = israeliCitiesData.remoteIndicators as string[];

// Helper: check if string contains any foreign country indicator
function findForeignCountry(lower: string): string | null {
  for (const [code, indicators] of Object.entries(countryIndicators)) {
    if (code === "IL") continue;
    if (indicators.some((ind) => lower.includes(ind))) {
      return code;
    }
  }
  return null;
}

// Helper: check if string contains Israeli city
function findIsraeliCity(lower: string): { region: string; city: string } | null {
  for (const [cityKey, data] of cityLookup.entries()) {
    if (lower.includes(cityKey)) {
      return data;
    }
  }
  return null;
}

// Helper: check if explicitly mentions Israel
function hasIsraeliIndicator(lower: string): boolean {
  return countryIndicators["IL"].some((ind) => lower.includes(ind));
}

// Helper: check if has remote/hybrid indicator
function hasRemoteIndicator(lower: string): boolean {
  return remoteIndicators.some((ind) => lower.includes(ind));
}

export function normalizeLocation(
  raw: string | null | undefined
): NormalizedLocation {
  if (!raw || raw.trim() === "") {
    return {
      country: undefined,
      region: undefined,
      city: undefined,
      normalized: undefined,
      isIsraeli: false,
    };
  }

  const original = raw.trim();
  const lower = original.toLowerCase();

  // FIRST: Check for foreign country indicators (most specific)
  const foreignCountry = findForeignCountry(lower);
  
  // SECOND: Check for Israeli city
  const israeliCity = findIsraeliCity(lower);
  
  // THIRD: Check if explicitly mentions Israel
  const explicitlyIsraeli = hasIsraeliIndicator(lower);
  
  // FOURTH: Check for remote/hybrid
  const isRemote = hasRemoteIndicator(lower);

  // Decision logic:
  
  // If has Israeli city - it's Israeli (even if remote/hybrid)
  if (israeliCity) {
    if (isRemote) {
      // "Israel (Jerusalem, Hybrid)" → Israeli, region based on city, hybrid note
      return {
        country: "IL",
        region: israeliCity.region, // Use actual city region, not "remote"
        city: israeliCity.city,
        normalized: `${israeliCity.city} (Hybrid/Remote)`,
        isIsraeli: true,
      };
    }
    return {
      country: "IL",
      region: israeliCity.region,
      city: israeliCity.city,
      normalized: israeliCity.city,
      isIsraeli: true,
    };
  }

  // If has foreign country - it's NOT Israeli
  if (foreignCountry) {
    return {
      country: foreignCountry,
      region: isRemote ? "remote" : undefined,
      city: undefined,
      normalized: original,
      isIsraeli: false,
    };
  }

  // If explicitly mentions Israel but no city
  if (explicitlyIsraeli) {
    // Check for "Israel South", "Israel North", etc. patterns
    if (lower.includes("israel south") || lower.includes("south israel")) {
      return {
        country: "IL",
        region: "south",
        city: undefined,
        normalized: "Israel South",
        isIsraeli: true,
      };
    }
    if (lower.includes("israel north") || lower.includes("north israel")) {
      return {
        country: "IL",
        region: "north",
        city: undefined,
        normalized: "Israel North",
        isIsraeli: true,
      };
    }
    if (lower.includes("israel central") || lower.includes("central israel")) {
      return {
        country: "IL",
        region: "central",
        city: undefined,
        normalized: "Israel Central",
        isIsraeli: true,
      };
    }
    return {
      country: "IL",
      region: isRemote ? "remote" : "other",
      city: undefined,
      normalized: isRemote ? "Remote (Israel)" : original,
      isIsraeli: true,
    };
  }

  // If just "Remote" with no country context - mark as unknown (NOT Israeli)
  if (isRemote) {
    return {
      country: "unknown",
      region: "remote",
      city: undefined,
      normalized: original,
      isIsraeli: false, // Don't assume Israeli!
    };
  }

  // No matches at all - unknown
  return {
    country: "unknown",
    region: undefined,
    city: undefined,
    normalized: original,
    isIsraeli: false,
  };
}

export function isIsraeliLocation(raw: string | null | undefined): boolean {
  return normalizeLocation(raw).isIsraeli;
}

export function getRegionDisplayName(region: string | null | undefined): string {
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
