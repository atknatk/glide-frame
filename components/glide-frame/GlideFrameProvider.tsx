"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GlideFrame } from "./GlideFrame";
import { HeaderStyleOptions, FrameStyleOptions, Size, Position, DOCKED_HANDLE_WIDTH, DOCKED_HEIGHT, MOMENTUM_FRICTION, MOMENTUM_MIN_VELOCITY, MOMENTUM_MULTIPLIER, DOCK_MIN_VELOCITY } from "./types";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { Rnd } from "react-rnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Global z-index manager
let globalZIndex = 10000;
const getNextZIndex = () => ++globalZIndex;

interface FrameConfig {
  id: string;
  title: string;
  content: ReactNode;
  defaultPosition?: Position;
  defaultSize?: Size;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
}

// Detachable content state
interface DetachableState {
  id: string;
  content: ReactNode;
  title: string;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
  lockAspectRatio: boolean;
  // State
  isDetached: boolean;
  isDocked: boolean;
  dockedSide: "left" | "right" | null;
  dockedY: number;
  isMaximized: boolean;
  position: Position;
  size: Size;
  originalSize: Size;
  zIndex: number;
  slotRect: DOMRect | null;
  preMaximizeState: { position: Position; size: Size } | null;
  aspectRatio: number | false;
}

interface DetachableContextValue {
  register: (id: string, content: ReactNode, options: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio?: boolean;
    defaultSize?: Size;
  }) => void;
  unregister: (id: string) => void;
  updateSlot: (id: string, rect: DOMRect | null) => void;
  detach: (id: string) => void;
  attach: (id: string) => void;
  isDetached: (id: string) => boolean;
  isDocked: (id: string) => boolean;
  isRegistered: (id: string) => boolean;
}

interface GlideFrameContextValue {
  frames: FrameConfig[];
  openFrame: (config: FrameConfig) => void;
  closeFrame: (id: string) => void;
  closeAllFrames: () => void;
  // Detachable content
  detachable: DetachableContextValue;
}

const GlideFrameContext = createContext<GlideFrameContextValue | null>(null);

export function useGlideFrameContext() {
  const context = useContext(GlideFrameContext);
  if (!context) {
    throw new Error("useGlideFrameContext must be used within GlideFrameProvider");
  }
  return context;
}

// Separate context for detachable - avoids re-renders
const DetachableContext = createContext<DetachableContextValue | null>(null);

export function useDetachableContext() {
  return useContext(DetachableContext);
}

/**
 * Hook to control a specific detachable content from anywhere in the app.
 * Must be used within GlideFrameProvider.
 *
 * @example
 * ```tsx
 * const { detach, attach, isDetached, isDocked } = useDetachable('youtube-player');
 *
 * <button onClick={detach}>Pop out</button>
 * <DetachableContent id="youtube-player" showDetachButton={false}>
 *   <iframe ... />
 * </DetachableContent>
 * ```
 */
export function useDetachable(id: string) {
  const context = useContext(DetachableContext);

  const detach = useCallback(() => {
    context?.detach(id);
  }, [context, id]);

  const attach = useCallback(() => {
    context?.attach(id);
  }, [context, id]);

  const isDetached = context?.isDetached(id) ?? false;
  const isDocked = context?.isDocked(id) ?? false;
  const isRegistered = context?.isRegistered(id) ?? false;

  return {
    /** Detach content to floating window */
    detach,
    /** Attach content back to its original slot */
    attach,
    /** Toggle between detached and attached */
    toggle: isDetached || isDocked ? attach : detach,
    /** Whether content is currently detached (floating) */
    isDetached,
    /** Whether content is currently docked (minimized to edge) */
    isDocked,
    /** Whether content is registered in provider */
    isRegistered,
    /** Whether content is floating (detached or docked) */
    isFloating: isDetached || isDocked,
  };
}

interface GlideFrameProviderProps {
  children: ReactNode;
}

