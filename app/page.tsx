"use client";

import { useSyncExternalStore } from "react";
import { useGlideFrameContext, DetachableContent } from "@/components/glide-frame";
import { Play, Video, Gamepad2, Layout, Package } from "lucide-react";

const MOBILE_BREAKPOINT = 768;

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

function DemoContent({ title, color }: { title: string; color: string }) {
  return (
    <div className={`h-full w-full flex flex-col items-center justify-center gap-4 ${color}`}>
      <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      <p className="text-white/80 text-center px-4 text-sm md:text-base">
        Draggable & resizable container.
        <br />
        Drag to edge → Dock!
      </p>
    </div>
  );
}

type FrameType = "iframe" | "video" | "component" | "game";

export default function Home() {
  const { openFrame, frames } = useGlideFrameContext();
  const isMobile = useIsMobile();

  const getFrameSize = () => {
    if (isMobile) {
      const width = typeof window !== "undefined" ? window.innerWidth - 40 : 300;
      return { width: Math.min(width, 340), height: 280 };
    }
    return { width: 480, height: 320 };
  };

  const getFramePosition = () => {
    const index = frames.length;
    if (isMobile) return { x: 20, y: 80 + index * 30 };
    return { x: 100 + index * 40, y: 80 + index * 40 };
  };

  const getFrameStyles = (type: FrameType) => {
    switch (type) {
      case "video":
        return {
          headerStyle: { backgroundColor: "#dc2626", textColor: "#fff", buttonColor: "#fff", height: 36 },
          frameStyle: { borderRadius: 12, borderColor: "#dc2626", borderWidth: 2 },
        };
      case "game":
        return {
          headerStyle: { backgroundColor: "linear-gradient(90deg, #f59e0b, #ef4444)", textColor: "#fff", buttonColor: "#fff", height: 40 },
          frameStyle: { borderRadius: 16, boxShadow: "0 0 30px rgba(245, 158, 11, 0.3)" },
        };
      case "component":
        return {
          headerStyle: { backgroundColor: "#7c3aed", textColor: "#fff", buttonColor: "#fff" },
          frameStyle: { borderColor: "#7c3aed", borderWidth: 1 },
        };
      default:
        return {};
    }
  };

  const getFrameContent = (type: FrameType) => {
    switch (type) {
      case "iframe":
        return <iframe src="https://example.com" className="w-full h-full border-0" title="Web Content" />;
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

  const addFrame = (type: FrameType) => {
    const id = `frame-${Date.now()}`;
    const titles: Record<FrameType, string> = { iframe: "Web Content", video: "Video Player", component: "React Component", game: "Slot Game" };
    const styles = getFrameStyles(type);
    openFrame({ id, title: titles[type], content: getFrameContent(type), defaultPosition: getFramePosition(), defaultSize: getFrameSize(), ...styles });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-14">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">GlideFrame Demo</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
            A YouTube mini-player inspired draggable & resizable floating container. The frame persists while navigating between pages.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/atknatk/glide-frame"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/glide-frame"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              <Package className="w-5 h-5" />
              npm
            </a>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12">
          <button onClick={() => addFrame("component")} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all">
            <Layout className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">React</span> Component
          </button>
          <button onClick={() => addFrame("video")} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all">
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            Video
          </button>
          <button onClick={() => addFrame("iframe")} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all">
            <Play className="w-4 h-4 md:w-5 md:h-5" />
            iFrame
          </button>
          <button onClick={() => addFrame("game")} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-sm md:text-base rounded-lg transition-all">
            <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
            Game
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">📱 Swipe to Dock</h3>
            <p className="text-slate-400 text-sm md:text-base">Drag to edge to dock. Tap the handle to restore.</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">🔄 Draggable</h3>
            <p className="text-slate-400 text-sm md:text-base">Drag from header. Stays within screen bounds.</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1 md:mb-2">📐 Resizable</h3>
            <p className="text-slate-400 text-sm md:text-base">Resize from corners. Multi-instance z-index support.</p>
          </div>
        </div>

        {/* Detachable Content Demo */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🎯 Detachable Content Demo</h2>
          <p className="text-slate-400 text-center mb-6">
            Hover over the video and click the pop-out button. The video will float without reloading!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetachableContent
              id="demo-video-1"
              title="YouTube Video"
              headerStyle={{ backgroundColor: "#dc2626", textColor: "#fff", buttonColor: "#fff" }}
              frameStyle={{ borderRadius: 12, borderColor: "#dc2626", borderWidth: 2 }}
            >
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                className="w-full aspect-video border-0 rounded-lg"
                title="YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </DetachableContent>

            <DetachableContent
              id="demo-component-1"
              title="Interactive Component"
              headerStyle={{ backgroundColor: "#7c3aed", textColor: "#fff", buttonColor: "#fff" }}
              frameStyle={{ borderRadius: 12, borderColor: "#7c3aed", borderWidth: 2 }}
            >
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <h3 className="text-xl font-bold mb-2">Interactive Component</h3>
                  <p className="text-white/80 text-sm">This component preserves its state when detached!</p>
                  <button className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    Click Me
                  </button>
                </div>
              </div>
            </DetachableContent>
          </div>
        </div>

        <div className="mt-8 md:mt-12 text-center text-slate-500 text-xs md:text-sm px-4">
          <p>💡 Drag to edge: Dock • Click handle: Restore • Double-tap: Maximize</p>
        </div>
      </main>
    </div>
  );
}