// Tiny EN/TR switcher. The page is complete in English without this script.
(function () {
  var TR = {
    'nav.games': 'Oyunlar', 'nav.about': 'Hakkımızda', 'nav.team': 'Ekip', 'nav.contact': 'İletişim', 'nav.play': 'Hemen oyna',
    'hero.eyebrow': 'Bağımsız oyun stüdyosu',
    'hero.title': 'Klasik kağıt oyunları, blockchain çağı için yeniden yapıldı.',
    'hero.lead': 'BatakCI, web ve Android için çok oyunculu kağıt oyunları geliştirir. İlk oyunumuz Batak Turnuvası, Türkiye\'nin en sevilen el alma oyununu sunucu taraflı adil oyun ve gerçekten size ait kupalarla internete taşıyor.',
    'hero.play': 'Tarayıcıda oyna', 'hero.apk': 'Android için indir',
    'hero.note': 'Oynaması ücretsiz. E-posta veya Solana cüzdanı ile giriş yapın.',
    'games.title': 'Batak Turnuvası',
    'games.sub': 'İhale, koz ve turnuva turlarıyla dört kişilik bir el alma oyunu.',
    'f1.t': 'İki klasik mod', 'f1.d': 'Koz Maça (maça koz, sadece ihale) ve İhaleli Batak (ihale ver, sonra koz seç). En yüksek skor kazanır.',
    'f2.t': 'Tasarımdan adil', 'f2.d': 'Tüm kurallar sunucumuzda çalışır. Eller gizlidir, hamleler doğrulanır, istemciden hile yapılamaz.',
    'f3.t': 'Herkesle oyna', 'f3.d': 'Hızlı maçlar, altı haneli kodla özel odalar veya masayı botlarla doldurun. Bağlantı koparsa geri dönebilirsiniz.',
    'f4.t': 'Solana üzerinde kupalar', 'f4.d': 'Turnuva kazananları sıkıştırılmış NFT kupaları alabilir. Solana Mobile ekosistemi ve Seeker cüzdanı için geliştirildi.',
    'about.title': 'BatakCI hakkında',
    'about.p1': 'İstanbul merkezli, çocukluğumuzdan beri sevdiğimiz kağıt oyunlarını seven küçük bir ekibiz. Amacımız basit: bu oyunları adaletten ödün vermeden, her yerde, her cihazda arkadaşlarla oynamayı kolaylaştırmak.',
    'about.p2': 'Oyun sunucusundan eşleştirmeye, web ve Android uygulamalarına kadar her şeyi kendimiz geliştiriyoruz ve yasal metinlerimizi sade bir dille yayınlıyoruz.',
    'facts.a.t': 'Platformlar', 'facts.a.d': 'Web (PWA) ve Android',
    'facts.b.t': 'Ağ', 'facts.b.d': 'Solana, Seeker cüzdanına hazır',
    'facts.c.t': 'Diller', 'facts.c.d': 'Türkçe, İngilizce ve daha fazlası',
    'facts.d.t': 'Fiyat', 'facts.d.d': 'Oynaması ücretsiz',
    'team.title': 'Ekip', 'team.sub': 'Birkaç kişi, birkaç alan, tek masa.',
    't1.t': 'Oyun tasarımı', 't1.d': 'Kurallar, puanlama, ihale akışı ve bot davranışı; oyun, mutfak masasındaki gibi hissettirsin diye.',
    't2.t': 'Sunucu ve blockchain mühendisliği', 't2.d': 'Gerçek zamanlı çok oyunculu altyapı, kimlik doğrulama, eşleştirme ve kupaların arkasındaki Solana entegrasyonu.',
    't3.t': 'Web ve mobil mühendisliği', 't3.d': 'Tarayıcı uygulaması ve Android uygulaması; hem telefonda hem masaüstünde rahat kullanım için ayarlandı.',
    'contact.title': 'Bize ulaşın', 'contact.sub': 'Soru, geri bildirim, basın veya veri talepleri: hepsini okuyoruz.',
    'foot.tag': 'Zincir üstü ödüllü kağıt oyunları.', 'foot.legal': 'Yasal',
    'foot.privacy': 'Gizlilik Politikası', 'foot.terms': 'Kullanım Koşulları', 'foot.license': 'Lisans', 'foot.copyright': 'Telif Hakkı',
    'foot.play': 'Oyna', 'foot.web': 'Tarayıcıda oyna', 'foot.apk': 'Android APK', 'foot.rights': 'Tüm hakları saklıdır.'
  };

  var nodes = document.querySelectorAll('[data-i18n]');
  var EN = {};
  nodes.forEach(function (n) { EN[n.getAttribute('data-i18n')] = n.innerHTML; });

  var btn = document.getElementById('lang');
  var lang = 'en';

  function apply(next) {
    lang = next;
    document.documentElement.lang = next;
    nodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n');
      n.innerHTML = next === 'tr' && TR[k] ? TR[k] : EN[k];
    });
    btn.textContent = next === 'tr' ? 'EN' : 'TR';
    try { localStorage.setItem('lang', next); } catch (e) { /* storage unavailable */ }
  }

  btn.addEventListener('click', function () { apply(lang === 'en' ? 'tr' : 'en'); });

  var saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) { /* storage unavailable */ }
  var initial = saved || ((navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en');
  if (initial === 'tr') apply('tr');

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
