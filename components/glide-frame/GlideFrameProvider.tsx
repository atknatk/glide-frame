"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { GlideFrame } from "./GlideFrame";
import { HeaderStyleOptions, FrameStyleOptions, Size, Position } from "./types";

interface FrameConfig {
  id: string;
  title: string;
  content: ReactNode;
  defaultPosition?: Position;
  defaultSize?: Size;
  headerStyle?: HeaderStyleOptions;
  frameStyle?: FrameStyleOptions;
}

interface GlideFrameContextValue {
  frames: FrameConfig[];
  openFrame: (config: FrameConfig) => void;
  closeFrame: (id: string) => void;
  closeAllFrames: () => void;
}

const GlideFrameContext = createContext<GlideFrameContextValue | null>(null);

export function useGlideFrameContext() {
  const context = useContext(GlideFrameContext);
  if (!context) {
    throw new Error("useGlideFrameContext must be used within GlideFrameProvider");
  }
  return context;
}

interface GlideFrameProviderProps {
  children: ReactNode;
}

export function GlideFrameProvider({ children }: GlideFrameProviderProps) {
  const [frames, setFrames] = useState<FrameConfig[]>([]);

  const openFrame = useCallback((config: FrameConfig) => {
    setFrames((prev) => {
      // If frame with same id exists, update it
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

  return (
    <GlideFrameContext.Provider value={{ frames, openFrame, closeFrame, closeAllFrames }}>
      {children}
      {/* Render all frames */}
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
    </GlideFrameContext.Provider>
  );
}

