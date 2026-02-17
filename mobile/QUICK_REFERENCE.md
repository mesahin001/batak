# Android App - Quick Reference

## Başlatma (Her Seferinde)

### 1. Server'ı Başlat (Terminal 1)
```bash
cd /Users/mesahin/batak/server
npm run dev
```

### 2. Metro Bundler'ı Başlat (Terminal 2)
```bash
cd /Users/mesahin/batak/mobile

# Port forwarding (her cihaz bağlandığında)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001

# Metro başlat
npm start
```

### 3. App'i Aç
Metro açıldığında terminal'de:
```
Press a │ open Android
```

**'a'** tuşuna bas!

## Metro Bundler Ekranı

Şunu göreceksin:
```
 ›  Metro waiting on exp://192.168.xxx.xxx:8081
 ›
 ›  Press a │ open Android
 ›  Press w │ open web
 ›
 ›  Press r │ reload app
 ›  Press m │ toggle menu
```

### İlk Açılışta (Bundle oluşturulurken)
```
 BUNDLE  ./index.js ░░░░░░░░░░░░░░░ 45.2%
 TRANSFORM [████████░░░░░░░░░] 523/842
```

Bu **30-60 saniye** sürebilir (ilk sefer).

### Bundle Tamamlandığında
```
 BUNDLE  ./index.js ✓ 100.0% (842 modules)

Android Bundling complete 23456ms
```

App cihazda açılır! 🎉

## Hatalar & Çözümleri

### "Unable to load script"
```bash
# Port forwarding tekrar yap
adb reverse tcp:8081 tcp:8081

# Metro'yu restart et
Ctrl+C (Metro'yu durdur)
npm start
'a' bas
```

### "Could not connect to development server"
```bash
# Cihazın bağlı olduğunu kontrol et
adb devices

# Port forwarding tekrar
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
```

### "Red screen - Network request failed"
```bash
# Server çalışıyor mu kontrol et
curl http://localhost:3001/health

# Çalışmıyorsa:
cd /Users/mesahin/batak/server
npm run dev
```

### App dondu / çalışmıyor
**Cihazda:**
1. Cihazı salla (shake)
2. Developer Menu açılır
3. "Reload" seç

**VEYA Metro'da:**
```
Press r (reload app)
```

## Hot Reload

Kod değiştiğinde **otomatik** reload olur:
```
 BUNDLE  ./index.js ░░░░░ (Fast Refresh)
```

Eğer otomatik olmazsa:
- Cihazı salla → Reload
- VEYA Metro'da 'r' bas

## Cihazı Yeniden Bağladığında

```bash
# Her zaman port forwarding yap
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001

# App'i tekrar aç
# Metro'da 'a' bas
```

## APK Yüklüyse (Development APK)

```bash
# Metro başlat
npm start

# APK'yı cihazda aç (simge tıkla)
# Metro'ya bağlanacak
```

## Production APK Build

```bash
cd android
./gradlew assembleRelease

# APK:
# android/app/build/outputs/apk/release/app-release.apk
```

## Useful Commands

```bash
# Cihazları listele
adb devices

# Logları izle
adb logcat | grep -i "ReactNative\|Expo"

# App'i cihazda başlat (Metro çalışırken)
adb shell am start -n com.mesahin.batak/.MainActivity

# App'i sil
adb uninstall com.mesahin.batak
```

## Troubleshooting Checklist

- [ ] Server çalışıyor (http://localhost:3001/health)
- [ ] Cihaz bağlı (adb devices)
- [ ] Port forwarding yapıldı (adb reverse)
- [ ] Metro bundler çalışıyor (port 8081)
- [ ] Bundle tamamlandı (%100)
- [ ] App cihazda açıldı

## Quick Tips

1. **İlk açılış yavaş** (30-60s bundle) - normal!
2. **Hot reload var** - kod değişince otomatik güncellenir
3. **Cihazı salla** - her zaman Developer Menu açar
4. **Metro'yu kapatma** - app çalışırken açık bırak
5. **Port forwarding** - her cihaz bağlantısında tekrar yap

## Son Eklenenler (15 Şubat 2026)

✅ Ses efektleri (haptic feedback)
✅ Particle animations (12 gold burst)
✅ Turn glow animation
✅ Winner popup animation

Test için:
- Kart oyna → titreşim hissedilmeli
- El kazan → 12 gold partikül patlaması görülmeli
