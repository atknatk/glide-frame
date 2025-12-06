"use client";

import { useCallback, useRef } from "react";
import { Maximize2, X, RotateCcw } from "lucide-react";
import { GlideFrameHeaderProps } from "./types";
import { cn } from "@/lib/utils";

const DEFAULT_HEADER_HEIGHT = 44;

export function GlideFrameHeader({
  title,
  isDocked,
  isMaximized,
  onMaximize,
  onRestore,
  onClose,
  styleOptions,
}: GlideFrameHeaderProps) {
  const showRestore = isDocked || isMaximized;
  const lastTapRef = useRef<number>(0);

  // Destructure style options with defaults
  const {
    backgroundColor,
    textColor,
    buttonColor,
    buttonHoverColor,
    height = DEFAULT_HEADER_HEIGHT,
    showMaximize = true,
    showClose = true,
    className: headerClassName,
    style: headerStyle,
  } = styleOptions || {};

  // Double tap to maximize/restore on mobile
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (isMaximized || isDocked) {
        onRestore();
      } else if (showMaximize) {
        onMaximize();
      }
    }
    lastTapRef.current = now;
  }, [isMaximized, isDocked, onMaximize, onRestore, showMaximize]);

  // Button style with custom colors
  const buttonStyle = buttonColor ? { color: buttonColor } : undefined;
  const buttonClassName = cn(
    "glide-frame-button",
    "p-1.5 rounded-md",
    "transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
    !buttonColor && "text-muted-foreground",
    !buttonHoverColor && "hover:text-foreground hover:bg-accent"
  );

  return (
    <div
      onTouchEnd={handleDoubleTap}
      onDoubleClick={() => {
        if (isMaximized || isDocked) {
          onRestore();
        } else if (showMaximize) {
          onMaximize();
        }
      }}
      style={{
        height,
        background: backgroundColor,
        color: textColor,
        ...headerStyle,
      }}
      className={cn(
        "flex items-center justify-between px-3",
        !backgroundColor && "bg-background/80 backdrop-blur-sm",
        "border-b border-border/50",
        "select-none touch-manipulation",
        !isMaximized && !isDocked && "cursor-grab active:cursor-grabbing",
        headerClassName
      )}
    >
      {/* Title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className={cn(
            "text-sm font-medium truncate",
            !textColor && "text-foreground"
          )}
        >
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
              e.preventDefault();
              onRestore();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={buttonStyle}
            className={buttonClassName}
            aria-label="Restore"
            title="Restore"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* Maximize Button - hidden when maximized or docked */}
        {showMaximize && !isMaximized && !isDocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onMaximize();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={buttonStyle}
            className={buttonClassName}
            aria-label="Maximize"
            title="Maximize"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Close Button */}
        {showClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={buttonStyle}
            className={cn(
              buttonClassName,
              !buttonColor && "hover:text-destructive hover:bg-destructive/10"
            )}
            aria-label="Close"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

