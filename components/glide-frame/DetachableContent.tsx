"use client";

import { useState, useRef, useCallback, ReactNode, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { ExternalLink, Minimize2 } from "lucide-react";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { HeaderStyleOptions, FrameStyleOptions } from "./types";
import { cn } from "@/lib/utils";

// Global z-index manager for focus
let globalZIndex = 10000;
const getNextZIndex = () => ++globalZIndex;

// Global state store for detachable content with sync support
const detachableStateStore = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function subscribeToStore(id: string, callback: () => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(callback);
  return () => listeners.get(id)!.delete(callback);
}

function getStoreSnapshot<T>(id: string, initialValue: T): T {
  const stored = detachableStateStore.get(id);
  return stored !== undefined ? (stored as T) : initialValue;
}

function setStoreValue<T>(id: string, value: T) {
  detachableStateStore.set(id, value);
  listeners.get(id)?.forEach(cb => cb());
}

export function useDetachableState<T>(id: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize store if not exists
  useEffect(() => {
    if (!detachableStateStore.has(id)) {
      detachableStateStore.set(id, initialValue);
    }
  }, [id, initialValue]);

  const value = useSyncExternalStore(
    (cb) => subscribeToStore(id, cb),
    () => getStoreSnapshot(id, initialValue),
    () => initialValue
  );

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const current = getStoreSnapshot(id, initialValue);
    const resolved = typeof newValue === 'function' ? (newValue as (prev: T) => T)(current) : newValue;
    setStoreValue(id, resolved);
  }, [id, initialValue]);

  return [value, setValue];
}

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
  /** Lock aspect ratio during resize */
  lockAspectRatio?: boolean;
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
  lockAspectRatio = false,
}: DetachableContentProps) {
  const [isDetached, setIsDetached] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [originalRect, setOriginalRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 480, height: 320 });
  const [aspectRatio, setAspectRatio] = useState<number | false>(false);
  const [zIndex, setZIndex] = useState(10000);
  const [mounted, setMounted] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  const headerHeight = headerStyle?.height || DEFAULT_HEADER_HEIGHT;

  // Client-side mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring to front on focus/click
  const bringToFront = useCallback(() => {
    setZIndex(getNextZIndex());
  }, []);

  const handleDetach = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setOriginalRect(rect);

      // Responsive sizing - fit within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;

      const maxWidth = viewportWidth - 40;
      const maxHeight = viewportHeight - 100;

      const width = isMobile
        ? Math.min(rect.width, maxWidth)
        : Math.min(Math.max(rect.width, 400), maxWidth);
      const height = Math.min(rect.height + headerHeight, maxHeight);

      if (lockAspectRatio) {
        setAspectRatio(width / height);
      }

      setPosition({ x: 20, y: isMobile ? 60 : 80 });
      setSize({ width, height });
    }
    setIsDetached(true);
    bringToFront();
  }, [headerHeight, lockAspectRatio, bringToFront]);

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

  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  const frameStyles = {
    backgroundColor: frameStyle?.backgroundColor,
    borderColor: frameStyle?.borderColor,
    borderWidth: frameStyle?.borderWidth,
    borderRadius: frameStyle?.borderRadius,
    boxShadow: frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  };

  // CRITICAL: Children must NEVER be unmounted/remounted to preserve iframe state
  // Solution: Render children ONCE in a portal, control position with CSS
  // When inline: position over placeholder | When floating: use Rnd position

  // Track inline placeholder position for overlay mode
  const [inlineRect, setInlineRect] = useState<DOMRect | null>(null);

  // Update inline position on scroll/resize when not detached
  useEffect(() => {
    if (isDetached || !contentRef.current) return;

    const updateRect = () => {
      if (contentRef.current) {
        setInlineRect(contentRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    // Also use ResizeObserver for container size changes
    const observer = new ResizeObserver(updateRect);
    observer.observe(contentRef.current);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      observer.disconnect();
    };
  }, [isDetached]);

  // SOLUTION: Always render Rnd with children, but position it either:
  // - Over inline placeholder (when !isDetached)
  // - At floating position (when isDetached)
  // This ensures children are NEVER unmounted

  // Calculate current position and size based on mode
  const currentPosition = isDetached ? position : { x: inlineRect?.left || 0, y: inlineRect?.top || 0 };
  const currentSize = isDetached
    ? size
    : { width: inlineRect?.width || 400, height: inlineRect?.height || 300 };

  // Single content portal - Rnd ALWAYS contains children, never conditional
  const contentPortal = mounted && createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: isDetached ? zIndex : 1,
      }}
    >
      <Rnd
        position={currentPosition}
        size={currentSize}
        lockAspectRatio={isDetached ? aspectRatio : false}
        onDragStart={bringToFront}
        onDragStop={(_, d) => {
          if (isDetached && !isMaximized) setPosition({ x: d.x, y: d.y });
        }}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (isDetached && !isMaximized) {
            setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPosition(pos);
          }
        }}
        onMouseDown={bringToFront}
        minWidth={isDetached ? Math.min(280, typeof window !== "undefined" ? window.innerWidth - 40 : 280) : undefined}
        minHeight={isDetached ? 180 : undefined}
        bounds={isDetached ? "window" : undefined}
        dragHandleClassName="detachable-frame-handle"
        cancel=".glide-frame-button"
        disableDragging={!isDetached || isMaximized}
        enableResizing={isDetached && !isMaximized}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          style={{
            ...(isDetached ? frameStyles : {}),
            borderStyle: isDetached && frameStyle?.borderWidth ? "solid" : undefined,
            height: '100%',
          }}
          className={cn(
            "flex flex-col overflow-hidden",
            isDetached && "border border-border",
            isDetached && !frameStyle?.borderRadius && "rounded-lg",
            isDetached && frameStyle?.className
          )}
        >
          {/* Header - only visible when detached */}
          {isDetached && (
            <div className="detachable-frame-handle shrink-0">
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
          )}
          {/* Content - ALWAYS rendered, never conditional */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </Rnd>
    </div>,
    document.body
  );

  return (
    <>
      {/* Inline placeholder - maintains layout space and hosts hover button */}
      <div
        ref={contentRef}
        className={cn("relative group", className)}
        style={isDetached ? { display: 'none' } : undefined}
      >
        {/* Spacer div - same size as content but invisible (content is in portal) */}
        <div
          className="w-full pointer-events-none"
          style={{
            aspectRatio: originalRect ? `${originalRect.width} / ${originalRect.height}` : undefined,
            minHeight: originalRect?.height || 200,
          }}
        />
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

      {/* Placeholder when detached */}
      {isDetached && originalRect && (
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

      {/* Content portal - children rendered ONCE, position controlled by CSS */}
      {contentPortal}
    </>
  );
}

