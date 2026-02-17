/**
 * Input Validation & Sanitization Utilities
 *
 * OWASP-compliant validation with:
 * - Schema-based validation using Zod
 * - Input sanitization (XSS prevention)
 * - Type checking and length limits
 * - Rejection of unexpected fields
 */

import { z } from "zod";
import { NextResponse } from "next/server";

// Maximum lengths for common fields
export const MAX_LENGTHS = {
  name: 100,
  email: 254, // RFC 5321
  jobTitle: 200,
  company: 200,
  about: 2000,
  linkedinUrl: 500,
  aiSummary: 5000,
  industryTag: 100,
  genericText: 1000,
  uuid: 36,
} as const;

/**
 * Sanitize a string to prevent XSS attacks
 * Removes/escapes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    // Trim whitespace
    .trim()
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters (except newlines/tabs for content fields)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize unicode to prevent homograph attacks
    .normalize("NFC");
}

/**
 * Sanitize HTML - escape dangerous characters
 * Use for content that will be displayed
 */
export function escapeHtml(input: string): string {
  const sanitized = sanitizeString(input);
  return sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validate and sanitize a name field
 */
export function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const sanitized = sanitizeString(input);
  if (sanitized.length === 0 || sanitized.length > MAX_LENGTHS.name) return null;
  // Name should only contain letters, spaces, hyphens, apostrophes, commas, and common punctuation
  if (!/^[\p{L}\p{M}\s\-'.,;:&()\/]+$/u.test(sanitized)) return null;
  return sanitized;
}

/**
 * Validate and sanitize an email field
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const sanitized = sanitizeString(input).toLowerCase();
  if (sanitized.length === 0 || sanitized.length > MAX_LENGTHS.email) return null;
  // Basic email validation
  const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!emailRegex.test(sanitized)) return null;
  return sanitized;
}

/**
 * Validate and sanitize a LinkedIn URL
 */
export function sanitizeLinkedInUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const sanitized = sanitizeString(input);
  if (sanitized.length === 0) return null;
  if (sanitized.length > MAX_LENGTHS.linkedinUrl) return null;

  try {
    const url = new URL(sanitized);
    // Must be LinkedIn
    if (url.hostname !== "linkedin.com" && !url.hostname.endsWith(".linkedin.com")) return null;
    // Must be HTTPS
    if (url.protocol !== "https:") return null;
    // Return normalized URL
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validate UUID format
 */
export function sanitizeUuid(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const sanitized = sanitizeString(input);
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitized)) return null;
  return sanitized.toLowerCase();
}

// Zod schemas with sanitization transforms

/**
 * Schema for name field
 */
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(MAX_LENGTHS.name, `Name must be ${MAX_LENGTHS.name} characters or less`)
  .transform(sanitizeString);

/**
 * Schema for email field
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(MAX_LENGTHS.email, `Email must be ${MAX_LENGTHS.email} characters or less`)
  .email("Invalid email format")
  .transform((val) => sanitizeString(val).toLowerCase());

/**
 * Schema for optional email field
 * Accepts string, empty string, null, or undefined
 */
export const optionalEmailSchema = z
  .union([
    z.string()
      .max(MAX_LENGTHS.email, `Email must be ${MAX_LENGTHS.email} characters or less`)
      .email("Invalid email format")
      .transform((val) => sanitizeString(val).toLowerCase()),
    z.literal(""),
    z.null(),
  ])
  .optional();

/**
 * Schema for job title field (optional)
 * Accepts string, null, or undefined
 */
export const jobTitleSchema = z
  .string()
  .max(MAX_LENGTHS.jobTitle, `Job title must be ${MAX_LENGTHS.jobTitle} characters or less`)
  .transform(sanitizeString)
  .nullish();

/**
 * Schema for company field (optional)
 * Accepts string, null, or undefined
 */
export const companySchema = z
  .string()
  .max(MAX_LENGTHS.company, `Company must be ${MAX_LENGTHS.company} characters or less`)
  .transform(sanitizeString)
  .nullish();

/**
 * Schema for about/bio field (optional)
 * Accepts string, null, or undefined
 */
export const aboutSchema = z
  .string()
  .max(MAX_LENGTHS.about, `About must be ${MAX_LENGTHS.about} characters or less`)
  .transform(sanitizeString)
  .nullish();

/**
 * Schema for LinkedIn URL field (optional)
 * Accepts string, null, or undefined
 */
export const linkedinUrlSchema = z
  .union([
    z.string()
      .max(MAX_LENGTHS.linkedinUrl, `LinkedIn URL must be ${MAX_LENGTHS.linkedinUrl} characters or less`)
      .transform(sanitizeString)
      .refine(
        (val) => {
          if (!val) return true; // Allow empty strings
          try {
            const url = new URL(val);
            return url.hostname.endsWith("linkedin.com") && url.protocol === "https:";
          } catch {
            return false;
          }
        },
        "Invalid LinkedIn URL"
      ),
    z.null(),
  ])
  .optional();

/**
 * Schema for UUID field
 */
export const uuidSchema = z
  .string()
  .min(1, "ID is required")
  .max(MAX_LENGTHS.uuid)
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid ID format"
  )
  .transform((val) => val.toLowerCase());

