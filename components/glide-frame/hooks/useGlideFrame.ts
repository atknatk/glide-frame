"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  GlideFrameState,
  Position,
  Size,
  UseGlideFrameReturn,
  DEFAULT_SIZE,
  DEFAULT_POSITION,
  DEFAULT_MINIMIZED_SIZE,
  STORAGE_KEY_PREFIX,
  BASE_Z_INDEX,
  MAXIMIZE_PADDING,
  MOBILE_BREAKPOINT,
  MOBILE_DEFAULT_SIZE,
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
    // Try to load from localStorage
    if (persist && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            isVisible: true,
            zIndex: ++globalZIndex,
          };
        }
      } catch (e) {
        console.warn("Failed to load GlideFrame state from localStorage:", e);
      }
    }

    // Calculate default position and size
    const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
    const size = defaultSize || (isMobile ? MOBILE_DEFAULT_SIZE : DEFAULT_SIZE);
    
    // Default position: top-right corner
    const position = defaultPosition || {
      x: typeof window !== "undefined" ? window.innerWidth - size.width - 20 : DEFAULT_POSITION.x,
      y: 20,
    };

    return {
      isMinimized: false,
      isMaximized: false,
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

  // Save to localStorage on state change
  useEffect(() => {
    if (persist && typeof window !== "undefined" && isInitialized.current) {
      try {
        const toSave = {
          position: state.position,
          size: state.size,
          isMinimized: state.isMinimized,
          isMaximized: state.isMaximized,
        };
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch (e) {
        console.warn("Failed to save GlideFrame state to localStorage:", e);
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

  // Actions
  const minimize = useCallback(() => {
    setState((prev) => {
      if (prev.isMinimized) return prev;

      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

      return {
        ...prev,
        isMinimized: true,
        isMaximized: false,
        previousPosition: prev.previousPosition || prev.position,
        previousSize: prev.previousSize || prev.size,
        position: {
          x: windowWidth - DEFAULT_MINIMIZED_SIZE.width - 20,
          y: windowHeight - DEFAULT_MINIMIZED_SIZE.height - 20,
        },
        size: DEFAULT_MINIMIZED_SIZE,
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
  const canDrag = !state.isMaximized;
  const canResize = !state.isMinimized && !state.isMaximized;
  const currentSize = state.size;
  const currentPosition = state.position;

  return {
    state,
    actions: {
      minimize,
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

