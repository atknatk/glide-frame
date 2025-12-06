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
// DetachedContentProvider - Content always rendered here, survives navigation
// ============================================================================

interface ContentItem {
  id: string;
  content: ReactNode;
  title: string;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
  lockAspectRatio: boolean;
  // Slot tracking
  slotRect: DOMRect | null;
  // State
  isDetached: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMaximized: boolean;
  preMaximizeState: { position: { x: number; y: number }; size: { width: number; height: number } } | null;
  aspectRatio: number | false;
}

interface DetachedContextValue {
  register: (id: string, content: ReactNode, opts: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio: boolean;
  }) => void;
  unregister: (id: string) => void;
  updateSlot: (id: string, rect: DOMRect | null) => void;
  detach: (id: string) => void;
  attach: (id: string) => void;
  isDetached: (id: string) => boolean;
  isRegistered: (id: string) => boolean;
}

const DetachedContext = createContext<DetachedContextValue | null>(null);

export function useDetachedContent() {
  return useContext(DetachedContext);
}

export function DetachedContentProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, ContentItem>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register content - ONLY on first call, never update content after
  const register = useCallback((id: string, content: ReactNode, opts: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio: boolean;
  }) => {
    setItems(prev => {
      // If already exists, DON'T update content - preserve iframe
      if (prev.has(id)) return prev;

      const next = new Map(prev);
      next.set(id, {
        id,
        content, // Stored ONCE, never updated
        ...opts,
        slotRect: null,
        isDetached: false,
        position: { x: 20, y: 80 },
        size: { width: 480, height: 320 },
        zIndex: 10000,
        isMaximized: false,
        preMaximizeState: null,
        aspectRatio: false,
      });
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.get(id);
      // Keep if detached - survives navigation
      if (item?.isDetached) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateSlot = useCallback((id: string, rect: DOMRect | null) => {
    setItems(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, slotRect: rect });
      return next;
    });
  }, []);

  const detach = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.get(id);
      if (!item || !item.slotRect) return prev;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      const headerHeight = item.headerStyle?.height || 44;

      const width = isMobile
        ? Math.min(item.slotRect.width, vw - 40)
        : Math.min(Math.max(item.slotRect.width, 400), vw - 40);
      const height = Math.min(item.slotRect.height + headerHeight, vh - 100);

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

  const attach = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, isDetached: false, isMaximized: false });
      return next;
    });
  }, []);

  const isDetached = useCallback((id: string) => items.get(id)?.isDetached ?? false, [items]);
  const isRegistered = useCallback((id: string) => items.has(id), [items]);

  const updateItem = useCallback((id: string, updates: Partial<ContentItem>) => {
    setItems(prev => {
      const item = prev.get(id);
      if (!item) return prev;
      const next = new Map(prev);
      next.set(id, { ...item, ...updates });
      return next;
    });
  }, []);

  return (
    <DetachedContext.Provider value={{ register, unregister, updateSlot, detach, attach, isDetached, isRegistered }}>
      {children}
      {mounted && <ContentPortal items={items} updateItem={updateItem} attach={attach} />}
    </DetachedContext.Provider>
  );
}

// Portal renders ALL content (inline positioned over slot, or floating)
function ContentPortal({
  items,
  updateItem,
  attach,
}: {
  items: Map<string, ContentItem>;
  updateItem: (id: string, updates: Partial<ContentItem>) => void;
  attach: (id: string) => void;
}) {
  return createPortal(
    <>
      {Array.from(items.values()).map(item => (
        <PortalContent key={item.id} item={item} updateItem={updateItem} attach={attach} />
      ))}
    </>,
    document.body
  );
}

