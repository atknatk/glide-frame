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
// Content is ALWAYS rendered in provider, only CSS positioning changes
// ============================================================================

interface RegisteredContent {
  id: string;
  title: string;
  content: ReactNode;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
  lockAspectRatio: boolean;
  // Slot position (where inline content should appear)
  slotRect: DOMRect | null;
  // Floating state
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
  }) => void;
  unregisterContent: (id: string) => void;
  updateSlotRect: (id: string, rect: DOMRect | null) => void;
  detachContent: (id: string) => void;
  attachContent: (id: string) => void;
  isDetached: (id: string) => boolean;
  getContent: (id: string) => RegisteredContent | undefined;
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
  }) => {
    setContents(prev => {
      const existing = prev.get(id);
      // If already registered and detached, keep the detached state but update content
      if (existing?.isDetached) {
        const next = new Map(prev);
        next.set(id, { ...existing, content, ...options });
        return next;
      }
      // New registration or re-registration when not detached
      const next = new Map(prev);
      next.set(id, {
        id,
        content,
        ...options,
        slotRect: existing?.slotRect || null,
        isDetached: existing?.isDetached || false,
        position: existing?.position || { x: 20, y: 80 },
        size: existing?.size || { width: 480, height: 320 },
        zIndex: existing?.zIndex || 10000,
        isMaximized: existing?.isMaximized || false,
        preMaximizeState: existing?.preMaximizeState || null,
        aspectRatio: existing?.aspectRatio || false,
      });
      return next;
    });
  }, []);

  const unregisterContent = useCallback((id: string) => {
    setContents(prev => {
      const item = prev.get(id);
      // Don't unregister if detached - keep floating
      if (item?.isDetached) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateSlotRect = useCallback((id: string, rect: DOMRect | null) => {
    setContents(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, slotRect: rect });
      return next;
    });
  }, []);

  const detachContent = useCallback((id: string) => {
    setContents(prev => {
      const item = prev.get(id);
      if (!item || !item.slotRect) return prev;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;
      const headerHeight = item.headerStyle?.height || 44;

      const maxWidth = viewportWidth - 40;
      const maxHeight = viewportHeight - 100;

      const width = isMobile
        ? Math.min(item.slotRect.width, maxWidth)
        : Math.min(Math.max(item.slotRect.width, 400), maxWidth);
      const height = Math.min(item.slotRect.height + headerHeight, maxHeight);

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

  const getContent = useCallback((id: string) => {
    return contents.get(id);
  }, [contents]);

  const updateContent = useCallback((id: string, updates: Partial<RegisteredContent>) => {
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
      updateSlotRect,
      detachContent,
      attachContent,
      isDetached,
      getContent
    }}>
      {children}
      <ContentRenderer contents={contents} updateContent={updateContent} attachContent={attachContent} />
    </DetachedContentContext.Provider>
  );
}

// Renders all content via portal - both inline and floating
function ContentRenderer({
  contents,
  updateContent,
  attachContent,
}: {
  contents: Map<string, RegisteredContent>;
  updateContent: (id: string, updates: Partial<RegisteredContent>) => void;
  attachContent: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {Array.from(contents.values()).map((item) => (
        <ContentItem
          key={item.id}
          item={item}
          updateContent={updateContent}
          attachContent={attachContent}
        />
      ))}
    </>,
    document.body
  );
}

// Single content item - renders either inline (positioned over slot) or floating
function ContentItem({
  item,
  updateContent,
  attachContent,
}: {
  item: RegisteredContent;
  updateContent: (id: string, updates: Partial<RegisteredContent>) => void;
  attachContent: (id: string) => void;
}) {
  const bringToFront = useCallback(() => {
    updateContent(item.id, { zIndex: getNextZIndex() });
  }, [item.id, updateContent]);

  const handleMaximize = useCallback(() => {
    if (!item.isMaximized) {
      updateContent(item.id, {
        preMaximizeState: { position: item.position, size: item.size },
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        isMaximized: true,
      });
    }
  }, [item, updateContent]);

  const handleRestore = useCallback(() => {
    if (item.isMaximized && item.preMaximizeState) {
      updateContent(item.id, {
        position: item.preMaximizeState.position,
        size: item.preMaximizeState.size,
        isMaximized: false,
      });
    }
  }, [item, updateContent]);

  const handleAttach = useCallback(() => {
    attachContent(item.id);
  }, [item.id, attachContent]);

  const frameStyles = {
    backgroundColor: item.frameStyle?.backgroundColor,
    borderColor: item.frameStyle?.borderColor,
    borderWidth: item.frameStyle?.borderWidth,
    borderRadius: item.frameStyle?.borderRadius,
    boxShadow: item.isDetached ? (item.frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)") : undefined,
  };

  // If no slot rect and not detached, don't render
  if (!item.slotRect && !item.isDetached) return null;

  // INLINE MODE: Position over the slot
  if (!item.isDetached && item.slotRect) {
    return (
      <div
        style={{
          position: 'fixed',
          top: item.slotRect.top,
          left: item.slotRect.left,
          width: item.slotRect.width,
          height: item.slotRect.height,
          zIndex: 1, // Low z-index for inline
          pointerEvents: 'auto',
        }}
      >
        {item.content}
      </div>
    );
  }

  // FLOATING MODE: Use Rnd for drag/resize
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
          if (!item.isMaximized) updateContent(item.id, { position: { x: d.x, y: d.y } });
        }}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!item.isMaximized) {
            updateContent(item.id, {
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
  const slotRef = useRef<HTMLDivElement>(null);

  // Check if this content is detached (managed by provider)
  const isDetachedInProvider = context?.isDetached(id) ?? false;
  const registeredContent = context?.getContent(id);

  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  // Register content with provider on mount
  useEffect(() => {
    if (!context) return;
    context.registerContent(id, children, { title, headerStyle, frameStyle, lockAspectRatio });
    return () => context.unregisterContent(id);
  }, [context, id, children, title, headerStyle, frameStyle, lockAspectRatio]);

  // Update slot rect when slot element changes or on scroll/resize
  useEffect(() => {
    if (!context || !slotRef.current) return;

    const updateRect = () => {
      if (slotRef.current) {
        context.updateSlotRect(id, slotRef.current.getBoundingClientRect());
      }
    };

    updateRect();

    // Update on scroll and resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    // Also use ResizeObserver for layout changes
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(slotRef.current);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      resizeObserver.disconnect();
    };
  }, [context, id, isDetachedInProvider]);

  const handleDetach = useCallback(() => {
    context?.detachContent(id);
  }, [context, id]);

  const handleAttach = useCallback(() => {
    context?.attachContent(id);
  }, [context, id]);

  // If not using provider, show warning
  if (!context) {
    return (
      <div className={cn("relative group", className)}>
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
      {isDetachedInProvider && registeredContent?.slotRect && (
        <div
          style={{ width: registeredContent.slotRect.width, height: registeredContent.slotRect.height }}
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

      {/* Slot - invisible element that marks where inline content should appear */}
      {/* Content is rendered via portal but positioned over this slot */}
      {!isDetachedInProvider && (
        <>
          <div ref={slotRef} className={cn("relative group", className)}>
            {/* Invisible placeholder to maintain size - actual content rendered via portal */}
            <div className="invisible">{children}</div>

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

