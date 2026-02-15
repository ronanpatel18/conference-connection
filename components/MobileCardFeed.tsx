"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { NetworkAttendee } from "@/types/database.types";
import AttendeeCard from "@/components/AttendeeCard";

interface MobileCardFeedProps {
  attendees: NetworkAttendee[];
}

export default function MobileCardFeed({ attendees }: MobileCardFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Refs for direct DOM manipulation of card scale/opacity (avoids React re-renders)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Multi-threshold IntersectionObserver for scroll-driven scale + opacity
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(
            (entry.target as HTMLElement).dataset.cardIndex
          );
          const ratio = entry.intersectionRatio;

          // Directly update DOM for smooth scroll-driven animations
          const cardEl = cardRefs.current.get(idx);
          if (cardEl) {
            const scale = 0.92 + ratio * 0.08;
            const opacity = 0.4 + ratio * 0.6;
            cardEl.style.transform = `scale(${scale})`;
            cardEl.style.opacity = `${opacity}`;
          }

          if (entry.isIntersecting && ratio > 0.5) {
            setActiveIndex(idx);
          }
        });
      },
      {
        root: container,
        threshold: thresholds,
      }
    );

    const cards = container.querySelectorAll("[data-card-index]");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [attendees]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const target = container.querySelector(
        `[data-card-index="${index}"]`
      ) as HTMLElement;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  return (
    <div className="fixed inset-0 top-16 bg-gray-50 z-40 flex flex-col">
      {/* Progress bar */}
      <div className="relative h-1 bg-gray-200 flex-shrink-0">
        <motion.div
          className="absolute left-0 top-0 h-full bg-badger-red"
          animate={{
            width: `${((activeIndex + 1) / attendees.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between px-5 py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-medium text-gray-500">
          {activeIndex + 1} of {attendees.length}
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="p-1 rounded-full text-gray-400 disabled:opacity-30 active:bg-gray-100"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              scrollToIndex(Math.min(attendees.length - 1, activeIndex + 1))
            }
            disabled={activeIndex === attendees.length - 1}
            className="p-1 rounded-full text-gray-400 disabled:opacity-30 active:bg-gray-100"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snap-scroll container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        {attendees.map((attendee, index) => (
          <div
            key={attendee.id}
            data-card-index={index}
            ref={(el) => {
              if (el) cardRefs.current.set(index, el);
              else cardRefs.current.delete(index);
            }}
            className="snap-start snap-always w-full card-slot-height px-4 py-3 flex items-center"
            style={{
              transition: "transform 0.15s ease-out, opacity 0.15s ease-out",
              willChange: "transform, opacity",
            }}
          >
            <div className="w-full h-[280px]">
              <AttendeeCard attendee={attendee} index={index} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
