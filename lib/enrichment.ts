// Helper functions for the enrichment API

import OpenAI from 'openai';

/**
 * Initialize OpenAI client with API key from environment
 */
export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Search for professional information about a person using Tavily API
 */
export async function searchPersonInfo(params: {
  name: string;
  company?: string;
  linkedin_url?: string;
}) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not set in environment variables');
  }
  
  let query = params.name;
  if (params.linkedin_url) {
    query += ` ${params.linkedin_url} professional profile`;
  } else if (params.company) {
    query += ` ${params.company} professional background`;
  } else {
    query += ' professional profile career';
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      max_results: 5,
      search_depth: 'advanced',
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Generate professional summary using OpenAI
 */
export async function generateSummary(params: {
  name: string;
  company?: string;
  contextText: string;
}) {
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional conference networking assistant. Create concise, engaging professional summaries.

TASK:
1. Analyze information about a conference attendee
2. Create exactly 3 bullet points (10-20 words each) capturing their professional vibe
3. Extract exactly 3 industry tags (single words or short phrases)

OUTPUT FORMAT (JSON):
{
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "industry_tags": ["tag1", "tag2", "tag3"]
}`,
      },
      {
        role: 'user',
        content: `Name: ${params.name}\n${params.company ? `Company: ${params.company}\n` : ''}\n\nInformation:\n${params.contextText}\n\nProvide JSON output.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

/**
 * Build context string from Tavily search results
 */
interface TavilySearchResult {
  title?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
  answer?: string;
}

export function buildContextFromSearchResults(searchResults: TavilyResponse): string {
  const results = searchResults.results || [];
  let context = '';

  if (searchResults.answer) {
    context += `AI Summary: ${searchResults.answer}\n\n`;
  }

  results.slice(0, 3).forEach((result: TavilySearchResult, index: number) => {
    context += `Source ${index + 1}: ${result.title || 'N/A'}\n`;
    if (result.content) {
      context += `${result.content.substring(0, 300)}...\n\n`;
    }
  });

  return context || 'Limited information available.';
}