export function GlideFrameProvider({ children }: GlideFrameProviderProps) {
  const [frames, setFrames] = useState<FrameConfig[]>([]);
  const [detachables, setDetachables] = useState<Map<string, DetachableState>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openFrame = useCallback((config: FrameConfig) => {
    setFrames((prev) => {
      const exists = prev.find((f) => f.id === config.id);
      if (exists) {
        return prev.map((f) => (f.id === config.id ? config : f));
      }
      return [...prev, config];
    });
  }, []);

  const closeFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const closeAllFrames = useCallback(() => {
    setFrames([]);
  }, []);

  // Detachable content management
  const register = useCallback((id: string, content: ReactNode, options: {
    title: string;
    headerStyle?: HeaderStyleOptions;
    frameStyle?: FrameStyleOptions;
    lockAspectRatio?: boolean;
    defaultSize?: Size;
  }) => {
    setDetachables(prev => {
      // Don't update if already exists - preserve content
      if (prev.has(id)) return prev;

      const next = new Map(prev);
      const defaultSize = options.defaultSize || { width: 480, height: 320 };
      next.set(id, {
        id,
        content,
        title: options.title,
        headerStyle: options.headerStyle,
        frameStyle: options.frameStyle,
        lockAspectRatio: options.lockAspectRatio ?? false,
        isDetached: false,
        isDocked: false,
        dockedSide: null,
        dockedY: 100,
        isMaximized: false,
        position: { x: 100, y: 100 },
        size: defaultSize,
        originalSize: defaultSize,
        zIndex: getNextZIndex(),
        slotRect: null,
        preMaximizeState: null,
        aspectRatio: false,
      });
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setDetachables(prev => {
      const item = prev.get(id);
      // Don't unregister if detached - keep it alive for navigation
      if (item?.isDetached || item?.isDocked) return prev;

      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateSlot = useCallback((id: string, rect: DOMRect | null) => {
    setDetachables(prev => {
      const item = prev.get(id);
      if (!item) return prev;

      // Skip update if rect is essentially the same (avoid infinite loops)
      if (item.slotRect && rect &&
          Math.abs(item.slotRect.x - rect.x) < 1 &&
          Math.abs(item.slotRect.y - rect.y) < 1 &&
          Math.abs(item.slotRect.width - rect.width) < 1 &&
          Math.abs(item.slotRect.height - rect.height) < 1) {
        return prev;
      }

      const next = new Map(prev);
      next.set(id, { ...item, slotRect: rect });
      return next;
    });
  }, []);

  const detach = useCallback((id: string) => {
    setDetachables(prev => {
      const item = prev.get(id);
      if (!item || !item.slotRect) return prev;

      const rect = item.slotRect;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      const headerHeight = item.headerStyle?.height || 44;

      const width = isMobile
        ? Math.min(rect.width, vw - 40)
        : Math.min(Math.max(rect.width, 400), vw - 40);
      const height = Math.min(rect.height + headerHeight, vh - 100);

      const next = new Map(prev);
      next.set(id, {
        ...item,
        isDetached: true,
        isDocked: false,
        dockedSide: null,
        position: { x: 20, y: isMobile ? 60 : 80 },
        size: { width, height },
        originalSize: { width: rect.width, height: rect.height },
        zIndex: getNextZIndex(),
        aspectRatio: item.lockAspectRatio ? width / height : false,
      });
      return next;
    });
  }, []);

  const attach = useCallback((id: string) => {
    setDetachables(prev => {
      const item = prev.get(id);
      if (!item) return prev;

      const next = new Map(prev);
      next.set(id, {
        ...item,
        isDetached: false,
        isDocked: false,
        dockedSide: null,
        isMaximized: false,
      });
      return next;
    });
  }, []);

  const isDetached = useCallback((id: string) => {
    return detachables.get(id)?.isDetached ?? false;
  }, [detachables]);

  const isDocked = useCallback((id: string) => {
    return detachables.get(id)?.isDocked ?? false;
  }, [detachables]);

  const isRegistered = useCallback((id: string) => {
    return detachables.has(id);
  }, [detachables]);

  const detachableContext: DetachableContextValue = {
    register,
    unregister,
    updateSlot,
    detach,
    attach,
    isDetached,
    isDocked,
    isRegistered,
  };

  return (
    <GlideFrameContext.Provider value={{ frames, openFrame, closeFrame, closeAllFrames, detachable: detachableContext }}>
      <DetachableContext.Provider value={detachableContext}>
        {children}

        {/* Render all GlideFrames */}
        {frames.map((frame, index) => (
          <GlideFrame
            key={frame.id}
            id={frame.id}
            title={frame.title}
            defaultPosition={frame.defaultPosition || { x: 100 + index * 30, y: 100 + index * 30 }}
            defaultSize={frame.defaultSize || { width: 480, height: 320 }}
            onClose={() => closeFrame(frame.id)}
            headerStyle={frame.headerStyle}
            frameStyle={frame.frameStyle}
          >
            {frame.content}
          </GlideFrame>
        ))}

        {/* Render detached content via portal */}
        {mounted && Array.from(detachables.values()).map(item => (
          <DetachableRenderer
            key={item.id}
            item={item}
            setDetachables={setDetachables}
            attach={attach}
          />
        ))}
      </DetachableContext.Provider>
    </GlideFrameContext.Provider>
  );
}


// Detachable content renderer - handles floating/docked/inline modes
function DetachableRenderer({
  item,
  setDetachables,
  attach
}: {
  item: DetachableState;
  setDetachables: React.Dispatch<React.SetStateAction<Map<string, DetachableState>>>;
  attach: (id: string) => void;
}) {
  const lastPositionRef = useRef<Position | null>(null);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const [isMomentumActive, setIsMomentumActive] = useState(false);

  // Store item ref for animation callback
  const itemRef = useRef(item);
  useEffect(() => {
    itemRef.current = item;
  }, [item]);

  // Update helpers
  const updateItem = useCallback((updates: Partial<DetachableState>) => {
    setDetachables(prev => {
      const current = prev.get(item.id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(item.id, { ...current, ...updates });
      return next;
    });
  }, [item.id, setDetachables]);

  const bringToFront = useCallback(() => {
    updateItem({ zIndex: getNextZIndex() });
  }, [updateItem]);

  const dockLeft = useCallback((y: number) => {
    updateItem({ isDocked: true, dockedSide: "left", dockedY: y, isMaximized: false });
  }, [updateItem]);

  const dockRight = useCallback((y: number) => {
    updateItem({ isDocked: true, dockedSide: "right", dockedY: y, isMaximized: false });
  }, [updateItem]);

  const undock = useCallback(() => {
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const newX = item.dockedSide === "left" ? 20 : windowWidth - item.size.width - 20;
    updateItem({
      isDocked: false,
      dockedSide: null,
      position: { x: newX, y: item.dockedY },
      zIndex: getNextZIndex(),
    });
  }, [item.dockedSide, item.dockedY, item.size.width, updateItem]);

  const maximize = useCallback(() => {
    if (!item.isMaximized) {
      updateItem({
        preMaximizeState: { position: item.position, size: item.size },
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        isMaximized: true,
      });
    }
  }, [item.isMaximized, item.position, item.size, updateItem]);

  const restore = useCallback(() => {
    if (item.isMaximized && item.preMaximizeState) {
      updateItem({
        position: item.preMaximizeState.position,
        size: item.preMaximizeState.size,
        isMaximized: false,
      });
    }
  }, [item.isMaximized, item.preMaximizeState, updateItem]);

  // Momentum animation
  const animateMomentumRef = useRef<((pos: Position, vel: { vx: number; vy: number }) => void) | null>(null);

  useEffect(() => {
    animateMomentumRef.current = (currentPos, velocity) => {
      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
      const current = itemRef.current;

      let newX = currentPos.x + velocity.vx;
      let newY = currentPos.y + velocity.vy;

      let hitLeftEdge = false;
      let hitRightEdge = false;

      if (newX <= 0) { newX = 0; hitLeftEdge = true; }
      if (newX >= windowWidth - current.size.width) {
        newX = windowWidth - current.size.width;
        hitRightEdge = true;
      }
      newY = Math.max(0, Math.min(newY, windowHeight - current.size.height));

      const totalSpeed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

      if (hitLeftEdge && totalSpeed >= DOCK_MIN_VELOCITY) {
        dockLeft(newY);
        setIsMomentumActive(false);
        return;
      }
      if (hitRightEdge && totalSpeed >= DOCK_MIN_VELOCITY) {
        dockRight(newY);
        setIsMomentumActive(false);
        return;
      }

      updateItem({ position: { x: newX, y: newY } });

      if (hitLeftEdge || hitRightEdge) {
        setIsMomentumActive(false);
        return;
      }

      velocity.vx *= MOMENTUM_FRICTION;
      velocity.vy *= MOMENTUM_FRICTION;

      if (Math.abs(velocity.vx) > MOMENTUM_MIN_VELOCITY || Math.abs(velocity.vy) > MOMENTUM_MIN_VELOCITY) {
        animationFrameRef.current = requestAnimationFrame(() => {
          animateMomentumRef.current?.({ x: newX, y: newY }, velocity);
        });
      } else {
        setIsMomentumActive(false);
      }
    };
  }, [dockLeft, dockRight, updateItem]);

  const handleDragStart = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsMomentumActive(false);
    bringToFront();
  }, [bringToFront]);

  const handleDrag = useCallback((_e: unknown, d: { x: number; y: number }) => {
    const now = performance.now();
    const currentPos = { x: d.x, y: d.y };

    if (lastPositionRef.current && lastTimeRef.current) {
      const dt = now - lastTimeRef.current;
      if (dt > 0 && dt < 100) {
        const vx = ((currentPos.x - lastPositionRef.current.x) / dt) * MOMENTUM_MULTIPLIER;
        const vy = ((currentPos.y - lastPositionRef.current.y) / dt) * MOMENTUM_MULTIPLIER;
        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
          velocityRef.current = { vx, vy };
        }
      }
    }

    lastPositionRef.current = currentPos;
    lastTimeRef.current = now;
  }, []);

  const handleDragStop = useCallback((_e: unknown, d: { x: number; y: number }) => {
    const finalPosition = { x: d.x, y: d.y };
    const velocity = velocityRef.current;

    lastPositionRef.current = null;
    lastTimeRef.current = 0;

    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

    if (speed > 1 && !item.isMaximized) {
      setIsMomentumActive(true);
      animateMomentumRef.current?.(finalPosition, { ...velocity });
    } else {
      updateItem({ position: finalPosition });
    }

    velocityRef.current = { vx: 0, vy: 0 };
  }, [item.isMaximized, updateItem]);

  const frameStyles = {
    backgroundColor: item.frameStyle?.backgroundColor,
    borderColor: item.frameStyle?.borderColor,
    borderWidth: item.frameStyle?.borderWidth,
    borderRadius: item.frameStyle?.borderRadius,
    boxShadow: item.frameStyle?.boxShadow || "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  };

  // Not detached - render inline over slot
  if (!item.isDetached && !item.isDocked) {
    if (!item.slotRect) return null;

    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: item.slotRect.top,
          left: item.slotRect.left,
          width: item.slotRect.width,
          height: item.slotRect.height,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
          {item.content}
        </div>
      </div>,
      document.body
    );
  }

  // Docked - render handle
  if (item.isDocked) {
    const isDockedLeft = item.dockedSide === "left";

    return createPortal(
      <div
        onClick={undock}
        onTouchEnd={undock}
        style={{
          zIndex: item.zIndex,
          position: "fixed",
          top: item.dockedY,
          [isDockedLeft ? "left" : "right"]: 0,
          width: DOCKED_HANDLE_WIDTH,
          height: DOCKED_HEIGHT,
          transition: "all 200ms ease-out",
        }}
        className={cn(
          "cursor-pointer flex items-center justify-center",
          isDockedLeft ? "rounded-r-xl" : "rounded-l-xl",
          "bg-primary/90 backdrop-blur-sm shadow-lg shadow-black/20",
          "border border-border/50",
          isDockedLeft ? "border-l-0" : "border-r-0",
          "hover:bg-primary hover:w-10 active:scale-95",
          "transition-all duration-150 touch-manipulation"
        )}
        role="button"
        aria-label={`Restore ${item.title}`}
        title={`Restore ${item.title}`}
      >
        {isDockedLeft ? (
          <ChevronRight className="h-5 w-5 text-primary-foreground" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-primary-foreground" />
        )}
      </div>,
      document.body
    );
  }

  // Detached - floating window
  return createPortal(
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
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={bringToFront}
        onResizeStop={(_, __, ref, ___, pos) => {
          if (!item.isMaximized) {
            updateItem({ size: { width: ref.offsetWidth, height: ref.offsetHeight }, position: pos });
          }
        }}
        onMouseDown={bringToFront}
        minWidth={Math.min(280, typeof window !== "undefined" ? window.innerWidth - 40 : 280)}
        minHeight={180}
        bounds="window"
        dragHandleClassName="detachable-frame-handle"
        cancel=".glide-frame-button"
        disableDragging={item.isMaximized || isMomentumActive}
        enableResizing={!item.isMaximized && !isMomentumActive}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          style={{
            ...frameStyles,
            borderStyle: item.frameStyle?.borderWidth ? "solid" : undefined,
          }}
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
              onMaximize={maximize}
              onRestore={item.isMaximized ? restore : () => attach(item.id)}
              onClose={() => attach(item.id)}
              styleOptions={item.headerStyle}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            {item.content}
          </div>
        </div>
      </Rnd>
    </div>,
    document.body
  );
}

