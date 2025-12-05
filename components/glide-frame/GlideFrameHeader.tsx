"use client";

import { useCallback, useRef } from "react";
import { Maximize2, X, RotateCcw, PanelLeftClose, PanelRightClose } from "lucide-react";
import { GlideFrameHeaderProps } from "./types";
import { cn } from "@/lib/utils";

export function GlideFrameHeader({
  title,
  isDocked,
  isMaximized,
  onDockLeft,
  onDockRight,
  onMaximize,
  onRestore,
  onClose,
}: GlideFrameHeaderProps) {
  const showRestore = isDocked || isMaximized;
  const lastTapRef = useRef<number>(0);

  // Double tap to maximize/restore on mobile
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (isMaximized || isDocked) {
        onRestore();
      } else {
        onMaximize();
      }
    }
    lastTapRef.current = now;
  }, [isMaximized, isDocked, onMaximize, onRestore]);

  return (
    <div
      onTouchEnd={handleDoubleTap}
      onDoubleClick={() => {
        if (isMaximized || isDocked) {
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
        !isMaximized && !isDocked && "cursor-grab active:cursor-grabbing"
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
        {/* Restore Button - shown when docked or maximized */}
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

        {/* Dock Left Button - hidden when docked */}
        {!isDocked && !isMaximized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDockLeft();
            }}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            )}
            aria-label="Dock Left"
            title="Dock Left"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}

        {/* Dock Right Button - hidden when docked */}
        {!isDocked && !isMaximized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDockRight();
            }}
            className={cn(
              "p-1.5 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            )}
            aria-label="Dock Right"
            title="Dock Right"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}

        {/* Maximize Button - hidden when maximized or docked */}
        {!isMaximized && !isDocked && (
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

