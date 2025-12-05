"use client";

import { useCallback, useRef } from "react";
import { Minimize2, Maximize2, X, RotateCcw } from "lucide-react";
import { GlideFrameHeaderProps } from "./types";
import { cn } from "@/lib/utils";

export function GlideFrameHeader({
  title,
  isMinimized,
  isMaximized,
  onMinimize,
  onMaximize,
  onRestore,
  onClose,
}: GlideFrameHeaderProps) {
  const showRestore = isMinimized || isMaximized;
  const lastTapRef = useRef<number>(0);

  // Double tap to maximize/restore on mobile
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (isMaximized || isMinimized) {
        onRestore();
      } else {
        onMaximize();
      }
    }
    lastTapRef.current = now;
  }, [isMaximized, isMinimized, onMaximize, onRestore]);

  return (
    <div
      onTouchEnd={handleDoubleTap}
      onDoubleClick={() => {
        if (isMaximized || isMinimized) {
          onRestore();
        } else {
          onMaximize();
        }
      }}
      className={cn(
        "flex items-center justify-between px-3 py-2",
        "bg-background/80 backdrop-blur-sm",
        "border-b border-border/50",
        "select-none touch-manipulation",
        !isMaximized && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {title}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        {/* Restore Button - shown when minimized or maximized */}
        {showRestore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            )}
            aria-label="Restore"
            title="Restore"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* Minimize Button - hidden when already minimized */}
        {!isMinimized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            )}
            aria-label="Minimize"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}

        {/* Maximize Button - hidden when already maximized */}
        {!isMaximized && !isMinimized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            )}
            aria-label="Maximize"
            title="Maximize"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "p-1.5 rounded-md",
            "text-muted-foreground hover:text-destructive",
            "hover:bg-destructive/10",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
          aria-label="Close"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

