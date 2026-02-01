import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface LookupLinkedInRequest {
  name: string;
  job_title?: string;
  company?: string;
}

interface TavilySearchResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body: LookupLinkedInRequest = await request.json();
    const { name, job_title, company } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn lookup is not configured' },
        { status: 500 }
      );
    }

    // Build a LinkedIn-specific search query
    const searchTerms = [name];
    if (job_title) searchTerms.push(job_title);
    if (company) searchTerms.push(company);
    searchTerms.push('site:linkedin.com/in');

    const searchQuery = searchTerms.join(' ');
    console.log(`[LinkedIn Lookup] Searching: "${searchQuery}"`);

    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        max_results: 5,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        include_domains: ['linkedin.com'],
      }),
    });

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily API error: ${tavilyResponse.status}`);
    }

    const searchResults: TavilyResponse = await tavilyResponse.json();
    console.log(`[LinkedIn Lookup] Found ${searchResults.results?.length || 0} results`);

    // Find the best LinkedIn profile URL
    const linkedInResults = (searchResults.results || []).filter((result) => {
      const url = result.url || '';
      // Only match personal LinkedIn profiles (linkedin.com/in/)
      return url.includes('linkedin.com/in/');
    });

    if (linkedInResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          linkedin_url: null,
          message: 'No LinkedIn profile found',
        },
      });
    }

    // Score each result based on how well it matches the search criteria
    const nameParts = name.toLowerCase().split(/\s+/);
    const scoredResults = linkedInResults.map((result) => {
      let score = 0;
      const title = (result.title || '').toLowerCase();
      const content = (result.content || '').toLowerCase();
      const combined = `${title} ${content}`;

      // Check if name parts appear in the result
      for (const part of nameParts) {
        if (part.length > 2 && combined.includes(part)) {
          score += 10;
        }
      }

      // Check if job title appears
      if (job_title) {
        const jobParts = job_title.toLowerCase().split(/\s+/);
        for (const part of jobParts) {
          if (part.length > 2 && combined.includes(part)) {
            score += 5;
          }
        }
      }

      // Check if company appears
      if (company) {
        const companyLower = company.toLowerCase();
        if (combined.includes(companyLower)) {
          score += 15; // Company match is strong signal
        } else {
          // Check for partial company name match
          const companyParts = companyLower.split(/\s+/);
          for (const part of companyParts) {
            if (part.length > 2 && combined.includes(part)) {
              score += 3;
            }
          }
        }
      }

      return { ...result, score };
    });

    // Sort by score descending and get the best match
    scoredResults.sort((a, b) => b.score - a.score);
    const bestMatch = scoredResults[0];
    console.log(`[LinkedIn Lookup] Best match (score ${bestMatch.score}): ${bestMatch.url}`);

    return NextResponse.json({
      success: true,
      data: {
        linkedin_url: bestMatch.url,
        title: bestMatch.title,
        snippet: bestMatch.content?.substring(0, 200),
      },
    });
  } catch (error) {
    console.error('[LinkedIn Lookup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lookup LinkedIn',
      },
      { status: 500 }
    );
  }
}
