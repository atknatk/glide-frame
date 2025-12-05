"use client";

import { useState } from "react";
import { GlideFrame } from "@/components/glide-frame";
import { Play, Video, Gamepad2, Layout } from "lucide-react";

// Demo component to show inside GlideFrame
function DemoContent({ title, color }: { title: string; color: string }) {
  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center gap-4 ${color}`}
    >
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-white/80 text-center px-4">
        This is a draggable and resizable container.
        <br />
        Try moving it around!
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
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => addFrame("component")}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Layout className="w-5 h-5" />
            React Component
          </button>
          <button
            onClick={() => addFrame("video")}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Video className="w-5 h-5" />
            Video Embed
          </button>
          <button
            onClick={() => addFrame("iframe")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Play className="w-5 h-5" />
            iFrame Content
          </button>
          <button
            onClick={() => addFrame("game")}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <Gamepad2 className="w-5 h-5" />
            Slot Game
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-2">Draggable</h3>
            <p className="text-slate-400">
              Header&apos;dan tutarak sürükleyin. Ekran sınırları içinde kalır.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-2">Resizable</h3>
            <p className="text-slate-400">
              Kenarlardan ve köşelerden boyutlandırın. Min/Max sınırları var.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Instance</h3>
            <p className="text-slate-400">
              Birden fazla frame açın. Tıklanan üste gelir (z-index).
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>💡 Minimize: Sağ alt köşeye küçülür • Maximize: Full-screen olur • Double-click: Toggle maximize</p>
        </div>
      </main>

      {/* GlideFrame Instances */}
      {frames.map((frame, index) => (
        <GlideFrame
          key={frame.id}
          id={frame.id}
          title={frame.title}
          defaultPosition={{
            x: 100 + index * 50,
            y: 100 + index * 50,
          }}
          defaultSize={{ width: 640, height: 400 }}
          onClose={() => removeFrame(frame.id)}
        >
          {renderFrameContent(frame)}
        </GlideFrame>
      ))}
    </div>
  );
}
