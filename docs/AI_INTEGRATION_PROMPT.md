# GlideFrame - Detachable iframe Integration Guide

> **Bu döküman, başka bir AI asistanının bu library'yi bir projeye entegre etmesi için hazırlanmış detaylı bir prompt/guide'dır.**

## 🎯 Ne İşe Yarar?

**GlideFrame**, sayfadaki herhangi bir içeriği (özellikle iframe) **pop-out yaparak floating window'a dönüştüren** bir React component'tir.

**Kritik Özellik:** iframe içeriği detach/attach edildiğinde **STATE KORUNUR** - yani video oynatma pozisyonu, form input'ları, scroll pozisyonu kaybolmaz.

## 📦 Kurulum

```bash
npm install glide-frame
# veya
pnpm add glide-frame
# veya
yarn add glide-frame
```

**Peer Dependencies (zaten projenizde olmalı):**
- `react` >= 18.0.0
- `react-dom` >= 18.0.0

## 🔧 Temel Kullanım - Detachable iframe

### 1. Provider Kurulumu (Opsiyonel - GlideFrame için gerekli, DetachableContent için değil)

```tsx
// app/layout.tsx veya _app.tsx
import { GlideFrameProvider } from "glide-frame";

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
```

### 2. DetachableContent ile iframe Kullanımı

```tsx
"use client"; // Next.js App Router için gerekli

import { DetachableContent } from "glide-frame";

export function MyVideoPlayer() {
  return (
    <DetachableContent
      id="my-video-1"
      title="Video Player"
      headerStyle={{
        backgroundColor: "#dc2626",
        textColor: "#fff",
        buttonColor: "#fff"
      }}
      frameStyle={{
        borderRadius: 12,
        borderColor: "#dc2626",
        borderWidth: 2
      }}
    >
      <iframe
        src="https://your-iframe-url.com"
        className="w-full aspect-video border-0 rounded-lg"
        title="Video Player"
        allowFullScreen
      />
    </DetachableContent>
  );
}
```

## 📝 DetachableContent Props

| Prop | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `id` | `string` | ✅ | - | Unique identifier |
| `title` | `string` | ✅ | - | Floating header'da gösterilen başlık |
| `children` | `ReactNode` | ✅ | - | İçerik (iframe, component, vb.) |
| `headerStyle` | `HeaderStyleOptions` | ❌ | - | Header stil ayarları |
| `frameStyle` | `FrameStyleOptions` | ❌ | - | Frame stil ayarları |
| `detachButtonPosition` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | ❌ | `"top-right"` | Pop-out butonunun konumu |
| `className` | `string` | ❌ | - | Container için CSS class |
| `placeholderClassName` | `string` | ❌ | - | Detach edildiğinde kalan placeholder için class |
| `lockAspectRatio` | `boolean` | ❌ | `false` | Resize sırasında en-boy oranını koru |

## 🎨 Style Options

### HeaderStyleOptions

```typescript
interface HeaderStyleOptions {
  backgroundColor?: string;    // "#dc2626" veya "linear-gradient(90deg, #f59e0b, #ef4444)"
  textColor?: string;          // "#fff"
  buttonColor?: string;        // "#fff"
  buttonHoverColor?: string;   // "#ccc"
  height?: number;             // 44 (px)
  showMaximize?: boolean;      // true
  showClose?: boolean;         // true
  className?: string;          // Ek CSS class
}
```

### FrameStyleOptions

```typescript
interface FrameStyleOptions {
  backgroundColor?: string;    // Frame arka plan rengi
  borderColor?: string;        // "#dc2626"
  borderWidth?: number;        // 2 (px)
  borderRadius?: number;       // 12 (px)
  boxShadow?: string;          // "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
  className?: string;          // Ek CSS class
}
```

## 🎮 Kullanım Senaryoları

### Senaryo 1: Video/Stream Embed
```tsx
<DetachableContent id="stream-1" title="Live Stream">
  <iframe src="https://twitch.tv/embed/channel" className="w-full h-full" />
</DetachableContent>
```

### Senaryo 2: 3D Model Viewer

```tsx
<DetachableContent id="model-1" title="3D Model" lockAspectRatio>
  <iframe src="https://sketchfab.com/embed/model-id" className="w-full aspect-square" />
</DetachableContent>
```

### Senaryo 3: External Dashboard

```tsx
<DetachableContent
  id="dashboard-1"
  title="Analytics"
  frameStyle={{ backgroundColor: "#1a1a2e" }}
>
  <iframe src="https://grafana.example.com/dashboard" className="w-full h-[400px]" />
</DetachableContent>
```

## ⚙️ Nasıl Çalışıyor (Teknik Detay)

