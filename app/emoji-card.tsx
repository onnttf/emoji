"use client";

import React, { useCallback, useState, useMemo } from "react";
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

// Constants for tooltip content and timing
const TOOLTIP_DELAY = 2000;
const INITIAL_TOOLTIP_STATE = { content: "Click to copy", isOpen: false };

function EmojiCard({ emoji }: EmojiCardProps) {
  const [tooltipState, setTooltipState] = useState(INITIAL_TOOLTIP_STATE);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(emoji.char);
    setTooltipState({ content: "Copied!", isOpen: true });

    const timer1 = setTimeout(() => {
      setTooltipState((prev) => ({ ...prev, isOpen: false }));
      const timer2 = setTimeout(() => 
        setTooltipState(INITIAL_TOOLTIP_STATE),
        100
      );
      return () => clearTimeout(timer2);
    }, TOOLTIP_DELAY);
    return () => clearTimeout(timer1);
  }, [emoji.char]);

  const handleMouseEnter = useCallback(() => 
    setTooltipState((prev) => ({ ...prev, isOpen: true })),
    []
  );
  
  const handleMouseLeave = useCallback(() => 
    setTooltipState((prev) => ({ ...prev, isOpen: false })),
    []
  );

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
    [emoji.char, emoji.name],
  );

  return (
    <TooltipProvider>
      <Tooltip open={tooltipState.isOpen}>
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
          <p>{tooltipState.content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default React.memo(EmojiCard);
