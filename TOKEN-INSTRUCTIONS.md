# 🔑 GITHUB PERSONAL ACCESS TOKEN KURULUMU

## ADIM 1: TOKEN OLUŞTUR

1. **Aç:** https://github.com/settings/tokens

2. **Generate new token (classic)** butonuna tıkla

3. Token ayarla:
   ```
   Note: Batak tournament development
   Expiration: 90 days (veya No expiration)
   Scopes: ✅ repo (full control)
   ```

4. **Generate token** → Token'i kopyala (başında `ghp_` ile başlar)

   ⚠️ **Token'i güvenli bir yere kaydet! Tekrar gösterilmeyecek.**

---

## ADIM 2: REPO OLUŞTURMA

1. **Aç:** https://github.com/new

2. Doldur:
   ```
   Repository name: batak
   Description: NFT-Red Batak Tournament on Solana
   Public: ✅
   Add .gitignore: ✅
   License: MIT
   ```

3. **Create repository**

---

## ADIM 3: PUSH

```bash
git push -u origin main
```

**Username:** `mesahin001`

**Password:** `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (token'in kendisi)

---

## ✅ BAŞARILI OLDUĞUNDA

```bash
# Remote ayarlandı
git remote set-url origin https://github.com/mesahin001/batak.git

# Branch yeniden adlandırıldı (master → main)
git branch -M main

# Push yapılacak
git push -u origin main
```

---

Hazır olduğunda `ghp_` ile başlayan token'i gir ve push yapalım.
