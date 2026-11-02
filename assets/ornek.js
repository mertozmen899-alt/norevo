// Herkese açık örnek panel: panel.html?ornek=1 açılınca gerçek Supabase yerine bu uydurma veri kullanılır.
// İşletme ve rakip adları uydurmadır (gerçek işletmelere benzemesin diye). Hiçbir şey sunucuya gitmez, kaydedilmez.
(function () {
  'use strict';
  if (!/[?&]ornek=1\b/.test(location.search) || !window.supabase) return;
  window.NOREVO_ORNEK = true;

  function gun(n) { return new Date(Date.now() - n * 864e5).toISOString(); }
  var ISL_AD = 'Lale Mobilya', SEHIR = 'Çorum';
  var RAKIP = { kuzey: 'Kuzey Mobilya', atlas: 'Atlas Ev Mobilyaları', yildiz: 'Yıldız Koltuk', cinar: 'Çınar Mobilya', mavi: 'Mavi Ev Dekorasyon' };
  var MESAJ = 'Bu bir örnek panel; burada yeni ölçüm yapılmaz ve hiçbir şey kaydedilmez. Kendi işletmeniz için ücretsiz hızlı testi deneyin.';

  var yorumlar = {
    tarih: gun(1), gun: gun(1).slice(0, 10), yer: { ad: ISL_AD, adres: 'Örnek Mah. Örnek Cd. No:1, Çorum Merkez/Çorum', place_id: 'ornek' },
    puan: 4.6, yorum_sayisi: 58, bakilan: 4, cevapsiz_sayi: 2, taslak_hata: null,
    taslak_denetim: { durum: 'kontrol_gerekli', notlar: ['1. cevap: [TELEFON] yerine kendi numaranızı yazın.'], tarih: gun(1) },
    yorumlar: [
      { ad: 'Müşteri A.', puan: 2, tarih: gun(6), zaman: '6 gün önce', metin: 'Ürün güzel ama teslimat söylenen günden bir hafta sonra geldi.', cevaplandi: false, taslak: 'Teslimatın gecikmesi için özür dileriz, bunun sizi zor durumda bıraktığını biliyoruz. Yaşadığınızı daha iyi anlamak için [TELEFON] numaramızdan bize ulaşırsanız seviniriz.' },
      { ad: 'Müşteri B.', puan: 5, tarih: gun(12), zaman: '2 hafta önce', metin: 'Montaj ekibi çok özenliydi, mağazadaki ilgi de güzeldi.', cevaplandi: false, taslak: 'Güzel yorumunuz için çok teşekkür ederiz. Montaj ekibimize ilettik; yeni mobilyalarınızı güle güle kullanın.' },
      { ad: 'Müşteri C.', puan: 5, tarih: gun(30), zaman: 'bir ay önce', metin: 'Yemek odası takımı tam istediğimiz gibi.', cevaplandi: true },
      { ad: 'Müşteri D.', puan: 4, tarih: gun(70), zaman: '2 ay önce', metin: 'Çeşit fazla, fiyatlar makul.', cevaplandi: true }],
    konular: { bakilan: 4, ovgu: ['Montaj ekibi özenli', 'Çeşit fazla, fiyatlar makul'], sikayet: ['Teslimat gecikiyor'],
      google: [{ ad: 'montaj', sayi: 9 }, { ad: 'teslimat', sayi: 7 }, { ad: 'koltuk takımı', sayi: 5 }, { ad: 'ilgi', sayi: 4 }] }
  };
  var isiHaritasi = { ay: gun(3).slice(0, 7), tarih: gun(3), kelime: 'çorum mobilya', adim_km: 1, merkez: { lat: 40.55, lng: 34.95 },
    noktalar: [5, 2, 9, 3, 1, 4, 14, 6, null].map(function (s) { return { sira: s }; }) };
  var platformlar = {
    tarih: gun(1), gun: gun(1).slice(0, 10), sorgu: '"' + ISL_AD + '" ' + SEHIR, arama: 1, liste: [
      { ad: 'Google İşletme Profili', alan: 'google.com/maps', durum: 'var', link: null, ne_yapmali: 'Profiliniz var. Adres, telefon, çalışma saatleri ve fotoğrafların güncel olduğundan emin olun.' },
      { ad: 'Instagram', alan: 'instagram.com', durum: 'var', link: null, ne_yapmali: 'Hesabınız var. Profil açıklamanızda şehriniz, telefonunuz ve web sitenizin bağlantısı olsun.' },
      { ad: 'Facebook', alan: 'facebook.com', durum: 'bulunamadi', link: null, ne_yapmali: 'Google\'da adınızla aratınca bir Facebook sayfası çıkmadı. Sayfanız varsa adını işletme adınızla aynı yapın; yoksa ücretsiz açın.' },
      { ad: 'Yandex Haritalar', alan: 'yandex.com.tr/harita', durum: 'bulunamadi', link: null, ne_yapmali: 'Google\'da adınızla aratınca Yandex Haritalar kaydınız çıkmadı. Yandex Haritalar\'ı açıp adınızı arayın.' },
      { ad: 'Apple Haritalar', alan: 'maps.apple.com', durum: 'kendiniz', link: 'https://business.apple.com', ne_yapmali: 'Apple Haritalar\'ı otomatik kontrol edemiyoruz. iPhone kullanan müşterileriniz ve Siri buraya bakıyor.', adimlar: ['iPhone\'da Haritalar uygulamasını açın.', 'İşletmenizin adını ve şehrinizi yazıp arayın.', 'Çıkmıyorsa business.apple.com adresinden ekleyin.'] },
      { ad: 'Bulurum', alan: 'bulurum.com', durum: 'var', link: null, ne_yapmali: 'Bu rehberde adınız geçiyor. Adres ve telefonunuzun doğru yazıldığını kontrol edin.' }]
  };
  var site = {
    adres: 'https://lalemobilya.example/', puan: 64, tarih: gun(1), kontroller: [
      { kod: 'https', ad: 'Güvenli bağlantı (https)', tamam: true, agirlik: 10, detay: 'Var.', oneri: '-' },
      { kod: 'mobil', ad: 'Telefonda görünüm', tamam: true, agirlik: 10, detay: 'Uygun.', oneri: '-' },
      { kod: 'aciklama', ad: 'Google açıklaması', tamam: false, agirlik: 10, detay: 'Yok.', oneri: 'Ana sayfaya şehrinizi ve ne sattığınızı anlatan kısa bir açıklama yazdırın.' },
      { kod: 'schema', ad: 'İşletme bilgisi kodu', tamam: false, agirlik: 10, detay: 'Yok.', oneri: 'Adres, telefon ve çalışma saatlerinizi içeren işletme kodunu (LocalBusiness) ekletin.' }]
  };
  var ISL = {
    id: 'ornek', ad: ISL_AD, is_turu: 'mobilya mağazası', site: 'https://lalemobilya.example', semt: SEHIR, calisma_sekli: ['gelir'],
    kurulum_bitti: true, mesaj_sikligi: 'haftalik', yorumlar: yorumlar, platformlar: platformlar, site_saglik: site, isi_haritasi: isiHaritasi,
    sektor_rehberleri: [{ ad: 'Trendyol', alan: 'trendyol.com', ne_ise_yarar: 'Mobilya alıcılarının en çok baktığı pazar yeri.' }, { ad: 'Şikayetvar', alan: 'sikayetvar.com', ne_ise_yarar: 'Güvenilirlik sorularında yapay zekânın baktığı site.' }]
  };

  // Altı haftalık ölçüm: işler yapıldıkça harita sırası ve yapay zekâ oranı yükseliyor
  var SIRA = [4, 5, 7, 9, 11, 14], YZ = [3, 2, 2, 1, 0, 0], KUZEY_YORUM = [214, 209, 205, 203, 198, 196];
  var sorular = ['Çorum’da iyi bir mobilya mağazası önerir misin?', 'Çorum’da en çok tavsiye edilen mobilyacılar hangileri?', '"çorum mobilya" diye arıyorum. Hangi işletmeleri önerirsin?'];
  function olcum(h) {
    var k = SIRA[h];
    var kelimeler = [
      { kelime: 'çorum mobilya', kaynak: 'temel', populer: true, arama_sira: h < 3 ? 6 : null, yerel_kutuda: null, yerel_kutu: [RAKIP.kuzey, RAKIP.atlas, RAKIP.yildiz], arama_ilk3: [{ sira: 1, baslik: 'Çorum Mobilya Mağazaları', alan: 'bulurum.com' }, { sira: 2, baslik: RAKIP.kuzey, alan: 'kuzeymobilya.example', tur: 'rakip' }, { sira: 3, baslik: RAKIP.atlas, alan: 'instagram.com' }], rehberler: [{ baslik: 'Çorum Mobilya Mağazaları', alan: 'bulurum.com', sira: 1, link: null }], harita_sira: k, harita_bakilan: 20, harita_ilk3: [RAKIP.kuzey, RAKIP.atlas, RAKIP.yildiz], harita_birinci: { ad: RAKIP.kuzey, puan: 4.7, yorum: KUZEY_YORUM[h] },
        harita_liste: [{ sira: 1, ad: RAKIP.kuzey, puan: 4.7, yorum: KUZEY_YORUM[h] }, { sira: 2, ad: RAKIP.atlas, puan: 4.5, yorum: 131 }, { sira: 3, ad: RAKIP.yildiz, puan: 4.8, yorum: 77 }, { sira: k, ad: ISL_AD, puan: 4.6, yorum: 58 - h * 2, siz: true }],
        arama_liste: [{ sira: 1, baslik: 'Çorum Mobilya Mağazaları', alan: 'bulurum.com' }, { sira: 2, baslik: RAKIP.kuzey, alan: 'kuzeymobilya.example' }, { sira: 3, baslik: RAKIP.atlas, alan: 'instagram.com' }] },
      { kelime: 'çorum koltuk takımı', kaynak: 'google', populer: true, arama_sira: 3, arama_link: 'https://lalemobilya.example/koltuk', yerel_kutuda: h < 2 ? 2 : null, yerel_kutu: h < 2 ? [RAKIP.yildiz, ISL_AD, RAKIP.kuzey] : [RAKIP.yildiz, RAKIP.kuzey, RAKIP.cinar], arama_ilk3: [{ sira: 1, baslik: RAKIP.yildiz, alan: 'yildizkoltuk.example' }, { sira: 2, baslik: 'Koltuk takımları', alan: 'trendyol.com' }, { sira: 3, baslik: 'Koltuk Takımları | ' + ISL_AD, alan: 'lalemobilya.example', siz: true }], rehberler: [], harita_sira: h < 2 ? 2 : 5, harita_bakilan: 20, harita_ilk3: [RAKIP.yildiz, RAKIP.kuzey, RAKIP.cinar] },
      { kelime: 'çorum yatak odası takımı', kaynak: 'oneri', populer: false, arama_sira: null, yerel_kutuda: null, yerel_kutu: [RAKIP.atlas, RAKIP.cinar, RAKIP.mavi], arama_ilk3: [{ sira: 1, baslik: RAKIP.atlas, alan: 'atlasev.example' }], rehberler: [], harita_sira: null, harita_bakilan: 20, harita_ilk3: [RAKIP.atlas, RAKIP.cinar, RAKIP.mavi], harita_birinci: { ad: RAKIP.atlas, puan: 4.5, yorum: 131 } }];
    var yz = [];
    sorular.forEach(function (q, qi) {
      for (var t = 1; t <= 3; t++) {
        var gecer = qi * 3 + t <= YZ[h];
        yz.push({ soru: q, tekrar: t, geciyor: gecer, ozet: 'Çorum’da öne çıkan mobilya mağazaları: ' + RAKIP.kuzey + ', ' + RAKIP.atlas + (gecer ? ', ' + ISL_AD : '') + '. Geniş ürün çeşidi ve montaj hizmetiyle biliniyorlar.' });
      }
    });
    return {
      id: 'ornek-' + h, isletme_id: 'ornek', durum: 'bitti', kaynak: h === 0 ? 'elle' : 'haftalik', baslangic: gun(h * 7 + 1), bitis: gun(h * 7 + 1),
      harita_sorgu: 'çorum mobilya', harita_sira: k, harita_sonuclar: kelimeler[0].harita_liste,
      arama_sorgu: 'çorum mobilya', arama_sira: kelimeler[0].arama_sira, arama_sonuclar: { organik: [], yerel_kutu: kelimeler[0].yerel_kutu, yerel_kutuda: null, konum: true },
      isletme_bilgi: { bulundu: true, puan: 4.6, yorum: 58 - h * 2 }, hatalar: [], kelimeler: kelimeler,
      yz_soru_sayisi: 9, yz_gecen: YZ[h], yz_cevaplar: yz,
      gyz_soru_sayisi: 2, gyz_gecen: h < 2 ? 1 : 0, gyz_cevaplar: [
        { soru: sorular[0], tekrar: 1, model: 'google-ai-mode', aramali: true, geciyor: h < 2, ozet: 'Çorum’da mobilya için öne çıkan mağazalar:\n' + RAKIP.kuzey + '\n' + RAKIP.atlas + (h < 2 ? '\n' + ISL_AD : ''), isletmeler: [RAKIP.kuzey, RAKIP.atlas].concat(h < 2 ? [ISL_AD] : []), kaynaklar: ['bulurum.com', 'instagram.com'] },
        { soru: sorular[1], tekrar: 1, model: 'google-ai-mode', aramali: true, geciyor: false, ozet: 'Yorumlara göre ' + RAKIP.yildiz + ' ve ' + RAKIP.kuzey + ' sık tavsiye ediliyor.', isletmeler: [RAKIP.yildiz, RAKIP.kuzey], kaynaklar: ['sikayetvar.com'] }],
      cg_soru_sayisi: 2, cg_gecen: h < 3 ? 1 : 0, cg_cevaplar: [
        { soru: sorular[0], tekrar: 1, geciyor: h < 3, ozet: RAKIP.kuzey + ', ' + RAKIP.cinar + (h < 3 ? ' ve ' + ISL_AD : '') + ' Çorum’da sık önerilen mağazalar arasında.', kaynaklar: ['bulurum.com'] },
        { soru: sorular[2], tekrar: 1, geciyor: false, ozet: RAKIP.atlas + ' ve ' + RAKIP.yildiz + ' öne çıkıyor.', kaynaklar: [] }],
      yz_rakipler: [{ ad: RAKIP.kuzey, sayi: 9 }, { ad: RAKIP.atlas, sayi: 7 }, { ad: RAKIP.yildiz, sayi: 3 }, { ad: RAKIP.cinar, sayi: 2 }],
      izlenen_rakipler: [
        { ad: RAKIP.kuzey, place_id: 'r1', secili: false, puan: 4.7, yorum: KUZEY_YORUM[h], yz_sayi: 9, yz_toplam: 13, aramalar: [{ kelime: 'çorum mobilya', sira: 1, siz: k }, { kelime: 'çorum koltuk takımı', sira: 2, siz: h < 2 ? 2 : 5 }] },
        { ad: RAKIP.atlas, place_id: 'r2', secili: false, puan: 4.5, yorum: 131, yz_sayi: 7, yz_toplam: 13, aramalar: [{ kelime: 'çorum mobilya', sira: 2, siz: k }] },
        { ad: RAKIP.yildiz, place_id: 'r3', secili: false, puan: 4.8, yorum: 77 - (h ? 2 : 0), yz_sayi: 3, yz_toplam: 13, aramalar: [{ kelime: 'çorum mobilya', sira: h ? 3 : 4, siz: k }, { kelime: 'çorum koltuk takımı', sira: 1, siz: h < 2 ? 2 : 5 }] }],
      rehber_sayfalari: [{ baslik: 'Çorum Mobilya Mağazaları', alan: 'bulurum.com', kelime: 'çorum mobilya', sira: 1 }]
    };
  }
  var OLCUMLER = [0, 1, 2, 3, 4, 5].map(olcum);
  var YAPILAN = [
    { is_kodu: 'nap', baslik: 'Adınızı, adresinizi ve telefonunuzu her yerde aynı yazın', yapildi: gun(25), onceki: { harita_sira: 11, yz_yuzde: 0 } },
    { is_kodu: 'yorum-iste', baslik: 'Memnun müşterilerden Google yorumu isteyin', yapildi: gun(11), onceki: { harita_sira: 7, yz_yuzde: 22 } }];

  function hata() { return { data: null, error: { message: MESAJ, context: { json: function () { return Promise.resolve({ hata: MESAJ }); } } } }; }
  function sorgu(tablo) {
    var q = { _tek: false };
    var sonuc = function () {
      if (tablo === 'isletmeler') return { data: ISL, error: null };
      if (tablo === 'olcumler') return q._tek ? { data: OLCUMLER[0], error: null } : { data: OLCUMLER, error: null };
      if (tablo === 'yapilan_isler') return { data: q._yaz ? Object.assign({ yapildi: new Date().toISOString() }, q._yaz) : YAPILAN, error: null };
      return { data: q._tek ? null : [], error: null };
    };
    ['select', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'limit', 'range', 'is', 'not'].forEach(function (m) { q[m] = function () { return q; }; });
    // Yazma: sayfada denenebilsin diye bellekte kabul edilir, hiçbir yere kaydedilmez
    q.insert = function (v) { q._yaz = Array.isArray(v) ? v[0] : v; return q; };
    q.update = q.upsert = function (v) { if (tablo === 'isletmeler') Object.assign(ISL, v); return q; };
    q.delete = function () { return q; };
    q.single = q.maybeSingle = function () { q._tek = true; return Promise.resolve(sonuc()); };
    q.then = function (a, b) { return Promise.resolve(sonuc()).then(a, b); };
    return q;
  }
  function metinOrnek(g) {
    var den = { durum: 'onaylandi', notlar: [], tarih: new Date().toISOString() };
    if (g.tur === 'aciklama') return { tur: 'aciklama', tarih: den.tarih, denetim: den, icerik: { metin: ISL_AD + ', Çorum’da koltuk takımı, yatak odası ve yemek odası takımları satan bir mobilya mağazasıdır. Mağazamızda ürünleri yerinde görebilir, ölçülerinize uygun seçenekler için bilgi alabilirsiniz. Satın aldığınız mobilyaların teslimatını ve montajını ekibimiz yapar.' } };
    if (g.tur === 'sayfa') return { tur: 'sayfa', kelime: g.kelime, tarih: den.tarih, denetim: den, icerik: { title: 'Çorum Mobilya | ' + ISL_AD, aciklama: 'Çorum’da koltuk, yatak odası ve yemek odası takımları. Mağazamızı ziyaret edin.', h1: 'Çorum’da mobilya', paragraflar: [ISL_AD + ' Çorum’da ev mobilyası satan bir mağazadır.', 'Ürünlerimizi mağazamızda yerinde görebilirsiniz.'], sss: [{ soru: 'Teslimat ve montaj yapıyor musunuz?', cevap: 'Evet, Çorum içinde teslimat ve montajı ekibimiz yapar.' }] } };
    return { tur: 'gonderi', tarih: den.tarih, denetim: den, icerik: { gonderiler: [{ konu: 'Yeni koltuk takımları', metin: 'Yeni sezon koltuk takımlarımız mağazamızda. Renk ve kumaş seçeneklerini yerinde görmek için uğrayın.', fotograf: 'Vitrindeki yeni koltuk takımı' }, { konu: 'Montaj ekibimiz', metin: 'Aldığınız mobilyaları evinize ekibimiz taşır ve kurar.', fotograf: 'Montaj ekibi iş başında' }] } };
  }
  var istemci = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'ornek', email: 'ornek@norevo' } } } }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signOut: function () { return Promise.resolve({ error: null }); }
    },
    rpc: function () { return Promise.resolve({ data: false, error: null }); },
    from: sorgu,
    functions: {
      invoke: function (ad, o) {
        var g = (o && o.body) || {};
        if (ad === 'yardimci' && g.islem === 'yorumlar') return Promise.resolve({ data: { yorumlar: yorumlar }, error: null });
        if (ad === 'yardimci' && g.islem === 'isi_haritasi') return Promise.resolve({ data: { isi_haritasi: isiHaritasi, mesaj: MESAJ }, error: null });
        if (ad === 'yardimci' && g.islem === 'platformlar') return Promise.resolve({ data: { platformlar: platformlar }, error: null });
        if (ad === 'yardimci' && g.islem === 'site') return Promise.resolve({ data: { site: site }, error: null });
        if (ad === 'yardimci' && g.islem === 'metin') return new Promise(function (r) { setTimeout(function () { r({ data: { metin: metinOrnek(g) }, error: null }); }, 600); });
        if (ad === 'yardimci' && g.islem === 'yanlis') return Promise.resolve({ data: { karar: 'belirsiz', cevap: 'Örnek panelde bildirim gönderilmez. Kendi panelinizde bu düğmeye bastığınızda yapay zekâ ölçüm verilerinize bakıp cevap verir.' }, error: null });
        return Promise.resolve(hata());
      }
    }
  };
  window.supabase = { createClient: function () { return istemci; } };

  document.addEventListener('DOMContentLoaded', function () {
    document.title = 'Örnek panel · Norevo';
    var s = document.createElement('div');
    s.className = 'ornek-serit'; s.setAttribute('role', 'note');
    s.innerHTML = '<span><b>Örnek panel.</b><span class="ornek-uzun"> İşletme ve rakip adları uydurmadır; hiçbir şey kaydedilmez.</span></span> <a href="test.html">Kendi işletmenizi görün →</a>';
    document.body.insertBefore(s, document.body.firstChild);
    // Çıkış ve hesap silme örnekte anlamsız: ana sayfaya dönüş
    var c = document.getElementById('cikis'); if (c) c.textContent = 'Örnekten çık';
  });
})();
