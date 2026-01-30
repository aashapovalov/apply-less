import israeliCitiesData from "../data/israeli-cities.json" with { type: "json" };

export interface NormalizedLocation {
  country: string | undefined;
  region: string | undefined;
  city: string | undefined; // Added
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

  // Add main name
  cityLookup.set(cityData.name.toLowerCase(), { region, city });

  // Add Hebrew name
  cityLookup.set(cityData.name_he, { region, city });

  // Add all aliases
  for (const alias of cityData.aliases) {
    cityLookup.set(alias.toLowerCase(), { region, city });
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

  // Check for remote/hybrid
  for (const indicator of remoteIndicators) {
    if (lower.includes(indicator)) {
      // Check if it's Israeli remote with city mentioned
      for (const [cityKey, data] of cityLookup.entries()) {
        if (lower.includes(cityKey)) {
          return {
            country: "IL",
            region: "remote",
            city: data.city,
            normalized: `Remote (${data.city})`,
            isIsraeli: true,
          };
        }
      }

      if (countryIndicators["IL"].some((ind) => lower.includes(ind))) {
        return {
          country: "IL",
          region: "remote",
          city: undefined,
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
            city: undefined,
            normalized: original,
            isIsraeli: false,
          };
        }
      }

      // Ambiguous remote - assume Israeli (product is Israel-focused)
      return {
        country: "IL",
        region: "remote",
        city: undefined,
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
        city: data.city,
        normalized: data.city,
        isIsraeli: true,
      };
    }
  }

  // Check for Israeli country indicators
  if (countryIndicators["IL"].some((ind) => lower.includes(ind))) {
    return {
      country: "IL",
      region: "other",
      city: undefined,
      normalized: original,
      isIsraeli: true,
    };
  }

  // Check for other countries
  for (const [code, indicators] of Object.entries(countryIndicators)) {
    if (code !== "IL" && indicators.some((ind) => lower.includes(ind))) {
      return {
        country: code,
        region: undefined,
        city: undefined,
        normalized: original,
        isIsraeli: false,
      };
    }
  }

  // Unknown
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
