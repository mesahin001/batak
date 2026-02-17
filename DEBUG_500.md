# 500 Hatası Debug Rehberi

## Durum
✅ Server çalışıyor (port 3001)
✅ Client çalışıyor (port 5173)
❌ Ama 500 hatası alıyorsun

## Neyi Kontrol Etmeliyiz?

### 1. Tarayıcı Konsolu
```
1. Chrome/Edge aç
2. F12 bas (DevTools)
3. Console tab'ına git
4. Tüm kırmızı hataları kopyala
```

**Özellikle ara:**
- `SoundManager` hatası
- `generateSounds` hatası
- `import` hatası
- `module not found` hatası

### 2. Network Tab
```
1. F12 → Network tab
2. Sayfayı yenile (Cmd+Shift+R)
3. Kırmızı (failed) isteklere bak
4. Her birine tıkla → Response tab'ı kontrol et
```

**Hangi endpoint 500 veriyor?**
- `http://localhost:5173/...` → Client sorunu (Vite)
- `http://localhost:3001/...` → Server sorunu (API)

### 3. Manuel Testler

```bash
# Client ana sayfa çalışıyor mu?
curl http://localhost:5173

# Server health endpoint çalışıyor mu?
curl http://localhost:3001/health

# Socket.IO bağlanabiliyor mu?
curl http://localhost:3001/socket.io/
```

### 4. Tarayıcı Cache Temizliği

**CRITICAL:** Eski kod cache'lenmiş olabilir!

```
Chrome:
1. Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Win)
2. "Cached images and files" seç
3. Clear data
4. VEYA: DevTools → Network → "Disable cache" checkbox
5. Hard refresh: Cmd+Shift+R
```

### 5. Muhtemel Sebepler

#### A) SoundManager Import Hatası
```typescript
// GameRoom.tsx içinde bu satır var:
import { soundManager } from '../utils/SoundManager';

// Eğer bu hata veriyorsa:
Error: Cannot find module '../utils/SoundManager'
```

**Çözüm:**
```bash
# Dosya var mı kontrol et
ls -la client/src/utils/SoundManager.ts

# Yoksa git'ten geri getir
git checkout HEAD -- client/src/utils/SoundManager.ts
```

#### B) generateSounds.ts Syntax Hatası
```
Error in generateSounds.ts
```

**Çözüm:**
```bash
# Type-check yap
cd client && npx tsc --noEmit

# Hata varsa gösterir
```

#### C) Framer Motion Versiyonu
```
Error: framer-motion module not found
```

**Çözüm:**
```bash
cd client
rm -rf node_modules
npm install
```

### 6. Acil Geri Alma

Eğer ses sistemi kesinlikle soruna sebep oluyorsa:

```bash
# Son commit'i geri al
git revert HEAD --no-edit

# Client'ı rebuild et
cd client && npm install && npm run build
```

### 7. Bana Göndermen Gerekenler

Eğer hala çözemediysen, şunları gönder:

1. **Console screenshot** (F12 → Console → tüm kırmızı hatalar)
2. **Network tab screenshot** (hangi request 500 veriyor)
3. **Hangi URL'de hata oluyor** (örn: http://localhost:5173/game)
4. **Bu komutun çıktısı:**
```bash
cd /Users/mesahin/batak/client
npx tsc --noEmit 2>&1 | grep error
```

## Hızlı Test Scripti

```bash
#!/bin/bash
echo "=== BATAK DEBUG ==="
echo ""
echo "1. Server health:"
curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "FAILED"
echo ""
echo "2. Client homepage:"
curl -s http://localhost:5173 | head -3
echo ""
echo "3. Running processes:"
ps aux | grep -E "vite|tsx.*server" | grep -v grep | wc -l
echo " processes found"
echo ""
echo "4. SoundManager file exists:"
ls -la client/src/utils/SoundManager.ts 2>/dev/null || echo "NOT FOUND"
echo ""
echo "5. TypeScript errors:"
cd client && npx tsc --noEmit 2>&1 | grep -c "error"
```

Bunu `debug.sh` olarak kaydet ve çalıştır: `bash debug.sh`
