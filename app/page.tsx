"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import EmojiCard from "@/app/emoji/emoji-card";
import { Input } from "@/components/ui/input";
import emojis from "emoji.json";
import { useToast } from "@/components/ui/use-toast";

// Define Emoji interface
interface Emoji {
  char: string;
  name: string;
}

// Number of emojis to display per page
const ITEMS_PER_PAGE = 50;

// Custom Hook: Debounce input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function: Clear the timer if value changes before the delay has passed
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function EmojiBrowser() {
  // State declarations
  const [search, setSearch] = useState<string>("");
  const [displayedEmojis, setDisplayedEmojis] = useState<Emoji[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isEmojisLoaded, setIsEmojisLoaded] = useState<boolean>(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // Debounce search input
  const debouncedSearch = useDebounce(search, 300);

  // Filter emoji list based on search term
  const filteredEmojis = useMemo(
    () =>
      emojis.filter((emoji: Emoji) =>
        emoji.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [debouncedSearch]
  );

  // Check if emojis are successfully loaded
  useEffect(() => {
    if (emojis.length === 0) {
      setIsEmojisLoaded(false);
    } else {
      setIsEmojisLoaded(true);
    }
  }, []);

  // Display toast notification for loading failure
  useEffect(() => {
    if (!isEmojisLoaded) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description:
          "Unable to load the emoji list. Please refresh the page or try again later.",
      });
    }
  }, [isEmojisLoaded, toast]);

  // Update displayed emoji list
  useEffect(() => {
    setDisplayedEmojis(filteredEmojis.slice(0, ITEMS_PER_PAGE));
    setPage(1);
  }, [filteredEmojis]);

  // Function to load more emojis
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newEmojis = filteredEmojis.slice(startIndex, endIndex);

    if (newEmojis.length > 0) {
      setDisplayedEmojis((prevEmojis) => [...prevEmojis, ...newEmojis]);
      setPage(nextPage);
    }
  }, [page, filteredEmojis]);

  // Set up infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);

    // Cleanup function
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [loadMore]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Emoji Browser</h1>
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-6"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearch(e.target.value)
        }
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-4">
        {displayedEmojis.map((emoji: Emoji) => (
          <EmojiCard key={emoji.char} emoji={emoji} />
        ))}
      </div>

      <div ref={loaderRef} style={{ height: "1px" }} />
    </div>
  );
}
