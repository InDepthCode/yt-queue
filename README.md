# YT Queue – Chrome / Edge Extension

Save YouTube videos & playlists to a tidy, searchable watch-later queue.  
Built with React + Vite, Manifest V3.

---

## ️🔧 Local development

1. **Install dependencies**  
   ```bash
   npm install
   ```

2. **Run the dev server**  
   ```bash
   npm run dev
   ```
   Vite serves the popup at `http://localhost:5173`. Hot-reload works as usual.

3. **Load the dev build in Chrome / Edge** (optional)  
   - Open `chrome://extensions` or `edge://extensions` → enable *Developer mode*.  
   - Click *Load unpacked* and pick the project **root** (Vite injects a dev service worker).

> Tip: in dev you can keep DevTools open on the popup and see hot-reloaded changes instantly.

---

## 🚀 Building a production package

```bash
npm run build          # outputs to dist/
```

Everything inside `public/` (manifest + icons) is copied automatically, so `dist/` ends up like:

```
dist/
  assets/                 # bundled JS / CSS
  icons/                  # 16,32,48,128 px PNGs
  index.html              # popup entry
  manifest.json           # Manifest V3
```

### Testing the production build locally
1. Go to `chrome://extensions` or `edge://extensions`.  
2. *Remove* any previous dev build, then **Load unpacked** → select the new `dist/` folder.  
3. Click the toolbar icon – you should see the fully-bundled popup.

---

## 📦 Publishing / Updating in the Chrome Web Store

1. **Bump the version** in `public/manifest.json` (e.g. 0.0.1 → 0.0.2).  
   The Web Store **requires** monotonically increasing versions.

2. **Build & zip**  
   ```bash
   npm run build
   # PowerShell
   Compress-Archive -Path dist\* -DestinationPath yt-queue-0.0.2.zip -Force
   ```

3. **Upload** the ZIP in the Developer Dashboard → *Add new version* → fill release notes → submit.

4. **Edge Add-ons Store**  
   The same ZIP works; follow the Edge dashboard to publish or set auto-import.

---

## 🗑 Cleaning workspace clutter

```
# remove previous build & ZIPs
rd /s /q dist
del yt-queue-*.zip 2>nul

# fresh build
npm run build
```

---

### Tech stack
* React 18
* TypeScript + Vite
* Manifest V3 – no background service worker (popup only)

---

MIT License – free to use & modify.
