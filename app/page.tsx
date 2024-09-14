"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmojiCard from "@/app/emoji-card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import emojis from "emoji.json";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUp, Loader2, AlertCircle, X } from "lucide-react";

// Constants for pagination and scroll behavior
const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 300;

// Emoji interface definition
interface Emoji {
  char: string;
  name: string;
}

// Custom hook for scroll-to-top functionality
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

// Modify the fetchEmojis function to support streaming
async function* streamEmojis(
  searchTerm: string,
  signal: AbortSignal
): AsyncGenerator<Emoji[], void, undefined> {
  const response = await fetch(`/api/suggestion?query=${encodeURIComponent(searchTerm)}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported");
  }

  const decoder = new TextDecoder("utf-8");
  let emojiBatch: Emoji[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });

    try {
      const emojiObject = JSON.parse(chunk);
      emojiBatch.push(emojiObject);
      if (emojiBatch.length >= 1) {
        yield emojiBatch;
        emojiBatch = [];
      }
    } catch (e) {
      console.error(`Error parsing JSON: ${e instanceof Error ? e.message : String(e)}. Problematic JSON string: ${chunk}`);
    }
  }

  if (emojiBatch.length > 0) {
    yield emojiBatch;
  }
}

// Main component for Emoji Browser
export default function EmojiBrowser() {
  // State for search and emoji display
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibleEmojis, setVisibleEmojis] = useState<Emoji[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [seenEmojis, setSeenEmojis] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [error, setError] = useState<Error | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'completed'>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs and hooks
  const infiniteScrollTrigger = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { showScrollTopButton, scrollToTop } = useScrollToTop(SCROLL_THRESHOLD);

  // Load initial emojis
  useEffect(() => {
    setVisibleEmojis(emojis.slice(0, ITEMS_PER_PAGE));
    setHasMore(emojis.length > ITEMS_PER_PAGE);
  }, []);

  // Function to load more emojis
  const loadMoreEmojis = useCallback(() => {
    const nextPage = currentPage + 1;
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newEmojis = emojis.slice(start, end);

    setVisibleEmojis(prev => [...prev, ...newEmojis]);
    setCurrentPage(nextPage);
    setHasMore(end < emojis.length);
  }, [currentPage]);

  // Add an intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && searchTerm.trim() === "") {
          loadMoreEmojis();
        }
      },
      { threshold: 1.0 }
    );

    if (infiniteScrollTrigger.current) {
      observer.observe(infiniteScrollTrigger.current);
    }

    return () => observer.disconnect();
  }, [loadMoreEmojis, hasMore, searchTerm]);

  // Modify the handleSearch function to support streaming
  const handleSearch = useCallback(async () => {
    setError(null);
    setSearchStatus('searching');
    setVisibleEmojis([]);
    setCurrentPage(1);
    setSeenEmojis(new Set());

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const stream = streamEmojis(searchTerm, abortControllerRef.current.signal);
      for await (const chunk of stream) {
        setVisibleEmojis(prevEmojis => {
          const newEmojis = chunk.filter(emoji => !seenEmojis.has(emoji.char));
          setSeenEmojis(prevSet => {
            const newSet = new Set(prevSet);
            newEmojis.forEach(emoji => newSet.add(emoji.char));
            return newSet;
          });
          return [...prevEmojis, ...newEmojis];
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err : new Error("An unexpected error occurred"));
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Unable to perform the search. Please try again later.",
      });
    } finally {
      setSearchStatus('completed');
    }
  }, [searchTerm, toast, seenEmojis]);

  // Modify handleSearchChange
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      if (e.target.value.trim() === "") {
        setVisibleEmojis(emojis.slice(0, ITEMS_PER_PAGE));
        setCurrentPage(1);
        setHasMore(emojis.length > ITEMS_PER_PAGE);
      }
    },
    []
  );

  // Handle Enter key press for search
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 检查是否正在使用输入法编辑器
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Emoji Browser</h1>

      {/* Search input with clear button */}
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search emojis with Enter..."
          className="mb-6"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyPress}
          aria-label="Search for emojis"
        />
        {searchTerm && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => {
              setSearchTerm("");
              setVisibleEmojis(emojis);
              setCurrentPage(1);
            }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {searchStatus === 'searching' && visibleEmojis.length === 0 && (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message ||
              "An unexpected error occurred while loading emojis. Please try again later."}
          </AlertDescription>
        </Alert>
      )}

      {/* No results message */}
      {searchStatus === 'completed' &&
        !error &&
        searchTerm.trim() !== "" &&
        visibleEmojis.length === 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Results</AlertTitle>
            <AlertDescription>
              No emojis found for {`"${searchTerm}"`}. Try a different search term or clear the search to see all emojis.
            </AlertDescription>
          </Alert>
        )}

      {/* Emoji grid */}
      {!error && visibleEmojis.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-4">
          {visibleEmojis.map((emoji: Emoji) => (
            <EmojiCard key={`${emoji.char}-${emoji.name}`} emoji={emoji} />
          ))}
        </div>
      )}

      {/* Show "Loading more..." indicator if loading more default emojis */}
      {/* {hasMore && searchTerm.trim() === "" && (
        <div className="flex justify-center items-center h-16 mt-4">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading more...</span>
        </div>
      )} */}

      {/* Show "Loading more..." indicator if still searching and some emojis are already displayed */}
      {searchStatus === 'searching' && visibleEmojis.length > 0 && searchTerm.trim() !== "" && (
        <div className="flex justify-center items-center h-16 mt-4">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading more...</span>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && <div ref={infiniteScrollTrigger} style={{ height: "1px" }} />}

      {/* Scroll to top button */}
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
