import { ReactNode } from "react";

// Position type
export interface Position {
  x: number;
  y: number;
}

// Size type
export interface Size {
  width: number;
  height: number;
}

// GlideFrame state
export interface GlideFrameState {
  isMinimized: boolean;
  isMaximized: boolean;
  isVisible: boolean;
  position: Position;
  size: Size;
  zIndex: number;
  // Previous state for restore functionality
  previousPosition: Position | null;
  previousSize: Size | null;
}

// GlideFrame props
export interface GlideFrameProps {
  /** Unique identifier for the frame */
  id: string;
  /** Title displayed in the header */
  title: string;
  /** Default position when first opened */
  defaultPosition?: Position;
  /** Default size when first opened */
  defaultSize?: Size;
  /** Callback when frame is closed */
  onClose?: () => void;
  /** Callback when frame state changes */
  onStateChange?: (state: GlideFrameState) => void;
  /** Content to render inside the frame */
  children: ReactNode;
  /** Custom class name for styling */
  className?: string;
  /** Minimum size constraints */
  minSize?: Size;
  /** Maximum size constraints */
  maxSize?: Size;
  /** Whether to persist state to localStorage */
  persist?: boolean;
}

// GlideFrame header props
export interface GlideFrameHeaderProps {
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onClose: () => void;
}

// Default values
export const DEFAULT_SIZE: Size = { width: 800, height: 600 };
export const DEFAULT_MIN_SIZE: Size = { width: 400, height: 300 };
export const DEFAULT_MINIMIZED_SIZE: Size = { width: 300, height: 60 };
export const DEFAULT_POSITION: Position = { x: 100, y: 100 };

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768;

// Mobile default sizes
export const MOBILE_DEFAULT_SIZE: Size = { width: 320, height: 400 };
export const MOBILE_MIN_SIZE: Size = { width: 280, height: 200 };

// Animation duration in ms
export const ANIMATION_DURATION = 150;

// LocalStorage key prefix
export const STORAGE_KEY_PREFIX = "glide_frame_";

// Z-index management
export const BASE_Z_INDEX = 1000;

// Padding for maximize mode
export const MAXIMIZE_PADDING = 20;

// Hook return type
export interface UseGlideFrameReturn {
  state: GlideFrameState;
  actions: {
    minimize: () => void;
    maximize: () => void;
    restore: () => void;
    close: () => void;
    updatePosition: (position: Position) => void;
    updateSize: (size: Size) => void;
    bringToFront: () => void;
  };
  computed: {
    canDrag: boolean;
    canResize: boolean;
    currentSize: Size;
    currentPosition: Position;
  };
}

// Context for z-index management
export interface GlideFrameContextValue {
  getNextZIndex: () => number;
  registerFrame: (id: string) => void;
  unregisterFrame: (id: string) => void;
}

