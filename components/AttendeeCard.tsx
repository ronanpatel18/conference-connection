"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ExternalLink, Briefcase, Building2 } from "lucide-react";
import type { Attendee } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface AttendeeCardProps {
  attendee: Attendee;
  index: number;
}

// Map industries to color variants
const getIndustryColor = (tags: string[] | null): string => {
  if (!tags || tags.length === 0) return "red";

  // Weight tags by their typical meaning:
  // 0 = broad industry (most important), 1 = domain, 2 = role function (least important)
  const weightForIndex = (i: number) => (i === 0 ? 3 : i === 1 ? 2 : 1);

  const scores: Record<string, number> = { red: 0, gray: 0, black: 0, darkred: 0 };

  const addScoreIfMatches = (tag: string, weight: number, keywords: string[], color: string) => {
    for (const kw of keywords) {
      if (tag.includes(kw)) {
        scores[color] += weight;
        return;
      }
    }
  };

  tags.forEach((rawTag, index) => {
    const tag = (rawTag || "").toLowerCase().trim();
    if (!tag) return;

    const w = weightForIndex(index);

    // Technology & Software -> Red (Primary)
    addScoreIfMatches(tag, w, [
      "technology",
      "tech",
      "software",
      "ai",
      "machine learning",
      "ml",
      "data",
      "cloud",
      "saas",
      "engineering",
      "gpu",
      "semiconductor",
      "hardware",
      "compute",
      "chips",
      "robotics",
    ], "red");

    // Finance & Business -> Gray (Professional)
    addScoreIfMatches(tag, w, [
      "finance",
      "fintech",
      "banking",
      "investment",
      "trading",
      "accounting",
      "private equity",
      "venture",
      "economics",
      "business",
      "operations",
    ], "gray");

    // Creative & Design -> Black (Sleek)
    addScoreIfMatches(tag, w, [
      "design",
      "creative",
      "art",
      "media",
      "marketing",
      "branding",
      "content",
      "advertising",
    ], "black");

    // Leadership & Management -> Dark Red (Senior)
    addScoreIfMatches(tag, w, [
      "leadership",
      "management",
      "ceo",
      "executive",
      "strategy",
      "founder",
      "operations leadership",
      "product leadership",
    ], "darkred");

    // Bonus: explicit sports tag should feel “Badger” (dark red)
    addScoreIfMatches(tag, w, ["sports", "athletics", "ncaa", "football", "basketball"], "darkred");
  });

  // Pick the highest-scoring category (ties break toward industry colors over role-color)
  const ordered: Array<keyof typeof scores> = ["red", "gray", "black", "darkred"];
  let best: keyof typeof scores = "red";
  for (const c of ordered) {
    if (scores[c] > scores[best]) best = c;
  }
  return best;
};

const colorClasses = {
  "red": {
    border: "border-badger-red",
    glow: "shadow-badger-red/20",
    bg: "bg-badger-red/10",
    text: "text-badger-red",
    badge: "bg-badger-red text-white",
  },
  "darkred": {
    border: "border-badger-darkred",
    glow: "shadow-badger-darkred/20",
    bg: "bg-badger-darkred/10",
    text: "text-badger-darkred",
    badge: "bg-badger-darkred text-white",
  },
  "gray": {
    border: "border-gray-500",
    glow: "shadow-gray-500/20",
    bg: "bg-gray-100",
    text: "text-gray-700",
    badge: "bg-gray-700 text-white",
  },
  "black": {
    border: "border-gray-900",
    glow: "shadow-gray-900/20",
    bg: "bg-gray-50",
    text: "text-gray-900",
    badge: "bg-gray-900 text-white",
  },
};

export default function AttendeeCard({ attendee, index }: AttendeeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const industryColor = getIndustryColor(attendee.industry_tags);
  const colors = colorClasses[industryColor as keyof typeof colorClasses];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="relative w-full h-full min-h-[280px] cursor-pointer"
        onHoverStart={() => setIsFlipped(true)}
        onHoverEnd={() => setIsFlipped(false)}
        onClick={() => setIsFlipped((prev) => !prev)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Card container with flip animation */}
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT of card */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6",
              "bg-white",
              "border-2",
              colors.border,
              "shadow-lg",
              "hover:shadow-xl",
              colors.glow,
              "transition-all duration-300",
              isFlipped && "pointer-events-none"
            )}
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            {/* Industry indicator dot */}
            <div className="absolute top-4 right-4">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  colors.text.replace("text-", "bg-"),
                  "animate-pulse"
                )}
              />
            </div>

            {/* Name & Title */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                {attendee.name}
              </h3>
              
              {attendee.job_title && (
                <div className="flex items-start space-x-2 mb-2">
                  <Briefcase className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {attendee.job_title}
                  </p>
                </div>
              )}

              {attendee.company && (
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className={cn("text-sm font-medium", colors.text)}>
                    {attendee.company}
                  </p>
                </div>
              )}
            </div>

            {/* Preview tags */}
            {attendee.industry_tags && attendee.industry_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {attendee.industry_tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      colors.badge
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Hover indicator */}
            <div className="absolute bottom-4 left-6 right-6 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Hover to reveal AI insights</span>
              </p>
            </div>
          </div>

          {/* BACK of card */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6",
              "bg-white",
              "border-2",
              colors.border,
              colors.glow,
              "shadow-xl",
              "overflow-y-auto"
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* AI Summary header */}
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className={cn("w-5 h-5", colors.text)} />
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">AI Profile Insights</h4>
            </div>

            {/* AI Summary bullets */}
            {attendee.ai_summary ? (
              <div className="space-y-3 mb-4">
                {attendee.ai_summary.split("\n").map((bullet, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0", colors.text.replace("text-", "bg-"))} />
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                      {bullet}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4 italic">
                Mystery guest - profile insights coming soon
              </p>
            )}

            {/* All industry tags */}
            {attendee.industry_tags && attendee.industry_tags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  {attendee.industry_tags.map((tag, i) => (
                    <span
                      key={i}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold",
                        colors.badge
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* LinkedIn link */}
            {attendee.linkedin_url && (
              <a
                href={attendee.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex items-center space-x-2 text-sm font-medium transition-colors",
                  colors.text,
                  "hover:underline"
                )}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View LinkedIn Profile</span>
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
