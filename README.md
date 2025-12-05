# GlideFrame

YouTube mini player benzeri draggable ve resizable floating container. Next.js 16 için React library.

## Özellikler

- 🖱️ **Draggable** - Header'dan tutarak sürüklenebilir
- 📐 **Resizable** - Kenarlardan ve köşelerden boyutlandırılabilir
- 📱 **Mobile First** - Touch support ve responsive tasarım
- 🎯 **Multi-Instance** - Birden fazla frame açılabilir, tıklanan üste gelir
- 💾 **localStorage** - Pozisyon ve boyut otomatik kaydedilir
- ✨ **Glassmorphism** - Modern blur backdrop styling
- 🌙 **Dark Mode** - shadcn/ui theme desteği

## Kurulum

```bash
pnpm add react-rnd lucide-react
pnpm dlx shadcn@latest init
```

## Kullanım

```tsx
import { GlideFrame } from "@/components/glide-frame";

function App() {
  return (
    <GlideFrame
      id="unique-id"
      title="Frame Title"
      defaultPosition={{ x: 100, y: 100 }}
      defaultSize={{ width: 800, height: 600 }}
      onClose={() => console.log("Closed")}
    >
      {/* iframe veya React component */}
      <iframe src="https://example.com" className="w-full h-full" />
    </GlideFrame>
  );
}
```

## Props

| Prop | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `id` | `string` | - | Unique identifier (zorunlu) |
| `title` | `string` | - | Header'da gösterilen başlık |
| `defaultPosition` | `{ x, y }` | Sağ üst köşe | Başlangıç pozisyonu |
| `defaultSize` | `{ width, height }` | 800x600 | Başlangıç boyutu |
| `minSize` | `{ width, height }` | 400x300 | Minimum boyut |
| `maxSize` | `{ width, height }` | Ekran - 40px | Maximum boyut |
| `onClose` | `() => void` | - | Kapanış callback |
| `onStateChange` | `(state) => void` | - | State değişim callback |
| `persist` | `boolean` | `true` | localStorage'a kaydet |
| `className` | `string` | - | Ek CSS class |

## Kontroller

- **Minimize**: Container 300x60 boyutuna küçülür, sağ alt köşeye gider
- **Maximize**: Full-screen olur (20px padding), drag disable
- **Close**: Fade-out animasyonu ile kapanır
- **Restore**: Önceki boyut ve pozisyona döner
- **Double-click Header**: Maximize/Restore toggle

## Component Yapısı

```text
/components/glide-frame
├── GlideFrame.tsx       # Ana component
├── GlideFrameHeader.tsx # Header + butonlar
├── types.ts             # TypeScript tipleri
├── index.ts             # Exports
└── hooks/
    └── useGlideFrame.ts # State management hook
```

## Teknik Stack

- Next.js 16
- React 19
- TypeScript
- react-rnd
- shadcn/ui
- Tailwind CSS 4
- lucide-react

## Geliştirme

```bash
# Bağımlılıkları yükle
pnpm install

# Development server
pnpm dev

# Build
pnpm build
```

## Lisans

MIT
