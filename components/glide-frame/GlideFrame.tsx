"use client";

import { useState, useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { useGlideFrame } from "./hooks/useGlideFrame";
import {
  GlideFrameProps,
  Position,
  DEFAULT_MIN_SIZE,
  ANIMATION_DURATION,
  MOBILE_MIN_SIZE,
  MOBILE_BREAKPOINT,
  DOCKED_HANDLE_WIDTH,
  DOCKED_HEIGHT,
  MOMENTUM_FRICTION,
  MOMENTUM_MIN_VELOCITY,
  MOMENTUM_MULTIPLIER,
  DOCK_MIN_VELOCITY,
} from "./types";
import { cn } from "@/lib/utils";

// Hook for checking if we're on the client side
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Hook for checking window width
function useIsMobile() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      return () => window.removeEventListener("resize", callback);
    },
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  );
}

export function GlideFrame({
  id,
  title,
  defaultPosition,
  defaultSize,
  onClose,
  onStateChange,
  children,
  className,
  minSize,
  maxSize,
  persist = true,
}: GlideFrameProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMomentumActive, setIsMomentumActive] = useState(false);
  const isMounted = useIsClient();
  const isMobile = useIsMobile();

  // Momentum tracking refs
  const lastPositionRef = useRef<Position | null>(null);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const { state, actions, computed } = useGlideFrame({
    id,
    defaultPosition,
    defaultSize,
    persist,
    onStateChange,
  });

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      actions.close();
      onClose?.();
    }, ANIMATION_DURATION);
  };

  // Handle dock handle click/swipe
  const handleDockHandleClick = useCallback(() => {
    actions.undock();
  }, [actions]);

  // Store latest state/actions in refs for animation callback
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);

  // Update refs in useEffect to avoid "cannot access ref during render" warnings
  useEffect(() => {
    stateRef.current = state;
    actionsRef.current = actions;
  });

  // Momentum animation ref for recursive calls
  const animateMomentumRef = useRef<((pos: Position, vel: { vx: number; vy: number }) => void) | null>(null);

  // Set up the momentum animation function in useEffect
  useEffect(() => {
    animateMomentumRef.current = (currentPos: Position, velocity: { vx: number; vy: number }) => {
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

      // Clamp to bounds and detect edge hits
      if (newX <= 0) {
        newX = 0;
        hitLeftEdge = true;
      } else if (newX >= windowWidth - frameWidth) {
        newX = windowWidth - frameWidth;
        hitRightEdge = true;
      }
      newY = Math.max(0, Math.min(newY, windowHeight - frameHeight));

      // Dock if frame hits edge with enough speed (any direction)
      // This feels more natural - throwing hard in any direction while at edge = dock
      const totalSpeed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

      if (hitLeftEdge && totalSpeed >= DOCK_MIN_VELOCITY) {
        actionsRef.current.dockLeft(newY);
        setIsMomentumActive(false);
        return;
      }
      if (hitRightEdge && totalSpeed >= DOCK_MIN_VELOCITY) {
        actionsRef.current.dockRight(newY);
        setIsMomentumActive(false);
        return;
      }

      // Update position
      actionsRef.current.updatePosition({ x: newX, y: newY });

      // If hit edge but velocity too low, stop momentum (bounce effect)
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
  });

  // Handle drag for velocity tracking
  const handleDrag = useCallback((_e: unknown, d: { x: number; y: number }) => {
    const now = performance.now();
    const currentPos = { x: d.x, y: d.y };

    if (lastPositionRef.current && lastTimeRef.current) {
      const dt = now - lastTimeRef.current;
      if (dt > 0 && dt < 100) { // Ignore if too much time passed
        const vx = ((currentPos.x - lastPositionRef.current.x) / dt) * MOMENTUM_MULTIPLIER;
        const vy = ((currentPos.y - lastPositionRef.current.y) / dt) * MOMENTUM_MULTIPLIER;

        // Only update velocity if there's actual movement
        // This prevents the last "stationary" event from zeroing out velocity
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

    // Check if we should apply momentum (velocity threshold)
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

    if (speed > 1) {
      // Start momentum animation
      setIsMomentumActive(true);
      animateMomentumRef.current?.(finalPosition, { ...velocity });
    } else {
      // Just update position
      actionsRef.current.updatePosition(finalPosition);
    }

    // Reset velocity
    velocityRef.current = { vx: 0, vy: 0 };
  }, []);

  // Handle drag start - cancel momentum and bring to front
  const handleDragStart = useCallback(() => {
    // Cancel any ongoing momentum animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsMomentumActive(false);
    actionsRef.current.bringToFront();
  }, []);

  // Don't render on server or if not visible
  if (!isMounted || !state.isVisible) {
    return null;
  }

  const currentMinSize = minSize || (isMobile ? MOBILE_MIN_SIZE : DEFAULT_MIN_SIZE);
  const currentMaxSize = maxSize || {
    width: typeof window !== "undefined" ? window.innerWidth - 40 : 1880,
    height: typeof window !== "undefined" ? window.innerHeight - 40 : 1040,
  };

  // If docked, render the dock handle instead of Rnd
  if (state.isDocked) {
    const isDockedLeft = state.dockedSide === "left";

    return (
      <div
        onClick={handleDockHandleClick}
        onTouchEnd={handleDockHandleClick}
        style={{
          zIndex: state.zIndex,
          position: "fixed",
          top: state.dockedY,
          [isDockedLeft ? "left" : "right"]: 0,
          width: DOCKED_HANDLE_WIDTH,
          height: DOCKED_HEIGHT,
          transition: `all ${ANIMATION_DURATION}ms ease-out`,
          opacity: isClosing ? 0 : 1,
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
    );
  }

  return (
    <Rnd
      position={computed.currentPosition}
      size={computed.currentSize}
      minWidth={currentMinSize.width}
      minHeight={currentMinSize.height}
      maxWidth={currentMaxSize.width}
      maxHeight={currentMaxSize.height}
      bounds="window"
      dragHandleClassName="glide-frame-handle"
      disableDragging={!computed.canDrag}
      enableResizing={computed.canResize ? {
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      } : false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStart={() => actions.bringToFront()}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        actions.updateSize({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        });
        actions.updatePosition(position);
      }}
      onMouseDown={() => actions.bringToFront()}
      onTouchStart={() => actions.bringToFront()}
      style={{
        zIndex: state.zIndex,
        // Disable transition during momentum for smooth animation
        transition: isMomentumActive
          ? "none"
          : isClosing
            ? `opacity ${ANIMATION_DURATION}ms ease-out`
            : state.isMaximized
              ? `all ${ANIMATION_DURATION}ms ease-out`
              : undefined,
        opacity: isClosing ? 0 : 1,
        // Enable hardware acceleration
        transform: "translateZ(0)",
        willChange: isMomentumActive ? "transform, left, top" : "transform",
      }}
      className={cn(
        "fixed",
        "rounded-lg overflow-hidden",
        "shadow-2xl shadow-black/20",
        "border border-border/50",
        "bg-background/95 backdrop-blur-xl",
        "dark:bg-background/90",
        // Touch-friendly on mobile
        isMobile && "touch-manipulation",
        className
      )}
    >
      {/* Header - draggable handle */}
      <div className="glide-frame-handle">
        <GlideFrameHeader
          title={title}
          isDocked={state.isDocked}
          isMaximized={state.isMaximized}
          onDockLeft={actions.dockLeft}
          onDockRight={actions.dockRight}
          onMaximize={actions.maximize}
          onRestore={actions.restore}
          onClose={handleClose}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto h-[calc(100%-44px)]">
        {children}
      </div>
    </Rnd>
  );
}

