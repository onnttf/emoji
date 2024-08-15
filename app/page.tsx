"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import EmojiCard from "@/app/emoji/emoji-card";
import { Input } from "@/components/ui/input";
import emojis from "emoji.json";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUp } from "lucide-react";

interface Emoji {
  char: string;
  name: string;
}

const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 300;
const DEBOUNCE_DELAY = 300;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function EmojiBrowser() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibleEmojis, setVisibleEmojis] = useState<Emoji[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(true);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  const infiniteScrollTrigger = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

  const filteredEmojis = useMemo(
    () =>
      emojis.filter((emoji: Emoji) =>
        emoji.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ),
    [debouncedSearchTerm]
  );

  useEffect(() => {
    setIsDataLoaded(emojis.length > 0);
  }, []);

  useEffect(() => {
    if (!isDataLoaded) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description:
          "Unable to load the emoji list. Please refresh the page or try again later.",
      });
    }
  }, [isDataLoaded, toast]);

  useEffect(() => {
    setVisibleEmojis(filteredEmojis.slice(0, ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [filteredEmojis]);

  const loadMoreEmojis = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newEmojis = filteredEmojis.slice(startIndex, endIndex);

    if (newEmojis.length > 0) {
      setVisibleEmojis((prevEmojis) => [...prevEmojis, ...newEmojis]);
      setCurrentPage(nextPage);
    }
  }, [currentPage, filteredEmojis]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreEmojis();
      },
      { threshold: 1.0 }
    );

    if (infiniteScrollTrigger.current) {
      observer.observe(infiniteScrollTrigger.current);
    }

    return () => observer.disconnect();
  }, [loadMoreEmojis]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTopButton(window.pageYOffset > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Emoji Browser</h1>
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-6"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value)
        }
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-4">
        {visibleEmojis.map((emoji: Emoji) => (
          <EmojiCard key={emoji.char} emoji={emoji} />
        ))}
      </div>

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
