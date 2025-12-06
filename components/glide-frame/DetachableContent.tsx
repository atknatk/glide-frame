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
// Detached Content Provider - manages floating windows across navigation
// Key: Content is stored ONCE on first registration, never updated after
// ============================================================================

interface RegisteredContent {
  id: string;
  title: string;
  content: ReactNode; // Stored once, never updated
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
  lockAspectRatio: boolean;
  isDetached: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMaximized: boolean;
  preMaximizeState: { position: { x: number; y: number }; size: { width: number; height: number } } | null;
  aspectRatio: number | false;
}

interface DetachedContentContextValue {
  registerContent: (id: string, content: ReactNode, options: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio: boolean;
    initialRect: DOMRect;
  }) => void;
  unregisterContent: (id: string) => void;
  detachContent: (id: string) => void;
  attachContent: (id: string) => void;
  isDetached: (id: string) => boolean;
  updatePosition: (id: string, updates: Partial<RegisteredContent>) => void;
}

const DetachedContentContext = createContext<DetachedContentContextValue | null>(null);

export function useDetachedContent() {
  return useContext(DetachedContentContext);
}

export function DetachedContentProvider({ children }: { children: ReactNode }) {
  const [contents, setContents] = useState<Map<string, RegisteredContent>>(new Map());

  const registerContent = useCallback((id: string, content: ReactNode, options: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio: boolean;
    initialRect: DOMRect;
  }) => {
    setContents(prev => {
      // If already exists, DON'T update content - just return existing
      if (prev.has(id)) return prev;

      const { initialRect, ...rest } = options;
      const headerHeight = options.headerStyle?.height || 44;

      const next = new Map(prev);
      next.set(id, {
        id,
        content, // Store content ONCE
        ...rest,
        isDetached: false,
        position: { x: 20, y: 80 },
        size: { width: initialRect.width, height: initialRect.height + headerHeight },
        zIndex: 10000,
        isMaximized: false,
        preMaximizeState: null,
        aspectRatio: false,
      });
      return next;
    });
  }, []);

  const unregisterContent = useCallback((id: string) => {
    setContents(prev => {
      const item = prev.get(id);
      // Don't unregister if detached - keep floating across navigation
      if (item?.isDetached) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const detachContent = useCallback((id: string) => {
    setContents(prev => {
      const item = prev.get(id);
      if (!item) return prev;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;

      const maxWidth = viewportWidth - 40;
      const maxHeight = viewportHeight - 100;

      const width = isMobile
        ? Math.min(item.size.width, maxWidth)
        : Math.min(Math.max(item.size.width, 400), maxWidth);
      const height = Math.min(item.size.height, maxHeight);

      const next = new Map(prev);
      next.set(id, {
        ...item,
        isDetached: true,
        position: { x: 20, y: isMobile ? 60 : 80 },
        size: { width, height },
        zIndex: getNextZIndex(),
        aspectRatio: item.lockAspectRatio ? width / height : false,
      });
      return next;
    });
  }, []);

  const attachContent = useCallback((id: string) => {
    setContents(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, isDetached: false, isMaximized: false });
      return next;
    });
  }, []);

  const isDetached = useCallback((id: string) => {
    return contents.get(id)?.isDetached ?? false;
  }, [contents]);

  const updatePosition = useCallback((id: string, updates: Partial<RegisteredContent>) => {
    setContents(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, ...updates });
      return next;
    });
  }, []);

  return (
    <DetachedContentContext.Provider value={{
      registerContent,
      unregisterContent,
      detachContent,
      attachContent,
      isDetached,
      updatePosition,
    }}>
      {children}
      <FloatingContentRenderer contents={contents} updatePosition={updatePosition} attachContent={attachContent} />
    </DetachedContentContext.Provider>
  );
}

// Renders ONLY detached/floating content via portal
function FloatingContentRenderer({
  contents,
  updatePosition,
  attachContent,
}: {
  contents: Map<string, RegisteredContent>;
  updatePosition: (id: string, updates: Partial<RegisteredContent>) => void;
  attachContent: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only render detached items
  const detachedItems = Array.from(contents.values()).filter(item => item.isDetached);
  if (detachedItems.length === 0) return null;

  return createPortal(
    <>
      {detachedItems.map((item) => (
        <FloatingWindow
          key={item.id}
          item={item}
          updatePosition={updatePosition}
          attachContent={attachContent}
        />
      ))}
    </>,
    document.body
  );
}

// Floating window with Rnd for drag/resize
function FloatingWindow({
  item,
  updatePosition,
  attachContent,
}: {
  item: RegisteredContent;
  updatePosition: (id: string, updates: Partial<RegisteredContent>) => void;
  attachContent: (id: string) => void;
}) {
  const bringToFront = useCallback(() => {
    updatePosition(item.id, { zIndex: getNextZIndex() });
  }, [item.id, updatePosition]);

  const handleMaximize = useCallback(() => {
    if (!item.isMaximized) {
      updatePosition(item.id, {
        preMaximizeState: { position: item.position, size: item.size },
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        isMaximized: true,
      });
    }
  }, [item, updatePosition]);

  const handleRestore = useCallback(() => {
    if (item.isMaximized && item.preMaximizeState) {
      updatePosition(item.id, {
        position: item.preMaximizeState.position,
        size: item.preMaximizeState.size,
        isMaximized: false,
      });
    }
  }, [item, updatePosition]);

  const handleAttach = useCallback(() => {
    attachContent(item.id);
  }, [item.id, attachContent]);

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
          if (!item.isMaximized) updatePosition(item.id, { position: { x: d.x, y: d.y } });
        }}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!item.isMaximized) {
            updatePosition(item.id, {
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
              onRestore={item.isMaximized ? handleRestore : handleAttach}
              onClose={handleAttach}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRegisteredRef = useRef(false);

  // Check if this content is detached (managed by provider)
  const isDetachedInProvider = context?.isDetached(id) ?? false;

  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  // Register content with provider on mount - only ONCE per id
  useEffect(() => {
    if (!context || !containerRef.current || hasRegisteredRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    context.registerContent(id, children, {
      title,
      headerStyle,
      frameStyle,
      lockAspectRatio,
      initialRect: rect,
    });
    hasRegisteredRef.current = true;

    return () => {
      context.unregisterContent(id);
      hasRegisteredRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, id]); // Only depend on context and id - content is registered ONCE

  const handleDetach = useCallback(() => {
    context?.detachContent(id);
  }, [context, id]);

  const handleAttach = useCallback(() => {
    context?.attachContent(id);
  }, [context, id]);

  // If detached in provider, show placeholder
  if (isDetachedInProvider) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-dashed border-slate-600",
          "bg-slate-800/30 flex items-center justify-center",
          "aspect-video",
          placeholderClassName,
          className
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
    );
  }

  // Inline mode - render children directly with CSS-only approach
  return (
    <>
      <div ref={containerRef} className={cn("relative group", className)}>
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
  );
}

