"use client";

import { useState, useEffect, type RefObject } from "react";

export function useStickyHeaderShadow(scrollRef: RefObject<HTMLElement | null>) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setIsScrolled(el.scrollTop > 0);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  return isScrolled;
}
