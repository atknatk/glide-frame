"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-14">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 text-center">About GlideFrame</h1>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">What is GlideFrame?</h2>
            <p className="text-slate-300 mb-4">
              GlideFrame is a React component inspired by YouTube&apos;s mini-player feature. It provides a 
              draggable, resizable floating container that can hold any content - videos, iframes, 
              custom React components, or anything else you need.
            </p>
            <p className="text-slate-300">
              Perfect for video players, chat widgets, notifications, or any content that needs to 
              stay visible while users navigate your application.
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Tech Stack</h2>
            <ul className="space-y-2 text-slate-300">
              <li>• <strong className="text-white">Next.js 15</strong> - App Router with React Server Components</li>
              <li>• <strong className="text-white">React 19</strong> - Latest React features</li>
              <li>• <strong className="text-white">TypeScript</strong> - Full type safety</li>
              <li>• <strong className="text-white">Tailwind CSS 4</strong> - Utility-first styling</li>
              <li>• <strong className="text-white">react-rnd</strong> - Drag and resize functionality</li>
              <li>• <strong className="text-white">Lucide Icons</strong> - Beautiful icon set</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Usage</h2>
            <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm text-slate-300">
{`import { GlideFrame } from "@/components/glide-frame";

<GlideFrame
  id="my-frame"
  title="Video Player"
  headerStyle={{
    backgroundColor: "#dc2626",
    textColor: "#ffffff",
    buttonColor: "#ffffff",
  }}
  frameStyle={{
    borderRadius: 12,
    borderColor: "#dc2626",
  }}
>
  <YourContent />
</GlideFrame>`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}

