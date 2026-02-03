"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Linkedin, Briefcase, Building2, RotateCcw } from "lucide-react";
import type { Attendee } from "@/types/database.types";
import { cn } from "@/lib/utils";
import {
  getThemeForAttendee,
  getThemeForSubcategory,
  isValidSubcategory,
} from "@/lib/industry";

interface AttendeeCardProps {
  attendee: Attendee;
  index: number;
}

export default function AttendeeCard({ attendee, index }: AttendeeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const theme = getThemeForAttendee(attendee);
  const cardRef = useRef<HTMLDivElement>(null);

  // Track touch for scroll vs tap detection
  const touchDataRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    scrolled: boolean;
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use native event listeners for passive touch handling
  useEffect(() => {
    if (!isMobile || !cardRef.current) return;

    const card = cardRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchDataRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        scrolled: false,
      };
    };

    const handleTouchMove = () => {
      // Mark that movement occurred (potential scroll)
      if (touchDataRef.current) {
        touchDataRef.current.scrolled = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchDataRef.current) return;

      const { startX, startY, startTime, scrolled } = touchDataRef.current;
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);
      const duration = Date.now() - startTime;

      // Check if target is an interactive element (links, buttons)
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, [role="button"]');

      // Only flip if:
      // 1. No significant movement (< 10px in any direction)
      // 2. Quick tap (< 300ms)
      // 3. Not on an interactive element
      // 4. No scroll occurred
      const isQuickTap = !scrolled && deltaX < 10 && deltaY < 10 && duration < 300;

      if (isQuickTap && !isInteractive) {
        setIsFlipped((prev) => !prev);
      }

      touchDataRef.current = null;
    };

    // Add passive listeners - they won't block scrolling
    card.addEventListener("touchstart", handleTouchStart, { passive: true });
    card.addEventListener("touchmove", handleTouchMove, { passive: true });
    card.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      card.removeEventListener("touchstart", handleTouchStart);
      card.removeEventListener("touchmove", handleTouchMove);
      card.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile]);

  const displayTags = (attendee.industry_tags || [])
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .filter((tag) => isValidSubcategory(tag))
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="h-full"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        ref={cardRef}
        className={cn(
          "relative w-full h-full min-h-[280px]",
          "cursor-pointer"
        )}
        style={{ touchAction: "pan-y" }}
        onHoverStart={() => !isMobile && setIsFlipped(true)}
        onHoverEnd={() => !isMobile && setIsFlipped(false)}
        onClick={() => !isMobile && setIsFlipped((prev) => !prev)}
        whileHover={!isMobile ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.15 }}
      >
        {/* Card container with flip animation */}
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT of card */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6",
              "bg-white",
              "border-2",
              "shadow-lg",
              "hover:shadow-xl",
              "transition-all duration-300",
              isFlipped && "pointer-events-none"
            )}
            style={{
              backfaceVisibility: "hidden",
              borderColor: theme.main,
            }}
          >
            {/* Industry indicator dot */}
            <div className="absolute top-4 right-4">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  "animate-pulse"
                )}
                style={{ backgroundColor: theme.tint }}
              />
            </div>

            {/* Name & Title */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                  {attendee.name}
                </h3>
                {attendee.linkedin_url && (
                  <a
                    href={attendee.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 text-[#0A66C2]/60 hover:text-[#0A66C2] transition-colors"
                    aria-label="View LinkedIn profile"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

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
                  <p className="text-sm font-medium text-gray-700">
                    {attendee.company}
                  </p>
                </div>
              )}
            </div>

            {/* Preview tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {displayTags.map((tag, i) => {
                  const tagTheme = getThemeForSubcategory(tag) || theme;
                  return (
                    <span
                      key={`${tag}-${i}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
                      style={{ backgroundColor: tagTheme.tint, color: tagTheme.main }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Hover/Tap indicator */}
            <div className="absolute bottom-4 left-6 right-6 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>{isMobile ? "Tap to reveal AI insights" : "Hover to reveal AI insights"}</span>
              </p>
            </div>
          </div>

          {/* BACK of card */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6",
              "bg-white",
              "border-2",
              "shadow-xl",
              "overflow-y-auto scroll-smooth",
              "scrollbar-hide"
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderColor: theme.main,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* AI Summary header */}
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
                AI Profile Insights
              </h4>
            </div>

            {/* AI Summary bullets */}
            {attendee.ai_summary ? (
              <div className="space-y-3 mb-4">
                {attendee.ai_summary.split("\n").map((bullet, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-black"
                    />
                    <p className="text-sm text-gray-900 leading-relaxed font-medium">
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

            {/* Expertise tags */}
            {displayTags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag, i) => {
                    const tagTheme = getThemeForSubcategory(tag) || theme;
                    return (
                      <span
                        key={`${tag}-back-${i}`}
                        className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
                        style={{ backgroundColor: tagTheme.tint, color: tagTheme.main }}
                      >
                        {tag}
                      </span>
                    );
                  })}
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
                  "inline-flex items-center justify-center space-x-2",
                  "px-4 py-2 rounded-full text-sm font-semibold",
                  "bg-[#0A66C2] text-white",
                  "hover:bg-[#004182] transition-colors"
                )}
              >
                <Linkedin className="w-4 h-4" />
                <span>Connect on LinkedIn</span>
              </a>
            )}

            {/* Mobile flip-back button */}
            {isMobile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className={cn(
                  "mt-4 w-full py-3 rounded-xl text-sm font-medium",
                  "bg-gray-100 text-gray-600",
                  "active:bg-gray-200 transition-colors",
                  "flex items-center justify-center gap-2"
                )}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tap to flip back</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