function PortalContent({
  item,
  updateItem,
  attach,
}: {
  item: ContentItem;
  updateItem: (id: string, updates: Partial<ContentItem>) => void;
  attach: (id: string) => void;
}) {
  const bringToFront = useCallback(() => {
    updateItem(item.id, { zIndex: getNextZIndex() });
  }, [item.id, updateItem]);

  const handleMaximize = useCallback(() => {
    if (!item.isMaximized) {
      updateItem(item.id, {
        preMaximizeState: { position: item.position, size: item.size },
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        isMaximized: true,
      });
    }
  }, [item, updateItem]);

  const handleRestore = useCallback(() => {
    if (item.isMaximized && item.preMaximizeState) {
      updateItem(item.id, {
        position: item.preMaximizeState.position,
        size: item.preMaximizeState.size,
        isMaximized: false,
      });
    }
  }, [item, updateItem]);

  const handleAttach = useCallback(() => attach(item.id), [attach, item.id]);

  // No slot and not detached = don't render
  if (!item.slotRect && !item.isDetached) return null;

  const frameStyles = {
    backgroundColor: item.frameStyle?.backgroundColor,
    borderColor: item.frameStyle?.borderColor,
    borderWidth: item.frameStyle?.borderWidth,
    borderRadius: item.frameStyle?.borderRadius,
    boxShadow: item.isDetached ? (item.frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)") : undefined,
  };

  // INLINE: Position over slot
  if (!item.isDetached && item.slotRect) {
    return (
      <div
        style={{
          position: 'fixed',
          top: item.slotRect.top,
          left: item.slotRect.left,
          width: item.slotRect.width,
          height: item.slotRect.height,
          zIndex: 1,
          pointerEvents: 'auto',
        }}
      >
        {item.content}
      </div>
    );
  }

  // FLOATING: Rnd wrapper
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
          if (!item.isMaximized) updateItem(item.id, { position: { x: d.x, y: d.y } });
        }}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!item.isMaximized) {
            updateItem(item.id, {
              size: { width: ref.offsetWidth, height: ref.offsetHeight },
              position: pos,
            });
          }
        }}
        onMouseDown={bringToFront}
        minWidth={280}
        minHeight={180}
        bounds="window"
        dragHandleClassName="detachable-frame-handle"
        cancel=".glide-frame-button"
        disableDragging={item.isMaximized}
        enableResizing={!item.isMaximized}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          style={{ ...frameStyles, borderStyle: item.frameStyle?.borderWidth ? "solid" : undefined }}
          className={cn(
            "h-full flex flex-col overflow-hidden border border-border",
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

// ============================================================================
// DetachableContent - renders slot, registers with provider
// ============================================================================

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
  const context = useContext(DetachedContext);

  // If provider exists, use provider-based rendering (navigation persistence)
  // Otherwise, use CSS-only fallback (no navigation persistence)
  if (context) {
    return (
      <DetachableContentWithProvider
        id={id}
        title={title}
        children={children}
        headerStyle={headerStyle}
        frameStyle={frameStyle}
        detachButtonPosition={detachButtonPosition}
        detachButtonStyle={detachButtonStyle}
        className={className}
        placeholderClassName={placeholderClassName}
        lockAspectRatio={lockAspectRatio}
        context={context}
      />
    );
  }

  // Fallback: CSS-only approach (no provider)
  return (
    <DetachableContentStandalone
      id={id}
      title={title}
      children={children}
      headerStyle={headerStyle}
      frameStyle={frameStyle}
      detachButtonPosition={detachButtonPosition}
      detachButtonStyle={detachButtonStyle}
      className={className}
      placeholderClassName={placeholderClassName}
      lockAspectRatio={lockAspectRatio}
    />
  );
}

// ============================================================================
// Provider-based: Content renders in portal, survives navigation
// ============================================================================

function DetachableContentWithProvider({
  id,
  title,
  children,
  headerStyle,
  frameStyle,
  detachButtonPosition,
  detachButtonStyle,
  className,
  placeholderClassName,
  lockAspectRatio,
  context,
}: DetachableContentProps & { context: DetachedContextValue }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const hasRegistered = useRef(false);

  // Register ONCE on first mount - content stored, never updated
  useEffect(() => {
    if (!hasRegistered.current) {
      context.register(id, children, { title, headerStyle, frameStyle, lockAspectRatio: lockAspectRatio ?? false });
      hasRegistered.current = true;
    }

    return () => {
      // Only unregister if not detached
      if (!context.isDetached(id)) {
        context.unregister(id);
        hasRegistered.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only id - NOT children, title, etc.

  // Track slot position for inline mode
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const updateRect = () => {
      const rect = slot.getBoundingClientRect();
      context.updateSlot(id, rect);
    };

    updateRect();

    // Update on scroll and resize
    const handleUpdate = () => requestAnimationFrame(updateRect);
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    const observer = new ResizeObserver(handleUpdate);
    observer.observe(slot);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      observer.disconnect();
      context.updateSlot(id, null);
    };
  }, [id, context]);

  const isDetached = context.isDetached(id);

  const buttonPositionClasses = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };

  const handleDetach = useCallback(() => context.detach(id), [context, id]);
  const handleAttach = useCallback(() => context.attach(id), [context, id]);

  return (
    <>
      {/* Slot - invisible placeholder that provides coordinates */}
      <div
        ref={slotRef}
        className={cn(
          "group",
          className,
          isDetached && "border-2 border-dashed border-slate-600 bg-slate-800/30 rounded-lg"
        )}
        style={isDetached ? { minHeight: 200 } : undefined}
      >
        {/* When inline, slot provides space for portal positioning */}
        {!isDetached && (
          <div className="w-full h-full" style={{ visibility: 'hidden' }}>
            {children}
          </div>
        )}

        {/* When detached, show restore button */}
        {isDetached && (
          <div className={cn("flex items-center justify-center h-full min-h-[200px]", placeholderClassName)}>
            <button
              onClick={handleAttach}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Restore here
            </button>
          </div>
        )}

        {/* Detach button (inside/overlay) */}
        {!isDetached && detachButtonStyle === "inside" && (
          <button
            onClick={handleDetach}
            className={cn(
              "absolute opacity-0 group-hover:opacity-100 z-10",
              "p-2 rounded-lg bg-black/70 text-white",
              "hover:bg-black/90 transition-all duration-200",
              "backdrop-blur-sm",
              buttonPositionClasses[detachButtonPosition!]
            )}
            title="Pop out to floating window"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Detach button (outside) */}
      {!isDetached && detachButtonStyle === "outside" && (
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

// ============================================================================
// Standalone: CSS-only approach - iframe state preserved but no navigation
// ============================================================================

function DetachableContentStandalone({
  id: _id,
  title,
  children,
  headerStyle,
  frameStyle,
  detachButtonPosition,
  detachButtonStyle,
  className,
  placeholderClassName,
  lockAspectRatio,
}: DetachableContentProps) {
  const [isDetached, setIsDetached] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [originalRect, setOriginalRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 480, height: 320 });
  const [aspectRatio, setAspectRatio] = useState<number | false>(false);
  const [zIndex, setZIndex] = useState(10000);
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  const headerHeight = headerStyle?.height || 44;

  const bringToFront = useCallback(() => setZIndex(getNextZIndex()), []);

  const handleDetach = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setOriginalRect(rect);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;

      const width = isMobile ? Math.min(rect.width, vw - 40) : Math.min(Math.max(rect.width, 400), vw - 40);
      const height = Math.min(rect.height + headerHeight, vh - 100);

      if (lockAspectRatio) setAspectRatio(width / height);
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

  return (
    <>
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

      <div
        ref={contentRef}
        style={isDetached ? {
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          pointerEvents: 'none',
          zIndex,
        } : { position: 'relative' }}
        className={cn(!isDetached && "group", !isDetached && className)}
      >
        <Rnd
          position={isDetached ? position : { x: 0, y: 0 }}
          size={isDetached ? size : { width: '100%', height: '100%' }}
          lockAspectRatio={isDetached ? aspectRatio : false}
          onDragStart={bringToFront}
          onDragStop={(_, d) => { if (isDetached && !isMaximized) setPosition({ x: d.x, y: d.y }); }}
          onResizeStart={bringToFront}
          onResizeStop={(_, __, ref, ___, pos) => {
            if (isDetached && !isMaximized) {
              setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
              setPosition(pos);
            }
          }}
          onMouseDown={isDetached ? bringToFront : undefined}
          minWidth={isDetached ? Math.min(280, typeof window !== "undefined" ? window.innerWidth - 40 : 280) : undefined}
          minHeight={isDetached ? 180 : undefined}
          bounds={isDetached ? "window" : undefined}
          dragHandleClassName="detachable-frame-handle"
          cancel=".glide-frame-button"
          disableDragging={!isDetached || isMaximized}
          enableResizing={isDetached && !isMaximized}
          style={{
            pointerEvents: 'auto',
            position: isDetached ? undefined : 'static',
            transform: isDetached ? undefined : 'none',
          }}
        >
          <div
            style={isDetached ? { ...frameStyles, borderStyle: frameStyle?.borderWidth ? "solid" : undefined } : undefined}
            className={cn(
              "h-full flex flex-col overflow-hidden",
              isDetached && "border border-border",
              isDetached && !frameStyle?.borderRadius && "rounded-lg",
              isDetached && frameStyle?.className
            )}
          >
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
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>
        </Rnd>

        {!isDetached && detachButtonStyle === "inside" && (
          <button
            onClick={handleDetach}
            className={cn(
              "absolute opacity-0 group-hover:opacity-100 z-10",
              "p-2 rounded-lg bg-black/70 text-white",
              "hover:bg-black/90 transition-all duration-200",
              "backdrop-blur-sm",
              buttonPositionClasses[detachButtonPosition!]
            )}
            title="Pop out to floating window"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {!isDetached && detachButtonStyle === "outside" && (
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

