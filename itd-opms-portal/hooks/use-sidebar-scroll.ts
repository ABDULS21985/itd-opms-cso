"use client";

import { useState, useRef, useCallback } from "react";

export interface SectionPosition {
  title: string;
  ratio: number;
}

export function useSidebarScroll(
  activeSectionTitle: string | null,
  activeItemText: string | null
) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<string | null>(
    activeSectionTitle
  );
  const [currentItem, setCurrentItem] = useState<string | null>(activeItemText);
  const [sectionPositions, setSectionPositions] = useState<SectionPosition[]>(
    []
  );

  const setScrollRef = useCallback((el: HTMLElement | null) => {
    scrollRef.current = el;
  }, []);

  const onScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setScrollProgress(Math.min(1, Math.max(0, progress)));

    // Find section headers by data attribute
    const headers = container.querySelectorAll<HTMLElement>(
      "[data-section-title]"
    );
    if (!headers.length) return;

    // Calculate section positions
    const positions: SectionPosition[] = [];
    let visibleSection: string | null = null;

    headers.forEach((header) => {
      const title = header.getAttribute("data-section-title");
      if (!title) return;

      const rect = header.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      const ratio =
        scrollHeight > 0
          ? (header.offsetTop - container.offsetTop) / scrollHeight
          : 0;

      positions.push({ title, ratio });

      // The last section whose header is at or above the container top is the current section
      if (relativeTop <= 10) {
        visibleSection = title;
      }
    });

    setSectionPositions(positions);

    if (visibleSection) {
      setCurrentSection(visibleSection);
    }

    // Update currentItem based on whether active section is in view
    if (activeSectionTitle && visibleSection !== activeSectionTitle) {
      setCurrentItem(activeItemText);
    } else {
      setCurrentItem(activeItemText);
    }
  }, [activeSectionTitle, activeItemText]);

  const scrollToSection = useCallback((title: string) => {
    const container = scrollRef.current;
    if (!container) return;

    const header = container.querySelector<HTMLElement>(
      `[data-section-title="${CSS.escape(title)}"]`
    );
    if (header) {
      header.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return {
    currentSection,
    currentItem,
    scrollProgress,
    sectionPositions,
    scrollToSection,
    setScrollRef,
    onScroll,
  };
}
