# Batak Mobile - Build Guide (Seeker Wallet için)

## Önemli: Expo Go'da Seeker ÇALIŞMAZ!

`@solana-mobile/mobile-wallet-adapter-protocol-web3js` paketi **gerçek APK/IPA** gerektirir.

---

## Yöntem 1: EAS Build (En Kolay - Cloud Build)

### 1. Kurulum

```bash
cd /Users/mesahin/batak/mobile

# EAS CLI kur
npm install -g eas-cli

# EAS hesabına login (veya signup)
eas login

# Project oluştur (tek seferlik)
eas project:info
```

### 2. Build Başlat

```bash
# Development build (Go development client)
eas build --platform android --profile development

# Bu 5-10 dakika sürecek, cloud'da build eder
```

### 3. Build Tamamlandığında

EAS size bir download linki verecek veya bu komutla indirin:

```bash
# APK dosyasını indir
eas build:list
```

### 4. Telefona Yükle

İndirdiğin `.apk` dosyasını telefona kur:
- Bilgisayardan telefonuna USB ile gönder
- Veya Google Drive'a atıp telefondan indir
- Dosyaya tıkla → Install

### 5. Seeker'ı Test Et

1. Uygulamayı aç
2. Settings → Sign Out (eski giriş varsa)
3. Login ekranına dön
4. "Connect with Seeker" butonuna bas
5. **Şimdi Seeker açılmalı!**

---

## Yöntem 2: Local Build (Bilgisayarında ADB ile)

### Gereksinimler

- Android Studio yüklü olmalı
- JAVA_HOME ayarlanmış olmalı

```bash
cd /Users/mesahin/batak/mobile

# Android için local build
npx expo run:android
```

Bu **bilgisayarında build eder** ve otomatik telefona kurar.

---

## Yöntem 3: Android Studio Build (En Kontrollü)

```bash
# 1. Prebuild yap (native kodları generate et)
cd /Users/mesahin/batak/mobile
npx expo prebuild --clean

# 2. Android Studio'da aç
open android/  # Veya Android Studio'da "Open" → android klasörü

# 3. Android Studio'da:
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## Hangisini Seçmelisin?

| Yöntem | Zaman | Kolaylık | İnternet | Öneri |
|--------|-------|----------|----------|-------|
| EAS Build | 10-15 dk | ⭐⭐⭐⭐⭐ | Gerekli | **En kolayı** |
| Local Build | 5-10 dk | ⭐⭐⭐ | Gerekli | İlk sefer için |
| Android Studio | 15-20 dk | ⭐⭐ | Gerekli | Profesyonel |

---

## Sorun Giderme

### "Build failed" hatası

```bash
# Dependencies kontrol et
npm install

# Cache temizle
rm -rf node_modules
npm install

# Tekrar dene
eas build --platform android --profile development
```

### "Seeker still not opening"

Build'in development client olduğundan emin ol:

```bash
# Bu komut development build yapar (expo Go değil!)
eas build --platform android --profile development
```

### Telefondan "Test Mode" hala görünüyor

1. Uygulamayı **tamamen kaldır**
2. Yeni build'i kur
3. Cache temizle: Uygulama bilgileri → Verileri temizle

---

## Doğrulama

Build başarılı olduğunda, uygulama açıldığında şunu görmelisin:

```
Expo Dev Tools     ← BU YAZI GÖRÜLMELİ
┌─────────────────┐
│  ✅ Connected  │
└─────────────────┘
```

Expo Go'da ise:

```
Expo Go          ← BU YANLIŞ
```

---

## Hızlı Test (Script)

```bash
#!/bin/bash
cd /Users/mesahin/batak/mobile

echo "🔨 Batak Mobile - Build Başlatılıyor..."
echo ""
echo "1. Dependencies kontrol ediliyor..."
npm install

echo ""
echo "2. EAS build başlatılıyor..."
echo "   (Bu 5-10 dakika sürecek, kahveni al! ☕)"
echo ""

eas build --platform android --profile development

echo ""
echo "✅ Build tamamlandı!"
echo "📥 Link: https://expo.dev/accounts"
```

Bunu `build.sh` olarak kaydet ve `./build.sh` ile çalıştır.

---

## Sonraki Adım

Build tamamlandıktan sonra:
1. APK indir → Telefona kur
2. Seeker zaten yüklü olmalı
3. Uygulamayı aç → Sign Out → Connect with Seeker
4. Seeker açılmalı! 🎉
