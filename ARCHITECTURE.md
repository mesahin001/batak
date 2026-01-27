# Architecture

Bu belge projenin mimari kararlarını ve nedenlerini açıklar.

## Neden Server-Authoritative?

**Karar:** Tüm oyun mantığı sunucuda çalışır, client sadece render ve input toplar.

**Neden:**
- Hile önleme: Client manipüle edilemez
- Tutarlılık: Tüm oyuncular aynı state'i görür
- Blockchain güvenliği: Sadece sunucu cNFT mint edebilir

## Neden WebSocket (Socket.IO)?

**Karar:** REST API yerine Socket.IO kullanıldı.

**Neden:**
- Gerçek zamanlı kart oyunu: Her hamle anında tüm oyunculara ulaşmalı
- Bi-directional: Hem client hem server event gönderebilir
- Room desteği: 4 kişilik masalar için built-in room yönetimi

## Neden State Machine?

**Karar:** GameStateMachine sınıfı ile state yönetimi.

**Neden:**
- Batak'ın net fazları var: LOBBY → BIDDING → PLAYING → SCORING → FINISHED
- Geçersiz geçişler engellenir (bidding'de kart oynanamaz)
- Debug kolaylığı: Her an hangi state'de olduğumuz belli

## Neden Bot Strategy Pattern?

**Karar:** Easy/Normal/Hard stratejileri ayrı sınıflarda.

**Neden:**
- Yeni zorluk seviyesi eklemek kolay
- Her strateji bağımsız test edilebilir
- Strateji runtime'da değiştirilebilir

## Neden cNFT (Compressed NFT)?

**Karar:** Standard NFT yerine Metaplex Bubblegum ile cNFT.

**Neden:**
- Maliyet: ~$0.0001 vs ~$0.02 (200x ucuz)
- Ölçeklenebilirlik: Binlerce turnuva ödülü mint edilebilir
- Solana Seeker uyumluluğu: Standart NFT gibi görüntülenir

## Neden PWA → APK?

**Karar:** Native Android yerine Bubblewrap ile PWA'dan APK.

**Neden:**
- Tek codebase: Web ve mobil aynı React kodu
- Hızlı iterasyon: Web'de test et, APK'ya paketle
- Solana Seeker: Deep-link ile wallet bağlantısı destekli

## Klasör Yapısı Kararları

```
server/
├── game/        # Saf oyun mantığı (Socket bağımsız)
├── socket/      # Socket.IO handler'ları
├── bots/        # Bot AI (Strategy pattern)
├── solana/      # Blockchain entegrasyonu
└── types/       # Shared TypeScript types

client/
├── components/  # React UI bileşenleri
├── phaser/      # Oyun görselleştirme (opsiyonel)
├── socket/      # Socket.IO client context
└── solana/      # Wallet bağlantısı
```

**Neden bu ayrım:**
- `game/` klasörü Socket'ten bağımsız → Unit test edilebilir
- `socket/` sadece event routing → Business logic yok
- `bots/` ayrı → Farklı AI stratejileri izole

## Veri Akışı

```
[Client] → Socket.IO → [Server Validate] → [GameStateMachine] → [Broadcast All Clients]
                                                    ↓
                                            [Solana] (oyun bitince)
```

**Neden tek yönlü akış:**
- Client hiçbir zaman kendi state'ini güncellemez
- Server her değişiklikte tüm state'i broadcast eder
- Race condition riski yok
