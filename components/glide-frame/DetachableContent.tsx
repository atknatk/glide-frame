"use client";

import { useState, useRef, useCallback, ReactNode, useEffect, useSyncExternalStore, createContext, useContext } from "react";
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

// ============================================================================
// Detached Content Provider - keeps floating content alive across navigation
// ============================================================================

interface DetachedItem {
  id: string;
  title: string;
  content: ReactNode;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMaximized: boolean;
  preMaximizeState: { position: { x: number; y: number }; size: { width: number; height: number } } | null;
  aspectRatio: number | false;
  onAttach: () => void;
}

interface DetachedContentContextValue {
  detachedItems: Map<string, DetachedItem>;
  detachContent: (item: DetachedItem) => void;
  attachContent: (id: string) => void;
  updateItem: (id: string, updates: Partial<DetachedItem>) => void;
  isDetached: (id: string) => boolean;
}

const DetachedContentContext = createContext<DetachedContentContextValue | null>(null);

export function useDetachedContent() {
  return useContext(DetachedContentContext);
}

export function DetachedContentProvider({ children }: { children: ReactNode }) {
  const [detachedItems, setDetachedItems] = useState<Map<string, DetachedItem>>(new Map());

  const detachContent = useCallback((item: DetachedItem) => {
    setDetachedItems(prev => {
      const next = new Map(prev);
      next.set(item.id, item);
      return next;
    });
  }, []);

  const attachContent = useCallback((id: string) => {
    setDetachedItems(prev => {
      const item = prev.get(id);
      if (item) {
        item.onAttach();
      }
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<DetachedItem>) => {
    setDetachedItems(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, ...updates });
      return next;
    });
  }, []);

  const isDetached = useCallback((id: string) => {
    return detachedItems.has(id);
  }, [detachedItems]);

  return (
    <DetachedContentContext.Provider value={{ detachedItems, detachContent, attachContent, updateItem, isDetached }}>
      {children}
      <DetachedContentRenderer />
    </DetachedContentContext.Provider>
  );
}

// Renders all detached floating windows via portal
function DetachedContentRenderer() {
  const context = useDetachedContent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!context || !mounted) return null;

  const { detachedItems, attachContent, updateItem } = context;

  return createPortal(
    <>
      {Array.from(detachedItems.values()).map((item) => (
        <FloatingWindow
          key={item.id}
          item={item}
          onAttach={() => attachContent(item.id)}
          onUpdate={(updates) => updateItem(item.id, updates)}
        />
      ))}
    </>,
    document.body
  );
}