/**
 * Schema for industry tags array
 */
export const industryTagsSchema = z
  .array(
    z
      .string()
      .max(MAX_LENGTHS.industryTag)
      .transform(sanitizeString)
  )
  .max(10, "Maximum 10 industry tags allowed")
  .optional();

// Pre-built request body schemas

/**
 * Schema for enrich-profile endpoint
 * Uses snake_case to match frontend field names
 */
export const enrichProfileSchema = z
  .object({
    name: nameSchema,
    job_title: jobTitleSchema,
    company: companySchema,
    about: aboutSchema,
    linkedin_url: linkedinUrlSchema,
  })
  .strict(); // Reject unexpected fields

/**
 * Schema for onboarding lookup endpoint
 */
export const lookupSchema = z
  .object({
    name: nameSchema,
  })
  .strict();

/**
 * Schema for onboarding claim endpoint
 */
export const claimSchema = z
  .object({
    attendeeId: uuidSchema,
    name: nameSchema,
    email: emailSchema,
  })
  .strict();

/**
 * Schema for lookup-linkedin endpoint
 * Uses snake_case to match frontend field names
 */
export const lookupLinkedinSchema = z
  .object({
    name: nameSchema,
    job_title: jobTitleSchema,
    company: companySchema,
  })
  .strict();

/**
 * Schema for cleanup-orphan-auth endpoint
 */
export const cleanupOrphanAuthSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

/**
 * Schema for admin create attendee
 * Uses snake_case to match database field names
 */
export const createAttendeeSchema = z
  .object({
    name: nameSchema,
    email: optionalEmailSchema,
    job_title: jobTitleSchema,
    company: companySchema,
    about: aboutSchema,
    linkedin_url: linkedinUrlSchema,
    industry_tags: industryTagsSchema,
  })
  .strict();

/**
 * Schema for admin update attendee
 * Uses snake_case to match database field names
 */
export const updateAttendeeSchema = z
  .object({
    name: nameSchema.optional(),
    email: optionalEmailSchema,
    job_title: jobTitleSchema,
    company: companySchema,
    about: aboutSchema,
    linkedin_url: linkedinUrlSchema,
    ai_summary: z.string().max(MAX_LENGTHS.aiSummary).optional(),
    industry_tags: industryTagsSchema,
  })
  .strict();

/**
 * Schema for admin reorder items
 */
export const reorderItemSchema = z.object({
  id: uuidSchema,
  sort_order: z.number().int().min(0).max(10000),
  is_pinned: z.boolean().optional(),
});

export const reorderSchema = z
  .object({
    items: z.array(reorderItemSchema).min(1).max(1000),
  })
  .strict();

/**
 * Validate request body against a schema
 * Returns a tuple of [data, errorResponse]
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<[z.infer<T> | null, NextResponse | null]> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return [
        null,
        NextResponse.json(
          { success: false, error: "Content-Type must be application/json" },
          { status: 415 }
        ),
      ];
    }

    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      console.error("[Validation] Failed:", JSON.stringify(errors, null, 2));
      return [
        null,
        NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: errors,
          },
          { status: 400 }
        ),
      ];
    }

    return [result.data, null];
  } catch (error) {
    if (error instanceof SyntaxError) {
      return [
        null,
        NextResponse.json(
          { success: false, error: "Invalid JSON in request body" },
          { status: 400 }
        ),
      ];
    }
    return [
      null,
      NextResponse.json(
        { success: false, error: "Failed to parse request body" },
        { status: 400 }
      ),
    ];
  }
}

/**
 * Security headers for API responses
 */
export function securityHeaders(): Headers {
  const headers = new Headers();
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Cache-Control", "no-store, max-age=0");
  return headers;
}

/**
 * Create a JSON response with security headers
 */
export function secureJsonResponse(
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(data, init);
  const secHeaders = securityHeaders();
  secHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
