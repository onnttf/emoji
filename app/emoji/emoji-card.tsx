"use client";
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react";
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
const TOOLTIP_DELAY = 2000;
const TOOLTIP_RESET_DELAY = 2100;

const TOOLTIP_STATES = {
  INITIAL: { content: "Click to copy", isOpen: false },
  COPIED: { content: "Copied!", isOpen: true },
};

type TooltipAction =
  | { type: "SHOW_INITIAL" }
  | { type: "SHOW_COPIED" }
  | { type: "HIDE" };

function tooltipReducer(
  state: TooltipState,
  action: TooltipAction
): TooltipState {
  switch (action.type) {
    case "SHOW_INITIAL":
      return { ...TOOLTIP_STATES.INITIAL, isOpen: true };
    case "SHOW_COPIED":
      return TOOLTIP_STATES.COPIED;
    case "HIDE":
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

function EmojiCard({ emoji }: EmojiCardProps) {
  // State for managing tooltip visibility and content
  const [tooltip, dispatchTooltip] = useReducer(
    tooltipReducer,
    TOOLTIP_STATES.INITIAL
  );

  // Function to copy emoji to clipboard and update tooltip
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(emoji.char);
    dispatchTooltip({ type: "SHOW_COPIED" });

    const timer = setTimeout(() => {
      dispatchTooltip({ type: "HIDE" });
    }, TOOLTIP_DELAY);

    return () => clearTimeout(timer);
  }, [emoji.char]);

  // Show tooltip on mouse enter
  const handleMouseEnter = useCallback(
    () => dispatchTooltip({ type: "SHOW_INITIAL" }),
    []
  );

  // Hide tooltip on mouse leave
  const handleMouseLeave = useCallback(
    () => dispatchTooltip({ type: "HIDE" }),
    []
  );

  // Reset tooltip content after copying
  useEffect(() => {
    if (tooltip.content === TOOLTIP_STATES.COPIED.content) {
      const timer = setTimeout(() => {
        dispatchTooltip({ type: "SHOW_INITIAL" });
      }, TOOLTIP_RESET_DELAY);

      return () => clearTimeout(timer);
    }
  }, [tooltip.content]);

  // Memoize the emoji content
  const emojiContent = useMemo(
    () => (
      <>
        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">
          {emoji.char}
        </div>
        <div className="text-xs text-gray-500 text-center px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-2 line-clamp-2">
          {emoji.name}
        </div>
      </>
    ),
    [emoji.char, emoji.name]
  );

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
            {emojiContent}
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip.content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default React.memo(EmojiCard);