// Floating window component for detached content
function FloatingWindow({
  item,
  onAttach,
  onUpdate,
}: {
  item: DetachedItem;
  onAttach: () => void;
  onUpdate: (updates: Partial<DetachedItem>) => void;
}) {
  const bringToFront = useCallback(() => {
    onUpdate({ zIndex: getNextZIndex() });
  }, [onUpdate]);

  const handleMaximize = useCallback(() => {
    if (!item.isMaximized) {
      onUpdate({
        preMaximizeState: { position: item.position, size: item.size },
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        isMaximized: true,
      });
    }
  }, [item, onUpdate]);

  const handleRestore = useCallback(() => {
    if (item.isMaximized && item.preMaximizeState) {
      onUpdate({
        position: item.preMaximizeState.position,
        size: item.preMaximizeState.size,
        isMaximized: false,
      });
    }
  }, [item, onUpdate]);

  const frameStyles = {
    backgroundColor: item.frameStyle?.backgroundColor,
    borderColor: item.frameStyle?.borderColor,
    borderWidth: item.frameStyle?.borderWidth,
    borderRadius: item.frameStyle?.borderRadius,
    boxShadow: item.frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: item.zIndex,
      }}
    >
      <Rnd
        position={item.position}
        size={item.size}
        lockAspectRatio={item.aspectRatio}
        onDragStart={bringToFront}
        onDragStop={(_, d) => {
          if (!item.isMaximized) onUpdate({ position: { x: d.x, y: d.y } });
        }}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!item.isMaximized) {
            onUpdate({
              size: { width: ref.offsetWidth, height: ref.offsetHeight },
              position: pos,
            });
          }
        }}
        onMouseDown={bringToFront}
        minWidth={Math.min(280, typeof window !== "undefined" ? window.innerWidth - 40 : 280)}
        minHeight={180}
        bounds="window"
        dragHandleClassName="detachable-frame-handle"
        cancel=".glide-frame-button"
        disableDragging={item.isMaximized}
        enableResizing={!item.isMaximized}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          style={{
            ...frameStyles,
            borderStyle: item.frameStyle?.borderWidth ? "solid" : undefined,
          }}
          className={cn(
            "h-full flex flex-col overflow-hidden",
            "border border-border",
            !item.frameStyle?.borderRadius && "rounded-lg",
            item.frameStyle?.className
          )}
        >
          <div className="detachable-frame-handle shrink-0">
            <GlideFrameHeader
              title={item.title}
              isDocked={false}
              isMaximized={item.isMaximized}
              onMaximize={handleMaximize}
              onRestore={item.isMaximized ? handleRestore : onAttach}
              onClose={onAttach}
              styleOptions={item.headerStyle}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            {item.content}
          </div>
        </div>
      </Rnd>
    </div>
  );
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
  /** Position of detach button when inside (overlay) */
  detachButtonPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Button placement: inside (overlay on hover) or outside (below content) */
  detachButtonStyle?: "inside" | "outside";
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
  detachButtonStyle = "inside",
  className,
  placeholderClassName,
  lockAspectRatio = false,
}: DetachableContentProps) {
  const context = useDetachedContent();
  const contentRef = useRef<HTMLDivElement>(null);
  const [originalRect, setOriginalRect] = useState<DOMRect | null>(null);

  // Check if this content is detached (managed by provider)
  const isDetachedInProvider = context?.isDetached(id) ?? false;

  const headerHeight = headerStyle?.height || DEFAULT_HEADER_HEIGHT;

  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  const handleDetach = useCallback(() => {
    if (!context || !contentRef.current) return;

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

    const calculatedAspectRatio = lockAspectRatio ? width / height : false;

    context.detachContent({
      id,
      title,
      content: children,
      headerStyle,
      frameStyle,
      position: { x: 20, y: isMobile ? 60 : 80 },
      size: { width, height },
      zIndex: getNextZIndex(),
      isMaximized: false,
      preMaximizeState: null,
      aspectRatio: calculatedAspectRatio,
      onAttach: () => setOriginalRect(null),
    });
  }, [context, id, title, children, headerStyle, frameStyle, headerHeight, lockAspectRatio]);

  const handleAttach = useCallback(() => {
    context?.attachContent(id);
  }, [context, id]);

  // If not using provider, show warning
  if (!context) {
    return (
      <div className={cn("relative group", className)} ref={contentRef}>
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
          Wrap with DetachedContentProvider
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder when detached - reserves space in document flow */}
      {isDetachedInProvider && originalRect && (
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

      {/* Inline content - only shown when not detached */}
      {!isDetachedInProvider && (
        <>
          <div ref={contentRef} className={cn("relative group", className)}>
            {children}

            {/* Detach button (inside/overlay) */}
            {detachButtonStyle === "inside" && (
              <button
                onClick={handleDetach}
                className={cn(
                  "absolute opacity-0 group-hover:opacity-100 z-10",
                  "p-2 rounded-lg bg-black/70 text-white",
                  "hover:bg-black/90 transition-all duration-200",
                  "backdrop-blur-sm",
                  buttonPositionClasses[detachButtonPosition]
                )}
                title="Pop out to floating window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Detach button (outside) - below content, small and subtle */}
          {detachButtonStyle === "outside" && (
            <button
              onClick={handleDetach}
              className={cn(
                "flex items-center justify-center gap-1.5 mt-2 py-1 px-3",
                "rounded-md bg-slate-700/80 hover:bg-slate-600 text-white/80 hover:text-white text-xs",
                "transition-colors duration-200"
              )}
            >
              <ExternalLink className="w-3 h-3" />
              Pop out
            </button>
          )}
        </>
      )}
    </>
  );
}

