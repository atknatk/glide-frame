"use client";

import { useState, useSyncExternalStore } from "react";
import { GlideFrame } from "@/components/glide-frame";
import { Play, Video, Gamepad2, Layout } from "lucide-react";

const MOBILE_BREAKPOINT = 768;

// Hook for responsive size
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

// Demo component to show inside GlideFrame
function DemoContent({ title, color }: { title: string; color: string }) {
  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center gap-4 ${color}`}
    >
      <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      <p className="text-white/80 text-center px-4 text-sm md:text-base">
        Draggable & resizable container.
        <br />
        Kenara sürükle → Dock!
      </p>
    </div>
  );
}

interface FrameConfig {
  id: string;
  title: string;
  type: "iframe" | "video" | "component" | "game";
}

export default function Home() {
  const [frames, setFrames] = useState<FrameConfig[]>([]);
  const isMobile = useIsMobile();

  const addFrame = (type: FrameConfig["type"]) => {
    const id = `frame-${Date.now()}`;
    const titles: Record<FrameConfig["type"], string> = {
      iframe: "Web Content",
      video: "Video Player",
      component: "React Component",
      game: "Slot Game",
    };
    setFrames((prev) => [...prev, { id, title: titles[type], type }]);
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  };

  const renderFrameContent = (frame: FrameConfig) => {
    switch (frame.type) {
      case "iframe":
        return (
          <iframe
            src="https://example.com"
            className="w-full h-full border-0"
            title="Web Content"
          />
        );
      case "video":
        return (
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            className="w-full h-full border-0"
            title="YouTube Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      case "component":
        return <DemoContent title="React Component" color="bg-gradient-to-br from-purple-500 to-pink-500" />;
      case "game":
        return <DemoContent title="🎰 Slot Game" color="bg-gradient-to-br from-amber-500 to-red-500" />;
      default:
        return null;
    }
  };

  // Responsive frame sizes
  const getFrameSize = () => {
    if (isMobile) {
      const width = typeof window !== "undefined" ? window.innerWidth - 40 : 300;
      return { width: Math.min(width, 340), height: 280 };
    }
    return { width: 480, height: 320 };
  };

  // Responsive frame position
  const getFramePosition = (index: number) => {
    if (isMobile) {
      return { x: 20, y: 100 + index * 30 };
    }
    return { x: 100 + index * 40, y: 100 + index * 40 };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            GlideFrame Demo
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            YouTube mini player benzeri draggable & resizable floating container.
            Siteyi gezerken container köşede kalır.
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12">
          <button
            onClick={() => addFrame("component")}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all"
          >
            <Layout className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">React</span> Component
          </button>
          <button
            onClick={() => addFrame("video")}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            Video
          </button>
          <button
            onClick={() => addFrame("iframe")}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all"
          >
            <Play className="w-4 h-4 md:w-5 md:h-5" />
            iFrame
          </button>
          <button
            onClick={() => addFrame("game")}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all"
          >
            <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
            Game
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">📱 Swipe to Dock</h3>
            <p className="text-slate-400 text-sm md:text-base">
              Kenara sürükle, dock olsun. Centik&apos;e dokun, geri gelsin.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">🔄 Draggable</h3>
            <p className="text-slate-400 text-sm md:text-base">
              Header&apos;dan sürükle. Ekran sınırları içinde kalır.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">📐 Resizable</h3>
            <p className="text-slate-400 text-sm md:text-base">
              Köşelerden boyutlandır. Multi-instance z-index.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 md:mt-12 text-center text-slate-500 text-xs md:text-sm px-4">
          <p>💡 Kenara sürükle: Dock • Centik&apos;e tıkla: Geri getir • Double-tap: Maximize</p>
        </div>
      </main>

      {/* GlideFrame Instances */}
      {frames.map((frame, index) => (
        <GlideFrame
          key={frame.id}
          id={frame.id}
          title={frame.title}
          defaultPosition={getFramePosition(index)}
          defaultSize={getFrameSize()}
          onClose={() => removeFrame(frame.id)}
        >
          {renderFrameContent(frame)}
        </GlideFrame>
      ))}
    </div>
  );
}
