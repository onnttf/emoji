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

// Fetch emojis based on search term
async function fetchEmojis(
  searchTerm: string,
  toast: ReturnType<typeof useToast>["toast"]
): Promise<Emoji[]> {
  if (searchTerm.trim() === "") {
    return emojis;
  } else {
    try {
      const response = await fetch(`/api/suggestion?query=${searchTerm}`);
      if (!response.ok) {
        throw new Error(
          `Unable to fetch emojis. Server responded with status: ${response.status}`
        );
      }
      const data = await response.json();
      if (!Array.isArray(data.emojis)) {
        throw new Error("Invalid data format received from server");
      }
      return data.emojis;
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof Response) {
        errorMessage = `Network response was not ok (${error.status})`;
      }
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: errorMessage,
      });
      throw error;
    }
  }
}

// Main component for Emoji Browser
export default function EmojiBrowser() {
  // State for search and emoji display
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibleEmojis, setVisibleEmojis] = useState<Emoji[]>(emojis);
  const [displayedEmojis, setDisplayedEmojis] = useState<Emoji[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs and hooks
  const infiniteScrollTrigger = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { showScrollTopButton, scrollToTop } = useScrollToTop(SCROLL_THRESHOLD);

  // Initialize displayed emojis on visible emojis change
  useEffect(() => {
    setDisplayedEmojis(visibleEmojis.slice(0, ITEMS_PER_PAGE));
  }, [visibleEmojis]);

  // Load more emojis for infinite scroll
  const loadMoreEmojis = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newEmojis = visibleEmojis.slice(startIndex, endIndex);

    if (newEmojis.length > 0) {
      setDisplayedEmojis((prevEmojis) => [...prevEmojis, ...newEmojis]);
      setCurrentPage(nextPage);
    }
  }, [currentPage, visibleEmojis]);

  // Set up intersection observer for infinite scroll
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

  // Handle search functionality
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await fetchEmojis(searchTerm, toast);
      setVisibleEmojis(results);
      setCurrentPage(1);
      if (results.length === 0) {
        toast({
          title: "No results found",
          description: `No emojis match "${searchTerm}". Try a different search term.`,
          duration: 3000,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("An unexpected error occurred")
      );
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Unable to perform the search. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, toast]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      if (e.target.value.trim() === "") {
        setVisibleEmojis(emojis);
        setCurrentPage(1);
      }
    },
    []
  );

  // Handle Enter key press for search
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
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
      {isLoading && (
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
      {!isLoading &&
        !error &&
        searchTerm.trim() !== "" &&
        displayedEmojis.length === 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Results</AlertTitle>
            <AlertDescription>
              No emojis found for {`"${searchTerm}"`}. Try a different search term or clear the search to see all emojis.
            </AlertDescription>
          </Alert>
        )}

      {/* Emoji grid */}
      {!isLoading && !error && displayedEmojis.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-6 gap-y-4">
          {displayedEmojis.map((emoji: Emoji) => (
            <EmojiCard key={emoji.char} emoji={emoji} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={infiniteScrollTrigger} style={{ height: "1px" }} />

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
