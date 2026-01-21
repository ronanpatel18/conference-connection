import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

let cachedGeminiModelName: string | null = null;
let cachedGeminiModelAtMs = 0;

// Type definitions
interface EnrichProfileRequest {
  name: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  about?: string;
}

interface TavilySearchResult {
  title?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
  answer?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: EnrichProfileRequest = await request.json();
    const { name, job_title, company, linkedin_url, about } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    console.log(`[Enrich] Processing: ${name}${company ? ` at ${company}` : ''}`);
    console.log(`[Gemini] API Key check:`, process.env.DEFAULT_GEMINI_API_KEY ? 'Present' : 'Missing');

    const geminiApiKey = process.env.DEFAULT_GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing DEFAULT_GEMINI_API_KEY server env var' },
        { status: 500 }
      );
    }

    // Allow overriding the preferred Gemini model (e.g. gemini-3-flash-preview)
    const requestedGeminiModel =
      process.env.GEMINI_MODEL || process.env.DEFAULT_GEMINI_MODEL || 'gemini-3-flash-preview';

    // Step 1: Search the web using Tavily API
    let searchResults: TavilyResponse = { results: [], answer: '' };
    let tavilyErrorMessage: string | undefined;
    try {
      const searchQuery = buildSearchQuery(name, job_title, company, linkedin_url, about);
      console.log(`[Tavily] Searching: "${searchQuery}"`);

      if (!process.env.TAVILY_API_KEY) {
        throw new Error('Missing TAVILY_API_KEY server env var');
      }

      // Call Tavily API directly
      const tavilyResponse = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: searchQuery,
          max_results: 5,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!tavilyResponse.ok) {
        throw new Error(`Tavily API error: ${tavilyResponse.status}`);
      }

      searchResults = await tavilyResponse.json();
      console.log(`[Tavily] Found ${searchResults.results?.length || 0} results`);
    } catch (tavilyError) {
      console.error('[Tavily] Search error:', tavilyError);
      tavilyErrorMessage = tavilyError instanceof Error ? tavilyError.message : String(tavilyError);
      // Continue without web context; Gemini can still summarize from user-provided inputs.
      searchResults = { results: [], answer: '' };
    }

    // Step 2: Prepare context for OpenAI
    const contextText = buildContextFromResults(searchResults, name, about);

    // Step 3: Use Gemini to analyze and summarize
    let aiResponse;
    try {
      console.log('[Gemini] Generating summary...');
      console.log('[Gemini] API Key exists:', !!process.env.DEFAULT_GEMINI_API_KEY);
      console.log('[Gemini] API Key length:', process.env.DEFAULT_GEMINI_API_KEY?.length);

      // Initialize Gemini client inside the function
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      let modelName = requestedGeminiModel;
      console.log('[Gemini] Requested model:', modelName);

      const prompt = `You are a professional conference networking assistant. Your job is to create concise, engaging professional summaries.

TASK:
1. Analyze the provided information about a conference attendee
2. Create exactly 3 bullet points that capture their professional vibe (achievements, expertise, interesting facts)
3. Extract 1 to 3 subcategory tags from the approved list.

RULES:
- Each bullet point should be 10-20 words
- Focus on accomplishments, expertise, and what makes them interesting to network with
- Be specific but concise
- Keep a professional yet approachable tone
  - If information is limited, keep statements general and based only on provided fields
  - Treat the user-provided "About" text as the most reliable source and do not contradict it
  - If a LinkedIn URL is provided, assume it is the correct profile and prioritize it in the summary
  - If sources are missing or ambiguous, avoid guessing specific employers or achievements

INDUSTRY TAGS RULES:
- Choose 1 to 3 SUBCATEGORY tags from the approved list below (use exact casing and wording).
- Tags should be distinct and align with the profile summary.
- Do NOT output the main category names; only subcategories.

APPROVED SUBCATEGORY LIST (grouped by main category):
- Brand Development and Fan Experience: Fan Experience, Brand Strategy, Community Engagement
- Brand Communications: Public Relations, Communications, Content
- Journalism and Media Operations: Journalism, Media Operations, Broadcast
- Sports Finance and Real Estate: Finance, Real Estate, Consulting
- Talent Representation: Talent Representation, Athlete Relations, Negotiations
- Sales, Partnerships and Merchandise: Sales, Partnerships, Merchandise
- Data and Technology: Data, Analytics, Technology
- Team Operations and Coaching: Team Operations, Coaching, Player Development

OUTPUT FORMAT (JSON only):
{
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "industry_tags": ["tag1", "tag2", "tag3"]
}

Analyze this person and create their professional summary:

Name: ${name}
${job_title ? `Job Title: ${job_title}\n` : ''}${company ? `Company: ${company}\n` : ''}
${about ? `About (user-provided): ${about}\n` : ''}
${linkedin_url ? `LinkedIn: ${linkedin_url}\n` : ''}

Information found:
${contextText}

Return ONLY valid JSON. Do not include markdown, code fences, or extra commentary.`;

      console.log('[Gemini] Sending prompt...');
      let result;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.6,
          },
        });
        result = await model.generateContent(prompt);
      } catch (firstError: unknown) {
        const status =
          typeof firstError === 'object' && firstError && 'status' in firstError
            ? (firstError as { status?: number }).status
            : undefined;
        const message = firstError instanceof Error ? firstError.message : String(firstError);
        const isModelIssue =
          status === 404 || /not found|not supported for generateContent/i.test(message);

        if (!isModelIssue) {
          throw firstError;
        }

        console.warn('[Gemini] Requested model unavailable, falling back to ListModels...');
        modelName = await getSupportedGeminiModelName(geminiApiKey);
        console.log('[Gemini] Using fallback model:', modelName);
        const fallbackModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.6,
          },
        });
        result = await fallbackModel.generateContent(prompt);
      }
      console.log('[Gemini] Got result...');
      const response = await result.response;
      const text = response.text();
      console.log('[Gemini] Raw response:', text);

      // Extract JSON from the response (support raw JSON or fenced blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const fencedMatch = text.match(/```json[\s\S]*?```/i);
      const candidate =
        (fencedMatch ? fencedMatch[0].replace(/```json|```/gi, "").trim() : null) ||
        (jsonMatch ? jsonMatch[0] : null) ||
        text.trim();

      try {
        aiResponse = JSON.parse(candidate);
      } catch {
        const sanitized = candidate
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        try {
          aiResponse = JSON.parse(sanitized);
        } catch {
          console.warn('[Gemini] Could not parse response as JSON, retrying with strict prompt...');
          const strictPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object with keys "summary" and "industry_tags". Do not include any other text.`;
          const strictResult = await genAI
            .getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            })
            .generateContent(strictPrompt);
          const strictText = (await strictResult.response).text().trim();
          try {
            aiResponse = JSON.parse(strictText);
          } catch {
            console.warn('[Gemini] Strict retry still invalid JSON');
            aiResponse = {
              summary: [
                'Experienced professional in their field',
                'Focused on collaboration and industry impact',
                'Open to meaningful networking conversations',
              ],
              industry_tags: [
                'Brand Communications',
                'Data and Technology',
                'Sales, Partnerships and Merchandise',
              ],
            };
          }
        }
      }

      console.log('[Gemini] Summary generated successfully');
    } catch (geminiError) {
      console.error('[Gemini] Error details:', geminiError);
      return NextResponse.json(
        {
          success: false,
          error:
            geminiError instanceof Error
              ? `Gemini error: ${geminiError.message}`
              : 'Gemini error: Unknown error',
        },
        { status: 502 }
      );
    }

    // Step 4: Validate and format response
    const summary = Array.isArray(aiResponse.summary)
      ? aiResponse.summary.slice(0, 3)
      : ['Professional in their field', 'Experienced industry expert', 'Open to networking'];

    const industry_tags = Array.isArray(aiResponse.industry_tags)
      ? aiResponse.industry_tags.slice(0, 3)
      : ['Business', 'Professional', 'Networking'];

    return NextResponse.json({
      success: true,
      data: {
        summary,
        industry_tags,
        sources_found: Array.isArray(searchResults.results) ? searchResults.results.length : 0,
        ...(tavilyErrorMessage ? { tavily_error: tavilyErrorMessage } : {}),
      },
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

async function getSupportedGeminiModelName(apiKey: string): Promise<string> {
  // Cache for 10 minutes to avoid listing models on every request.
  const now = Date.now();
  if (cachedGeminiModelName && now - cachedGeminiModelAtMs < 10 * 60 * 1000) {
    return cachedGeminiModelName;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ListModels failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  const json = (await res.json()) as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const models = (json.models || [])
    .map((m) => ({
      name: m.name || '',
      supportedGenerationMethods: m.supportedGenerationMethods || [],
    }))
    .filter((m) => m.name);

  const supportsGenerateContent = models.filter((m) =>
    m.supportedGenerationMethods.includes('generateContent')
  );

  const preferred = [
    // Gemini 3 preview variants
    'models/gemini-3-flash-preview',
    'models/gemini-3.0-flash-preview',
    'models/gemini-3-flash-preview-latest',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-latest',
    'models/gemini-1.5-pro',
    'models/gemini-1.0-pro',
    'models/gemini-pro',
  ];

  const picked =
    preferred.find((p) => supportsGenerateContent.some((m) => m.name === p)) ||
    supportsGenerateContent[0]?.name;

  if (!picked) {
    throw new Error(
      `No models support generateContent for this key (models: ${models
        .map((m) => m.name)
        .join(', ')})`
    );
  }

  // Library wants the short name without "models/".
  const normalized = picked.startsWith('models/') ? picked.slice('models/'.length) : picked;
  cachedGeminiModelName = normalized;
  cachedGeminiModelAtMs = now;
  return normalized;
}

// Helper function to build search query
function buildSearchQuery(
  name: string,
  job_title?: string,
  company?: string,
  linkedin_url?: string,
  about?: string
): string {
  const terms = [name];
  
  if (job_title) {
    terms.push(job_title);
  }

  if (company) {
    terms.push(company);
  }
  
  if (linkedin_url) {
    terms.push(linkedin_url);
  }

  if (about && about.trim().length > 0) {
    terms.push(`"${about.trim()}"`);
  }
  
  // Broader search terms to find information across the web
  terms.push("professional profile");
  terms.push("career background");
  terms.push("biography");
  
  return terms.join(" ");
}

// Helper function to build context from search results
function buildContextFromResults(searchResults: TavilyResponse, name: string, about?: string): string {
  const results = searchResults.results || [];
  
  let context = '';

  if (about && about.trim().length > 0) {
    context += `User-provided context: ${about.trim()}\n\n`;
  }
  
  // Add Tavily's AI answer if available
  if (searchResults.answer) {
    context += `AI Summary: ${searchResults.answer}\n\n`;
  }
  
  // Add top results
  results.slice(0, 3).forEach((result: TavilySearchResult, index: number) => {
    context += `Source ${index + 1}:\nTitle: ${result.title || 'N/A'}\n`;
    if (result.content) {
      context += `Content: ${result.content.substring(0, 300)}...\n`;
    }
    context += '\n';
  });
  
  // If context is too short, add fallback
  if (context.length < 100) {
    context += `Limited information available about ${name}. Please infer based on any available context.`;
  }
  
  return context;
}

