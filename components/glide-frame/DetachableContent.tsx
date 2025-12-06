"use client";

import { useState, useRef, useCallback, useLayoutEffect, ReactNode } from "react";
import { Rnd } from "react-rnd";
import { ExternalLink, Minimize2 } from "lucide-react";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { HeaderStyleOptions, FrameStyleOptions } from "./types";
import { cn } from "@/lib/utils";

interface DetachableContentProps {
  /** Unique identifier */
  id: string;
  /** Title shown in floating header */
  title: string;
  /** Content to render - will preserve state when detaching */
  children: ReactNode;
  /** Header style options for floating mode */
  headerStyle?: HeaderStyleOptions;
  /** Frame style options for floating mode */
  frameStyle?: FrameStyleOptions;
  /** Position of detach button */
  detachButtonPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Custom class for the container */
  className?: string;
  /** Placeholder style when detached */
  placeholderClassName?: string;
}

const DEFAULT_HEADER_HEIGHT = 44;

export function DetachableContent({
  id,
  title,
  children,
  headerStyle,
  frameStyle,
  detachButtonPosition = "top-right",
  className,
  placeholderClassName,
}: DetachableContentProps) {
  const [isDetached, setIsDetached] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [originalRect, setOriginalRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 480, height: 320 });
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  const headerHeight = headerStyle?.height || DEFAULT_HEADER_HEIGHT;

  const handleDetach = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setOriginalRect(rect);
      // Position at top-left with some padding, not at the original element position
      setPosition({ x: 20, y: 80 });
      setSize({ width: Math.max(rect.width, 400), height: rect.height + headerHeight });
    }
    setIsDetached(true);
  }, [headerHeight]);

  const handleAttach = useCallback(() => {
    setIsDetached(false);
    setIsMaximized(false);
  }, []);

  const handleMaximize = useCallback(() => {
    if (!isMaximized) {
      setPreMaximizeState({ position, size });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    setIsMaximized(true);
  }, [isMaximized, position, size]);

  const handleRestore = useCallback(() => {
    if (isMaximized && preMaximizeState) {
      setPosition(preMaximizeState.position);
      setSize(preMaximizeState.size);
      setIsMaximized(false);
    }
  }, [isMaximized, preMaximizeState]);

  // Button position classes
  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  // Frame styles
  const frameStyles = {
    backgroundColor: frameStyle?.backgroundColor,
    borderColor: frameStyle?.borderColor,
    borderWidth: frameStyle?.borderWidth,
    borderRadius: frameStyle?.borderRadius,
    boxShadow: frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  };

  if (!isDetached) {
    // Inline mode - content with detach button
    return (
      <div ref={contentRef} className={cn("relative group", className)}>
        {children}
        <button
          onClick={handleDetach}
          className={cn(
            "absolute opacity-0 group-hover:opacity-100",
            "p-2 rounded-lg bg-black/70 text-white",
            "hover:bg-black/90 transition-all duration-200",
            "backdrop-blur-sm",
            buttonPositionClasses[detachButtonPosition]
          )}
          title="Pop out to floating window"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Detached/Floating mode
  return (
    <>
      {/* Placeholder to maintain layout */}
      {originalRect && (
        <div
          style={{ width: originalRect.width, height: originalRect.height }}
          className={cn(
            "rounded-lg border-2 border-dashed border-slate-600",
            "bg-slate-800/30 flex items-center justify-center",
            placeholderClassName
          )}
        >
          <button
            onClick={handleAttach}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
            Restore here
          </button>
        </div>
      )}

      {/* Floating frame */}
      <Rnd
        position={position}
        size={size}
        onDragStop={(_, d) => {
          if (!isMaximized) setPosition({ x: d.x, y: d.y });
        }}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!isMaximized) {
            setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPosition(pos);
          }
        }}
        minWidth={280}
        minHeight={200}
        bounds="window"
        dragHandleClassName="detachable-frame-handle"
        cancel=".glide-frame-button"
        disableDragging={isMaximized}
        enableResizing={!isMaximized}
        style={{ zIndex: 9999 }}
      >
        <div
          ref={containerRef}
          style={{
            ...frameStyles,
            borderStyle: frameStyle?.borderWidth ? "solid" : undefined,
          }}
          className={cn(
            "h-full flex flex-col overflow-hidden",
            "bg-background border border-border",
            !frameStyle?.borderRadius && "rounded-lg",
            frameStyle?.className
          )}
        >
          {/* Header */}
          <div className="detachable-frame-handle flex-shrink-0">
            <GlideFrameHeader
              title={title}
              isDocked={false}
              isMaximized={isMaximized}
              onMaximize={handleMaximize}
              onRestore={isMaximized ? handleRestore : handleAttach}
              onClose={handleAttach}
              styleOptions={headerStyle}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </Rnd>
    </>
  );
}

