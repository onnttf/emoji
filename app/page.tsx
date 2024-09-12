"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmojiCard from "@/app/emoji-card";
import { Input } from "@/components/ui/input";
import emojis from "emoji.json";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUp, Loader2 } from "lucide-react";
import { useQuery } from 'react-query';
import { debounce } from 'lodash';

interface Emoji {
  char: string;
  name: string;
}

const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 300;

function useScrollToTop(threshold: number) {
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTopButton(window.pageYOffset > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { showScrollTopButton, scrollToTop };
}

export default function EmojiBrowser() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibleEmojis, setVisibleEmojis] = useState<Emoji[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const infiniteScrollTrigger = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { showScrollTopButton, scrollToTop } = useScrollToTop(SCROLL_THRESHOLD);

  // Create a debounced search term setter
  const debouncedSetSearchTerm = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
      setIsSearching(true);
    }, 300),
    []
  );

  // Modified query to fetch emojis based on search term
  const { data: fetchedEmojis, isLoading, error } = useQuery(
    ['emojis', searchTerm],
    async () => {
      if (searchTerm.trim() === '') {
        // If search term is empty, return all emojis
        return emojis;
      } else {
        // Otherwise, fetch filtered emojis from API
        const response = await fetch(`/api/suggestion?query=${searchTerm}`);
        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description:
              "Unable to load the emoji list. Please refresh the page or try again later.",
          });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data.emojis) ? data.emojis : [];
      }
    },
    {
      keepPreviousData: true,
      onSettled: () => setIsSearching(false),
    }
  );

  // Update visibleEmojis when fetchedEmojis changes
  useEffect(() => {
    if (fetchedEmojis) {
      setVisibleEmojis(fetchedEmojis.slice(0, ITEMS_PER_PAGE));
      setCurrentPage(1);
    }
  }, [fetchedEmojis]);

  useEffect(() => {
    if (emojis.length === 0) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description:
          "Unable to load the emoji list. Please refresh the page or try again later.",
      });
    }
  }, [toast]);

  const loadMoreEmojis = useCallback(() => {
    if (!fetchedEmojis) return;

    const nextPage = currentPage + 1;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newEmojis = fetchedEmojis.slice(startIndex, endIndex);

    if (newEmojis.length > 0) {
      setVisibleEmojis((prevEmojis) => [...prevEmojis, ...newEmojis]);
      setCurrentPage(nextPage);
    }
  }, [currentPage, fetchedEmojis]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreEmojis();
      },
      { threshold: 1.0 }
    );

    const currentTrigger = infiniteScrollTrigger.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => {
      if (currentTrigger) {
        observer.unobserve(currentTrigger);
      }
    };
  }, [loadMoreEmojis]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      debouncedSetSearchTerm(value);
    },
    [debouncedSetSearchTerm]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Emoji Browser</h1>
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-6"
        onChange={(e) => debouncedSetSearchTerm(e.target.value)}
      />

      {(isLoading || isSearching) && (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {error instanceof Error && (
        <div className="text-red-500 text-center mb-4">
          {error.message || "Error loading emojis. Please try again."}
        </div>
      )}

      {!isLoading && !isSearching && !error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-4">
          {visibleEmojis.map((emoji: Emoji) => (
            <EmojiCard key={emoji.char} emoji={emoji} />
          ))}
        </div>
      )}

      <div ref={infiniteScrollTrigger} style={{ height: "1px" }} />

      {showScrollTopButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
