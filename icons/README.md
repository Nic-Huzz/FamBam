# FamBam - Project Assets

Splash screen, app icons, and base styles for the FamBam family connection app.

## 📁 File Structure

```
fambam-project/
├── public/
│   ├── favicon.svg          # Browser tab icon
│   ├── apple-touch-icon.svg # iOS home screen icon (convert to PNG)
│   └── manifest.json        # PWA manifest
├── src/
│   ├── assets/
│   │   └── app-icon.svg     # Master icon (1024x1024, convert for App Store)
│   ├── components/
│   │   ├── SplashScreen.jsx          # Inline styles version
│   │   └── SplashScreenTailwind.jsx  # Tailwind CSS version
│   └── index.css            # Global styles + component classes
├── index.html               # Entry point with all meta tags
├── tailwind.config.js       # Tailwind with FamBam theme
└── README.md                # This file
```

## 🚀 Setup Instructions

### 1. Create a new Vite + React project
```bash
npm create vite@latest fambam -- --template react
cd fambam
```

### 2. Copy these files into your project
- Copy all files from this folder into your new project
- Replace the default `index.html`, `src/index.css`, etc.

### 3. Install dependencies
```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4. Replace the generated `tailwind.config.js` with the one in this folder

### 5. Convert SVG icons to PNG
The SVG icons need to be converted to PNG for iOS:

**Option A: Online converter**
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `app-icon.svg` → download as 1024x1024 PNG
3. Upload `apple-touch-icon.svg` → download as 180x180 PNG

**Option B: Using Sharp (Node.js)**
```bash
npm install sharp
```
```javascript
// convert-icons.js
const sharp = require('sharp');

// App Store icon
sharp('src/assets/app-icon.svg')
  .resize(1024, 1024)
  .png()
  .toFile('public/icon-1024.png');

// iOS home screen
sharp('public/apple-touch-icon.svg')
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');

// PWA icons
sharp('src/assets/app-icon.svg')
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png');

sharp('src/assets/app-icon.svg')
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png');
```

### 6. Using the Splash Screen

```jsx
// App.jsx
import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
// OR for Tailwind version:
// import SplashScreen from './components/SplashScreenTailwind';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div>
      {/* Your app content */}
    </div>
  );
}

export default App;
```

## 🎨 Design Tokens

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Coral | `#FF6B6B` | Primary, CTAs, active states |
| Tangerine | `#FF8E53` | Gradient accent |
| Sunshine | `#FFE66D` | Highlights, badges |
| Cream | `#FFF9F5` | Page background |
| Blush | `#FFF5F5` | Light backgrounds |
| Charcoal | `#333333` | Headings |
| Gray | `#555555` | Body text |
| Muted | `#999999` | Timestamps |

### Gradients
```css
--gradient-primary: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
--gradient-sunset: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%);
--gradient-soft: linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%);
```

### Border Radius
- Small: `8px`
- Inputs: `14px`
- Cards: `20px`
- Buttons: `30px`
- Avatars: `50%`

### Font
**Nunito** from Google Fonts
- Weights: 400, 600, 700, 800

## 📱 Icon Sizes Needed

| Purpose | Size | File |
|---------|------|------|
| App Store | 1024×1024 | icon-1024.png |
| iPhone @3x | 180×180 | apple-touch-icon.png |
| iPhone @2x | 120×120 | icon-120.png |
| PWA | 512×512 | icon-512.png |
| PWA | 192×192 | icon-192.png |
| Favicon | 32×32 | favicon.svg (or .ico) |

## ✅ Checklist

- [ ] Copy files to project
- [ ] Install Tailwind CSS
- [ ] Convert SVG icons to PNG
- [ ] Test splash screen animation
- [ ] Add to iOS home screen to test icon
- [ ] Verify PWA manifest works

---

**Theme:** Warm & Playful 🌅
**Mood:** Like a warm hug from family
