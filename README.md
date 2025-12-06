# GlideFrame

[![Deploy to GitHub Pages](https://github.com/atknatk/glide-frame/actions/workflows/deploy.yml/badge.svg)](https://github.com/atknatk/glide-frame/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A YouTube mini-player inspired **draggable and resizable floating container** component for Next.js 16. Create picture-in-picture style floating windows that persist while users navigate your site.

## 🎬 Live Demo

**[View Live Demo →](https://atknatk.github.io/glide-frame)**

## ✨ Features

- 🖱️ **Draggable** - Drag from header to reposition anywhere on screen
- 📐 **Resizable** - Resize from edges and corners with smooth animations
- 📱 **Mobile First** - Full touch support with responsive design
- 🚀 **iOS-Style Momentum** - Physics-based throwing with velocity and friction
- 🎯 **Dock to Edge** - Swipe to edge to minimize, tap handle to restore
- 🎯 **Multi-Instance** - Multiple frames with automatic z-index management
- 💾 **Persistent State** - Position and size saved to localStorage
- ✨ **Glassmorphism** - Modern blur backdrop with beautiful styling
- 🌙 **Dark Mode** - Full support for light/dark themes via shadcn/ui
- ⚡ **60 FPS** - Hardware-accelerated animations for smooth performance
- 🔧 **Fully Typed** - Complete TypeScript support with exported types
- 🎥 **Stateful Detach** - Pop-out iframe/video without reloading (preserves state)

## 📦 Installation

```bash
# Install dependencies
pnpm add react-rnd lucide-react

# Initialize shadcn/ui (if not already done)
pnpm dlx shadcn@latest init
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { GlideFrame } from "@/components/glide-frame";

function App() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <GlideFrame
      id="my-frame"
      title="My Floating Window"
      defaultPosition={{ x: 100, y: 100 }}
      defaultSize={{ width: 480, height: 320 }}
      onClose={() => setIsOpen(false)}
    >
      {/* Any content: iframe, video, React components */}
      <iframe
        src="https://example.com"
        className="w-full h-full border-0"
      />
    </GlideFrame>
  );
}
```

### Persistent Frames Across Pages

Use `GlideFrameProvider` in your layout to keep frames visible while navigating:

```tsx
// app/layout.tsx
import { GlideFrameProvider } from "@/components/glide-frame";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GlideFrameProvider>
          {children}
        </GlideFrameProvider>
      </body>
    </html>
  );
}

// Any page component
import { useGlideFrameContext } from "@/components/glide-frame";

function MyPage() {
  const { openFrame, closeFrame } = useGlideFrameContext();

  const handleOpenVideo = () => {
    openFrame({
      id: "video-player",
      title: "Video Player",
      content: <iframe src="https://youtube.com/embed/..." />,
      defaultSize: { width: 480, height: 320 },
      headerStyle: { backgroundColor: "#dc2626", buttonColor: "#fff" },
    });
  };

  return <button onClick={handleOpenVideo}>Open Video</button>;
}
```

## 📖 API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique identifier for the frame instance |
| `title` | `string` | `undefined` | Title displayed in the header bar |
| `defaultPosition` | `{ x: number, y: number }` | Top-right corner | Initial position on screen |
| `defaultSize` | `{ width: number, height: number }` | `800x600` | Initial dimensions |
| `minSize` | `{ width: number, height: number }` | `400x300` (desktop) / `280x200` (mobile) | Minimum resize constraints |
| `maxSize` | `{ width: number, height: number }` | Screen size - 40px | Maximum resize constraints |
| `onClose` | `() => void` | `undefined` | Callback when close button is clicked |
| `onStateChange` | `(state: GlideFrameState) => void` | `undefined` | Callback when state changes |
| `persist` | `boolean` | `true` | Whether to persist position/size to localStorage |
| `className` | `string` | `undefined` | Additional CSS classes for the container |
| `children` | `ReactNode` | `undefined` | Content to render inside the frame |

### State Object

The `onStateChange` callback receives a state object with:

```typescript
interface GlideFrameState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  isDocked: boolean;
  dockedSide: 'left' | 'right' | null;
  isVisible: boolean;
  zIndex: number;
}
```

## 🎮 Controls & Interactions

### Header Buttons

| Button | Action |
|--------|--------|
| □ | Maximize to fullscreen |
| ↺ | Restore from maximized/docked state |
| × | Close the frame |

### Gestures

- **Drag Header** - Move the frame around
- **Double-click/tap Header** - Toggle maximize
- **Throw to Edge** - Momentum-based dock (swipe fast toward edge)
- **Tap Dock Handle** - Restore from docked state
- **Resize Edges/Corners** - Resize the frame

### Keyboard (when focused)

- Frame receives focus on interaction for accessibility

## 🎨 Customization

### Header Style Options

```tsx
<GlideFrame
  id="styled-frame"
  title="Custom Header"
  headerStyle={{
    backgroundColor: "#dc2626",      // Background color or gradient
    textColor: "#ffffff",            // Title text color
    buttonColor: "#ffffff",          // Icon button color
    buttonHoverColor: "#ffcccc",     // Button hover color
    height: 40,                      // Header height in pixels
    showMaximize: true,              // Show/hide maximize button
    showClose: true,                 // Show/hide close button
  }}
>
  <YourContent />
</GlideFrame>
```

### Frame Style Options

```tsx
<GlideFrame
  id="styled-frame"
  title="Custom Frame"
  frameStyle={{
    backgroundColor: "#1e293b",      // Frame background color
    borderColor: "#dc2626",          // Border color
    borderWidth: 2,                  // Border width in pixels
    borderRadius: 12,                // Corner radius in pixels
    boxShadow: "0 0 30px rgba(0,0,0,0.3)", // Custom shadow
  }}
>
  <YourContent />
</GlideFrame>
```

### Combined Example

```tsx
<GlideFrame
  id="video-player"
  title="Video Player"
  headerStyle={{
    backgroundColor: "linear-gradient(90deg, #f59e0b, #ef4444)",
    textColor: "#fff",
    buttonColor: "#fff",
    height: 36,
  }}
  frameStyle={{
    borderRadius: 16,
    boxShadow: "0 0 30px rgba(245, 158, 11, 0.3)",
  }}
>
  <iframe src="https://youtube.com/embed/..." />
</GlideFrame>
```

### DetachableContent - Stateful Pop-out

Convert any inline content (iframe, video, component) to a floating window **without losing state**:

```tsx
import { DetachableContent } from "@/components/glide-frame";

function Page() {
  return (
    <DetachableContent
      id="video-player"
      title="YouTube Video"
      headerStyle={{ backgroundColor: "#dc2626", buttonColor: "#fff" }}
      frameStyle={{ borderRadius: 12, borderColor: "#dc2626", borderWidth: 2 }}
    >
      {/* iframe won't reload when detached! */}
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        className="w-full aspect-video"
        allowFullScreen
      />
    </DetachableContent>
  );
}
```

**How it works:**

- Hover over content → pop-out button appears
- Click pop-out → content floats without reloading
- Placeholder shows where content was
- Click "Restore here" or close → content returns to original position

This is perfect for:

- 🎥 Video players that shouldn't restart
- 🎮 Games with state (canvas, WebGL)
- 📊 Live dashboards with WebSocket connections
- 📝 Forms with user input

### Momentum Physics

Adjust the physics constants in `types.ts`:

```typescript
export const MOMENTUM_FRICTION = 0.92;    // 0-1, higher = slides further
export const MOMENTUM_MIN_VELOCITY = 0.5; // Stop threshold
export const MOMENTUM_MULTIPLIER = 8;     // Velocity amplification
export const DOCK_MIN_VELOCITY = 2;       // Min speed to trigger dock
```

## 📁 Project Structure

```text
components/glide-frame/
├── GlideFrame.tsx          # Main component with react-rnd integration
├── GlideFrameHeader.tsx    # Header bar with control buttons
├── GlideFrameProvider.tsx  # Context provider for persistent frames
├── DetachableContent.tsx   # Stateful pop-out wrapper (preserves iframe state)
├── types.ts                # TypeScript interfaces and constants
├── index.ts                # Public exports
└── hooks/
    └── useGlideFrame.ts    # State management hook with localStorage
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [react-rnd](https://github.com/bokuweb/react-rnd) | Drag and resize functionality |
| [shadcn/ui](https://ui.shadcn.com/) | UI components and theming |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Lucide React](https://lucide.dev/) | Icons |

## 💻 Development

```bash
# Clone the repository
git clone https://github.com/atknatk/glide-frame.git
cd glide-frame

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

## 🚀 Deployment

This project uses GitHub Actions for automatic deployment to GitHub Pages.

Every push to `main` triggers:

1. Install dependencies
2. Build the Next.js application
3. Deploy to GitHub Pages

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
