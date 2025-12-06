"use client";

import { Check } from "lucide-react";

const features = [
  { title: "Draggable", description: "Drag frames anywhere on screen using the header" },
  { title: "Resizable", description: "Resize from any corner or edge" },
  { title: "Dock to Edge", description: "Drag to screen edge to minimize and dock" },
  { title: "Maximize", description: "Double-click or tap maximize button for fullscreen" },
  { title: "Persistent State", description: "Position and size saved to localStorage" },
  { title: "Multi-Instance", description: "Open multiple frames with proper z-index management" },
  { title: "Customizable Styles", description: "Configure header and frame colors, borders, shadows" },
  { title: "Mobile Friendly", description: "Touch gestures and responsive sizing" },
  { title: "Page Navigation", description: "Frames persist while navigating between pages" },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-14">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Features</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Everything you need to create floating, draggable containers in your Next.js app.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500">
            Open a frame on the home page and navigate here - it will stay visible!
          </p>
        </div>
      </main>
    </div>
  );
}