**iframe state'inin korunması için kritik mimari:**

1. **Children ASLA conditional render edilmez** - React'ın unmount/remount yapmasını önler
2. **CSS position değişir** - `position: relative` (inline) ↔ `position: fixed` (floating)
3. **Rnd component her zaman wrapper** - Sadece drag/resize enable/disable edilir
4. **DOM node asla hareket etmez** - Aynı React tree location'da kalır

```text
INLINE MODE:
┌─────────────────────────────┐
│ <div position:relative>     │
│   <Rnd disabled>            │
│     {children} ← iframe     │
│   </Rnd>                    │
│   <DetachButton/>           │
│ </div>                      │
└─────────────────────────────┘

FLOATING MODE:
┌─────────────────────────────┐
│ <Placeholder/>              │  ← Orijinal konumda boşluk
└─────────────────────────────┘
┌─────────────────────────────┐
│ <div position:fixed>        │  ← Ekranda floating
│   <Rnd enabled>             │
│     <Header/>               │
│     {children} ← iframe     │  ← AYNI INSTANCE!
│   </Rnd>                    │
│ </div>                      │
└─────────────────────────────┘
```

## 🔄 useDetachableState Hook (React State için)

iframe dışında, React component state'i korumak için `useDetachableState` hook'u kullanılır:

```tsx
import { useDetachableState } from "glide-frame";

function MyComponent() {
  // Normal useState yerine
  const [count, setCount] = useDetachableState("unique-id", 0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

**NOT:** iframe için bu hook'a gerek yok - iframe kendi internal state'ini tutar ve DOM unmount olmadığı sürece korur.

## 🚨 Dikkat Edilecekler

### ✅ DOĞRU Kullanım

```tsx
// iframe aspect-ratio ile
<DetachableContent id="video-1" title="Video">
  <iframe src="..." className="w-full aspect-video" />
</DetachableContent>

// Sabit height ile
<DetachableContent id="embed-1" title="Embed">
  <iframe src="..." className="w-full h-[300px]" />
</DetachableContent>
```

### ❌ YANLIŞ Kullanım

```tsx
// Height belirtilmemiş - sorun yaratır
<DetachableContent id="bad-1" title="Bad">
  <iframe src="..." className="w-full" />  {/* h-full veya aspect-ratio YOK! */}
</DetachableContent>
```

## 📱 Responsive Davranış

- **Desktop (≥768px):** Min genişlik 400px, pozisyon x:20 y:80
- **Mobile (<768px):** Ekrana sığacak şekilde, pozisyon x:20 y:60
- **Resize:** Corner'lardan tutup boyutlandırılabilir
- **Drag:** Header'dan tutup sürüklenebilir
- **Maximize:** Çift tıklama veya maximize butonu ile tam ekran

## 🎯 Entegrasyon Checklist

- [ ] `glide-frame` paketi kuruldu
- [ ] Component'ler `"use client"` directive ile işaretlendi (Next.js App Router)
- [ ] Her DetachableContent için unique `id` verildi
- [ ] iframe'lere `aspect-ratio` veya sabit `height` verildi
- [ ] `title` prop'u anlamlı bir değer içeriyor
- [ ] (Opsiyonel) `headerStyle` ve `frameStyle` ile branding uygulandı

## 📄 Tam Örnek

```tsx
"use client";

import { DetachableContent } from "glide-frame";

export default function VideoSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* Video 1 */}
      <DetachableContent
        id="promo-video"
        title="Product Demo"
        headerStyle={{
          backgroundColor: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          textColor: "#fff",
          buttonColor: "#fff",
        }}
        frameStyle={{
          borderRadius: 16,
          borderColor: "#6366f1",
          borderWidth: 2,
          boxShadow: "0 20px 40px -12px rgba(99, 102, 241, 0.4)",
        }}
      >
        <iframe
          src="https://www.youtube.com/embed/VIDEO_ID"
          className="w-full aspect-video border-0 rounded-lg"
          title="Product Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </DetachableContent>

      {/* Video 2 */}
      <DetachableContent
        id="tutorial-video"
        title="Tutorial"
        detachButtonPosition="bottom-right"
        lockAspectRatio
      >
        <iframe
          src="https://player.vimeo.com/video/VIDEO_ID"
          className="w-full aspect-video border-0 rounded-lg"
          title="Tutorial"
          allowFullScreen
        />
      </DetachableContent>
    </div>
  );
}
```

---

**Library GitHub:** [github.com/atknatk/glide-frame](https://github.com/atknatk/glide-frame)
**npm:** [npmjs.com/package/glide-frame](https://www.npmjs.com/package/glide-frame)
