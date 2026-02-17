# Error 500 Düzeltme Adımları

## Sorun
Oyun açılırken Error 500 alıyorsun.

## Muhtemel Sebepler
1. ✅ **Tarayıcı cache'i** - Eski kod cache'lenmiş
2. ✅ **SoundManager import hatası** - Yeni eklenen ses sistemi
3. ✅ **Port karışıklığı** - Client farklı portlarda çalışıyor

## Çözüm Adımları

### 1. Serverleri Yeniden Başlat

```bash
# Tüm portları temizle
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Server'ı başlat (Terminal 1)
cd server && npm run dev

# Client'ı başlat (Terminal 2)
cd client && npm run dev
```

### 2. Tarayıcıyı Temizle

**Chrome/Edge:**
1. DevTools aç (F12)
2. Network tab'ına git
3. "Disable cache" checkbox'ını işaretle
4. Sayfayı hard refresh (Cmd+Shift+R veya Ctrl+Shift+R)

**Veya:**
1. Tarayıcı ayarlarına git
2. "Clear browsing data" / "Tarama verilerini temizle"
3. "Cached images and files" seç
4. Clear data

### 3. Console Hatalarını Kontrol Et

1. Tarayıcıda F12 bas
2. Console tab'ına bak
3. Kırmızı hataları kopyala ve bana gönder

### 4. Manuel Test

```bash
# Server sağlıklı mı?
curl http://localhost:3001/health

# Client yükleniyor mu?
curl http://localhost:5173

# Her ikisi de 200 OK dönmeli
```

## Eğer Hala Hata Alıyorsan

Bana şunları gönder:
1. **Tarayıcı console'undaki hatalar** (F12 → Console)
2. **Network tab'ındaki failed requests** (F12 → Network → kırmızı olanlar)
3. **Hangi URL'de hata alıyorsun** (örn: http://localhost:5173)

## Acil Çözüm (Geri Alma)

Eğer ses sistemi soruna sebep olduysa:

```bash
# Son commit'i geri al
git revert HEAD --no-edit

# Veya sadece değişiklikleri unstage et
git reset --hard c4a8869

# Client'ı yeniden build et
cd client && npm run build
```

Bu ses öncesi hale döndürür (Phase 2-3 animasyonlar kalır).
