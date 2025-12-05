"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import { Rnd } from "react-rnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlideFrameHeader } from "./GlideFrameHeader";
import { useGlideFrame } from "./hooks/useGlideFrame";
import {
  GlideFrameProps,
  DEFAULT_MIN_SIZE,
  ANIMATION_DURATION,
  MOBILE_MIN_SIZE,
  MOBILE_BREAKPOINT,
  DOCKED_HANDLE_WIDTH,
  DOCKED_HEIGHT,
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
  const isMounted = useIsClient();
  const isMobile = useIsMobile();

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
    const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
    const topPosition = (windowHeight - DOCKED_HEIGHT) / 2;

    return (
      <div
        onClick={handleDockHandleClick}
        onTouchEnd={handleDockHandleClick}
        style={{
          zIndex: state.zIndex,
          position: "fixed",
          top: topPosition,
          [isDockedLeft ? "left" : "right"]: 0,
          width: DOCKED_HANDLE_WIDTH,
          height: DOCKED_HEIGHT,
          transition: `all ${ANIMATION_DURATION}ms ease-out`,
          opacity: isClosing ? 0 : 1,
        }}
        className={cn(
          "cursor-pointer",
          "flex items-center justify-center",
          isDockedLeft ? "rounded-r-lg" : "rounded-l-lg",
          "bg-primary/90 backdrop-blur-sm",
          "shadow-lg shadow-black/20",
          "border border-border/50",
          isDockedLeft ? "border-l-0" : "border-r-0",
          "hover:bg-primary hover:scale-105",
          "active:scale-95",
          "transition-all duration-150",
          "touch-manipulation"
        )}
        role="button"
        aria-label={`Restore ${title}`}
        title={`Restore ${title}`}
      >
        {isDockedLeft ? (
          <ChevronRight className="h-4 w-4 text-primary-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-primary-foreground" />
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
      onDragStart={() => actions.bringToFront()}
      onDragStop={(_e, d) => {
        actions.updatePosition({ x: d.x, y: d.y });
      }}
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
        transition: isClosing
          ? `opacity ${ANIMATION_DURATION}ms ease-out`
          : state.isMaximized
          ? `all ${ANIMATION_DURATION}ms ease-out`
          : undefined,
        opacity: isClosing ? 0 : 1,
        // Enable hardware acceleration
        transform: "translateZ(0)",
        willChange: "transform",
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

