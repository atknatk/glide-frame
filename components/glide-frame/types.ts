import { ReactNode, CSSProperties } from "react";

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

// Dock side type
export type DockSide = "left" | "right" | null;

// Header style options
export interface HeaderStyleOptions {
  /** Background color or gradient */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Button/icon color */
  buttonColor?: string;
  /** Button hover color */
  buttonHoverColor?: string;
  /** Header height in pixels */
  height?: number;
  /** Show maximize button */
  showMaximize?: boolean;
  /** Show close button */
  showClose?: boolean;
  /** Custom class name for header */
  className?: string;
  /** Custom inline styles */
  style?: CSSProperties;
}

// Frame style options
export interface FrameStyleOptions {
  /** Background color or gradient */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Box shadow */
  boxShadow?: string;
  /** Custom class name for frame */
  className?: string;
  /** Custom inline styles */
  style?: CSSProperties;
}

// GlideFrame state
export interface GlideFrameState {
  isMinimized: boolean;
  isMaximized: boolean;
  isDocked: boolean;
  dockedSide: DockSide;
  dockedY: number; // Y position of the docked handle
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
  /** Header style customization */
  headerStyle?: HeaderStyleOptions;
  /** Frame style customization */
  frameStyle?: FrameStyleOptions;
}

// GlideFrame header props
export interface GlideFrameHeaderProps {
  title: string;
  isDocked: boolean;
  isMaximized: boolean;
  onMaximize: () => void;
  onRestore: () => void;
  onClose: () => void;
  /** Style options */
  styleOptions?: HeaderStyleOptions;
}

// Default values
export const DEFAULT_SIZE: Size = { width: 800, height: 600 };
export const DEFAULT_MIN_SIZE: Size = { width: 400, height: 300 };
export const DEFAULT_POSITION: Position = { x: 100, y: 100 };

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768;

// Mobile default sizes
export const MOBILE_DEFAULT_SIZE: Size = { width: 320, height: 400 };
export const MOBILE_MIN_SIZE: Size = { width: 280, height: 200 };

// Docked (minimized) state
export const DOCKED_HANDLE_WIDTH = 28; // Width of visible handle when docked
export const DOCKED_HEIGHT = 100; // Height of docked handle

// Edge detection threshold for swipe-to-dock
export const DOCK_EDGE_THRESHOLD = 5; // px - only dock when frame hits the edge

// Animation duration in ms
export const ANIMATION_DURATION = 200;

// Momentum/Inertia settings
export const MOMENTUM_FRICTION = 0.92; // Friction factor (0-1, higher = less friction)
export const MOMENTUM_MIN_VELOCITY = 0.5; // Stop animation when velocity drops below this
export const MOMENTUM_MULTIPLIER = 8; // Velocity multiplier for more noticeable effect
export const DOCK_MIN_VELOCITY = 2; // Minimum velocity required to dock when hitting edge

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
    dockLeft: (y?: number) => void;
    dockRight: (y?: number) => void;
    undock: () => void;
    maximize: () => void;
    restore: () => void;
    close: () => void;
    updatePosition: (position: Position) => void;
    updateSize: (size: Size) => void;
    bringToFront: () => void;
    checkAndDock: (position: Position) => boolean; // Returns true if docked
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

