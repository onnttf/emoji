"use client";
import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the props interface for the EmojiCard component
interface EmojiCardProps {
  emoji: {
    char: string;
    name: string;
  };
}

// Define tooltip states
type TooltipState = {
  isOpen: boolean;
  content: string;
};

// Constants for tooltip content and timing
const TOOLTIP_INITIAL = "Click to copy";
const TOOLTIP_COPIED = "Copied!";
const TOOLTIP_DELAY = 2000;
const TOOLTIP_RESET_DELAY = 2100;

export default function EmojiCard({ emoji }: EmojiCardProps) {
  // State for managing tooltip visibility and content
  const [tooltip, setTooltip] = useState<TooltipState>({
    isOpen: false,
    content: TOOLTIP_INITIAL,
  });

  // Function to copy emoji to clipboard and update tooltip
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(emoji.char);
    setTooltip({ isOpen: true, content: TOOLTIP_COPIED });

    // Hide tooltip after a delay
    const timer = setTimeout(() => {
      setTooltip((prev) => ({ ...prev, isOpen: false }));
    }, TOOLTIP_DELAY);

    return () => clearTimeout(timer);
  }, [emoji.char]);

  // Show tooltip on mouse enter
  const handleMouseEnter = useCallback(() => {
    setTooltip((prev) => ({ ...prev, isOpen: true }));
  }, []);

  // Hide tooltip on mouse leave
  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Reset tooltip content after copying
  useEffect(() => {
    if (tooltip.content === TOOLTIP_COPIED) {
      const timer = setTimeout(() => {
        setTooltip((prev) => ({ ...prev, content: TOOLTIP_INITIAL }));
      }, TOOLTIP_RESET_DELAY);

      return () => clearTimeout(timer);
    }
  }, [tooltip.content]);

  return (
    <TooltipProvider>
      <Tooltip open={tooltip.isOpen}>
        <TooltipTrigger asChild>
          <Card
            className="h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors duration-200 relative group"
            onClick={copyToClipboard}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">
              {emoji.char}
            </div>
            <div className="text-xs text-gray-500 text-center px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-2 line-clamp-2">
              {emoji.name}
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip.content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
