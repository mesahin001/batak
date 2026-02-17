# "Unable to Load Script" - Final Fix

## Durum
✅ Build başarılı (357 KB)
✅ TypeScript hatasız
✅ Vite dev server başladı (port 5173)
❌ Tarayıcıda "unable to load script" hatası

## Root Cause
Bu hata genellikle **Service Worker (PWA)** cache'inden kaynaklanır.

## Çözüm Adımları (SIRASI ÖNEMLI)

### 1. Service Worker'ı Unregister Et

**Tarayıcıda:**
```
1. F12 aç (DevTools)
2. Application tab'a git
3. Sol menüde "Service Workers" seç
4. "Unregister" butonuna tıkla (her SW için)
5. "Clear storage" butonuna tıkla
```

**VEYA Chrome URL'den:**
```
chrome://serviceworker-internals/
→ Tüm batak-related SW'leri "Unregister" et
```

### 2. Cache'i Tamamen Temizle

**DevTools → Application:**
```
Storage → Clear storage → "Clear site data"
```

**VEYA:**
```
Cmd+Shift+Delete
→ "All time"
→ All checkboxes
→ Clear data
```

### 3. Tarayıcıyı Kapat ve Yeniden Aç

**CRITICAL:** Sadece tab kapatma yetmez!
```
Chrome'u TAMAMEN kapat (Cmd+Q)
Yeniden aç
```

### 4. Dev Server'ı Restart Et

```bash
# Terminal'de:
cd /Users/mesahin/batak/client
pkill -9 -f vite
rm -rf node_modules/.vite
npm run dev
```

### 5. Incognito'da Test Et (PWA olmadan)

```
Cmd+Shift+N (incognito)
http://localhost:5173
```

Eğer incognito'da çalışıyorsa → %100 PWA/SW cache sorunu.

## Alternatif: PWA'yı Geçici Olarak Devre Dışı Bırak

Eğer yukarıdakiler işe yaramazsa, PWA'yı geçici olarak kapat:

**vite.config.ts:**
```typescript
export default defineConfig({
  plugins: [
    react(),
    // VitePWA({ ... })  // ← Bunu comment out et
  ],
  // ...
});
```

Sonra:
```bash
pkill -9 -f vite
rm -rf dist node_modules/.vite
npm run dev
```

## Debug Info

**Şu komutu çalıştır ve çıktısını gönder:**
```bash
echo "=== DEBUG INFO ==="
echo "1. Vite running:"
lsof -ti:5173 && echo "YES" || echo "NO"
echo ""
echo "2. Build files:"
ls -lh dist/*.html 2>/dev/null || echo "No build files"
echo ""
echo "3. Service worker:"
ls -lh dist/sw.js 2>/dev/null || echo "No SW"
echo ""
echo "4. Vite cache:"
ls -lh node_modules/.vite 2>/dev/null || echo "No cache"
echo ""
echo "5. Test server:"
curl -s http://localhost:5173 | grep -o '<script.*src.*' | head -3
```

## Son Çare: Clean Install

Eğer hiçbir şey işe yaramazsa:

```bash
cd /Users/mesahin/batak/client
rm -rf node_modules dist .vite
npm install
npm run dev
```

## Beklenen Sonuç

Tarayıcıda http://localhost:5173 açtığında:
- ✅ Login ekranı görünmeli
- ✅ Console'da hata OLMAMALI
- ✅ Network tab'da tüm script'ler 200 OK dönmeli
