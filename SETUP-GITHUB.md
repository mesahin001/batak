# 🚀 GITHUB REPO OLUŞTURMA ADIMLARI

## 1. GitHub'da Yeni Repository Oluştur

1. https://github.com/new adresine git
2. Şu bilgileri doldur:
   - **Repository name:** `batak`
   - **Description:** `NFT-Rewarded Batak Tournament Game on Solana`
   - **Public** ✅ (işaretle)
   - **Add .gitignore** ✅ (önerilen)
   - **License:** MIT

3. **Create repository** butonuna tıkla

---

## 2. Komutları Çalıştır

```bash
# Remote ekle
git remote add origin https://github.com/[KULLANICI_ADI]/batak.git

# Branch adını "main" yap (Opsiyonel)
git branch -M main

# İlk push
git push -u origin main
```

**Not:** `[KULLANICI_ADI]` kısmını kendi GitHub kullanıcı adınla değiştirmeyi unutma!

---

## 3. SSH Key Kullanıyorsan (Önerilen)

### SSH Key Oluştur

```bash
# SSH key oluştur
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### Key'i Kopyala

```bash
# Public key'i göster
cat ~/.ssh/id_ed25519.pub
```

### GitHub'a Ekle

1. GitHub.com → Sağ üst profil ikonu → **Settings**
2. Sol menüden **SSH and GPG keys** → **New SSH key**
3. Key'i yapıştır → **Add SSH key**

### SSH URL Kullan

```bash
# SSH remote ile
git remote set-url origin git@github.com:[KULLANICI_ADI]/batak.git

# Push
git push -u origin main
```

---

## 📋 ADIMLAR (Sıra ile)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GitHub'da yeni repo oluştur                               │
│    https://github.com/new                                   │
│    → Name: batak                                            │
│    → Public: ✅                                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Local'de komutları çalıştır                              │
│                                                              │
│  git remote add origin https://github.com/xxx/batak.git  │
│  git branch -M main                                          │
│  git push -u origin main                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Sonuç                                                     │
│    ✅ Kodlar GitHub'da                                        │
│    ✅ İlerlemi takip edebilirsin                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 KULLANICI ADI NEYİ?

GitHub kullanıcı adını gir, seni yönlendireyim:

```
export GITHUB_USER="[KULLANICI_ADI]"
git remote add origin https://github.com/${GITHUB_USER}/batak.git
```

---

Hazır olduğunda haber ver, komutları birlikte çalıştıralım!
