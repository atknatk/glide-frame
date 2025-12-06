"use client";

import { useState, useRef, useCallback, ReactNode, useEffect, useSyncExternalStore } from "react";
import { Rnd } from "react-rnd";
import { ExternalLink, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { HeaderStyleOptions, FrameStyleOptions, DockSide, DOCKED_HANDLE_WIDTH, DOCKED_HEIGHT, MOMENTUM_FRICTION, MOMENTUM_MIN_VELOCITY, MOMENTUM_MULTIPLIER, DOCK_MIN_VELOCITY } from "./types";
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
  id: _id, // Reserved for future use
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
  const [isDocked, setIsDocked] = useState(false);
  const [dockedSide, setDockedSide] = useState<"left" | "right" | null>(null);
  const [dockedY, setDockedY] = useState(100);
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

  // Momentum tracking refs
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const [isMomentumActive, setIsMomentumActive] = useState(false);

  const headerHeight = headerStyle?.height || DEFAULT_HEADER_HEIGHT;

  // Bring to front on focus/click
  const bringToFront = useCallback(() => {
    setZIndex(getNextZIndex());
  }, []);

  // Dock to left edge
  const dockLeft = useCallback((y?: number) => {
    setDockedSide("left");
    setDockedY(y ?? position.y);
    setIsDocked(true);
    setIsMaximized(false);
  }, [position.y]);

  // Dock to right edge
  const dockRight = useCallback((y?: number) => {
    setDockedSide("right");
    setDockedY(y ?? position.y);
    setIsDocked(true);
    setIsMaximized(false);
  }, [position.y]);

  // Undock
  const handleUndock = useCallback(() => {
    if (!isDocked) return;

    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const newX = dockedSide === "left" ? 20 : windowWidth - size.width - 20;

    setPosition({ x: newX, y: dockedY });
    setIsDocked(false);
    setDockedSide(null);
    bringToFront();
  }, [isDocked, dockedSide, dockedY, size.width, bringToFront]);

  // Store refs for animation callback
  const stateRef = useRef({ position, size, isMaximized });
  useEffect(() => {
    stateRef.current = { position, size, isMaximized };
  }, [position, size, isMaximized]);

  // Momentum animation
  const animateMomentumRef = useRef<((pos: { x: number; y: number }, vel: { vx: number; vy: number }) => void) | null>(null);

  useEffect(() => {
    animateMomentumRef.current = (currentPos, velocity) => {
      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
      const frameWidth = stateRef.current.size.width;
      const frameHeight = stateRef.current.size.height;

      // Apply velocity
      let newX = currentPos.x + velocity.vx;
      let newY = currentPos.y + velocity.vy;

      // Track if we hit an edge
      let hitLeftEdge = false;
      let hitRightEdge = false;

      // Boundary constraints
      if (newX <= 0) {
        newX = 0;
        hitLeftEdge = true;
      }
      if (newX >= windowWidth - frameWidth) {
        newX = windowWidth - frameWidth;
        hitRightEdge = true;
      }
      newY = Math.max(0, Math.min(newY, windowHeight - frameHeight));

      // Dock if frame hits edge with enough speed
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

      // Update position
      setPosition({ x: newX, y: newY });

      // If hit edge but velocity too low, stop momentum
      if (hitLeftEdge || hitRightEdge) {
        setIsMomentumActive(false);
        return;
      }

      // Apply friction
      velocity.vx *= MOMENTUM_FRICTION;
      velocity.vy *= MOMENTUM_FRICTION;

      // Continue animation if velocity is significant
      if (Math.abs(velocity.vx) > MOMENTUM_MIN_VELOCITY || Math.abs(velocity.vy) > MOMENTUM_MIN_VELOCITY) {
        animationFrameRef.current = requestAnimationFrame(() => {
          animateMomentumRef.current?.({ x: newX, y: newY }, velocity);
        });
      } else {
        setIsMomentumActive(false);
      }
    };
  }, [dockLeft, dockRight]);

  // Handle drag for velocity tracking
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

  // Handle drag stop with momentum
  const handleDragStop = useCallback((_e: unknown, d: { x: number; y: number }) => {
    const finalPosition = { x: d.x, y: d.y };
    const velocity = velocityRef.current;

    // Reset tracking
    lastPositionRef.current = null;
    lastTimeRef.current = 0;

    // Check if we should apply momentum
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

    if (speed > 1 && !isMaximized) {
      setIsMomentumActive(true);
      animateMomentumRef.current?.(finalPosition, { ...velocity });
    } else {
      setPosition(finalPosition);
    }

    // Reset velocity
    velocityRef.current = { vx: 0, vy: 0 };
  }, [isMaximized]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    // Cancel any ongoing momentum animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsMomentumActive(false);
    bringToFront();
  }, [bringToFront]);

  const handleDetach = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setOriginalRect(rect);

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
    setIsDocked(false);
    setDockedSide(null);
    bringToFront();
  }, [headerHeight, lockAspectRatio, bringToFront]);

  const handleAttach = useCallback(() => {
    setIsDetached(false);
    setIsMaximized(false);
    setIsDocked(false);
    setDockedSide(null);
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

  // CRITICAL: Children are ALWAYS rendered in the same place - NEVER conditional
  // Only the container's CSS changes between inline and floating modes

  // If docked, render the dock handle
  if (isDetached && isDocked) {
    const isDockedLeft = dockedSide === "left";

    return (
      <>
        {/* Placeholder when detached */}
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

        {/* Dock handle */}
        <div
          onClick={handleUndock}
          onTouchEnd={handleUndock}
          style={{
            zIndex,
            position: "fixed",
            top: dockedY,
            [isDockedLeft ? "left" : "right"]: 0,
            width: DOCKED_HANDLE_WIDTH,
            height: DOCKED_HEIGHT,
            transition: "all 200ms ease-out",
          }}
          className={cn(
            "cursor-pointer",
            "flex items-center justify-center",
            isDockedLeft ? "rounded-r-xl" : "rounded-l-xl",
            "bg-primary/90 backdrop-blur-sm",
            "shadow-lg shadow-black/20",
            "border border-border/50",
            isDockedLeft ? "border-l-0" : "border-r-0",
            "hover:bg-primary",
            "hover:w-10",
            "active:scale-95",
            "transition-all duration-150",
            "touch-manipulation"
          )}
          role="button"
          aria-label={`Restore ${title}`}
          title={`Restore ${title}`}
        >
          {isDockedLeft ? (
            <ChevronRight className="h-5 w-5 text-primary-foreground" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-primary-foreground" />
          )}
        </div>

        {/* Hidden content container to preserve children */}
        <div style={{ position: 'fixed', left: -9999, top: -9999, visibility: 'hidden' }}>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Placeholder when detached - reserves space in document flow */}
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

      {/* Main container - CSS changes based on mode, children NEVER unmount */}
      <div
        ref={contentRef}
        style={isDetached ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex,
        } : {
          position: 'relative',
        }}
        className={cn(!isDetached && "group", !isDetached && className)}
      >
        <Rnd
          position={isDetached ? position : { x: 0, y: 0 }}
          size={isDetached ? size : { width: '100%', height: '100%' }}
          lockAspectRatio={isDetached ? aspectRatio : false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragStop={handleDragStop}
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
          disableDragging={!isDetached || isMaximized || isMomentumActive}
          enableResizing={isDetached && !isMaximized && !isMomentumActive}
          style={{
            pointerEvents: 'auto',
            position: isDetached ? undefined : 'static',
            transform: isDetached ? undefined : 'none',
          }}
        >
          <div
            style={isDetached ? {
              ...frameStyles,
              borderStyle: frameStyle?.borderWidth ? "solid" : undefined,
            } : undefined}
            className={cn(
              "h-full flex flex-col overflow-hidden",
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

            {/* Content - ALWAYS rendered, NEVER conditional */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        </Rnd>

        {/* Detach button - only visible when inline */}
        {!isDetached && (
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
    </>
  );
}

