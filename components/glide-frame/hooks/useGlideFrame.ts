"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  GlideFrameState,
  Position,
  Size,
  UseGlideFrameReturn,
  DEFAULT_SIZE,
  DEFAULT_POSITION,
  STORAGE_KEY_PREFIX,
  BASE_Z_INDEX,
  MAXIMIZE_PADDING,
  MOBILE_BREAKPOINT,
  MOBILE_DEFAULT_SIZE,
  DOCKED_HANDLE_WIDTH,
  DOCKED_HEIGHT,
} from "../types";

// Global z-index counter
let globalZIndex = BASE_Z_INDEX;

interface UseGlideFrameOptions {
  id: string;
  defaultPosition?: Position;
  defaultSize?: Size;
  persist?: boolean;
  onStateChange?: (state: GlideFrameState) => void;
}

export function useGlideFrame(options: UseGlideFrameOptions): UseGlideFrameReturn {
  const { id, defaultPosition, defaultSize, persist = true, onStateChange } = options;

  const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
  const isInitialized = useRef(false);

  // Calculate initial values based on screen size
  const getInitialState = useCallback((): GlideFrameState => {
    // Calculate default position and size first
    const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
    const defaultSizeValue = defaultSize || (isMobile ? MOBILE_DEFAULT_SIZE : DEFAULT_SIZE);

    // Default position: top-right corner
    const defaultPositionValue = defaultPosition || {
      x: typeof window !== "undefined" ? window.innerWidth - defaultSizeValue.width - 20 : DEFAULT_POSITION.x,
      y: 20,
    };

    // Try to load position and size from localStorage (not minimize/maximize state)
    let position = defaultPositionValue;
    let size = defaultSizeValue;

    if (persist && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only restore position and size, not minimize/maximize state
          if (parsed.position) position = parsed.position;
          if (parsed.size) size = parsed.size;
        }
      } catch (e) {
        console.warn("Failed to load GlideFrame state from localStorage:", e);
      }
    }

    return {
      isMinimized: false,
      isMaximized: false,
      isDocked: false,
      dockedSide: null,
      isVisible: true,
      position,
      size,
      zIndex: ++globalZIndex,
      previousPosition: null,
      previousSize: null,
    };
  }, [defaultPosition, defaultSize, persist, storageKey]);

  const [state, setState] = useState<GlideFrameState>(getInitialState);

  // Initialize on mount (client-side)
  useEffect(() => {
    if (!isInitialized.current) {
      setState(getInitialState());
      isInitialized.current = true;
    }
  }, [getInitialState]);

  // Save to localStorage on state change (only position and size when not docked/maximized)
  useEffect(() => {
    if (persist && typeof window !== "undefined" && isInitialized.current) {
      // Only save when in normal state (not docked or maximized)
      if (!state.isDocked && !state.isMaximized) {
        try {
          const toSave = {
            position: state.position,
            size: state.size,
          };
          localStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch (e) {
          console.warn("Failed to save GlideFrame state to localStorage:", e);
        }
      }
    }
    onStateChange?.(state);
  }, [state, persist, storageKey, onStateChange]);

  // Cleanup localStorage on unmount
  useEffect(() => {
    return () => {
      if (persist && typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
    };
  }, [persist, storageKey]);

  // Actions - Dock to left edge (iOS style minimize)
  const dockLeft = useCallback(() => {
    setState((prev) => {
      if (prev.isDocked && prev.dockedSide === "left") return prev;

      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

      return {
        ...prev,
        isDocked: true,
        dockedSide: "left",
        isMinimized: true,
        isMaximized: false,
        previousPosition: prev.isDocked ? prev.previousPosition : prev.position,
        previousSize: prev.isDocked ? prev.previousSize : prev.size,
        position: {
          x: -prev.size.width + DOCKED_HANDLE_WIDTH,
          y: (windowHeight - DOCKED_HEIGHT) / 2,
        },
        zIndex: ++globalZIndex,
      };
    });
  }, []);

  // Dock to right edge
  const dockRight = useCallback(() => {
    setState((prev) => {
      if (prev.isDocked && prev.dockedSide === "right") return prev;

      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

      return {
        ...prev,
        isDocked: true,
        dockedSide: "right",
        isMinimized: true,
        isMaximized: false,
        previousPosition: prev.isDocked ? prev.previousPosition : prev.position,
        previousSize: prev.isDocked ? prev.previousSize : prev.size,
        position: {
          x: windowWidth - DOCKED_HANDLE_WIDTH,
          y: (windowHeight - DOCKED_HEIGHT) / 2,
        },
        zIndex: ++globalZIndex,
      };
    });
  }, []);

  // Undock (restore from docked state)
  const undock = useCallback(() => {
    setState((prev) => {
      if (!prev.isDocked) return prev;

      return {
        ...prev,
        isDocked: false,
        dockedSide: null,
        isMinimized: false,
        position: prev.previousPosition || prev.position,
        size: prev.previousSize || prev.size,
        previousPosition: null,
        previousSize: null,
        zIndex: ++globalZIndex,
      };
    });
  }, []);

  const maximize = useCallback(() => {
    setState((prev) => {
      if (prev.isMaximized) return prev;

      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

      return {
        ...prev,
        isMaximized: true,
        isMinimized: false,
        isDocked: false,
        dockedSide: null,
        previousPosition: prev.previousPosition || prev.position,
        previousSize: prev.previousSize || prev.size,
        position: { x: MAXIMIZE_PADDING, y: MAXIMIZE_PADDING },
        size: {
          width: windowWidth - MAXIMIZE_PADDING * 2,
          height: windowHeight - MAXIMIZE_PADDING * 2,
        },
        zIndex: ++globalZIndex,
      };
    });
  }, []);

  const restore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMinimized: false,
      isMaximized: false,
      isDocked: false,
      dockedSide: null,
      position: prev.previousPosition || prev.position,
      size: prev.previousSize || prev.size,
      previousPosition: null,
      previousSize: null,
      zIndex: ++globalZIndex,
    }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const updatePosition = useCallback((position: Position) => {
    setState((prev) => ({
      ...prev,
      position,
    }));
  }, []);

  const updateSize = useCallback((size: Size) => {
    setState((prev) => ({
      ...prev,
      size,
    }));
  }, []);

  const bringToFront = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zIndex: ++globalZIndex,
    }));
  }, []);

  // Computed values
  const canDrag = !state.isMaximized && !state.isDocked;
  const canResize = !state.isMinimized && !state.isMaximized && !state.isDocked;
  const currentSize = state.size;
  const currentPosition = state.position;

  return {
    state,
    actions: {
      dockLeft,
      dockRight,
      undock,
      maximize,
      restore,
      close,
      updatePosition,
      updateSize,
      bringToFront,
    },
    computed: {
      canDrag,
      canResize,
      currentSize,
      currentPosition,
    },
  };
}

