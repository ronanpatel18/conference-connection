// API Response Types

export interface EnrichProfileRequest {
  name: string;
  company?: string;
  linkedin_url?: string;
}

export interface EnrichProfileResponse {
  success: boolean;
  data?: {
    summary: string[];
    industry_tags: string[];
    sources_found: number;
  };
  error?: string;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  answer?: string;
  results: TavilySearchResult[];
  responseTime: number;
}
