// Norevo: müşteri paneli. İşletme bilgisi + gerçek ölçüm sonuçları.
(function () {
  'use strict';
  var A = window.NorevoAuth;
  var $ = function (id) { return document.getElementById(id); };
  var MOD = { gelir: 'Dükkânıma gelir', giderim: 'Ben adrese giderim', online: 'İnternetten çalışırım' };
  var SIKLIK = { haftalik: 'tercihiniz haftalık kısa özet', onemli: 'tercihiniz sadece önemli bir şey olunca', yok: 'mesaj göndermeyeceğiz' };
  var oturum, isletme;

  // Cümlelerde kullanılan iş adı: ölçüm motorunun bulduğu Türkçe ad ("dentist" yazıldıysa "diş hekimi"), yoksa yazılan iş türü
  function isAdi(i, yedek) { var p = i && i.sektor_profili; return ((p && p.ad) || (i && i.is_turu) || yedek || '').toLocaleLowerCase('tr').trim(); }
  function el(tag, metin, sinif) { var e = document.createElement(tag); if (metin != null) e.textContent = metin; if (sinif) e.className = sinif; return e; }
  // Türkçe bulunma eki: son ünlüye göre -da/-de, sert ünsüzden sonra -ta/-te (Çorum’da, Kadıköy’de, Bağcılar’da, Ahmet’te)
  function yerde(semt) {
    if (semt === 'Türkiye geneli') return 'Türkiye’de';
    var ad = (semt || '').split(',')[0].trim(), kucuk = ad.toLocaleLowerCase('tr');
    var unluler = kucuk.match(/[aıoueiöü]/g) || ['e'], son = unluler[unluler.length - 1];
    var kalin = 'aıou'.indexOf(son) >= 0, sert = /[çfhkpsşt]$/.test(kucuk);
    return ad + '’' + (sert ? 't' : 'd') + (kalin ? 'a' : 'e');
  }
  function gosterLink(url) { return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
  function sayi(x) { return x == null ? '-' : Number(x).toLocaleString('tr-TR'); }
  function tarih(t) { return new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }

  var EKLER = ['satıcısı', 'satıcı', 'satış', 'mağazası', 'mağaza', 'firması', 'firma', 'hizmeti', 'hizmetleri', 'merkezi', 'noktası', 'şirketi'];
  function sadeK(x) { return (x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tekil(liste) {
    var gor = {}, out = [];
    liste.map(function (x) { return (x || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).forEach(function (k) {
      var im = sadeK(k).split(' ').sort().join(' '); if (!gor[im]) { gor[im] = 1; out.push(k); }
    });
    return out;
  }
  function otomatikKelimeler(i) {
    var isK = isAdi(i, '').trim();
    var yer = i.semt === 'Türkiye geneli' ? '' : (i.semt || '').split(',')[0].trim().toLocaleLowerCase('tr');
    var cek = isK.split(/\s+/).filter(function (k) { return k && EKLER.indexOf(k) < 0; }).join(' ') || isK;
    return tekil([yer + ' ' + cek, isK + ' ' + yer, 'en iyi ' + cek + ' ' + yer, cek + ' ' + yer + ' tavsiye']).slice(0, 3);
  }
  function siraYaz(td, sira, hata, bakilmadi) {
    if (bakilmadi) { td.textContent = 'bakılmadı'; td.className = 'sira-yok'; return; }
    if (hata) { td.textContent = 'ölçülemedi'; td.className = 'sira-yok'; return; }
    td.textContent = sira ? sira + '.' : 'yok'; td.className = sira ? (sira <= 3 ? 'sira-iyi' : '') : 'sira-yok';
  }

  // Bir işi çizer: başlık, süre, açıklama, madde madde yapılacaklar, kopyalanabilir hazır metin
  // "Yaptım" ile işaretlenen işler: { is_kodu: satır }
  var yapilanlar = {}, kutular = [];
  function isKodu(x) { return x.k || sadeK(x.t).replace(/ /g, '-').slice(0, 70); }
  // İşlerim kutuları önem sırasıyla; aynı iş ya da aynı site sadece en üstteki kutuda bir kez görünür
  var KUTU_SIRA = ['olcum-isler', 'yp-isler', 'site-isler', 'yz-isler', 'metin-isler', 'isler'];
  function alanSade(a) { return String(a || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase(); }
  function tekrarsiz(kutu, isler) {
    var s = KUTU_SIRA.indexOf(kutu.id), kodlar = {}, alanlar = {};
    // Kendi işi olan site (Yandex, Bing, platform kartları) başka kartın site listesinde tekrar çıkmaz
    KUTU_SIRA.forEach(function (id) { var k = $(id); ((k === kutu ? isler : k && k._isler) || []).forEach(function (x) { if (x.alan) alanlar[alanSade(x.alan)] = 1; }); });
    KUTU_SIRA.slice(0, s).forEach(function (id) { var k = $(id); ((k && k._gosterilen) || []).forEach(function (x) { kodlar[isKodu(x)] = 1; (x.siteler || []).forEach(function (st) { alanlar[alanSade(st.alan)] = 1; }); }); });
    var out = [];
    isler.forEach(function (x) {
      if (!x.bilgi && kodlar[isKodu(x)]) return;
      if (x.siteler) {
        var kalan = x.siteler.filter(function (st) { return !alanlar[alanSade(st.alan)]; });
        if (!kalan.length) return;
        kalan.forEach(function (st) { alanlar[alanSade(st.alan)] = 1; });
        if (kalan.length < x.siteler.length) x = Object.assign({}, x, { siteler: kalan });
      }
      kodlar[isKodu(x)] = 1; out.push(x);
    });
    return out;
  }
  function isEkle(kutu, isler, zincirde) {
    kutu.innerHTML = '';
    kutu._isler = isler; if (kutular.indexOf(kutu) < 0) kutular.push(kutu);
    var s = KUTU_SIRA.indexOf(kutu.id);
    if (s >= 0) isler = kutu._gosterilen = tekrarsiz(kutu, isler);
    var acikVar = false; // her kutuda sadece yapılmamış ilk işin adımları açık; gerisi "Nasıl yapılır?" ile açılır
    isler.forEach(function (x, k) {
      var kod = isKodu(x), yap = !x.bilgi && yapilanlar[kod];
      var kapali = !yap && !x.bilgi && acikVar;
      if (!yap && !x.bilgi) acikVar = true;
      var d = el('div', null, 'is-satir' + (yap ? ' yapildi' : '') + (kapali ? ' kapali' : '')); d.dataset.kod = kod;
      d.appendChild(el('span', yap ? '✓' : String(k + 1), 'is-no'));
      var g = el('div', null, 'is-govde');
      g.appendChild(el('b', x.t)); if (x.s) g.appendChild(el('small', x.s));
      var anaG = g; g = el('div', null, 'is-detay'); anaG.appendChild(g);
      if (x.n) g.appendChild(el('p', x.n));
      if (x.siteler && x.siteler.length) {
        var ul = el('ul', null, 'site-liste');
        x.siteler.forEach(function (st) {
          var li = el('li');
          var a = el('a', st.ad); a.href = st.url; a.target = '_blank'; a.rel = 'noopener nofollow'; li.appendChild(a);
          li.appendChild(el('span', ' ' + st.alan, 'site-alan'));
          if (st.not) li.appendChild(el('small', st.not));
          ul.appendChild(li);
        });
        g.appendChild(ul);
      }
      if (x.adimlar && x.adimlar.length) {
        var ol = el('ol', null, 'adim-liste');
        x.adimlar.forEach(function (a) { ol.appendChild(el('li', a)); });
        g.appendChild(ol);
      }
      if (x.metin) {
        var hm = el('div', null, 'hazir-metin');
        hm.appendChild(el('span', x.metin.baslik, 'hazir-baslik'));
        hm.appendChild(el('p', x.metin.yazi));
        var kb = el('button', 'Kopyala', 'btn btn-cizgi kucuk-btn'); kb.type = 'button';
        kb.addEventListener('click', function () {
          var bitti = function () { kb.textContent = 'Kopyalandı'; setTimeout(function () { kb.textContent = 'Kopyala'; }, 1800); };
          if (navigator.clipboard) navigator.clipboard.writeText(x.metin.yazi).then(bitti, function () {}); else bitti();
        });
        hm.appendChild(kb); g.appendChild(hm);
      }
      if (x.yaz) g.appendChild(yazKutusu(x.yaz));
      if (x.sonuc) g.appendChild(el('p', 'Ne kazanırsınız: ' + x.sonuc, 'is-sonuc'));
      if (x.l) { var a = el('a', x.lm + ' →'); a.href = x.l; if (/^http/.test(x.l)) { a.target = '_blank'; a.rel = 'noopener'; } g.appendChild(a); }
      if (!x.bilgi) {
        var alt = el('div', null, 'is-alt');
        if (yap) {
          alt.appendChild(el('span', 'Yaptınız · ' + kisaTarihG(yap.yapildi), 'pil pil-y'));
          var ac = el('button', 'Adımları göster', 'link-btn'); ac.type = 'button';
          ac.addEventListener('click', function () { var a = d.classList.toggle('acik'); ac.textContent = a ? 'Adımları gizle' : 'Adımları göster'; });
          var geri = el('button', 'Geri al', 'link-btn'); geri.type = 'button';
          geri.addEventListener('click', function () { geriAl(kod, geri); });
          alt.appendChild(ac); alt.appendChild(geri);
        } else {
          var yb = el('button', 'Bitirdim, işaretle', 'btn btn-amber kucuk-btn'); yb.type = 'button';
          yb.addEventListener('click', function () { yaptim(kod, x, yb); });
          if (kapali) {
            var nb = el('button', 'Nasıl yapılır?', 'btn btn-cizgi kucuk-btn'); nb.type = 'button';
            nb.addEventListener('click', function () { var a = d.classList.toggle('acik'); nb.textContent = a ? 'Adımları gizle' : 'Nasıl yapılır?'; });
            alt.appendChild(nb);
          }
          alt.appendChild(yb);
        }
        anaG.appendChild(alt);
      }
      d.appendChild(anaG); kutu.appendChild(d);
    });
    // Üstteki kutu değişince alttakiler yeniden süzülür (kutular farklı zamanlarda dolar)
    if (s >= 0 && !zincirde) KUTU_SIRA.slice(s + 1).forEach(function (id) { var k = $(id); if (k && k._isler) isEkle(k, k._isler, true); });
  }
  function kisaTarihG(t) { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); }
  function anlik() {
    var o = gecmis[0];
    return o ? { olcum_id: o.id || null, tarih: o.baslangic, harita_sira: o.harita_sira || null, harita_olculdu: !!o.harita_sonuclar, arama_sira: o.arama_sira || null, yz_yuzde: yzYuzde(o) } : null;
  }
  function isleriYenile() {
    kutular.forEach(function (k) { if (k._isler) isEkle(k, k._isler); });
    yapilanCiz(); siradakiCiz(); isSayaci();
  }
  // ---- Bu haftanın işleri: hedefe göre sıralı, haftada 3 iş ----
  var HEDEFLER = {
    telefon: { ad: 'Daha çok telefon', isler: ['google-profil', 'nap', 'yorum', 'yorum-cevap-', 'puan', 'profil-', 'aciklama', 'urun-listesi', 'fotograf'] },
    dukkan: { ad: 'Dükkânıma daha çok müşteri', isler: ['google-profil', 'fotograf', 'yorum', 'yorum-cevap-', 'puan', 'apple-yandex', 'bing', 'gonderi-', 'nap'] },
    internet: { ad: 'İnternetten daha çok müşteri', isler: ['site-sayfa', 'site-baslik', 'site-saglik-', 'site-yok', 'sayfa-', 'yz-kaynak', 'rakip-sayfa', 'rehber-', 'sektor-siteleri', 'liste-sayfalari', 'platform-', 'guclendir-'] }
  };
  var ekstraIs = 0, tumIsler = false;
  function hedefeUygun(kod) {
    var h = HEDEFLER[isletme && isletme.hedef]; if (!h) return false;
    return h.isler.some(function (p) { return p.slice(-1) === '-' ? kod.indexOf(p) === 0 : kod === p; });
  }
  // Önerilen işler, hedefe göre: Google profili her zaman önce, sonra hedefe uyanlar, sonra diğerleri (kendi sıralarıyla)
  function hedefSirali() {
    var l = onerilenler(), puan = function (z, n) { return (z.kod === 'google-profil' ? 0 : hedefeUygun(z.kod) ? 1 : 2) * 1000 + n; };
    return l.map(function (z, n) { return { z: z, p: puan(z, n) }; }).sort(function (a, b) { return a.p - b.p; }).map(function (a) { return a.z; });
  }
  function haftaBasi() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function hedefCiz() {
    var kutu = $('hedef-kutu'); if (!kutu) return; kutu.innerHTML = '';
    var h = HEDEFLER[isletme && isletme.hedef];
    if (h) {
      var p = el('p', 'Hedefiniz: ' + h.ad + '. İşleri buna göre sıraladık. ', 'hedef-satir');
      var deg = el('button', 'Değiştir', 'link-btn'); deg.type = 'button';
      deg.addEventListener('click', function () { hedefSoru(kutu); });
      p.appendChild(deg); kutu.appendChild(p);
    } else hedefSoru(kutu);
  }
  function hedefSoru(kutu) {
    kutu.innerHTML = '';
    var d = el('div', null, 'hedef-soru');
    d.appendChild(el('b', 'Bu ay en çok ne istiyorsunuz?'));
    var s = el('div', null, 'hedef-secenekler');
    Object.keys(HEDEFLER).forEach(function (k) {
      var b = el('button', HEDEFLER[k].ad, 'btn btn-cizgi'); b.type = 'button';
      if (isletme.hedef === k) b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () {
        s.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        A.sb.from('isletmeler').update({ hedef: k }).eq('id', isletme.id).then(function (r) {
          if (r.error) throw r.error;
          isletme.hedef = k; haftaCiz();
        }).catch(function (e) { s.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); alert(A.hataMetni(e)); });
      });
      s.appendChild(b);
    });
    d.appendChild(s); kutu.appendChild(d);
  }
  function haftaCiz() {
    var kutu = $('hafta-isler'); if (!kutu || !isletme) return;
    hedefCiz();
    var sirali = hedefSirali(), bas = haftaBasi();
    var acik = sirali.filter(function (z) { return !yapilanlar[z.kod]; });
    var buHafta = sirali.filter(function (z) { var y = yapilanlar[z.kod]; return y && new Date(y.yapildi) >= bas; });
    var kota = Math.max(0, 3 - buHafta.length) + ekstraIs;
    var gosterilen = acik.slice(0, kota);
    var eski = kutular.indexOf(kutu); if (eski >= 0) kutular.splice(eski, 1);
    isEkle(kutu, buHafta.map(function (z) { return z.x; }).concat(gosterilen.map(function (z) { return z.x; })));
    kutular.splice(kutular.indexOf(kutu), 1); kutu._isler = null;
    var bitenSayi = buHafta.length;
    $('hafta-pil').textContent = bitenSayi + ' / ' + Math.max(3, bitenSayi + gosterilen.length) + ' bitti';
    $('hafta-not').textContent = acik.length
      ? 'Her hafta sadece 3 işe odaklanın. Bitirdiğiniz işi "Bitirdim, işaretle" düğmesiyle işaretleyin, etkisini takip edelim.'
      : 'Bütün işleri bitirdiniz. Etkisini haftalık ölçümlerde görürsünüz.';
    var alt = $('hafta-alt'); alt.innerHTML = '';
    if (acik.length && !gosterilen.length) {
      var b = el('div', null, 'hafta-bitti');
      b.appendChild(el('p', 'Bu haftanın 3 işi bitti. Google’ın fark etmesi birkaç hafta sürer; isterseniz şimdiden sıradakilere geçebilirsiniz.'));
      var ac = el('button', 'Gelecek haftanın işlerini şimdi aç', 'btn btn-amber'); ac.type = 'button';
      ac.addEventListener('click', function () { ekstraIs += 3; haftaCiz(); });
      b.appendChild(ac); alt.appendChild(b);
    }
    var tb = $('tum-isler-btn'), toplam = sirali.length;
    tb.hidden = !toplam;
    tb.textContent = tumIsler ? 'Sadece bu haftanın işlerini göster' : 'Tüm işleri göster (' + toplam + ' iş)';
    tb.setAttribute('aria-expanded', tumIsler ? 'true' : 'false');
    $('isler-sayfa').classList.toggle('odak', !tumIsler);
  }
  $('tum-isler-btn').addEventListener('click', function () { tumIsler = !tumIsler; haftaCiz(); });
  function yaptim(kod, x, btn) {
    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    var ekle = function () { return A.sb.from('yapilan_isler').insert({ isletme_id: isletme.id, is_kodu: kod, baslik: String(x.t).slice(0, 200), onceki: anlik() }).select().single(); };
    ekle().then(function (r) {
      // Aynı kodlu eski kayıt var: işletme bilgisi değişmeden önceye ait olduğu için gizlenmişti; silinip yenisi yazılır
      if (r.error && r.error.code === '23505') return A.sb.from('yapilan_isler').delete().eq('isletme_id', isletme.id).eq('is_kodu', kod).then(ekle);
      return r;
    }).then(function (r) {
      if (r.error && r.error.code !== '23505') throw r.error;
      if (r.data) yapilanlar[kod] = r.data; else yapilanlar[kod] = { is_kodu: kod, baslik: x.t, yapildi: new Date().toISOString(), onceki: anlik() };
      isleriYenile();
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Bitirdim, işaretle'; alert(A.hataMetni(e)); });
  }
  function geriAl(kod, btn) {
    var y = yapilanlar[kod]; if (!y) return;
    btn.disabled = true;
    A.sb.from('yapilan_isler').delete().eq('isletme_id', isletme.id).eq('is_kodu', kod).then(function (r) {
      if (r.error) throw r.error;
      delete yapilanlar[kod]; isleriYenile();
    }).catch(function (e) { btn.disabled = false; alert(A.hataMetni(e)); });
  }
  // Yapılan işin etkisi: işaretlendiği andaki ölçüm ile sonraki son ölçümü karşılaştırır
  function etkiYaz(y) {
    var gun = Math.floor((Date.now() - new Date(y.yapildi).getTime()) / 864e5);
    var once = y.onceki || null;
    var sonra = gecmis.filter(function (o) { return new Date(o.baslangic) > new Date(y.yapildi); })[0];
    if (gun < 7) return { pil: 'Bekleniyor', sinif: 'pil-a', yazi: 'İlk bakış ' + (7 - gun) + ' gün sonra. Google’ın değişikliği fark etmesi zaman alır.' };
    if (!sonra) return { pil: 'Ölçüm bekleniyor', sinif: 'pil-a', yazi: 'Sıradaki haftalık ölçümden sonra etkisini burada göreceksiniz.' };
    var net = gun >= 28;
    var parca = [];
    var hs = function (v) { return v ? v + '.' : 'ilk 20’de yok'; };
    // Anlık kayıtta harita listesi yok; eski kayıtlarda harita_olculdu alanı da yok (o zaman ölçülmüş sayılır)
    var onceHarita = once && once.harita_olculdu !== false;
    if (once) {
      var a = once.harita_sira, b = sonra.harita_sira;
      if (onceHarita && sonra.harita_sonuclar) parca.push('Haritalar: ' + (a === (b || null) ? 'değişmedi (' + hs(b) + ')' : hs(a) + ' → ' + hs(b)));
      else parca.push('Haritalar bu ölçümlerde alınamadı');
      var yz2 = yzYuzde(sonra);
      if (once.yz_yuzde != null && yz2 != null) parca.push('yapay zekâ: ' + (once.yz_yuzde === yz2 ? 'değişmedi (%' + yz2 + ')' : '%' + once.yz_yuzde + ' → %' + yz2));
    } else parca.push('İşaretlediğinizde ölçüm yoktu; şu an haritalarda ' + (sonra.harita_sonuclar ? hs(sonra.harita_sira) : 'ölçülemedi'));
    var iyi = once && ((onceHarita && sonra.harita_sira && (!once.harita_sira || sonra.harita_sira < once.harita_sira)) || (sonra.yz_soru_sayisi && once.yz_yuzde != null && yzYuzde(sonra) > once.yz_yuzde));
    return { pil: net ? 'Net sonuç' : 'İlk bakış', sinif: iyi ? 'pil-y' : 'pil-a', yazi: parca.join(', ') + '.' + (!net ? ' Net sonuç 4 hafta dolunca (' + kisaTarihG(new Date(new Date(y.yapildi).getTime() + 28 * 864e5)) + ').' : (iyi ? '' : ' Bazı işlerin etkisi daha geç görünür; diğer işlerle birlikte devam edin.')) };
  }
  function yapilanCiz() {
    var liste = Object.keys(yapilanlar).map(function (k) { return yapilanlar[k]; }).sort(function (a, b) { return new Date(b.yapildi) - new Date(a.yapildi); });
    $('yapilan-kart').hidden = !liste.length;
    $('yapilan-sayi').textContent = liste.length + ' iş';
    var kutu = $('yapilan-liste'); kutu.innerHTML = '';
    liste.forEach(function (y) {
      var e = etkiYaz(y), d = el('div', null, 'yapilan');
      var ust = el('div', null, 'yapilan-ust');
      ust.appendChild(el('b', y.baslik || y.is_kodu)); ust.appendChild(el('span', e.pil, 'pil ' + e.sinif));
      d.appendChild(ust);
      d.appendChild(el('small', kisaTarihG(y.yapildi) + ' tarihinde yaptınız'));
      d.appendChild(el('p', e.yazi));
      kutu.appendChild(d);
    });
  }
  // Ekrandaki önerilen işlerden kaç tanesi yapıldı
  function onerilenler() {
    var gor = {}, out = [];
    kutular.slice().sort(function (a, b) { return KUTU_SIRA.indexOf(a.id) - KUTU_SIRA.indexOf(b.id); }).forEach(function (k) { (k._gosterilen || k._isler || []).forEach(function (x) { if (x.bilgi) return; var kod = isKodu(x); if (!gor[kod]) { gor[kod] = 1; out.push({ kod: kod, x: x }); } }); });
    return out;
  }
  function isSayaci() {
    var l = onerilenler(), kalan = l.filter(function (z) { return !yapilanlar[z.kod]; }).length;
    $('isler-sayi').textContent = kalan; $('isler-sayi').hidden = !kalan;
    $('isler-ozet').textContent = l.length ? l.length + ' işten ' + (l.length - kalan) + ' tanesini yaptınız.' + (kalan ? ' Her seferinde sadece sıradaki işe odaklanın.' : ' Hepsi tamam; etkisini haftalık ölçümlerde görürsünüz.') : '';
    haftaCiz();
  }
  // Özet sayfasında: yapılmamış en önemli iş
  function siradakiCiz() {
    var kutu = $('siradaki-is'); if (!kutu) return;
    var ilk = hedefSirali().filter(function (z) { return !yapilanlar[z.kod]; })[0];
    $('siradaki-kart').hidden = !ilk;
    if (!ilk) return;
    $('siradaki-not').textContent = 'Ölçüme göre şu an en çok işinize yarayacak adım:';
    var eski = kutular.indexOf(kutu); if (eski >= 0) kutular.splice(eski, 1);
    isEkle(kutu, [ilk.x]); kutular.splice(kutular.indexOf(kutu), 1); kutu._isler = null;
  }

  function yerAdi(i) { return i.semt === 'Türkiye geneli' ? 'Türkiye' : (i.semt || '').split(',')[0].trim(); }

  // Hazır işler: dükkân sahibinin anlayacağı dille, madde madde
  // Platform kontrolünde (yardimci: platformlar) "var" çıkan site: zaten profili olan yere "hesap açın" denmez
  function platformdaVar(alan) {
    var a = String(alan || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return ((isletme.platformlar && isletme.platformlar.liste) || []).some(function (p) { return p.durum === 'var' && String(p.alan || '').replace(/^www\./, '').split('/')[0] === a; });
  }
  // --- İşlerin işletmeye uyup uymadığını gerçek veriyle kontrol eden yardımcılar (4KDent denetimi, 1 Kasım) ---
  var SAGLIK_K = /\b(dis|hekim\w*|doktor|klinik\w*|hastane\w*|poliklinik\w*|veteriner|eczane|fizyoterap\w*|psikolog|diyetisyen|estetik|saglik|ortodont\w*)\b/;
  function saglikIsl(i) { return SAGLIK_K.test(sadeK((i.is_turu || '') + ' ' + (i.ad || ''))); }
  // "yakınımda" aramaları kişinin konumuna göre değişir: bunlar için sayfa/profil işi önerilmez
  function yakinAramasi(k) { return k.kaynak === 'yakin' || /\byakin/.test(sadeK(k.kelime)); }
  // Özel klinik "diş hastanesi" diye sayfa açamaz (kurum türü işletmeninkiyle uyuşmuyor)
  function kurumUyusmuyor(kelime, i) { return /\bhastane/.test(sadeK(kelime)) && !/\bhastane/.test(sadeK((i.is_turu || '') + ' ' + (i.ad || ''))); }
  // Aramada şehir ve iş türü dışında kalan kelimeler ("çorum implant diş" -> ["implant"]): işletme bu hizmeti veriyor mu bilmiyoruz
  function hizmetKelimeleri(kelime, i) {
    var cikar = sadeK((i.semt || '') + ' ' + (i.is_turu || '') + ' ' + isAdi(i, '') + ' ve en iyi fiyat fiyatlari merkezi merkez ozel' +
      (saglikIsl(i) ? ' hekim hekimi hekimleri disci doktor klinik klinigi klinikleri poliklinik poliklinigi muayenehane agiz saglik sagligi' : '')).split(' ');
    return sadeK(kelime).split(' ').filter(function (w) { return w.length > 2 && !cikar.some(function (c) { return c.length > 2 && (w === c || (c.length > 3 && (w.indexOf(c) === 0 || c.indexOf(w) === 0))); }); });
  }
  // Şart cümlesinde gösterilecek hizmet: aramadan şehir adı çıkınca kalan ifade ("çorum diş teli" -> "diş teli")
  function hizmetIfadesi(kelime, i) { var y = sadeK(yerAdi(i)); return String(kelime).split(/\s+/).filter(function (w) { return sadeK(w) !== y; }).join(' '); }
  // Ana sayfanın başlığı aramanın bütün kelimelerini zaten içeriyorsa ayrı sayfa önerilmez (site taraması: site_saglik.title)
  // Sağlıkta "diş hekimi", "diş kliniği", "dişçi" aynı işi anlatır: başlıkta biri varsa diğerleri de karşılanmış sayılır
  var SAGLIK_ES = ['hekim', 'hekimi', 'disci', 'doktor', 'klinik', 'klinigi', 'poliklinik', 'poliklinigi', 'muayenehane'];
  function siteBuAramayiHedefliyor(kelime, i) {
    var t = sadeK((i.site_saglik && i.site_saglik.title) || ''); if (!t) return false;
    var tk = t.split(' '), saglikBaslik = saglikIsl(i) && tk.some(function (x) { return SAGLIK_ES.indexOf(x) >= 0; });
    return sadeK(kelime).split(' ').filter(function (w) { return w.length > 2; }).every(function (w) {
      return (saglikBaslik && SAGLIK_ES.indexOf(w) >= 0) || tk.some(function (x) { return x === w || (w.length > 3 && x.indexOf(w) === 0); });
    });
  }
  // Rehber/liste sayfası işletmenin şehrine ait mi (link ya da başlıkta şehir geçmeli; "Türkiye geneli" ise hepsi uygun)
  function sehirdeMi(x, i) { var y = sadeK(yerAdi(i)); return i.semt === 'Türkiye geneli' || !y || sadeK((x.link || '') + ' ' + (x.baslik || '')).indexOf(y) >= 0; }
  // Bu ölçümde Google sonuçlarında görünen alan adları (sektör sitesi önerisine kanıt)
  function aramadaGorulenAlanlar(o) {
    var s = {};
    ((o && o.kelimeler) || []).forEach(function (k) { (k.arama_ilk3 || []).concat(k.rehberler || []).forEach(function (x) { if (x.alan) s[String(x.alan).replace(/^www\./, '')] = 1; }); });
    ((o && o.rehber_sayfalari) || []).forEach(function (x) { if (x.alan) s[String(x.alan).replace(/^www\./, '')] = 1; });
    return s;
  }
  var IS = {
    googleProfil: function (i, b) {
      var yer = yerAdi(i);
      return { k: 'google-profil', t: (i.semt === 'Türkiye geneli' ? 'İşletmeniz' : yerde(i.semt) + 'ki işletmeniz') + ' için Google’da kendi profilinizi açın', s: 'En önemli iş · 30 dakika · ücretsiz',
        n: b && b.baska_sube ? 'Google’da "' + i.ad + '" diye arayınca sadece "' + b.baska_sube.ad + '" çıkıyor' + (b.baska_sube.adres ? ' (' + b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ')' : '') + '. ' + yer + ' şubeniz haritada yok gibi görünüyor, müşteri sizi bulamıyor.' : 'Google Haritalar’da "' + i.ad + '" adıyla ' + yer + ' bölgesinde bir işletme bulamadık. Müşteri sizi haritada göremiyor.',
        adimlar: [
          'Önce telefonunuzda Google Haritalar’ı açıp işletmenizin adını yazın. İşletmeniz çıkıyorsa altındaki "Bu işletmenin sahibi misiniz?" yazısına basıp sahiplenin, sonra 4. adıma geçin.',
          'Çıkmıyorsa bilgisayardan ya da telefondan business.google.com adresine Gmail hesabınızla girip "İşletme ekle" deyin.',
          'İşletme adını tabelanızdaki gibi yazın (örnek: "' + i.ad + ' ' + yer + '"). Kategori olarak işinize en yakın olanı seçin (örnek: "' + (i.is_turu || 'Mağaza') + '").',
          'Adresi, telefonu ve çalışma saatlerini girin. Telefon, müşterinin sizi aradığı numara olsun.',
          'Google sizden doğrulama isteyecek. Genelde dükkânınızı, tabelanızı ve içeriyi gösteren kısa bir video çekmenizi ister. Telefonla çekip gönderin.',
          'Onay gelince en az 10 fotoğraf ekleyin: tabela, vitrin, içerisi, ürünler, siz ve çalışanlarınız.'
        ],
        sonuc: 'Haritada "' + yer + ' ' + isAdi(i, '') + '" arayanlar sizi görmeye başlar. Diğer bütün adımlar bu profilin üstüne kurulur.',
        l: 'https://business.google.com', lm: 'Google İşletme Profili' };
    },
    yorum: function (i, benim, ort) {
      return { k: 'yorum', t: 'Her hafta 3-5 yeni Google yorumu toplayın', s: 'Her hafta · 10 dakika',
        n: benim != null ? 'Sizin ' + sayi(benim) + ' yorumunuz var, haritada önünüzdeki işletmelerin ortalaması ' + sayi(ort) + '. Google ve yapay zekâ, çok ve yeni yorumu olan işletmeyi öne çıkarıyor.' : 'Google ve yapay zekâ, çok ve yeni yorumu olan işletmeyi öne çıkarıyor.',
        adimlar: [
          'Google İşletme Profilinize girin ve "Yorum iste" ya da "Yorum bağlantısını paylaş" yazan yerden bağlantınızı kopyalayın.',
          'Satıştan veya teslimattan sonra memnun kalan müşterinize aşağıdaki mesajı WhatsApp’tan gönderin. Mesajdaki [yorum bağlantınız] yazan yere kopyaladığınız bağlantıyı yapıştırın.',
          'Aynı bağlantıyı bir QR koda çevirip kasanın yanına koyun. "QR kod oluştur" diye aratırsanız ücretsiz siteler çıkar.',
          'Gelen her yoruma 2 gün içinde kısa bir teşekkürle cevap verin. Kötü yorumlara tartışmadan, çözüm teklif ederek cevap verin.'
        ],
        metin: { baslik: 'Müşteriye gönderilecek hazır mesaj', yazi: 'Merhaba, ' + i.ad + ' olarak bizi tercih ettiğiniz için teşekkür ederiz. Memnun kaldıysanız Google’da 1 dakikanızı ayırıp kısa bir yorum yazar mısınız? Bu bize çok yardımcı oluyor: [yorum bağlantınız]' },
        sonuc: 'Haritada öne geçmenin en hızlı yolu. Yapay zekâ da önerirken yorum sayısına ve puana bakıyor.' };
    },
    puan: function (i, benim, ort) {
      var y = isletme.yorumlar, cevapsiz = y && y.cevapsiz_sayi != null ? y.cevapsiz_sayi : null;
      return { k: 'puan', t: 'Puanınızı yükseltin', s: '20 dakika, sonra haftada 5 dakika',
        n: 'Puanınız ' + String(benim).replace('.', ',') + ', öndekilerin ortalaması ' + ort.toFixed(1).replace('.', ',') + '.',
        adimlar: [
          'Google İşletme Profilinizdeki yorumlar bölümünü açın.',
          cevapsiz === 0 ? 'Son yorumlarınızın hepsine cevap vermişsiniz; yeni gelenlere de 2 gün içinde cevap verin.' : (cevapsiz ? 'Son yorumlarınızdan ' + cevapsiz + ' tanesi cevapsız; Google sayfasındaki hazır taslaklarla cevaplayın.' : 'Cevapsız kalan bütün yorumlara cevap yazın.') + ' İyi yorumlara teşekkür edin.',
          'Kötü yorumlarda özür dileyin ve çözüm teklif edin. Örnek: "Yaşadığınız sorun için üzgünüz, 05xx numaramızdan bize ulaşırsanız hemen ilgilenelim."',
          'Sorunu çözdüğünüz müşteriden yorumunu güncellemesini rica edin.'
        ],
        sonuc: 'Puanı düşük işletmeyi hem müşteri hem yapay zekâ atlıyor. Cevap verilen kötü yorumlar güven verir.' };
    },
    // Site taranmışsa (site_saglik) eksiklerin hepsi "Sitenizdeki eksikleri düzelttirin" işinde zaten var: aynı şey iki kez istenmez.
    // Sadece site hiç taranmadıysa genel başlık/açıklama mesajı verilir.
    siteBaslik: function (i, sorgu) {
      if (i.site_saglik && i.site_saglik.kontroller) return null;
      var yer = yerAdi(i), isK = (i.is_turu || 'hizmet').toLocaleLowerCase('tr'), ss = i.site_saglik, k = {};
      ((ss && ss.kontroller) || []).forEach(function (x) { k[x.kod] = x; });
      var eksik = function (kod) { return !ss || (k[kod] && !k[kod].tamam); };
      var istek = [], tamam = [], eksikAd = [];
      if (eksik('baslik')) { istek.push('Ana sayfa başlığı (title) şöyle olsun: "' + i.ad + ' | ' + yer + ' ' + isK + '".'); eksikAd.push('başlık'); } else tamam.push('başlığınızda işiniz ve şehriniz var');
      if (eksik('aciklama')) { istek.push('Google’da görünen açıklama (meta description) şöyle olsun: "' + i.ad + ', ' + yer + ' bölgesinde ' + isK + '. Adres, telefon ve çalışma saatlerimiz sitemizde."' + (k.aciklama && k.aciklama.detay ? ' Şu an sadece ' + k.aciklama.detay.replace(/^Açıklama:\s*/, '') + ' yazıyor.' : '')); eksikAd.push('Google açıklaması'); }
      var yazi = [eksik('telefon') && 'telefonumuz', eksik('yer') && 'adresimiz'].filter(Boolean);
      if (yazi.length) { istek.push('Ana sayfada ' + yazi.join(' ve ') + ' yazı olarak (resim değil) görünsün.'); eksikAd.push(yazi.join(' ve ').replace('umuz', '').replace('imiz', '')); } else if (ss) tamam.push('telefonunuz ve şehriniz sayfada yazıyor');
      if (!istek.length) return null;
      return { k: 'site-baslik', t: eksik('baslik') ? 'Sitenizin Google’da görünen başlığını düzeltin' : 'Sitenizin Google açıklamasını tamamlayın', s: '15 dakika (sitenizi yapan kişi için)',
        n: '"' + sorgu + '" aramasında sitenizi ilk sonuçlarda göremedik.' + (tamam.length ? ' Sitenize baktık: ' + tamam.join(', ') + '. Eksik olan: ' + eksikAd.join(', ') + '.' : ' Google, sitenizin başlığında işinizi ve şehrinizi görmek istiyor.'),
        adimlar: [
          'Sitenizi kim yaptıysa (ajans, tanıdık, siz) aşağıdaki mesajı ona gönderin.',
          'Değişiklik yapılınca 2-4 hafta bekleyin. Norevo bir sonraki ölçümlerde farkı gösterecek.'
        ],
        metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemizde ' + (istek.length > 1 ? 'şu ' + istek.length + ' değişikliği' : 'şu değişikliği') + ' yapabilir misiniz? ' + istek.map(function (x, n) { return istek.length > 1 ? (n + 1) + ') ' + x : x; }).join(' ') + ' Teşekkürler.' },
        sonuc: 'Google aramasında sitenizin çıkma şansı artar.' };
    },
    siteYok: function (i) {
      return { k: 'site-yok', t: 'Bir web siteniz olsun', s: 'İsterseniz biz hazırlarız · 1-2 gün içinde teslim',
        n: 'Siteniz yok. Google aramasında ve yapay zekâ cevaplarında en çok kaynak gösterilen şey işletmelerin kendi siteleri. Sitenizi sizin için hazırlayıp 1-2 gün içinde teslim edebiliriz; kendiniz yaptırmak isterseniz de olur.',
        adimlar: [
          'Bize WhatsApp’tan yazın. Ne sattığınızı ya da hangi hizmeti verdiğinizi konuşalım; fiyatı ve teslim gününü baştan söyleriz, sizi bağlayan bir şey yok.',
          'Siteyi Google’ın aradığı başlık, açık adres, telefon ve çalışma saatleriyle hazırlarız. Telefonda hızlı açılır, tek dokunuşla arama ve yol tarifi olur.',
          'Teslimden sonra sitenin adresini Google İşletme Profilinize ve Instagram’ınıza ekleriz; sırasını Norevo her hafta ölçer.',
          'Kendiniz yaptırmak isterseniz: sayfada ne sattığınız, açık adres, telefon ve çalışma saatleri yazı olarak (resim değil) olsun, müşterilerin en çok sorduğu 5 soru ve cevabı da eklensin.'
        ],
        sonuc: 'Google aramasında çıkmaya başlarsınız ve yapay zekâ sizin hakkınızda okuyacak bir kaynak bulur.',
        l: 'https://wa.me/905556984086?text=' + encodeURIComponent('Merhaba, ' + (i.ad || 'işletmem') + ' için web sitesi yaptırmak istiyorum.'), lm: 'WhatsApp’tan bilgi alın' };
    },
    siteGorunmuyor: function (i, o) {
      var alan = String(i.site || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      return { k: 'site-gorunmuyor', t: 'Sitenizi Google’a tanıtın', s: '20 dakika · ücretsiz',
        n: 'Google’da "' + ((o.marka_arama && o.marka_arama.kelime) || i.ad) + '" diye aratınca bile siteniz (' + alan + ') ilk 10 sonuçta çıkmıyor. Google sitenizi henüz tanımıyor ya da önemsemiyor olabilir.',
        adimlar: [
          'Google Search Console’u açın (search.google.com/search-console), Google hesabınızla girin ve sitenizi ekleyin. Sitenizi yapan kişi bunu 10 dakikada yapar.',
          'Search Console’da "URL denetimi" kısmına ana sayfa adresinizi yazıp "Dizine eklenmesini iste" deyin.',
          'Sitenin adresini Google İşletme Profilinize ve Instagram’ınıza ekleyin.'
        ],
        sonuc: 'Google sitenizi tanır; adınızla ve işinizle yapılan aramalarda siteniz çıkmaya başlar.' };
    },
    profilSite: function (i) {
      return { k: 'profil-site', t: 'Google profilinize sitenizin adresini ekleyin', s: '5 dakika · ücretsiz',
        n: 'Siteniz var ama Google Haritalar’daki profilinizde site bağlantısı görünmüyor. Müşteri sitenize oradan ulaşamıyor, Google da ikisini birbirine bağlayamıyor.',
        adimlar: [
          'Telefonda Google Haritalar’ı açın, işletmenizi bulun ve "İşletmenizi düzenleyin"e basın.',
          '"İletişim" bölümünde "Web sitesi" kutusuna şu adresi yazın: ' + (i.site || '') + '. Kaydedin.'
        ],
        sonuc: 'Profilinizden sitenize gelen olur; Google işletmenizle sitenizi aynı yer olarak tanır.' };
    },
    bing: function (i) {
      return { k: 'bing', t: 'Bing Haritalar’da işletme hesabı açın', s: '15 dakika · ücretsiz',
        n: 'ChatGPT’nin baktığı kaynaklardan biri Bing; orada da kaydınızın olması şansınızı artırır.',
        adimlar: [
          'bingplaces.com adresine girin. Gmail ya da Hotmail/Outlook hesabınızla giriş yapın.',
          'Google İşletme Profiliniz varsa "Google’dan içe aktar" seçeneğini seçin. Bilgileriniz kendiliğinden gelir.',
          'Profiliniz yoksa işletmenizi elle ekleyin. Adı, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.',
          'Bing sizden doğrulama ister (telefon, e-posta ya da kod). İstenen kodu girin.'
        ],
        sonuc: 'ChatGPT’ye "' + yerAdi(i) + ' ' + isAdi(i, '') + '" sorulduğunda listeye girme şansınız doğar.',
        l: 'https://www.bingplaces.com', lm: 'Bing Places', alan: 'bing.com' };
    },
    // Apple otomatik kontrol edilemiyor; kodu eski "Yaptım" kayıtları için aynı kaldı
    apple: function () {
      return { k: 'apple-yandex', t: 'Apple Haritalar’a ekleyin', s: '10 dakika · ücretsiz',
        n: 'iPhone kullananlar ve Siri Apple Haritalar’a bakıyor; orayı otomatik kontrol edemiyoruz.',
        adimlar: [
          'Önce iPhone’da Haritalar uygulamasında adınızı aratın; çıkıyorsa bu adımı geçin.',
          'Çıkmıyorsa businessconnect.apple.com adresine Apple kimliğinizle (iPhone’unuzdaki hesap) girin, "İşletme ekle" deyin, bilgilerinizi girin.',
          'Adı, adresi ve telefonu Google’daki ile aynı yazın. Farklı yazılmış bilgi yapay zekânın kafasını karıştırır.'
        ],
        sonuc: 'Yapay zekâ sizi ne kadar çok yerde aynı bilgiyle görürse size o kadar güveniyor.',
        l: 'https://businessconnect.apple.com', lm: 'Apple Business Connect' };
    },
    // Kodu platform kartıyla aynı: platform kontrolü Yandex'i bulamadıysa ikisinden sadece biri görünür
    yandex: function () {
      return { k: 'platform-yandex-com-tr-harita', t: 'Yandex Haritalar’da profil açın', s: '15-20 dakika · ücretsiz',
        n: 'Türkiye’de birçok kişi Yandex Haritalar’a bakıyor; yapay zekâ da Yandex kayıtlarını kaynak gösteriyor.',
        adimlar: [
          'Önce Yandex Haritalar’da işletmenizin adını arayın; çıkıyorsa bilgilerini güncelleyin.',
          'Çıkmıyorsa Google’a "Yandex Business" yazın, çıkan Yandex sayfasından ücretsiz kayıt olun.',
          'Adı, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.'
        ],
        sonuc: 'Yapay zekâ sizi ne kadar çok yerde aynı bilgiyle görürse size o kadar güveniyor.',
        l: 'https://yandex.com.tr/harita', lm: 'Yandex Haritalar', alan: 'yandex.com.tr' };
    }
  };

  // Sektörünüzdeki rehber ve platform siteleri: araştırılmış liste + Google'da gerçekten çıkan liste sayfaları
  function rehberIsleri(i, o) {
    var isler = [];
    // Yapay zekânın önerdiği sektör sitelerinden sadece bu işletmenin Google aramalarında gerçekten görünenler ya da
    // sektörüyle bilinen büyük siteler kalır (4KDent'e "Armut" ve var olmayan "Enuygun Sağlık" önerilmişti)
    var gorulen = aramadaGorulenAlanlar(o), tS = sadeK(i.is_turu || '');
    var bilinen = ['sikayetvar.com'].concat(saglikIsl(i) ? ['doktortakvimi.com'] : [],
      /(tadilat|temizlik|nakliyat|boya|tesisat|elektrik|usta|montaj|tamir|ders|fotograf|klima|cilingir)/.test(tS) ? ['armut.com'] : [],
      /(restoran|kafe|cafe|lokanta|otel|pansiyon|kebap|pide)/.test(tS) ? ['tripadvisor.com.tr', 'yemeksepeti.com'] : []);
    var sektorHepsi = (isletme.sektor_rehberleri || i.sektor_rehberleri || []).filter(function (x) { var a = String(x.alan || '').replace(/^www\./, ''); return gorulen[a] || bilinen.indexOf(a) >= 0; });
    var sektor = sektorHepsi.filter(function (x) { return !platformdaVar(x.alan); });
    var zatenVar = sektorHepsi.length - sektor.length;
    if (sektor.length) isler.push({
      k: 'sektor-siteleri', t: 'Sektörünüzün sitelerinde işletme hesabı açın', s: 'Her biri 15-20 dakika · çoğu ücretsiz',
      n: '"' + (i.is_turu || 'işletme') + '" işletmeleri için Türkiye’de müşterilerin baktığı siteleri araştırdık. Yapay zekâ ve Google bu sitelerdeki profilleri okuyor. ' + (zatenVar ? zatenVar + ' tanesinde sizi zaten bulduk; kalanlarda ' : 'Aşağıdakilerin her birinde ') + 'hesabınız olsun:',
      siteler: sektor.map(function (x) { return { ad: x.ad, alan: x.alan, url: 'https://' + x.alan, not: x.ne_ise_yarar }; }),
      adimlar: [
        'Listedeki her siteye girin ve "Firma ekle", "İşletme kaydı", "Satıcı ol" ya da "Hizmet veren ol" yazan bölümü bulun.',
        'İşletme adını, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.',
        'Ürün veya hizmetlerinizi, fotoğraflarınızı ve çalışma saatlerinizi ekleyin.',
        'Müşterilerinizden bu sitelerde de yorum isteyin.'
      ],
      sonuc: 'Yapay zekâ sizi ne kadar çok güvenilir sitede görürse o kadar çok öneriyor.'
    });
    var tum = (o.rehber_sayfalari || []).filter(function (x) { return sehirdeMi(x, i); });
    var sayfalar = tum.filter(function (x) { return x.tur !== 'rakip'; });
    var rakipSayfa = tum.filter(function (x) { return x.tur === 'rakip'; });
    // Sitesi olmayana "sitenizi yapan kişiye mesaj" denmez; önce site işi gelir
    if (rakipSayfa.length && i.site) isler.push({
      k: 'rakip-sayfa', t: 'Rakiplerinizin Google’da öne çıkan sayfasının benzerini yapın', s: '1-2 saat (sitenizi yapan kişi için)',
      n: 'Bu rakipler kendi sitelerine aramayla aynı başlıkta bir sayfa açmış ve Google’da üst sıralara çıkmış:',
      siteler: rakipSayfa.map(function (x) { return { ad: x.baslik, alan: x.alan, url: 'https://' + x.alan, not: '"' + x.kelime + '" aramasında ' + x.sira + '. sırada.' }; }),
      adimlar: [
        'Bu sayfaları açıp bakın: başlıkta şehir ve iş adı geçiyor, içinde ürünler, adres ve telefon var.',
        'Sitenizi yapan kişiye aşağıdaki mesajı gönderin.',
        'Sayfa yayına girince 3-4 hafta bekleyin; Norevo haftalık ölçümde değişimi gösterecek.'
      ],
      metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemize "' + rakipSayfa[0].kelime.replace(/(^|\s)\S/g, function (h) { return h.toLocaleUpperCase('tr'); }) + '" başlıklı yeni bir sayfa ekleyebilir misiniz? Sayfada ' + yerAdi(i) + ' işletmemizin adresi, telefonu, çalışma saatleri, verdiğimiz hizmetler ya da sattığımız ürünler (fotoğraflı), hizmet verdiğimiz bölgeler ve sık sorulan 5 soru ile cevapları olsun. Sayfa başlığı ve ana başlık aynı olsun. Teşekkürler.' },
      sonuc: 'Rakiplerinizin çıktığı aramalarda siz de Google’ın ilk sayfasına çıkma şansı yakalarsınız.'
    });
    if (sayfalar.length) isler.push({
      k: 'liste-sayfalari', t: 'Google’da çıkan liste sayfalarına adınızı ekletin', s: 'Sayfa başına 10 dakika',
      n: 'Müşterileriniz Google’da arama yapınca bu liste ve rehber sayfalarını görüyor. Sayfaların içini otomatik okuyamıyoruz; adınızın geçip geçmediğine bir bakın:',
      siteler: sayfalar.map(function (x) { return { ad: x.baslik, alan: x.alan, url: 'https://' + x.alan, not: '"' + x.kelime + '" aramasında ' + x.sira + '. sırada çıkıyor.' }; }),
      adimlar: [
        'Her sayfayı açın ve listede işletmenizin olup olmadığına bakın.',
        'Yoksa sayfadaki "Firma ekle", "Ücretsiz kayıt" ya da "İletişim" bölümünden işletmenizi ekleyin veya eklenmesini isteyin.',
        'Varsa adres ve telefonunuzun doğru yazıldığını kontrol edin.'
      ],
      sonuc: 'Google aramasında listelerden gelen müşterilere de görünürsünüz; yapay zekâ bu listeleri sık kaynak gösteriyor.'
    });
    return isler;
  }

  // Ölçüm sonucundan yapılacaklar çıkarır (sadece ölçülen farka dayanır)
  function olcumIsleri(o, i) {
    var isler = [];
    var b = o.isletme_bilgi || {};
    // Karşılaştırma sadece haritada ÖNÜNÜZDEKİLERLE (en fazla 3); 1. sıradaysanız yorum/puan işi çıkmaz.
    // (Eskiden ilk 3 "rakip" alınıyordu: 4KDent 3. iken 4. sıradaki 35 yorumlu işletme de ortalamaya giriyordu.)
    var benS = ((o.harita_sonuclar || []).filter(function (r) { return r.siz; })[0] || {}).sira;
    var ilk3 = (o.harita_sonuclar || []).filter(function (r) { return !r.siz && (!benS || r.sira < benS); }).slice(0, 3);
    var ortYorum = ilk3.length ? Math.round(ilk3.reduce(function (t, r) { return t + (r.yorum || 0); }, 0) / ilk3.length) : null;
    var ortPuan = ilk3.length ? ilk3.reduce(function (t, r) { return t + (r.puan || 0); }, 0) / ilk3.length : null;
    if (b.bulundu === false) isler.push(IS.googleProfil(i, b));
    if (b.bulundu && ortYorum != null && (b.yorum || 0) < ortYorum) isler.push(IS.yorum(i, b.yorum || 0, ortYorum));
    if (b.bulundu && b.puan != null && ortPuan != null && b.puan + 0.1 < ortPuan) isler.push(IS.puan(i, b.puan, ortPuan));
    // Arama ölçülemediyse (arama_sonuclar yok) "sitenizi göremedik" denmez
    if (o.arama_sonuclar && o.arama_sira == null && !i.site) isler.push(IS.siteYok(i));
    // Site adıyla aratınca bile ilk 10'da yoksa asıl sorun başlık değil, Google'ın siteyi tanımaması
    else if (o.arama_sonuclar && o.arama_sira == null && i.site) { var sb = o.marka_arama && o.marka_arama.sira == null ? IS.siteGorunmuyor(i, o) : IS.siteBaslik(i, o.arama_sorgu || ''); if (sb) isler.push(sb); }
    var benH = (o.harita_sonuclar || []).filter(function (r) { return r.siz; })[0];
    if (i.site && benH && !benH.site) isler.push(IS.profilSite(i));
    // Bing işi ChatGPT için: ChatGPT ölçüldüyse onun sonucuna, ölçülmediyse Gemini'ye bakılır
    if (o.cg_soru_sayisi ? o.cg_gecen === 0 : (o.yz_soru_sayisi && o.yz_gecen === 0)) isler.push(IS.bing(i));
    if (o.harita_sira && o.harita_sira <= 3 && o.yz_gecen > 0) {
      isler.push({ k: 'koru', t: 'İyi durumdasınız, yerinizi koruyun', s: 'Her hafta', n: 'Haritalarda ilk 3’tesiniz ve yapay zekâ sizi öneriyor. Bunu korumak için:', adimlar: ['Her hafta birkaç yeni Google yorumu toplamaya devam edin.', 'Ayda 2-3 yeni fotoğraf ekleyin.', 'Kampanya veya yeni ürün olunca Google profilinizde "Güncelleme" paylaşın.'] });
    }
    return isler.slice(0, 4);
  }

  // ChatGPT ve Google Yapay Zekâ Modu'nun işletme önerirken kaynak gösterdiği siteler (ölçümde kaydedilir; eski ölçümde cevaptaki
  // bağlantılardan çıkarılır). Kendi siteniz, rakiplerin siteleri, sosyal medya, devlet siteleri ve zaten profil olan yerler çıkarılır.
  var KAYNAK_DISI = /(^|\.)(google\.|youtube\.com|instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com|wikipedia\.org|openai\.com|gov\.tr$)/;
  // Yerel haber sitelerinin resimleri teimg.com'dan gelir ("corumhakimiyetnet.teimg.com" = corumhakimiyet.net); çevrilemeyen resim sunucusu atılır
  var TEIMG = { comtr: 'com.tr', nettr: 'net.tr', orgtr: 'org.tr', com: 'com', net: 'net', org: 'org', tv: 'tv' };
  function alanOf(u) {
    try { var a = new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    var m = /^(.+?)(comtr|nettr|orgtr|com|net|org|tv)\.teimg\.com$/.exec(a);
    return m ? m[1] + '.' + TEIMG[m[2]] : /teimg\.com$/.test(a) ? '' : a;
  }
  function yzKaynakIsi(o, i) {
    if (!o) return null;
    var say = {}, haric = {}, cevap = 0;
    haric[alanOf(i.site || '')] = 1;
    (o.harita_sonuclar || []).forEach(function (r) { if (r.site) haric[alanOf(r.site)] = 1; });
    (o.cg_cevaplar || []).concat(o.gyz_cevaplar || []).forEach(function (c) {
      if (!c || c.hata) return;
      var k = (c.kaynaklar || String(c.ozet || '').match(/https?:\/\/[^\s)\]"']+/g) || []).map(alanOf);
      var bu = {}; k.forEach(function (a) { if (a) bu[a] = 1; });
      Object.keys(bu).forEach(function (a) { if (!haric[a] && !KAYNAK_DISI.test(a) && !platformdaVar(a)) say[a] = (say[a] || 0) + 1; });
      cevap++;
    });
    var liste = Object.keys(say).sort(function (a, b) { return say[b] - say[a]; }).slice(0, 6);
    if (!liste.length) return null;
    return { k: 'yz-kaynak', t: 'Yapay zekânın kaynak gösterdiği sitelerde yer alın', s: 'Site başına 10-15 dakika · çoğu ücretsiz',
      n: 'ChatGPT ve Google Yapay Zekâ Modu, ' + yerde(i.semt) + ' ' + isAdi(i, 'işletme') + ' önerirken bu sitelere baktı. Buralarda adınız yoksa önerilmeniz zorlaşıyor:',
      siteler: liste.map(function (a) { return { ad: a, alan: a, url: 'https://' + a, not: say[a] + ' / ' + cevap + ' cevapta kaynak' }; }),
      adimlar: ['Her siteyi açın ve ' + yerAdi(i) + ' ' + isAdi(i, '') + ' listesinde işletmenizin olup olmadığına bakın.', 'Yoksa "Firma ekle", "İşletme kaydı" ya da "İletişim" bölümünden eklenmesini isteyin. Adı, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.', 'Varsa bilgilerinizin güncel olduğunu kontrol edin.'],
      sonuc: 'Yapay zekâ önerirken bu sitelere bakıyor; orada görünmek önerilme şansınızı doğrudan artırır.' };
  }
  // Yapay zekâda önerilmek için somut adımlar; sektöre göre rehber önerir
  function yzYolu(o, i) {
    var t = sadeK(i.is_turu || '');
    var yer = yerAdi(i);
    var isK = isAdi(i, 'işletme');
    var cek = isK.split(/\s+/).filter(function (k) { return k && EKLER.indexOf(k) < 0; }).join(' ') || isK;
    var adimlar = [IS.bing(i), IS.apple()].concat(platformdaVar('yandex.com.tr') ? [] : [IS.yandex()]);
    var yk = yzKaynakIsi(o, i); if (yk) adimlar.unshift(yk);
    var arastirilmis = rehberIsleri(i, o);
    if (arastirilmis.length) adimlar = adimlar.concat(arastirilmis);
    else if (/(dis|doktor|hekim|klinik|psikolog|diyetisyen|fizyoterap|estetik|saglik)/.test(t) && !/veteriner/.test(t))
      adimlar.push({ t: 'Doktortakvimi’nde profil açın', s: '20 dakika', n: 'Sağlık alanında Google ve yapay zekâ en çok Doktortakvimi profillerini ve yorumlarını gösteriyor.', adimlar: ['doktortakvimi.com adresine girip "Doktor musunuz?" ya da "Klinik ekle" bölümünden ücretsiz kayıt olun.', 'Uzmanlık alanlarınızı, ' + yer + ' adresinizi ve muayene ücretinizi ekleyin.', 'Hastalarınızdan orada da yorum isteyin.'], l: 'https://www.doktortakvimi.com', lm: 'Doktortakvimi' });
    else if (/(tadilat|temizlik|nakliyat|boya|tesisat|elektrik|usta|montaj|tamir|tamirat|ders|fotograf|dugun|organizasyon|bahce|klima|cilingir)/.test(t))
      adimlar.push({ t: 'Armut’ta hizmet veren hesabı açın', s: '20 dakika', n: 'Hizmet işlerinde Armut profilleri ve yorumları aramalarda ve yapay zekâ cevaplarında sık geçiyor.', adimlar: ['armut.com adresine girip "Hizmet veren ol" bölümünden kayıt olun.', 'Verdiğiniz her hizmeti ayrı ayrı seçin ve ' + yer + ' bölgesini işaretleyin.', 'İşlerinizin fotoğraflarını ekleyin, işi bitirdiğiniz müşterilerden Armut’ta yorum isteyin.'], l: 'https://armut.com', lm: 'Armut' });
    else if (/(restoran|kafe|cafe|lokanta|pastane|otel|pansiyon|bar|meyhane|kebap|doner|pide|balik)/.test(t))
      adimlar.push({ t: 'Tripadvisor’da işletmenizi sahiplenin', s: '15 dakika', n: 'Yeme-içme ve konaklamada yapay zekâ Tripadvisor yorumlarını sıkça kaynak gösteriyor.', adimlar: ['Google’a "Tripadvisor işletme sahiplen" yazın ve çıkan sayfadan işletmenizi arayın.', 'Çıkarsa "Sahiplen", çıkmazsa "İşletme ekle" deyin.', 'Menü, fotoğraf ve çalışma saatlerini ekleyin. Yorumlara cevap verin.'], l: 'https://www.tripadvisor.com.tr/Owners', lm: 'Tripadvisor işletme' });
    else
      adimlar.push({ t: 'Şikayetvar’daki şikâyetlere cevap verin', s: 'Haftada 10 dakika', n: 'Müşteriler ve yapay zekâ "güvenilir mi?" sorusunda Şikayetvar’a bakıyor.', adimlar: ['Google’a "Şikayetvar ' + i.ad + '" yazın. Markanızın sayfası çıkıyorsa Şikayetvar’ın "Marka girişi" bölümünden kurumsal hesap açın.', 'Cevapsız şikâyetlere kısa, kibar ve çözüm teklif eden cevaplar yazın.', 'Sorunu çözünce müşteriden şikâyeti "çözüldü" olarak işaretlemesini rica edin.'], l: 'https://www.sikayetvar.com', lm: 'Şikayetvar' });
    // Site bu aramada zaten ilk 3'teyse ayrı sayfa önerilmez
    var sayfaK = sadeK(yer + ' ' + cek), sayfaSira = ((o && o.kelimeler) || []).filter(function (x) { return sadeK(x.kelime) === sayfaK; }).map(function (x) { return x.arama_sira; })[0];
    if (!(i.site && ((sayfaSira && sayfaSira <= 3) || siteBuAramayiHedefliyor(yer + ' ' + cek, i)))) adimlar.push(i.site
      ? { k: 'site-sayfa', yaz: { tur: 'sayfa', kelime: yer + ' ' + cek }, t: 'Sitenize "' + yer + ' ' + cek + '" sayfası ekletin', s: '1-2 saat (sitenizi yapan kişi için)', n: 'Gemini önerirken en çok işletmelerin kendi sitelerini kaynak gösteriyor.', adimlar: ['Sitenizi kim yaptıysa aşağıdaki mesajı ona gönderin.', 'Sayfa yayına girince bağlantısını Google İşletme Profilinize ekleyin.'], metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemize "' + yer + ' ' + cek + '" başlıklı yeni bir sayfa ekleyebilir misiniz? Sayfada şunlar yazı olarak olsun: ' + yer + ' işletmemizin açık adresi, telefonu, çalışma saatleri, verdiğimiz hizmetler ya da sattığımız ürünler, hizmet verdiğimiz bölgeler ve müşterilerin sık sorduğu 5 soru ile cevapları. Sayfa başlığı: "' + i.ad + ' ' + yer + ' | ' + (i.is_turu || '') + '". Teşekkürler.' } }
      : IS.siteYok(i));
    // Sağlıkta reklam yasağı var: "tanıtmalarını isteyin" önerisi verilmez
    if (!saglikIsl(i)) adimlar.push({ t: 'Şehrinizdeki listelerde ve haberlerde adınız geçsin', s: 'Ayda 1 deneme', n: '"En iyi ' + cek + ' yerleri" gibi yazılar ve yerel haber siteleri yapay zekânın en çok okuduğu kaynaklar arasında.', adimlar: ['Google’a "' + yer + ' en iyi ' + cek + '" yazın. Çıkan liste yazılarını ve yerel haber sitelerini not edin.', 'Bu sitelere ve şehrinizin popüler Instagram sayfalarına telefonla veya mesajla ulaşın, işletmenizi tanıtmalarını isteyin.', 'Açılış, kampanya veya yardım kampanyası gibi haber olacak bir şey yaptığınızda yerel gazetelere haber verin.'] });
    return adimlar;
  }

  var gecmis = [];
  function kisaTarih(t) { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); }
  // Basit çizgi grafik (SVG). ters=true ise küçük değer yukarıda (sıra için)
  function cizgiGrafik(kutu, noktalar, ayar) {
    // Genişlik kutunun gerçek genişliği: yazılar telefonda da küçülmeden okunur
    var NS = 'http://www.w3.org/2000/svg', G = Math.max(300, Math.round(kutu.clientWidth || Math.min(560, innerWidth - 90))), Y = 180, sol = 40, sag = 14, ust = 30, alt = 30;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + G + ' ' + Y); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', ayar.etiket);
    function e(ad, at, metin) { var x = document.createElementNS(NS, ad); for (var k in at) x.setAttribute(k, at[k]); if (metin != null) x.textContent = metin; svg.appendChild(x); return x; }
    var yx = function (v) { var o = (v - ayar.min) / (ayar.max - ayar.min); if (ayar.ters) o = 1 - o; return ust + (1 - o) * (Y - ust - alt); };
    ayar.cizgiler.forEach(function (v) { var y = yx(v); e('line', { x1: sol, x2: G - sag, y1: y, y2: y, 'class': 'g-izgi' }); e('text', { x: sol - 8, y: y + 4, 'text-anchor': 'end', 'class': 'g-yazi' }, ayar.etiketle(v)); });
    var n = noktalar.length, adim = n > 1 ? (G - sol - sag - 20) / (n - 1) : 0;
    var xs = noktalar.map(function (_, k) { return n > 1 ? sol + 10 + k * adim : (sol + G - sag) / 2; });
    var yol = '';
    noktalar.forEach(function (p, k) { var y = yx(p.v); yol += (yol ? ' L' : 'M') + xs[k] + ' ' + y; });
    if (n > 1) e('path', { d: yol, 'class': 'g-cizgi' });
    noktalar.forEach(function (p, k) {
      var y = yx(p.v);
      e('circle', { cx: xs[k], cy: y, r: 5, 'class': p.bos ? 'g-nokta bos' : 'g-nokta' });
      e('text', { x: xs[k], y: y - 10, 'text-anchor': 'middle', 'class': 'g-deger' }, p.yazi);
      var her = adim ? Math.ceil(48 / adim) : 1;
      if (k % her === 0 || k === n - 1 && (n - 1) % her >= her / 2) e('text', { x: xs[k], y: Y - 8, 'text-anchor': 'middle', 'class': 'g-yazi' }, p.t);
    });
    // "Yaptım" denen işler: iki ölçüm arasına kesik çizgi (işten önce ve sonra ölçüm varsa)
    var araliklar = {};
    (ayar.isler || []).forEach(function (y) {
      var z = new Date(y.yapildi).getTime(), k = noktalar.findIndex(function (p) { return p.z > z; });
      if (k > 0) (araliklar[k] = araliklar[k] || []).push(y.baslik);
    });
    Object.keys(araliklar).forEach(function (k) {
      var x = (xs[k - 1] + xs[k]) / 2, l = araliklar[k];
      e('line', { x1: x, x2: x, y1: 18, y2: Y - alt, 'class': 'g-is' });
      e('text', { x: x, y: 13, 'text-anchor': 'middle', 'class': 'g-is-yazi' }, l.length > 1 ? '✓ ' + l.length + ' iş' : '✓ iş').appendChild(document.createElementNS(NS, 'title')).textContent = l.join(', ');
    });
    kutu.innerHTML = ''; kutu.appendChild(svg);
  }
  // Bir ölçümde verilen aramanın harita sırası (yoksa null); o aramada harita ölçülmediyse undefined
  function aramaHaritaSira(o, kelime) {
    if (!kelime) return undefined;
    if (o.harita_sorgu === kelime && o.harita_sonuclar) return o.harita_sira || null;
    var k = (o.kelimeler || []).find(function (x) { return x.kelime === kelime && x.harita_bakilan != null && !x.harita_hata; });
    return k ? k.harita_sira || null : undefined;
  }
  function gelisimCiz() {
    var liste = gecmis.slice(0, 12).reverse();
    var son = gecmis[0];
    var sonraki = son ? new Date(new Date(son.baslangic).getTime() + 7 * 864e5) : null;
    // Her ölçümde "en iyi arama" değişebilir; karşılaştırma hep son ölçümün aramasıyla yapılır
    var sonHarita = gecmis.find(function (o) { return o.harita_sonuclar; }), kelime = sonHarita && sonHarita.harita_sorgu;
    var haritali = liste.filter(function (o) { return aramaHaritaSira(o, kelime) !== undefined; });
    var not;
    if (liste.length < 2) not = 'Bu ilk ölçümünüz. Her hafta otomatik olarak yeniden ölçüyoruz' + (sonraki ? ' (sıradaki: ' + kisaTarih(sonraki) + ')' : '') + '. Yaptığınız işlerin etkisini burada hafta hafta göreceksiniz.';
    else {
      var fark = '';
      if (haritali.length >= 2) {
        var a = aramaHaritaSira(haritali[0], kelime), b = aramaHaritaSira(haritali[haritali.length - 1], kelime), H = 'Haritalarda "' + kelime + '" aramasında';
        fark = a && b ? (a > b ? H + ' ' + (a - b) + ' sıra yükseldiniz.' : a < b ? H + ' ' + (b - a) + ' sıra geriye düştünüz.' : H + ' sıranız değişmedi.') : (!a && b ? H + ' ilk 20’ye girdiniz, şu an ' + b + '. sıradasınız.' : (a && !b ? H + ' ilk 20’nin dışına düştünüz.' : H + ' henüz ilk 20’de değilsiniz.'));
      }
      not = kisaTarih(liste[0].baslangic) + ' tarihinden bu yana ' + liste.length + ' ölçüm. ' + fark + (sonraki ? ' Sıradaki otomatik ölçüm: ' + kisaTarih(sonraki) + '.' : '');
    }
    $('gelisim-not').textContent = not;
    var isler = Object.keys(yapilanlar).map(function (k) { return yapilanlar[k]; }).filter(function (y) { return y.yapildi; });
    if (isler.length) $('gelisim-not').textContent += ' Kesik çizgiler "Yaptım" dediğiniz işleri gösterir.';
    cizgiGrafik($('grafik-harita'), haritali.map(function (o) {
      var s = aramaHaritaSira(o, kelime);
      return { v: s || 21, bos: !s, yazi: s ? s + '.' : 'yok', t: kisaTarih(o.baslangic), z: new Date(o.baslangic).getTime() };
    }), { isler: isler, min: 1, max: 21, ters: true, cizgiler: [1, 5, 10, 20], etiketle: function (v) { return v === 1 ? '1.' : v + '.'; }, etiket: 'Haritalardaki sıra' + (kelime ? ' ("' + kelime + '")' : '') });
    cizgiGrafik($('grafik-yz'), liste.filter(function (o) { return o.yz_soru_sayisi; }).map(function (o) {
      var y = yzYuzde(o); return { v: y, bos: !y, yazi: '%' + y, t: kisaTarih(o.baslangic), z: new Date(o.baslangic).getTime() };
    }), { isler: isler, min: 0, max: 100, cizgiler: [0, 50, 100], etiketle: function (v) { return '%' + v; }, etiket: 'Yapay zekâ önerme oranı' });
  }
  // ---- Aramalar: her arama için durum, ayrı sayfa ve o aramaya özel işler ----
  function enIyiYer(k) {
    var l = [];
    if (k.yerel_kutuda) l.push({ sira: k.yerel_kutuda, yer: 'harita kutusunda' });
    if (k.arama_sira) l.push({ sira: k.arama_sira, yer: 'sitenizle' });
    if (k.harita_sira) l.push({ sira: k.harita_sira, yer: 'Haritalar’da' });
    l.sort(function (a, b) { return a.sira - b.sira; });
    return l[0] || null;
  }
  function ilkSayfada(k) { return !!(k.yerel_kutuda || (k.arama_sira && k.arama_sira <= 10)); }
  function aramaDurum(k) {
    var olculdu = ('arama_sira' in k) || k.harita_bakilan != null;
    if (!olculdu) return { yazi: 'Ölçülmedi', sinif: 'rozet-gri' };
    var en = enIyiYer(k);
    if (en && en.sira === 1) return { yazi: '1. sıradasınız', sinif: 'rozet-yesil' };
    if (en && en.sira <= 10) return { yazi: en.sira + '. sıradasınız', sinif: 'rozet-sari' };
    // Haritalar ilk 20'ye bakar: 11-20. sıradaki işletme "çıkmıyor" değil, ilk sayfanın gerisinde
    if (en) return { yazi: en.yer + ' ' + en.sira + '. sıradasınız', sinif: 'rozet-sari' };
    return { yazi: 'İlk sayfada yoksunuz', sinif: 'rozet-kirmizi' };
  }
  function aramaOzet(o) {
    var ks = o.kelimeler || [];
    var a = ks.filter(function (k) { return 'arama_sira' in k && !k.arama_hata; });
    var h = ks.filter(function (k) { return !k.harita_hata && k.harita_bakilan != null; });
    return { aOlculen: a.length, ilkSayfa: a.filter(ilkSayfada).length, hOlculen: h.length, hCikan: h.filter(function (k) { return k.harita_sira; }).length };
  }
  function siraMetni(v, yok) { return v ? v + '.' : yok; }
  // Bir aramanın sıralama listesi: ilk 5 + işletme aşağıdaysa kendi satırı (eski ölçümlerde ilk 3)
  function siraListesi(tur, k) {
    var kutu = el('div'), satirlar = [], baslik, siz = null;
    if (tur === 'kutu') {
      baslik = 'Harita kutusu (Google sayfasının en üstü)';
      satirlar = (k.yerel_kutu || []).map(function (ad, j) { return { sira: j + 1, ad: ad, siz: k.yerel_kutuda === j + 1 }; });
    } else if (tur === 'site') {
      baslik = 'Google’da siteler';
      satirlar = (k.arama_liste || k.arama_ilk3 || []).map(function (x) { return { sira: x.sira, ad: x.alan || x.baslik || '-', alt: x.alan ? x.baslik : '', siz: x.siz }; });
      if (k.arama_sira && !satirlar.some(function (x) { return x.siz; })) siz = k.arama_sira;
    } else {
      baslik = 'Google Haritalar';
      satirlar = (k.harita_liste || []).map(function (x) {
        return { sira: x.sira, ad: x.ad, alt: [x.yorum != null ? sayi(x.yorum) + ' yorum' : '', x.puan ? String(x.puan).replace('.', ',') + ' ★' : ''].filter(Boolean).join(' · '), siz: x.siz };
      });
      if (!k.harita_liste && k.harita_birinci) satirlar = [{ sira: k.harita_birinci.sira, ad: k.harita_birinci.ad, alt: k.harita_birinci.yorum != null ? sayi(k.harita_birinci.yorum) + ' yorum' : '' }];
      if (k.harita_sira && !satirlar.some(function (x) { return x.siz; })) siz = k.harita_sira;
    }
    kutu.appendChild(el('h4', baslik));
    if (!satirlar.length) { kutu.appendChild(el('p', 'Bu ölçümde bu liste yok. Bir sonraki ölçümde görünecek.', 'kart-alt')); return kutu; }
    var ol = el('ol', null, 'sira-liste');
    satirlar.forEach(function (x) {
      var li = el('li'); if (x.sira) li.value = x.sira; if (x.siz) li.className = 'siz';
      li.appendChild(el('b', x.siz ? 'Siz' : String(x.ad || '-'))); if (x.siz && x.ad) li.appendChild(el('span', ' ' + x.ad));
      if (x.alt) li.appendChild(el('small', x.alt));
      ol.appendChild(li);
    });
    kutu.appendChild(ol);
    if (siz) kutu.appendChild(el('p', 'Siz: ' + siz + '. sıradasınız.', 'kart-alt'));
    return kutu;
  }
  function aramaListeCiz(o) {
    var ks = o.kelimeler || [], kutu = $('arama-liste'); kutu.innerHTML = '';
    var ozt = aramaOzet(o);
    $('arama-ozet').textContent = ozt.aOlculen ? 'Müşterilerin en sık yaptığı aramalardan ' + ks.length + ' tanesine baktık. Bunların ' + ozt.ilkSayfa + ' tanesinde Google’ın ilk sayfasındasınız. Bir aramaya tıklayın, o aramada nasıl yükseleceğinizi gösterelim.' : '';
    ks.forEach(function (k, n) {
      var d = aramaDurum(k);
      var a = el('a', null, 'arama-satir'); a.href = '#arama-' + n;
      var sol = el('div', null, 'arama-sol');
      var bas = el('b', '"' + k.kelime + '"'); sol.appendChild(bas);
      if (k.populer) sol.appendChild(el('span', 'çok aranıyor', 'arama-etiket'));
      var alt = el('div', null, 'arama-sayilar');
      alt.appendChild(el('span', 'Harita kutusu: ' + (k.yerel_kutu ? siraMetni(k.yerel_kutuda, 'yok') : '-')));
      alt.appendChild(el('span', 'Siteler: ' + ('arama_sira' in k ? siraMetni(k.arama_sira, 'ilk 10’da yok') : '-')));
      if (k.harita_bakilan != null) alt.appendChild(el('span', 'Haritalar: ' + siraMetni(k.harita_sira, 'ilk 20’de yok')));
      sol.appendChild(alt);
      a.appendChild(sol);
      a.appendChild(el('span', d.yazi, 'rozet ' + d.sinif));
      kutu.appendChild(a);
    });
    $('arama-liste').closest('section').hidden = !ks.length;
  }
  function baslikHarf(x) { return String(x || '').replace(/(^|\s)\S/g, function (h) { return h.toLocaleUpperCase('tr'); }); }
  // Bir arama için yapılacaklar: ölçülen farklardan çıkar
  function aramaIsleri(k, o, i) {
    var b = o.isletme_bilgi || {}, isler = [], K = baslikHarf(k.kelime), kod = sadeK(k.kelime).replace(/ /g, '-');
    var bir = k.harita_birinci || null;
    // Harita tarafı
    if (b.bulundu === false) isler.push(IS.googleProfil(i, b));
    var uygunsuz = yakinAramasi(k) || kurumUyusmuyor(k.kelime, i), hk = hizmetKelimeleri(k.kelime, i);
    // Aramada işletmenin vermediği bir hizmet olabilir ("implant", "çocuk"): öneri "veriyorsanız" diye yazılır
    var sart = hk.length ? '"' + hizmetIfadesi(k.kelime, i) + '" hizmetini veriyorsanız: ' : '';
    if (b.bulundu !== false && !uygunsuz && !k.yerel_kutuda && !(k.harita_sira && k.harita_sira <= 3)) isler.push({
      k: 'profil-' + kod, t: 'Google profilinizde "' + k.kelime + '" geçsin', s: '20 dakika · ücretsiz',
      n: sart + 'Google, harita kutusuna bu aramayla en çok eşleşen profilleri koyuyor. ' + (k.harita_sira ? 'Haritalar’da ' + k.harita_sira + '. sıradasınız.' : k.harita_bakilan != null ? 'Haritalar’da ilk 20’de değilsiniz.' : 'Haritalar bu aramada ölçülemedi.'),
      adimlar: [
        'Google İşletme Profilinize girin, "Profili düzenle" deyin.',
        'Ana kategori işinizi tam anlatsın. "' + k.kelime + '" aramasına uyan ek kategoriler varsa ekleyin.',
        '"Ürünler" veya "Hizmetler" bölümüne "' + K.replace(new RegExp('^' + yerAdi(i) + '\\s*', 'i'), '') + '" adıyla bir kalem ekleyin, fotoğraf ve kısa açıklama yazın.',
        'İşletme açıklamanızda bu ifade doğal bir cümlede geçsin. Örnek: "' + yerde(i.semt) + ' ' + isAdi(i, '') + ' olarak…"',
        'Haftada bir "Güncelleme" paylaşın, metinde bu aramayı kullanın.'
      ],
      sonuc: 'Bu aramada harita kutusuna girme şansınız artar. Harita kutusu sayfanın en üstünde, en çok tıklanan yer.' });
    if (bir && b.bulundu && b.yorum != null && bir.yorum != null && b.yorum < bir.yorum) isler.push(Object.assign(IS.yorum(i, b.yorum, bir.yorum), {
      n: 'Bu aramada haritalarda 1. sıradaki "' + bir.ad + '" işletmesinin ' + sayi(bir.yorum) + ' yorumu' + (bir.puan ? ' ve ' + String(bir.puan).replace('.', ',') + ' puanı' : '') + ' var. Sizin ' + sayi(b.yorum) + ' yorumunuz var. Aradaki fark kapandıkça yükselirsiniz.' }));
    // Site tarafı
    if (!i.site) isler.push(IS.siteYok(i));
    // Ana sayfa bu aramayı zaten hedefliyorsa, "yakınımda" aramasıysa ya da kurum türü uymuyorsa ayrı sayfa önerilmez
    else if (!k.arama_sira && !uygunsuz && !siteBuAramayiHedefliyor(k.kelime, i)) {
      var ust = (k.arama_ilk3 || []).filter(function (x) { return x.tur !== 'rehber'; })[0];
      isler.push({ k: 'sayfa-' + kod, yaz: { tur: 'sayfa', kelime: k.kelime }, t: 'Sitenize "' + K + '" sayfası ekletin' + (hk.length ? ' (bu hizmeti veriyorsanız)' : ''), s: '1-2 saat (sitenizi yapan kişi için)',
        n: sart + 'Bu aramada sitenizi ilk 10’da göremedik.' + (ust ? ' 1. sıradaki site: ' + ust.alan + ' ("' + ust.baslik + '").' : '') + ' Google bir aramada, başlığı o aramayla aynı olan sayfaları öne çıkarıyor.',
        adimlar: ['Aşağıdaki mesajı sitenizi yapan kişiye gönderin.', 'Sayfa yayına girince ana sayfanızdan bu sayfaya bağlantı verilsin.', '3-4 hafta sonra burada sıranızın değiştiğini göreceksiniz.'],
        metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemize "' + K + '" başlıklı yeni bir sayfa ekleyebilir misiniz? Sayfa başlığı (title) "' + K + ' | ' + i.ad + '" olsun, sayfadaki ana başlık da "' + K + '". İçinde en az 300 kelimelik açıklama, fotoğraflar, adresimiz, telefonumuz, çalışma saatlerimiz ve bu konuda müşterilerin sık sorduğu 5 soru ile cevapları olsun. Ana sayfadan bu sayfaya bağlantı verelim. Teşekkürler.' },
        sonuc: 'Bu aramada Google’ın ilk sayfasına girme şansı yakalarsınız.' });
    } else if (k.arama_sira > 1) isler.push({ k: 'guclendir-' + kod, t: '"' + K + '" sayfanızı güçlendirin', s: '1 saat (sitenizi yapan kişi için)',
      n: 'Siteniz bu aramada ' + k.arama_sira + '. sırada' + (k.arama_link ? ' (' + gosterLink(k.arama_link) + ')' : '') + '. Üstünüzdekiler: ' + (k.arama_ilk3 || []).filter(function (x) { return !x.siz; }).slice(0, 2).map(function (x) { return x.alan; }).join(', ') + '.',
      adimlar: ['Sayfanın başlığı "' + K + '" ile başlasın.', 'Sayfaya fotoğraf, fiyat aralığı ve sık sorulan sorular eklensin (en az 300 kelime).', 'Google İşletme Profilinizdeki web sitesi bağlantısı bu sayfayı göstersin ya da ana sayfadan bu sayfaya bağlantı verilsin.', 'Aşağıdaki rehber sitelerden sitenize bağlantı alın.'],
      sonuc: 'Üstünüzdeki sitelerin önüne geçme şansınız artar.' });
    // Bu aramada çıkan rehberler
    var reh = (k.rehberler || []).filter(function (x) { return sehirdeMi(x, i); });
    if (reh.length) isler.push({ k: 'rehber-' + kod, t: 'Bu aramada çıkan rehber sitelere eklenin', s: 'Site başına 10 dakika',
      n: '"' + k.kelime + '" arayanlar Google’da bu sayfaları da görüyor. Buralarda adınız olsun:',
      siteler: reh.map(function (x) { return { ad: x.baslik, alan: x.alan, url: x.link || ('https://' + x.alan), not: x.sira + '. sırada' }; }),
      adimlar: ['Her sayfayı açın, işletmeniz listede var mı bakın.', 'Yoksa "Firma ekle" ya da "Ücretsiz kayıt" bölümünden ekleyin. Adı, adresi ve telefonu Google’daki ile aynı yazın.'],
      sonuc: 'Müşteri rehbere tıklasa bile sizi görür. Yapay zekâ da bu rehberleri okuyor.' });
    if (!isler.length) isler.push(k.arama_sira === 1 || (k.harita_sira && k.harita_sira <= 3 && k.arama_sira)
      ? { bilgi: true, t: 'Bu aramada en öndesiniz', n: 'Yerinizi korumak için her hafta birkaç yeni yorum toplayın ve ayda birkaç fotoğraf ekleyin.' }
      : { bilgi: true, t: 'Bu arama için ayrı bir iş önermiyoruz', n: yakinAramasi(k) ? 'Bu arama, arayan kişinin bulunduğu yere göre değişiyor; ayrı sayfa ya da profil değişikliği gerekmiyor.'
        : kurumUyusmuyor(k.kelime, i) ? 'Bu aramayı yapanlar başka türde bir kurum (ör. devlet hastanesi) arıyor; işletmeniz için uygun bir hedef değil.'
        : 'Ana sayfanız bu aramayı zaten hedefliyor. İşlerim sayfasındaki genel işler (yorum, Google açıklaması, site eksikleri) bu aramada da yükselmenizi sağlar.' });
    return isler;
  }
  function aramaSayfaCiz(n) {
    var o = gecmis[0]; if (!o) return false;
    var k = (o.kelimeler || [])[n]; if (!k) return false;
    var i = isletme, d = aramaDurum(k), b = o.isletme_bilgi || {};
    $('ar-baslik').textContent = '"' + k.kelime + '"';
    $('ar-rozet').textContent = d.yazi; $('ar-rozet').className = 'rozet ' + d.sinif;
    var en = enIyiYer(k);
    $('ar-hedef').textContent = en && en.sira === 1 ? 'Bu aramada en öndesiniz. Hedef: yerinizi korumak.'
      : en && en.sira <= 3 ? 'Hedef: 1. sıra. Çok yakınsınız.'
      : en && en.sira <= 10 ? 'Hedef: ilk 3. İlk 3’e girenler tıklamaların çoğunu alıyor.'
      : 'Hedef: önce Google’ın ilk sayfasına girmek (harita kutusu veya ilk 10 site).';
    var kut = $('ar-kutular'); kut.innerHTML = '';
    var sk = $('ar-sira'); sk.innerHTML = ''; sk.hidden = true;
    // Kutuya basınca o sıralamanın listesi kutuların hemen altında açılır (tekrar basınca kapanır)
    [['Harita kutusu', k.yerel_kutu ? siraMetni(k.yerel_kutuda, 'Yok') : '-', 'Sayfanın en üstündeki 3 işletme', 'kutu'],
     ['Siteler', 'arama_sira' in k ? siraMetni(k.arama_sira, 'Yok') : '-', k.arama_link ? gosterLink(k.arama_link) : 'ilk 10 sonuç', 'site'],
     ['Google Haritalar', k.harita_bakilan != null ? siraMetni(k.harita_sira, 'Yok') : '-', 'ilk 20 sonuç', 'harita']].forEach(function (x) {
      var dv = el('button', null, 'sayi-kutu'); dv.type = 'button'; dv.setAttribute('aria-expanded', 'false'); dv.setAttribute('aria-controls', 'ar-sira');
      dv.appendChild(el('span', x[0])); var bb = el('b', x[1]); if (/^\d/.test(x[1]) && parseInt(x[1], 10) <= 3) bb.className = 'iyi'; dv.appendChild(bb); dv.appendChild(el('small', x[2])); dv.appendChild(el('em', 'Liste', 'sira-ac'));
      dv.addEventListener('click', function () {
        var acik = dv.getAttribute('aria-expanded') === 'true';
        kut.querySelectorAll('.sayi-kutu').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        sk.innerHTML = ''; sk.hidden = acik;
        if (!acik) { dv.setAttribute('aria-expanded', 'true'); sk.appendChild(siraListesi(x[3], k)); }
      });
      kut.appendChild(dv);
    });
    var on = $('ar-onde'); on.innerHTML = '';
    if (k.yerel_kutu && k.yerel_kutu.length) {
      on.appendChild(el('h4', 'Harita kutusunda'));
      var ol = el('ol', null, 'onde-liste');
      k.yerel_kutu.forEach(function (ad) { ol.appendChild(el('li', ad)); }); on.appendChild(ol);
    }
    if (k.harita_birinci) on.appendChild(el('p', 'Haritalarda 1.: ' + k.harita_birinci.ad + (k.harita_birinci.yorum != null ? ' · ' + sayi(k.harita_birinci.yorum) + ' yorum' : '') + (k.harita_birinci.puan ? ' · ' + String(k.harita_birinci.puan).replace('.', ',') + ' ★' : '') + (b.bulundu && b.yorum != null ? '  (sizde ' + sayi(b.yorum) + ' yorum)' : ''), 'kart-alt'));
    if (k.arama_ilk3 && k.arama_ilk3.length) {
      on.appendChild(el('h4', 'Sitelerde ilk sıralar'));
      var ol2 = el('ol', null, 'onde-liste');
      k.arama_ilk3.forEach(function (x) { var li = el('li'); li.appendChild(el('b', x.alan || '-')); li.appendChild(el('span', ' ' + (x.baslik || ''))); if (x.siz) li.className = 'siz'; ol2.appendChild(li); });
      on.appendChild(ol2);
    }
    if (!on.children.length) on.appendChild(el('p', 'Bu arama için rakip bilgisi yok.', 'kart-alt'));
    isEkle($('ar-isler'), aramaIsleri(k, o, i));
    var ks = o.kelimeler || [];
    $('ar-onceki').hidden = n <= 0; $('ar-onceki').href = '#arama-' + (n - 1);
    $('ar-sonraki').hidden = n >= ks.length - 1; $('ar-sonraki').href = '#arama-' + (n + 1);
    return true;
  }

  // Yapay zekâ 6'dan az cevap verdiyse oran güvenilir değil: ölçülemedi say (kota/zaman aşımı)
  var YZ_EN_AZ = 6;
  function yzDuzelt(o) { if (o && o.yz_soru_sayisi && o.yz_soru_sayisi < YZ_EN_AZ) { o.yz_eksik = o.yz_soru_sayisi; o.yz_soru_sayisi = 0; } return o; }
  // Yapay zekâ oranı her yerde aynı hesap: üç yapay zekânın (Gemini, Google Yapay Zekâ Modu, ChatGPT) bütün cevapları birlikte.
  // Özet, grafik, 4 haftalık ortalama ve "Yaptım" karşılaştırması bu sayıyı kullanır (önceden Özet yalnız Gemini'yi sayıyordu).
  function yzToplam(o) { return o && o.yz_soru_sayisi ? { n: o.yz_soru_sayisi + (o.gyz_soru_sayisi || 0) + (o.cg_soru_sayisi || 0), gecen: (o.yz_gecen || 0) + (o.gyz_gecen || 0) + (o.cg_gecen || 0) } : null; }
  function yzYuzde(o) { var t = yzToplam(o); return t ? Math.round(100 * t.gecen / t.n) : null; }
  function yzGruplar(o) {
    var g = [], bul = {};
    (o.yz_cevaplar || []).forEach(function (c) { if (!c) return; if (!bul[c.soru]) { bul[c.soru] = { soru: c.soru, cevaplar: [] }; g.push(bul[c.soru]); } bul[c.soru].cevaplar.push(c); });
    return g;
  }
  // Yeni motorlar (Google Yapay Zekâ Modu: gyz_*, ChatGPT: cg_*) Gemini ile aynı yapıda; boş (null) olabilir
  function motorGruplar(cevaplar) { return yzGruplar({ yz_cevaplar: cevaplar }); }
  function benimAdim(t, ad) { var a = sadeK(t), b = sadeK(ad); return !!(a && b && (a.indexOf(b) >= 0 || (a.length >= 5 && b.indexOf(a) >= 0))); }
  // Google Yapay Zekâ Modu özetinin sonuna işletme adları ayrıca eklenmiş; listede gösterdiğimiz için metinden çıkar ve kısalt
  function kisaOzet(c) {
    var m = String(c.ozet || ''), l = c.isletmeler || [];
    if (l.length) { var sat = m.split('\n'); while (sat.length && l.indexOf(sat[sat.length - 1].trim()) >= 0) sat.pop(); m = sat.join('\n'); }
    m = m.trim();
    return m.length > 600 ? m.slice(0, 600).replace(/\s+\S*$/, '') + '…' : (m || '(boş cevap)');
  }
  function yzSoruKutu(g, ad) {
    var ok = g.cevaplar.filter(function (c) { return !c.hata; }), gec = ok.filter(function (c) { return c.geciyor; }).length;
    var d = el('details', null, 'yz-cevap');
    var s = el('summary');
    s.appendChild(el('span', /["“”]/.test(g.soru) ? g.soru : '"' + g.soru + '"', 'yz-soru'));
    var yazi = !ok.length ? 'Sorulamadı' : (g.cevaplar.length === 1 ? (gec ? 'Adınız geçti' : 'Adınız geçmedi') : ok.length + ' cevapta ' + gec + ' kez');
    s.appendChild(el('span', yazi, 'pil ' + (!ok.length ? 'pil-a' : (gec ? 'pil-y' : 'pil-k'))));
    d.appendChild(s);
    g.cevaplar.forEach(function (c, k) {
      if (g.cevaplar.length > 1) d.appendChild(el('p', (k + 1) + '. cevap' + (c.hata ? '' : (c.geciyor ? ' · adınız geçti' : ' · adınız geçmedi')), 'yz-tekrar'));
      if (c.hata) { d.appendChild(el('p', c.hata, 'yz-metin')); return; }
      d.appendChild(el('p', ad ? kisaOzet(c) : (c.ozet || '(boş cevap)'), 'yz-metin'));
      if (ad && (c.isletmeler || []).length) {
        d.appendChild(el('p', 'Google’ın listelediği işletmeler', 'yz-tekrar'));
        var ul = el('ul', null, 'yz-isletmeler');
        c.isletmeler.forEach(function (t) {
          var siz = c.geciyor && benimAdim(t, ad);
          var li = el('li', t, siz ? 'siz' : null); if (siz) li.appendChild(el('span', ' (siz)'));
          ul.appendChild(li);
        });
        d.appendChild(ul);
      }
    });
    return d;
  }
  // Bir motorun özet satırı: "X sorunun Y tanesinde adınız geçti", "yakında" veya "bu ölçümde yok"
  function motorSatir(id, ad, alt, n, gecen, cevaplar, bosYazi) {
    var d = $(id), s = d.querySelector('summary'); s.innerHTML = '';
    var sol = el('span', null, 'yz-motor-sol');
    sol.appendChild(el('b', ad, 'yz-motor-ad'));
    var gr = motorGruplar(cevaplar), tekrarli = gr.length && gr.length < n;
    var cumle = bosYazi ? alt : n
      ? (tekrarli ? gr.length + ' soruyu birkaç kez sorduk: ' + n + ' cevabın ' + (gecen || 0) + ' tanesinde adınız geçti.' : n + ' sorunun ' + (gecen || 0) + ' tanesinde adınız geçti.')
      : 'Bu ölçümde cevap alınamadı.';
    sol.appendChild(el('span', cumle, 'yz-motor-cumle'));
    s.appendChild(sol);
    s.appendChild(el('span', bosYazi || (n ? (gecen || 0) + ' / ' + n : 'alınamadı'), 'pil ' + (bosYazi || !n ? 'pil-a' : (gecen ? 'pil-y' : 'pil-k'))));
    d.classList.toggle('bos', !!bosYazi || !(cevaplar || []).length);
    if (d.classList.contains('bos')) d.open = false;
    return gr;
  }
  function motorlarCiz(o, i) {
    // Gemini: 6'dan az cevapta yüzde hesaplanmaz (YZ_EN_AZ) ama kaç sorunun kaçında geçtiği yine gösterilir
    var gN = o.yz_soru_sayisi || o.yz_eksik || 0;
    motorSatir('motor-gemini', 'Gemini', 'Bu ölçümde Gemini’ye soru sorulamadı.', gN, o.yz_gecen, o.yz_cevaplar, o.yz_cevaplar == null && !gN ? 'bu ölçümde yok' : null);
    var olcGyz = o.gyz_soru_sayisi != null || o.gyz_cevaplar != null;
    var gr = motorSatir('motor-gyz', 'Google Yapay Zekâ Modu', 'Bu özellik eklenmeden önceki bir ölçüm.', o.gyz_soru_sayisi || 0, o.gyz_gecen, o.gyz_cevaplar, olcGyz ? null : 'bu ölçümde yok');
    var ic = $('motor-gyz').querySelector('.yz-motor-ic'); ic.innerHTML = '';
    if (olcGyz) {
      ic.appendChild(el('p', 'Google’da arama yapınca çıkan yapay zekâ cevabını müşteri gibi okuduk. Google cevapta işletme listelediyse onları da gösteriyoruz.', 'kart-alt'));
      var l = el('div', null, 'yz-liste'); gr.forEach(function (g) { l.appendChild(yzSoruKutu(g, i.ad)); }); ic.appendChild(l);
    }
    // ChatGPT: hiç ölçüm yoksa "yakında"; daha önce ölçüldüyse ama bu ölçümde yoksa "bu ölçümde yok"
    var olcCg = o.cg_soru_sayisi != null || o.cg_cevaplar != null;
    var hicCg = !olcCg && !gecmis.some(function (x) { return x.cg_soru_sayisi != null || x.cg_cevaplar != null; });
    // Süre dolduysa soru soruldu ama cevap yetişmedi; "sorulmadı" demeyelim
    var cgGecikti = (o.hatalar || []).some(function (h) { return /Süre doldu/.test(String(h)); });
    var cgBos = cgGecikti ? 'ChatGPT bu ölçümde zamanında cevap vermedi. Bir sonraki ölçümde yeniden soracağız.' : 'Bu ölçümde ChatGPT’ye soru sorulmadı.';
    var gc = motorSatir('motor-cg', 'ChatGPT', hicCg ? 'ChatGPT artık ölçülüyor. Bir sonraki ölçümde sonuçları burada göreceksiniz.' : cgBos, o.cg_soru_sayisi || 0, o.cg_gecen, o.cg_cevaplar, olcCg ? null : (hicCg ? 'sıradaki ölçümde' : 'bu ölçümde yok'));
    var ic2 = $('motor-cg').querySelector('.yz-motor-ic'); ic2.innerHTML = '';
    if (olcCg) { var l2 = el('div', null, 'yz-liste'); gc.forEach(function (g) { l2.appendChild(yzSoruKutu(g)); }); ic2.appendChild(l2); }
  }
  // Ölçülmemiş motorun satırı açılmasın
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.yz-motor.bos > summary')) e.preventDefault(); });
  // Son 4 haftadaki ölçümlerin ortalama önerilme oranı (en az 2 ölçüm varsa)
  function dortHafta(o) {
    var son = new Date(o.baslangic).getTime();
    var l = gecmis.concat([o]).filter(function (x, k, a) { return x.yz_soru_sayisi && son - new Date(x.baslangic).getTime() < 28 * 864e5 && son >= new Date(x.baslangic).getTime() && a.findIndex(function (y) { return y === x || (x.id && y.id === x.id); }) === k; });
    if (l.length < 2) return null;
    var t = 0, n = 0; l.forEach(function (x) { var z = yzToplam(x); t += z.gecen; n += z.n; });
    return { yuzde: Math.round(100 * t / n), olcum: l.length };
  }
  function payCiz(o, i) {
    var kutu = $('yz-pay'); kutu.innerHTML = '';
    // Gemini yeterli cevap verdiyse göster (YZ_EN_AZ); yz_rakipler tüm motorların cevaplarından sayıldığı için payda da hepsi
    $('yz-pay-kart').hidden = !o.yz_soru_sayisi;
    if (!o.yz_soru_sayisi) return;
    var n = o.yz_soru_sayisi + (o.gyz_soru_sayisi || 0) + (o.cg_soru_sayisi || 0);
    var ben = (o.yz_gecen || 0) + (o.gyz_gecen || 0) + (o.cg_gecen || 0);
    var satirlar = [{ ad: i.ad + ' (siz)', sayi: ben, siz: true }].concat((o.yz_rakipler || []).map(function (r) { return { ad: r.ad, sayi: r.sayi }; }));
    satirlar.sort(function (a, b) { return b.sayi - a.sayi || (b.siz ? 1 : 0) - (a.siz ? 1 : 0); });
    satirlar.forEach(function (r) {
      var d = el('div', null, 'pay-satir' + (r.siz ? ' siz' : ''));
      d.appendChild(el('span', r.ad, 'pay-ad'));
      var cubuk = el('span', null, 'pay-cubuk'); var dolu = el('i'); dolu.style.width = Math.max(2, Math.round(100 * r.sayi / n)) + '%'; cubuk.appendChild(dolu); d.appendChild(cubuk);
      var ps = el('span', '%' + Math.round(100 * r.sayi / n), 'pay-sayi');
      ps.appendChild(el('small', ' · ' + n + ' cevapta ' + r.sayi, 'pay-kac'));
      d.appendChild(ps);
      kutu.appendChild(d);
    });
    var onde = (o.yz_rakipler || []).filter(function (r) { return r.sayi > ben; });
    $('yz-pay-not').textContent = 'Gemini, ChatGPT ve Google’ın yapay zekâsına müşteri gibi soru sorduk, toplam ' + n + ' cevap aldık. Her işletmenin adı kaç cevapta geçti, onu sayıyoruz. ' +
      (onde.length ? onde.length + ' rakibiniz sizden daha çok öneriliyor.' : (ben ? 'Rakiplerinizden daha çok öneriliyorsunuz.' : 'Rakiplerinizin adı da geçmiyorsa yapay zekâ bu bölgeyi henüz tanımıyor; ilk öne çıkan siz olabilirsiniz.'));
  }

  function sonucCiz(o) {
    var i = isletme, b = o.isletme_bilgi || {};
    var isK = isAdi(i, '');
    $('olcum-tarih').textContent = 'Son ölçüm: ' + tarih(o.bitis || o.baslangic) + (o.kaynak === 'haftalik' ? ' · otomatik' : '');
    var c;
    if (o.harita_sira) c = yerde(i.semt) + ' "' + o.harita_sorgu + '" aramasında Google Haritalar’da ' + o.harita_sira + '. sıradasınız.';
    else if (b.bulundu === false && b.baska_sube) c = yerde(i.semt) + ' "' + i.ad + '" profilini bulamadık. Google’da sadece "' + b.baska_sube.ad + '" görünüyor' + (b.baska_sube.adres ? ' (' + b.baska_sube.adres.split(',').slice(-2).join(',').trim() + ')' : '') + '.';
    else if (b.bulundu === false) c = 'Google Haritalar’da "' + i.ad + '" adıyla bir profil bulamadık.';
    else if (o.harita_sonuclar) c = '"' + o.harita_sorgu + '" aramasında Google Haritalar’ın ilk 20 sonucunda yoksunuz.';
    else c = 'Haritalar ölçümü yapılamadı.';
    $('sonuc-cumle').textContent = c;
    $('sonuc-alt').textContent = o.yz_soru_sayisi
      ? 'Yapay zekâlardan müşteri gibi ' + yzToplam(o).n + ' cevap aldık; adınız ' + yzToplam(o).gecen + ' tanesinde geçti (her 100 cevapta ' + yzYuzde(o) + ').' + (b.bulundu && b.yorum != null ? ' Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '')
      : (b.bulundu && b.yorum != null ? 'Google’da ' + sayi(b.yorum) + ' yorumunuz ve ' + String(b.puan || '-').replace('.', ',') + ' puanınız var.' : '');

    var onceki = gecmis.filter(function (x) { return x !== o && (!o.id || x.id !== o.id) && new Date(x.baslangic) < new Date(o.baslangic); })[0];
    var dg = $('degisim');
    if (onceki) {
      var sirayaz = function (x) { return x.harita_sira ? x.harita_sira + '.' : 'ilk 20’de yok'; };
      var oran = function (x) { return x.yz_soru_sayisi ? '%' + yzYuzde(x) : '-'; };
      // Aynı aramayla karşılaştır: önceki ölçümde bu aramanın sırası (ölçülmediyse undefined)
      var hOnce = aramaHaritaSira(onceki, o.harita_sorgu);
      var hD = hOnce === undefined || !o.harita_sonuclar ? 'ölçülemedi' : (hOnce || 0) === (o.harita_sira || 0) ? 'değişmedi (' + sirayaz(o) + ')' : sirayaz({ harita_sira: hOnce }) + ' → ' + sirayaz(o);
      if (hD !== 'ölçülemedi') hD = '("' + o.harita_sorgu + '") ' + hD;
      var yD = oran(onceki) === oran(o) ? 'değişmedi (' + oran(o) + ')' : oran(onceki) + ' → ' + oran(o);
      var ayni = / değişmedi/.test(hD) && yD.indexOf('değişmedi') === 0;
      dg.textContent = 'Önceki ölçüme göre (' + tarih(onceki.baslangic) + '): Haritalar ' + hD + ', yapay zekâ ' + yD + '.' +
        (ayni ? ' Sonuçlar aynı çünkü Google’daki durumunuz değişmedi. Aşağıdaki işleri yaptıkça burada değişim göreceksiniz; Google’ın bunu yansıtması genelde 1-4 hafta sürer.' : '');
      dg.hidden = false;
    } else dg.hidden = true;

    var ks = o.kelimeler || [];
    var hOlculen = ks.filter(function (k) { return !k.harita_hata && k.harita_bakilan != null; });
    var hCikan = hOlculen.filter(function (k) { return k.harita_sira; });
    var as = o.arama_sonuclar || {};
    var ozt = aramaOzet(o);
    $('k-harita').textContent = o.harita_sira ? o.harita_sira + '.' : (o.harita_sonuclar ? 'Yok' : '-');
    $('k-harita-not').textContent = ozt.hOlculen
      ? (ozt.hCikan ? ozt.hOlculen + ' aramadan ' + ozt.hCikan + ' tanesinde ilk 20’desiniz, en iyi sıranız' : ozt.hOlculen + ' aramada da ilk 20’de değilsiniz')
      : (o.harita_sira ? 'sıradasınız' : (o.harita_sonuclar ? 'ilk 20’de değilsiniz' : 'ölçülemedi'));
    $('k-arama').textContent = ozt.aOlculen ? ozt.ilkSayfa + ' / ' + ozt.aOlculen : '-';
    $('k-arama-not').textContent = ozt.aOlculen ? 'aramada Google’ın ilk sayfasındasınız (harita kutusu veya ilk 10 site)' : 'ölçülemedi';
    var dh = dortHafta(o);
    $('k-yz').textContent = o.yz_soru_sayisi ? '%' + yzYuzde(o) : '-';
    $('k-yz-not').textContent = o.yz_soru_sayisi ? 'her 100 cevapta ' + yzYuzde(o) + ' kez adınız geçti' + (dh ? '. 4 haftalık ortalama: %' + dh.yuzde : '') : o.yz_eksik ? 'yapay zekâ bu sefer yeterli cevap vermedi, sonraki ölçümde tekrar denenecek' : 'ölçülemedi';
    ['k-harita', 'k-arama', 'k-yz'].forEach(function (id) { $(id).className = ''; });
    if (o.harita_sira && o.harita_sira <= 3) $('k-harita').className = 'iyi';
    if (ozt.ilkSayfa) $('k-arama').className = 'iyi';
    if (yzYuzde(o) > 0) $('k-yz').className = 'iyi';
    // Önceki ölçüme göre oklar (harita: aynı aramayla; ikisinde de ölçüldüyse)
    var ok = function (id, fark, birim) {
      if (!fark) return;
      $(id).appendChild(el('span', (fark > 0 ? '▲ ' : '▼ ') + Math.abs(fark) + birim, 'ok ' + (fark > 0 ? 'iyi' : 'kotu')));
    };
    if (onceki) {
      var hO = aramaHaritaSira(onceki, o.harita_sorgu);
      if (hO && o.harita_sira) ok('k-harita', hO - o.harita_sira, ' sıra');
      var aO = aramaOzet(onceki);
      if (aO.aOlculen && ozt.aOlculen) ok('k-arama', ozt.ilkSayfa - aO.ilkSayfa, '');
      if (onceki.yz_soru_sayisi && o.yz_soru_sayisi) ok('k-yz', yzYuzde(o) - yzYuzde(onceki), ' puan');
    }

    var h = (o.hatalar || []).filter(Boolean);
    $('sonuc-hata').hidden = !h.length;
    // Ham (çoğu İngilizce) hata metni gösterilmez; sadece hangi bölümün ölçülemediği
    var bolum = h.map(function (x) { var m = /^(Haritalar|Google arama|Yapay zekâ|Google Yapay Zekâ Modu|ChatGPT)\b/.exec(String(x)); return m ? m[1] : 'diğer'; })
      .filter(function (x, n, l) { return l.indexOf(x) === n; });
    if (h.length) $('sonuc-hata').textContent = 'Bazı ölçümler bu sefer yapılamadı (' + bolum.join(', ') + '). Sonraki ölçümde tekrar denenecek.';

    // Aramalar tek tek: her arama bir satır, rozete tıklayınca o aramanın sayfası açılır
    aramaListeCiz(o);
    $('kelime-konum').textContent = 'Google’da ' + (as.konum ? yerde(isletme.semt) + 'ki, ' : '') + 'hesabına giriş yapmamış bir müşteri gibi arıyoruz. Kendi bilgisayarınızda sonuçlar biraz farklı çıkabilir, çünkü Google size daha önce girdiğiniz siteleri öne çıkarır.';

    // Rakip tablosu
    var tb = $('rakip-tablo'); tb.innerHTML = '';
    var liste = o.harita_sonuclar || [];
    $('rakip-not').textContent = liste.length ? '"' + o.harita_sorgu + '" aramasında Google Haritalar’ın ilk ' + liste.length + ' sonucu.' + (o.harita_sira ? '' : ' Siz bu listede yoksunuz.') : 'Haritalar sonucu alınamadı.';
    liste.forEach(function (r) {
      var tr = el('tr'); if (r.siz) tr.className = 'siz-satir';
      tr.appendChild(el('td', String(r.sira)));
      var ad = el('td'); ad.appendChild(el('b', String(r.ad || '-'))); if (r.siz) ad.appendChild(el('span', ' (siz)'));
      tr.appendChild(ad);
      tr.appendChild(el('td', r.puan != null ? String(r.puan).replace('.', ',') + ' ★' : '-'));
      tr.appendChild(el('td', sayi(r.yorum)));
      tb.appendChild(tr);
    });

    izlenenCiz(o); hareketCiz(o);

    // Yapay zekâ cevapları: motor motor (Gemini, Google Yapay Zekâ Modu, ChatGPT)
    var yl = $('yz-liste'); yl.innerHTML = '';
    var aramasiz = (o.yz_cevaplar || []).some(function (c) { return c.aramali === false; });
    $('yz-not').textContent = aramasiz
      ? 'Gemini aynı soruya her seferinde farklı cevap verebilir; bu yüzden her soruyu birkaç kez soruyoruz. Bu ölçümde internette arama yapmadan kendi bilgisinden cevapladı.'
      : 'Gemini’ye Google aramasıyla çalışacak şekilde sorduk. Aynı soruya her seferinde farklı cevap verebildiği için her soruyu birkaç kez soruyoruz.';
    yzGruplar(o).forEach(function (g) { yl.appendChild(yzSoruKutu(g)); });
    if (!yl.children.length) yl.appendChild(el('p', 'Yapay zekâ ölçümü yapılamadı.', 'kart-alt'));
    motorlarCiz(o, i);

    isEkle($('yz-isler'), yzYolu(o, i));
    isEkle($('olcum-isler'), olcumIsleri(o, i));
    if (!$('olcum-isler').children.length) isEkle($('olcum-isler'), [{ t: 'Belirgin bir eksik görmedik', n: 'Yine de aşağıdaki genel adımlara göz atın.', bilgi: true }]);

    payCiz(o, i);
    gelisimCiz();
    $('ilk').hidden = true; $('sonuc').hidden = false;
    document.body.classList.remove('olcum-yok');
    yapilanCiz(); siradakiCiz(); isSayaci();
  }

  // ---- Hazır metinler (yapay zekâ yazar, esnaf kopyalar) ----
  function yardimci(govde) {
    return A.sb.functions.invoke('yardimci', { body: govde }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json() : Promise.resolve({})).then(function (j) { var e = new Error((j && j.hata) || 'Şu an yapılamadı. Biraz sonra tekrar deneyin.'); e.veri = j; throw e; }, function () { throw new Error('Şu an yapılamadı. Biraz sonra tekrar deneyin.'); });
      }
      return r.data;
    });
  }
  function metinAnahtar(y) { return y.tur === 'sayfa' ? 'sayfa:' + sadeK(y.kelime) : y.tur; }
  function kopyaDugme(metinFn, etiket) {
    var b = el('button', etiket || 'Kopyala', 'btn btn-cizgi kucuk-btn'); b.type = 'button';
    b.addEventListener('click', function () {
      var bitti = function () { var e = b.textContent; b.textContent = 'Kopyalandı'; setTimeout(function () { b.textContent = e === 'Kopyalandı' ? (etiket || 'Kopyala') : e; }, 1800); };
      var t = metinFn(); if (navigator.clipboard) navigator.clipboard.writeText(t).then(bitti, function () {}); else bitti();
    });
    return b;
  }
  // Yayın denetçisinin sonucu (yardimci: denetle). Eski metinlerde denetim yoksa bir şey gösterilmez.
  function denetimKutu(d) {
    if (!d || !d.durum) return null;
    var DURUM = {
      onaylandi: ['✓ Denetçi kontrol etti: uydurma bilgi, abartılı vaat ve Google kuralına aykırı bir şey bulmadı.', 'iyi'],
      duzeltildi: ['✓ Denetçi kontrol etti ve şunları düzeltti:', 'iyi'],
      kontrol_gerekli: ['⚠ Yayınlamadan önce şunları kontrol edin:', 'dikkat'],
      denetlenemedi: ['⚠ Bu metin otomatik kontrol edilemedi. Yayınlamadan önce dikkatle okuyun.', 'dikkat']
    }[d.durum];
    if (!DURUM) return null;
    var k = el('div', null, 'denetim denetim-' + DURUM[1]);
    k.appendChild(el('p', DURUM[0]));
    if ((d.notlar || []).length && d.durum !== 'onaylandi') { var ul = el('ul'); d.notlar.forEach(function (n) { ul.appendChild(el('li', n)); }); k.appendChild(ul); }
    return k;
  }
  function metinCiz(kutu, sonuc) {
    var ic = sonuc.icerik || {}, alan = el('div', null, 'yazilan');
    if (sonuc.tur === 'sayfa') {
      var duz = 'Sayfa başlığı (title): ' + (ic.title || '') + '\nAçıklama (meta description): ' + (ic.aciklama || '') + '\n\n' + (ic.h1 || '') + '\n\n' + (ic.paragraflar || []).join('\n\n') + '\n\nSık sorulan sorular\n\n' + (ic.sss || []).map(function (q) { return q.soru + '\n' + q.cevap; }).join('\n\n');
      [['Sayfa başlığı', ic.title], ['Google açıklaması', ic.aciklama], ['Ana başlık', ic.h1]].forEach(function (x) { if (x[1]) { alan.appendChild(el('span', x[0], 'hazir-baslik')); alan.appendChild(el('p', x[1], 'yazilan-vurgu')); } });
      alan.appendChild(el('span', 'Sayfa metni', 'hazir-baslik'));
      (ic.paragraflar || []).forEach(function (p) { alan.appendChild(el('p', p)); });
      if ((ic.sss || []).length) { alan.appendChild(el('span', 'Sık sorulan sorular', 'hazir-baslik')); ic.sss.forEach(function (q) { var d = el('p'); d.appendChild(el('b', q.soru)); d.appendChild(document.createTextNode(' ' + q.cevap)); alan.appendChild(d); }); }
      alan.appendChild(kopyaDugme(function () { return duz; }, 'Hepsini kopyala'));
    } else if (sonuc.tur === 'aciklama') {
      alan.appendChild(el('p', ic.metin || ''));
      alan.appendChild(el('small', (ic.metin || '').length + ' / 750 karakter', 'kart-alt'));
      alan.appendChild(kopyaDugme(function () { return ic.metin || ''; }));
    } else if (sonuc.tur === 'gonderi') {
      (ic.gonderiler || []).forEach(function (g, n) {
        var d = el('div', null, 'gonderi');
        d.appendChild(el('span', (n + 1) + '. taslak · ' + (g.konu || ''), 'hazir-baslik'));
        d.appendChild(el('p', g.metin || ''));
        if (g.fotograf) d.appendChild(el('small', 'Fotoğraf önerisi: ' + g.fotograf, 'kart-alt'));
        d.appendChild(kopyaDugme(function () { return g.metin || ''; }));
        alan.appendChild(d);
      });
    }
    var dk = denetimKutu(sonuc.denetim); if (dk) alan.appendChild(dk);
    alan.appendChild(el('small', 'Yapay zekâ yazdı. Köşeli parantezli yerleri ([TELEFON] gibi) kendi bilginizle doldurun, yanlış bir şey varsa düzeltin.', 'kart-alt yazilan-not'));
    kutu.innerHTML = ''; kutu.appendChild(alan);
  }
  var YAZ_ETIKET = { sayfa: 'Sayfa metnini bizim için yazın', aciklama: 'Açıklamayı bizim için yazın', gonderi: 'Bu haftanın gönderilerini yazın' };
  function yazKutusu(y) {
    var dis = el('div', null, 'yaz-kutu'), sonucK = el('div');
    var b = el('button', null, 'btn btn-amber kucuk-btn'); b.type = 'button';
    var kayit = (isletme.hazir_metinler || {})[metinAnahtar(y)];
    // İşletme değiştiyse (başka ad/iş türü) eski metin önceki işletmenindir: gösterilmez, yeniden yazılır
    var degisti = isletme.degisiklik && isletme.degisiklik.zaman;
    if (kayit && degisti && new Date(kayit.tarih || 0) < new Date(degisti)) kayit = null;
    // Haftalık gönderi her hafta yenilenir
    if (kayit && y.tur === 'gonderi' && Date.now() - new Date(kayit.tarih).getTime() > 6 * 864e5) kayit = null;
    b.textContent = kayit ? 'Yeniden yazın' : '✍ ' + YAZ_ETIKET[y.tur];
    if (kayit) metinCiz(sonucK, kayit);
    var durum = el('small', null, 'kart-alt');
    b.addEventListener('click', function () {
      b.disabled = true; var eski = b.textContent; b.textContent = 'Yazılıyor… (20-40 saniye)'; durum.textContent = '';
      yardimci({ islem: 'metin', tur: y.tur, kelime: y.kelime || '' }).then(function (r) {
        isletme.hazir_metinler = isletme.hazir_metinler || {}; isletme.hazir_metinler[metinAnahtar(y)] = r.metin;
        metinCiz(sonucK, r.metin); b.textContent = 'Yeniden yazın';
      }).catch(function (e) { durum.textContent = e.message; b.textContent = eski; }).then(function () { b.disabled = false; });
    });
    var ust = el('div', null, 'yaz-alt'); ust.appendChild(b); ust.appendChild(durum);
    dis.appendChild(ust); dis.appendChild(sonucK);
    return dis;
  }
  function haftaNo() { var d = new Date(), y = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-' + Math.ceil(((d - y) / 864e5 + y.getDay() + 1) / 7); }
  function metinIsleri(i) {
    return [
      { k: 'gonderi-' + haftaNo(), yaz: { tur: 'gonderi' }, t: 'Bu haftanın Google gönderisini paylaşın', s: 'Her hafta · 5 dakika',
        n: 'Google, düzenli gönderi paylaşan profilleri daha canlı buluyor. Size bu hafta için 3 taslak yazıyoruz, birini seçip paylaşmanız yeter.',
        adimlar: ['Aşağıdaki düğmeye basın, taslaklar gelsin.', 'Birini seçip "Kopyala" deyin.', 'Telefonda Google Haritalar’da kendi işletmenizi açın, "Güncelleme ekle" ya da "Gönderi ekle" deyin.', 'Metni yapıştırın, taslağın önerdiği gibi bir fotoğraf ekleyip paylaşın.'],
        sonuc: 'Profiliniz canlı görünür; gönderide geçen kelimeler aramalarda sizi öne çıkarabilir.' },
      { k: 'aciklama', yaz: { tur: 'aciklama' }, t: 'Google profil açıklamanızı güncelleyin', s: '10 dakika · bir kez',
        n: 'Profilinizdeki "İşletme açıklaması" Google’a ve yapay zekâya ne iş yaptığınızı anlatır. Google’ın kurallarına uygun bir açıklamayı sizin için yazıyoruz.',
        adimlar: ['Aşağıdaki düğmeye basın, açıklama gelsin; köşeli parantezli yerleri doldurun.', 'business.google.com adresine girin ya da Google Haritalar’da işletmenizi açıp "Profili düzenle" deyin.', '"Açıklama" bölümüne yapıştırıp kaydedin.'],
        sonuc: 'Google ve yapay zekâ işinizi doğru anlar; açıklamadaki kelimelerle aramalarda daha kolay bulunursunuz.' }
    ];
  }

  // ---- Site sağlığı ----
  function siteCiz() {
    var i = isletme, kutu = $('site-saglik'); if (!kutu) return;
    var ss = i.site_saglik; kutu.innerHTML = '';
    $('site-tara').hidden = !i.site;
    if (!$('site-tara').disabled) $('site-tara').textContent = i.site_saglik ? 'Yeniden tara' : 'Siteyi tara';
    if (!i.site) {
      kutu.appendChild(el('p', 'Kurulumda web sitesi girmediniz. Siteniz varsa Hesap sayfasından "Düzenle" ile ekleyin.', 'kart-alt'));
      var tk = el('div', null, 't-teklif-panel');
      tk.appendChild(el('b', 'Siteniz yoksa biz yapalım'));
      tk.appendChild(el('p', 'Google\'a uygun, telefonda hızlı açılan bir web sitesini sizin için hazırlıyoruz. Sırası Norevo ile her hafta takip edilir.', 'kart-alt'));
      var wa = el('a', 'WhatsApp\'tan bilgi alın', 'btn btn-wa kucuk-btn'); wa.target = '_blank'; wa.rel = 'noopener';
      wa.href = 'https://wa.me/905556984086?text=' + encodeURIComponent('Merhaba, ' + (i.ad || 'işletmem') + ' için web sitesi yaptırmak istiyorum.');
      tk.appendChild(wa); kutu.appendChild(tk);
      siteIsleriCiz(); return;
    }
    if (!ss) { kutu.appendChild(el('p', 'Sitenizi henüz taramadık. "Siteyi tara" düğmesine basın, 10-20 saniye sürer.', 'kart-alt')); siteIsleriCiz(); return; }
    var ust = el('div', null, 'site-ust');
    var p = el('div', null, 'site-puan ' + (ss.puan >= 80 ? 'iyi' : ss.puan >= 50 ? 'orta' : 'zayif'));
    p.appendChild(el('b', String(ss.puan))); p.appendChild(el('span', '/ 100'));
    ust.appendChild(p);
    var ac = el('div'); ac.appendChild(el('b', gosterLink(ss.adres || i.site)));
    ac.appendChild(el('p', (ss.puan >= 80 ? 'Siteniz iyi durumda.' : ss.puan >= 50 ? 'Sitenizde düzeltilecek birkaç şey var.' : 'Sitenizde Google’ı ve müşteriyi zorlayan önemli eksikler var.') + ' Son tarama: ' + tarih(ss.tarih) + '.', 'kart-alt'));
    ust.appendChild(ac); kutu.appendChild(ust);
    var ul = el('ul', null, 'site-liste-kontrol');
    (ss.kontroller || []).slice().sort(function (a, b) { return (a.tamam - b.tamam) || (b.agirlik - a.agirlik); }).forEach(function (k) {
      var li = el('li', null, k.tamam ? 'tamam' : 'eksik');
      li.appendChild(el('span', k.tamam ? '✓' : '✗', 'site-isaret'));
      var g = el('div'); g.appendChild(el('b', k.ad)); g.appendChild(el('small', k.detay)); li.appendChild(g);
      ul.appendChild(li);
    });
    kutu.appendChild(ul);
    siteIsleriCiz();
  }
  function siteIstegi(k) {
    var i = isletme, yer = yerAdi(i), isK = isAdi(i, 'işletme'), d = String(k.detay || '').replace(/^[^:]+:\s*/, '');
    var ISTEK = {
      https: 'Siteye ücretsiz SSL sertifikası kurulsun, site https ile açılsın.',
      hiz: 'Ana sayfa hızlandırılsın, resimler küçültülsün (' + k.detay + ').',
      mobil: 'Site telefon ekranına uyumlu hâle getirilsin.',
      baslik: 'Ana sayfa başlığı (title) işimizi ve şehrimizi söylesin: "' + i.ad + ' | ' + yer + ' ' + isK + '". Şu an: ' + d,
      aciklama: 'Google’da görünen açıklama (meta description) 120-155 karakterlik bir cümle olsun, ne iş yaptığımızı ve nerede olduğumuzu söylesin; örneğin "' + i.ad + ', ' + yer + ' bölgesinde ' + isK + '. Adres, telefon ve çalışma saatlerimiz sitemizde." Şu an sadece ' + d + ' yazıyor.',
      h1: 'Ana sayfanın en üstündeki ana başlık (H1) işimizi ve şehrimizi söylesin; örneğin "' + yer + ' ' + isK + '". Şu an: ' + d,
      telefon: 'Telefon numaramız ana sayfada yazı olarak ve tıklayınca arayacak şekilde olsun.',
      yer: 'Açık adresimiz ve hizmet verdiğimiz bölgeler ana sayfada yazı olarak olsun.',
      ad: 'İşletme adımız "' + i.ad + '" ana sayfada yazı olarak geçsin.',
      sema: 'Ana sayfaya LocalBusiness yapılandırılmış verisi (JSON-LD) eklensin: işletme adı, adres, telefon, çalışma saatleri ve Google Haritalar bağlantısı.',
      harita: 'İletişim bölümüne Google Haritalar haritası ya da işletme profilimizin bağlantısı eklensin.',
      indeks: 'ACİL: sayfadaki "noindex" işareti kaldırılsın; bu işaret varken Google siteyi hiç göstermiyor.',
      resim: 'Resimlere ne gösterdiklerini anlatan kısa açıklamalar (alt metni) eklensin. Taramada ' + k.detay.replace(/\.$/, '').toLocaleLowerCase('tr') + '.',
      sitemap: 'Site haritası (sitemap.xml) oluşturulup Google Search Console’a eklensin.'
    };
    return ISTEK[k.kod] || (k.ad + ': ' + k.oneri);
  }
  function siteIsleriCiz() {
    var ss = isletme.site_saglik, kutu = $('site-isler'); if (!kutu) return;
    var eksik = ss && ss.kontroller ? ss.kontroller.filter(function (k) { return !k.tamam; }).sort(function (a, b) { return b.agirlik - a.agirlik; }) : [];
    $('site-isler-kart').hidden = !eksik.length;
    if (!eksik.length) { kutu.innerHTML = ''; kutu._isler = null; return; }
    isEkle(kutu, [{
      k: 'site-saglik-' + eksik.map(function (k) { return k.kod; }).join('-'), t: 'Sitenizdeki ' + eksik.length + ' eksiği düzelttirin', s: 'Sitenizi yapan kişi için · 1-3 saat',
      n: 'Sitenizi taradık. Bu eksikler Google’ın ve yapay zekânın sizi anlamasını zorlaştırıyor. Aşağıdaki mesajı sitenizi yapan kişiye gönderin.',
      adimlar: eksik.map(function (k) { return k.ad + ': ' + k.oneri; }),
      // Siteyi yapan kişiye giden mesaj onun diliyle ve taramada bulunan gerçek değerlerle (öneri metinleri işletme sahibine hitap ediyor)
      metin: { baslik: 'Sitenizi yapan kişiye gönderilecek mesaj', yazi: 'Merhaba, sitemiz ' + gosterLink(ss.adres || isletme.site) + ' için şu düzeltmeleri yapabilir misiniz?\n\n' + eksik.map(function (k, n) { return (n + 1) + ') ' + siteIstegi(k); }).join('\n') + '\n\nTeşekkürler.' },
      sonuc: 'Siteniz Google’da daha iyi anlaşılır, telefonda düzgün açılır; müşteri ve yapay zekâ size daha kolay güvenir.'
    }]);
  }
  function siteTara(sessiz) {
    var b = $('site-tara'); if (b) { b.disabled = true; b.textContent = 'Taranıyor…'; }
    $('site-durum').textContent = '';
    return yardimci({ islem: 'site' }).then(function (r) { isletme.site_saglik = r.site; siteCiz(); isSayaci(); })
      .catch(function (e) { if (!sessiz) $('site-durum').textContent = e.message; })
      .then(function () { if (b) { b.disabled = false; b.textContent = 'Yeniden tara'; } });
  }

  // ---- Google yorumları ve cevap taslakları ----
  // Türkçe bulunma eki (Facebook’ta, Yandex Haritalar’da, Foursquare’de)
  function bulunma(ad) {
    var kucuk = String(ad || '').toLocaleLowerCase('tr');
    var unluler = kucuk.match(/[aıoueiöü]/g) || ['e'], son = unluler[unluler.length - 1];
    return ad + '’' + (/[çfhkpsşt]$/.test(kucuk) ? 't' : 'd') + ('aıou'.indexOf(son) >= 0 ? 'a' : 'e');
  }
  function yildiz(p) { var n = Math.max(0, Math.min(5, Math.round(Number(p) || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function puanYaz(p) { return p == null ? '-' : String(p).replace('.', ','); }
  function yorumTarih(y) { return y.tarih ? kisaTarihG(y.tarih) : (y.zaman || ''); }
  function yorumCiz() {
    var kutu = $('yorum-icerik'); if (!kutu) return;
    var y = isletme.yorumlar; kutu.innerHTML = '';
    if (!$('yorum-yenile').disabled) $('yorum-yenile').textContent = y ? 'Yorumları yenile' : 'Yorumları getir';
    if (!y) { kutu.appendChild(el('p', 'Yorumlarınızı henüz getirmedik. "Yorumları getir" düğmesine basın, 20-40 saniye sürer.', 'kart-alt')); ypIsleriCiz(); return; }
    if (y.bulunamadi) {
      var bd = el('div', null, 'yorum-bos');
      bd.appendChild(el('b', 'Google Haritalar’da işletmenizi bulamadık'));
      var bs = y.baska_sube;
      bd.appendChild(el('p', '"' + isletme.ad + (isletme.semt !== 'Türkiye geneli' ? ' ' + yerAdi(isletme) : '') + '" diye aradık ama ' + (isletme.semt !== 'Türkiye geneli' ? yerAdi(isletme) + ' bölgesinde ' : '') + 'bu adla bir Google İşletme Profili çıkmadı.' + (bs && bs.ad ? ' Sadece "' + bs.ad + '"' + (bs.adres ? ' (' + bs.adres + ')' : '') + ' çıktı; o profilin yorumlarını sizinmiş gibi göstermiyoruz.' : ' Profiliniz farklı bir adla açılmış olabilir ya da henüz hiç açılmamış olabilir.'), 'kart-alt'));
      bd.appendChild(el('p', 'Profiliniz varsa adının tabelanızdaki adla aynı olduğunu kontrol edin. Yoksa business.google.com adresinden ücretsiz açın; yorumlarınızı burada göstermeye başlarız.', 'kart-alt'));
      kutu.appendChild(bd); ypIsleriCiz(); return;
    }
    var liste = y.yorumlar || [];
    var ozet = el('div', null, 'yorum-ozet');
    [['Puanınız', puanYaz(y.puan), y.puan != null ? yildiz(y.puan) : ''], ['Toplam yorum', sayi(y.yorum_sayisi), 'Google Haritalar’da'], ['Cevapsız', String(y.cevapsiz_sayi || 0), 'son ' + liste.length + ' yorumda']].forEach(function (x, n) {
      var d = el('div', null, 'sayi-kutu' + (n === 2 && y.cevapsiz_sayi ? ' dikkat' : ''));
      d.appendChild(el('span', x[0])); d.appendChild(el('b', x[1])); d.appendChild(el('small', x[2])); ozet.appendChild(d);
    });
    kutu.appendChild(ozet);
    kutu.appendChild(el('p', (y.yer && y.yer.ad ? 'Google’daki profil: ' + y.yer.ad + (y.yer.adres ? ', ' + y.yer.adres : '') + '. ' : '') + 'Son yenileme: ' + tarih(y.tarih) + '.', 'kart-alt yorum-kaynak'));
    if (!liste.length) { kutu.appendChild(el('p', 'Profilinizde henüz yorum yok. İşlerim sayfasındaki "Her hafta 3-5 yeni Google yorumu toplayın" adımıyla başlayabilirsiniz.', 'kart-alt')); ypIsleriCiz(); return; }
    var kn = y.konular;
    if (kn) {
      var kk = el('div', null, 'yorum-konular');
      kk.appendChild(el('b', 'Müşterileriniz ne diyor?'));
      [['Övülen', kn.ovgu, 'pil-y'], ['Şikâyet edilen', kn.sikayet, 'pil-a']].forEach(function (x) {
        if (!x[1] || !x[1].length) return;
        var s = el('p', null, 'konu-satir'); s.appendChild(el('span', x[0] + ':', 'konu-etiket'));
        x[1].forEach(function (k) { s.appendChild(el('span', k, 'pil ' + x[2])); }); kk.appendChild(s);
      });
      if (kn.google && kn.google.length) {
        var g = el('p', null, 'konu-satir'); g.appendChild(el('span', 'Google’ın yorumlarınızda öne çıkardığı konular:', 'konu-etiket'));
        kn.google.forEach(function (k) { g.appendChild(el('span', k.ad + (k.sayi ? ' (' + k.sayi + ')' : ''), 'pil')); }); kk.appendChild(g);
      }
      if (kn.ovgu && (kn.ovgu.length || kn.sikayet.length)) kk.appendChild(el('small', 'Övgü ve şikâyetleri son ' + kn.bakilan + ' yazılı yorumdan yapay zekâ çıkardı; parantezdeki sayılar Google’ın saydığı yorum sayısı.', 'kart-alt'));
      kutu.appendChild(kk);
    }
    if (y.taslak_hata) kutu.appendChild(el('p', 'Cevap taslakları bu sefer yazılamadı. Yarın "Yorumları yenile" ile tekrar deneyin.', 'kart-alt'));
    var tdk = denetimKutu(y.taslak_denetim); if (tdk) kutu.appendChild(tdk);
    var ul = el('ul', null, 'yorum-liste');
    liste.forEach(function (r) {
      var li = el('li', null, 'yorum' + (r.cevaplandi ? ' cevapli' : ''));
      var ust = el('div', null, 'yorum-ust');
      var sol = el('div'); sol.appendChild(el('b', r.ad || 'Google kullanıcısı')); sol.appendChild(el('span', yorumTarih(r), 'yorum-zaman'));
      ust.appendChild(sol);
      var sag = el('div', null, 'yorum-sag');
      var yz = el('span', yildiz(r.puan), 'yorum-yildiz'); yz.setAttribute('aria-label', (r.puan || 0) + ' yıldız'); sag.appendChild(yz);
      sag.appendChild(el('span', r.cevaplandi ? 'Cevap verdiniz' : 'Cevapsız', 'pil ' + (r.cevaplandi ? 'pil-y' : 'pil-a')));
      ust.appendChild(sag); li.appendChild(ust);
      li.appendChild(el('p', r.metin || '(Yazı yok, sadece puan verilmiş.)', 'yorum-metin' + (r.metin ? '' : ' bos')));
      if (!r.cevaplandi && r.taslak) {
        var t = el('div', null, 'hazir-metin yorum-taslak');
        t.appendChild(el('span', 'Cevap taslağı', 'hazir-baslik'));
        t.appendChild(el('p', r.taslak));
        var alt = el('div', null, 'yorum-taslak-alt');
        alt.appendChild(kopyaDugme(function () { return r.taslak; }));
        alt.appendChild(el('small', 'Google İşletme Profilinizde yorumun altındaki "Yanıtla"ya yapıştırın.' + (/\[[A-ZÇĞİÖŞÜ ]+\]/.test(r.taslak) ? ' Köşeli parantezli yeri kendi bilginizle doldurun.' : ''), 'kart-alt'));
        t.appendChild(alt); li.appendChild(t);
      }
      ul.appendChild(li);
    });
    kutu.appendChild(ul);
    kutu.appendChild(el('small', 'Taslakları yapay zekâ yazdı. Yayınlamadan önce okuyun, gerekirse düzeltin.', 'kart-alt yazilan-not'));
    ypIsleriCiz();
  }
  function yorumYenile(sessiz) {
    var b = $('yorum-yenile'); b.disabled = true; b.textContent = 'Getiriliyor… (20-40 saniye)';
    $('yorum-durum').textContent = '';
    return yardimci({ islem: 'yorumlar' }).then(function (r) {
      if (r.yorumlar) isletme.yorumlar = r.yorumlar;
      if (r.mesaj && !sessiz) $('yorum-durum').textContent = r.mesaj;
    }).catch(function (e) { if (!sessiz) $('yorum-durum').textContent = e.message; })
      .then(function () { b.disabled = false; yorumCiz(); isSayaci(); });
  }

  // ---- Mahalle ısı haritası (yardimci: isi_haritasi, ayda 1) ----
  function isiRenk(s) { return s == null ? 'isi-yok' : s <= 3 ? 'isi-1' : s <= 10 ? 'isi-2' : 'isi-3'; }
  function isiCiz() {
    var kutu = $('isi-icerik'); if (!kutu) return;
    var h = isletme.isi_haritasi, b = $('isi-cikar'); kutu.innerHTML = '';
    var buAy = h && h.ay === new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7);
    if (!b.disabled) { b.textContent = h && h.noktalar ? 'Haritayı yenile' : 'Haritayı çıkar'; b.hidden = !!(buAy && h.noktalar); }
    if (!h || !h.noktalar) { kutu.appendChild(el('p', 'Haritanızı henüz çıkarmadık. "Haritayı çıkar" düğmesine basın, 20-40 saniye sürer.', 'kart-alt')); return; }
    var izg = el('div', null, 'isi-izgara'); izg.setAttribute('role', 'img');
    var ilk3 = 0, yok = 0;
    h.noktalar.forEach(function (n, i) {
      var d = el('span', n.hata ? '?' : n.sira == null ? '20+' : String(n.sira), 'isi-nokta ' + (n.hata ? 'isi-yok' : isiRenk(n.sira)) + (i === 4 ? ' isi-siz' : ''));
      izg.appendChild(d);
      if (n.sira != null && n.sira <= 3) ilk3++; if (n.sira == null && !n.hata) yok++;
    });
    izg.setAttribute('aria-label', '9 noktanın ' + ilk3 + ' tanesinde ilk 3’tesiniz, ' + yok + ' tanesinde ilk 20’de yoksunuz.');
    kutu.appendChild(izg);
    var ac = el('div', null, 'isi-aciklama');
    [['isi-1', '1-3'], ['isi-2', '4-10'], ['isi-3', '11-20'], ['isi-yok', '20’den sonra']].forEach(function (x) { var s = el('span'); s.appendChild(el('i', null, 'isi-nokta kucuk ' + x[0])); s.appendChild(document.createTextNode(x[1])); ac.appendChild(s); });
    kutu.appendChild(ac);
    var yon = (h.adim_km || 1) + ' km';
    kutu.appendChild(el('p', '"' + h.kelime + '" araması, noktalar arası ' + yon + '. ' + (ilk3 === 9 ? 'Her noktada ilk 3’tesiniz.' : ilk3 ? '9 noktanın ' + ilk3 + ' tanesinde ilk 3’tesiniz.' : 'Hiçbir noktada ilk 3’te değilsiniz.') + (yok ? ' ' + yok + ' noktada ilk 20’de çıkmıyorsunuz: oradan arayanlar sizi görmüyor.' : '') + ' Çıkarıldığı tarih: ' + tarih(h.tarih) + '.', 'kart-alt'));
    if (buAy) kutu.appendChild(el('small', 'Yeni haritayı gelecek ay çıkarabilirsiniz.', 'kart-alt'));
  }
  function isiCikar() {
    var b = $('isi-cikar'); b.disabled = true; b.textContent = 'Çıkarılıyor… (20-40 saniye)';
    $('isi-durum').textContent = '';
    return yardimci({ islem: 'isi_haritasi' }).then(function (r) {
      if (r.isi_haritasi) isletme.isi_haritasi = r.isi_haritasi;
      if (r.mesaj) $('isi-durum').textContent = r.mesaj;
    }).catch(function (e) { $('isi-durum').textContent = e.message; })
      .then(function () { b.disabled = false; isiCiz(); });
  }

  // ---- Hangi platformlarda varsınız? ----
  var DURUM = { 'var': ['Var', 'pil-y'], bulunamadi: ['Bulunamadı', 'pil-k'], kendiniz: ['Kendiniz kontrol edin', 'pil-a'] };
  function platformCiz() {
    var kutu = $('platform-icerik'); if (!kutu) return;
    var p = isletme.platformlar; kutu.innerHTML = '';
    if (!$('platform-yenile').disabled) $('platform-yenile').textContent = p ? 'Yeniden kontrol et' : 'Kontrol et';
    if (!p) { kutu.appendChild(el('p', 'Henüz kontrol etmedik. "Kontrol et" düğmesine basın, 10-20 saniye sürer.', 'kart-alt')); ypIsleriCiz(); return; }
    var l = p.liste || [];
    var say = function (d) { return l.filter(function (x) { return x.durum === d; }).length; };
    kutu.appendChild(el('p', l.length + ' yerden ' + say('var') + ' tanesinde sizi bulduk, ' + say('bulunamadi') + ' tanesinde bulamadık, ' + say('kendiniz') + ' tanesine sizin bakmanız gerekiyor. Son kontrol: ' + tarih(p.tarih) + '.', 'kart-alt'));
    var ul = el('ul', null, 'platform-liste');
    l.forEach(function (x) {
      var li = el('li', null, 'platform p-' + x.durum);
      var ust = el('div', null, 'platform-ust');
      var sol = el('div'); sol.appendChild(el('b', x.ad)); sol.appendChild(el('span', x.alan, 'site-alan')); ust.appendChild(sol);
      var d = DURUM[x.durum] || DURUM.bulunamadi; ust.appendChild(el('span', d[0], 'pil ' + d[1]));
      li.appendChild(ust);
      li.appendChild(el('p', x.ne_yapmali, 'kart-alt'));
      if (x.adimlar && x.adimlar.length) { var ol = el('ol', null, 'adim-liste'); x.adimlar.forEach(function (a) { ol.appendChild(el('li', a)); }); li.appendChild(ol); }
      var lk = x.link || (x.durum === 'bulunamadi' && /^[a-z0-9.-]+\.[a-z]{2,}(\/[a-z]*)?$/i.test(x.alan || '') ? 'https://' + x.alan : '');
      if (lk) { var a = el('a', (x.durum === 'var' ? 'Sayfanızı açın' : x.durum === 'kendiniz' ? 'İşletme ekleme sayfası' : 'Siteye gidin') + ' →'); a.href = lk; a.target = '_blank'; a.rel = 'noopener nofollow'; li.appendChild(a); }
      ul.appendChild(li);
    });
    kutu.appendChild(ul);
    kutu.appendChild(el('small', '"Bulunamadı", Google’da adınızla yaptığımız aramanın ilk sonuçlarında o siteden bir sayfanız çıkmadığı anlamına gelir. Sayfanız olup da çıkmıyorsa adının işletme adınızla aynı yazıldığını kontrol edin.', 'kart-alt yazilan-not'));
    ypIsleriCiz();
  }
  function platformYenile(sessiz) {
    var b = $('platform-yenile'); b.disabled = true; b.textContent = 'Kontrol ediliyor…';
    $('platform-durum').textContent = '';
    return yardimci({ islem: 'platformlar' }).then(function (r) {
      if (r.platformlar) isletme.platformlar = r.platformlar;
      if (r.mesaj && !sessiz) $('platform-durum').textContent = r.mesaj;
    }).catch(function (e) { if (!sessiz) $('platform-durum').textContent = e.message; })
      .then(function () { b.disabled = false; platformCiz(); isSayaci(); });
  }

  // İşlerim: cevapsız yorumlar ve eksik platformlar
  function ypIsleriCiz() {
    var kutu = $('yp-isler'); if (!kutu) return;
    var isler = [], y = isletme.yorumlar, p = isletme.platformlar;
    if (y && !y.bulunamadi && y.cevapsiz_sayi > 0) {
      var tas = (y.yorumlar || []).filter(function (r) { return !r.cevaplandi && r.taslak; }).length;
      isler.push({ k: 'yorum-cevap-' + String(y.gun || '').replace(/-/g, ''), t: y.cevapsiz_sayi + ' yoruma cevap verin', s: '10 dakika · ücretsiz',
        n: 'Son ' + (y.yorumlar || []).length + ' Google yorumunuzdan ' + y.cevapsiz_sayi + ' tanesine cevap vermemişsiniz.' + (tas ? ' ' + tas + ' tanesi için cevap taslağı hazır.' : '') + ' Cevap verilen yorumlar müşteriye güven verir; Google da yorumlarıyla ilgilenen işletmeyi canlı bulur.',
        adimlar: ['Google sekmesindeki "Google yorumlarınız" bölümünde her cevapsız yorumun taslağını "Kopyala" ile kopyalayın.', 'Telefonda Google Haritalar’da kendi işletmenizi açın (ya da business.google.com adresine girin) ve "Yorumlar" bölümüne gidin.', 'Yorumun altındaki "Yanıtla"ya basın, taslağı yapıştırın, gerekirse düzeltip gönderin.', 'Kötü yorumlarda tartışmaya girmeyin; özür dileyip çözüm için sizi aramalarını isteyin.'],
        sonuc: 'Müşteri sizi seçmeden önce yorumlara ve cevaplarınıza bakıyor. Düzenli cevap, puanınızı korumanın en kolay yolu.',
        l: '#google', lm: 'Yorumlara ve taslaklara gidin' });
    }
    if (p && p.liste) p.liste.filter(function (x) { return x.durum === 'bulunamadi'; }).slice(0, 2).forEach(function (x) {
      var g = /google/i.test(x.ad);
      isler.push({ k: 'platform-' + sadeK(x.alan).replace(/ /g, '-'), t: g ? 'Google İşletme Profilinizi açın' : bulunma(x.ad) + ' profil açın', s: '15-20 dakika · ücretsiz',
        n: x.ne_yapmali,
        adimlar: g ? ['business.google.com adresine Gmail hesabınızla girip "İşletme ekle" deyin.', 'Adı tabelanızdaki gibi, adresi ve telefonu doğru yazın.', 'Google’ın istediği doğrulamayı (genelde kısa bir video) tamamlayın.']
          : ['Önce ' + bulunma(x.ad) + ' işletmenizin adını arayın; sayfanız varsa bilgilerini güncelleyin.', 'Yoksa sitedeki "İşletme ekle", "Firma ekle" ya da "Sayfa oluştur" bölümünden ücretsiz kayıt olun.', 'Adı, adresi ve telefonu Google’daki ile harfi harfine aynı yazın.'],
        sonuc: 'Yapay zekâ sizi ne kadar çok yerde aynı bilgiyle görürse size o kadar güveniyor.',
        l: x.link || ('https://' + x.alan), lm: x.ad, alan: x.alan });
    });
    $('yp-isler-kart').hidden = !isler.length;
    if (!isler.length) { kutu.innerHTML = ''; kutu._isler = null; return; }
    isEkle(kutu, isler);
  }

  function genelCiz() {
    var i = isletme, m = i.calisma_sekli || [];
    var saat = new Date().getHours();
    $('kim').textContent = oturum.user.email; $('kim2').textContent = oturum.user.email;
    $('selam').textContent = (saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar');
    $('baslik').textContent = i.ad || 'Hoş geldiniz';
    $('hero-cumle').textContent = yerde(i.semt) + ' ' + isAdi(i, 'işletme') + ' arayanlar sizi buluyor mu? Hemen ölçelim.';

    var satirlar = [
      ['İşletme', i.ad], ['İş', i.is_turu], ['Yer', i.semt],
      ['Çalışma şekli', m.map(function (x) { return MOD[x] || x; }).join(', ')],
      ['Web sitesi', gosterLink(i.site) || 'Yok'], ['Instagram', i.instagram || 'Yok'],
      ['Google profili', i.google_profil ? 'Eklendi' : 'Eklenmedi']
    ];
    var dl = $('ozet'); dl.innerHTML = '';
    satirlar.forEach(function (s) { dl.appendChild(el('dt', s[0])); dl.appendChild(el('dd', s[1] || '-')); });

    var ilet = 'E-posta: ' + oturum.user.email + '. ';
    ilet += i.whatsapp ? 'WhatsApp: ' + i.whatsapp + ', ' + SIKLIK[i.mesaj_sikligi || 'haftalik'] + '.' : 'WhatsApp numarası eklemediniz.';
    $('iletisim').textContent = ilet;

    var isler = [
      { k: 'nap', t: 'Adınızı, adresinizi ve telefonunuzu her yerde aynı yazın', s: '15 dakika', n: 'Yapay zekâ farklı yazılmış bilgiye daha az güveniyor.', adimlar: ['Google profilinizdeki adı, adresi ve telefonu bir kâğıda yazın.', 'Instagram, Facebook, web siteniz ve kayıtlı olduğunuz diğer sitelerde aynı bilgiler mi, bakın.', 'Farklı olanları Google’daki ile birebir aynı yapın.'] },
      { k: 'urun-listesi', t: 'Google profilinizdeki ürün ve hizmet listesini doldurun', s: '20 dakika', n: 'Google ve yapay zekâ ne iş yaptığınızı bu listeden anlıyor.', adimlar: ['Google İşletme Profilinize girip "Ürünler" ya da "Hizmetler" bölümünü açın.', 'Sattığınız her ürün grubunu veya verdiğiniz her hizmeti ayrı satır olarak ekleyin.', 'Her birine bir cümle açıklama ve varsa fotoğraf ekleyin.'] },
      { k: 'fotograf', t: 'Ayda 2-3 güncel fotoğraf ekleyin', s: '5 dakika', n: 'Güncel fotoğrafı olan profiller daha canlı görünür ve daha çok tıklanır.', adimlar: ['Telefonla yeni ürünlerin, vitrinin veya yaptığınız işin fotoğrafını çekin.', 'Google İşletme Profilinizde "Fotoğraf ekle" deyip yükleyin.'] }
    ];
    isEkle($('isler'), isler);
    isEkle($('metin-isler'), metinIsleri(i));
    siteCiz();
    yorumCiz();
    isiCiz();
    platformCiz();
  }

  var zamanlayici;
  function adimlariOynat(bas) {
    var satir = document.querySelectorAll('#olcum-adimlar > div'), k = 0;
    clearInterval(zamanlayici);
    $('olcum-adimlar').hidden = !bas;
    if (!bas) return;
    satir.forEach(function (s) { s.className = ''; });
    zamanlayici = setInterval(function () {
      satir.forEach(function (s, j) { s.className = j < k ? 'tamam' : (j === k ? 'aktif' : ''); });
      if (k < satir.length - 1) k++;
    }, 6000);
    satir[0].className = 'aktif';
  }

  // Ölçüm arka planda sürer; kaydın durumuna 5 saniyede bir bakılır (en çok 8 dakika)
  function olcumBekle(id) {
    var son = Date.now() + 8 * 6e4;
    return new Promise(function (coz, red) {
      (function bak() {
        A.sb.from('olcumler').select('*').eq('id', id).maybeSingle().then(function (r) {
          var o = r.data;
          if (o && o.durum === 'bitti') return coz(o);
          if (o && o.durum === 'hata') return red(new Error('Ölçüm şu an yapılamadı. Bu deneme aylık ölçüm hakkınızdan sayılmadı; biraz sonra tekrar deneyin.'));
          if (Date.now() > son) return red(new Error('Ölçüm beklenenden uzun sürdü. Birkaç dakika sonra sayfayı yenileyin.'));
          setTimeout(bak, 5000);
        }, function () {
          if (Date.now() > son) red(new Error('İnternet bağlantısında sorun var. Sayfayı yenileyin.')); else setTimeout(bak, 5000);
        });
      })();
    });
  }

  function olc() {
    sayfaGoster('ozet');
    $('ilk').hidden = false; $('sonuc').hidden = true;
    $('olc').disabled = true; $('olc').textContent = 'Ölçülüyor…'; $('olcum-uyari').textContent = '';
    $('durum-yazi').textContent = 'Ölçüm sürüyor';
    adimlariOynat(true);
    return A.sb.functions.invoke('olcum', { body: {} }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json() : Promise.resolve({})).then(function (j) { if (j && j.olcum) return j.olcum; throw new Error((j && j.hata) || 'Ölçüm şu an yapılamadı. Biraz sonra tekrar deneyin.'); }, function () { throw new Error('Ölçüm şu an yapılamadı. Biraz sonra tekrar deneyin.'); });
      }
      return r.data.kayit ? olcumBekle(r.data.kayit) : r.data.olcum;
    }).then(function (o) {
      adimlariOynat(false);
      yzDuzelt(o);
      if (o && o.durum === 'bitti') gecmis.unshift(o);
      return A.isletmeGetir().then(function (yeni) { if (yeni) isletme = yeni; }, function () {}).then(function () { sonucCiz(o); });
    }).then(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (e) {
      adimlariOynat(false);
      $('olcum-uyari').textContent = e.message;
      $('durum-yazi').textContent = 'Ölçüm yapılamadı';
    }).then(function () { $('olc').disabled = false; $('olc').textContent = 'Tekrar dene'; });
  }

  // İzlenen rakipler: sadece ölçümde gerçekten görülen değerler; listede yoksa "listede yok" yazılır, tahmin yok
  var RAKIP_EN_COK = 5;
  function izlenenCiz(o) {
    var tb = $('izlenen-tablo'); tb.innerHTML = '';
    var liste = (o && o.izlenen_rakipler) || [];
    var seciliSayi = (isletme.secili_rakipler || []).length;
    // Rakip bilgisi olmayan (eski) ölçümlerde kart hiç gösterilmez; olmayan bir takibi vaat etmeyelim
    $('izlenen-kart').hidden = !(o && o.izlenen_rakipler);
    if (!o || !o.izlenen_rakipler) return;
    var secili = liste.some(function (r) { return r.secili; });
    $('izlenen-not').textContent = liste.length
      ? liste.length + ' rakip izleniyor' + (secili ? ' (sizin seçtikleriniz).' : ' (haritalarda en sık önünüze çıkanlar; isterseniz kendiniz seçebilirsiniz).')
        + (seciliSayi && !secili ? ' Yeni seçiminiz bir sonraki ölçümde görünecek.' : '')
      : 'Bu ölçümde harita sonucu alınamadığı için rakip bilgisi yok.';
    liste.forEach(function (r) {
      var tr = el('tr');
      var ad = el('td'); ad.appendChild(el('b', String(r.ad || '-'))); tr.appendChild(ad);
      tr.appendChild(el('td', r.puan != null ? String(r.puan).replace('.', ',') + ' ★' : '-'));
      tr.appendChild(el('td', sayi(r.yorum)));
      var h = el('td');
      var ar = r.aramalar || [];
      if (!ar.length) h.textContent = '-';
      ar.forEach(function (a) {
        var satir = el('div', '"' + a.kelime + '": ' + (a.sira ? a.sira + '. sırada' : 'ilk 20’de yok') + ' (siz: ' + (a.siz ? a.siz + '.' : 'ilk 20’de yok') + ')');
        satir.style.fontSize = '13px';
        h.appendChild(satir);
      });
      tr.appendChild(h);
      tr.appendChild(el('td', r.yz_sayi == null ? 'ölçülmedi' : r.yz_toplam + ' cevabın ' + r.yz_sayi + ' tanesinde'));
      tb.appendChild(tr);
    });
  }
  // Rakip hareketleri: izlenen rakiplerin önceki ölçüme göre yorum, puan ve harita sırası farkı (yeni arama harcamaz)
  function hareketCiz(o) {
    var kart = $('hareket-kart'), ul = $('hareket-liste'); ul.innerHTML = '';
    kart.hidden = !(o && o.izlenen_rakipler && o.izlenen_rakipler.length);
    if (kart.hidden) return;
    var p = gecmis.filter(function (x) { return x.izlenen_rakipler && x.izlenen_rakipler.length && new Date(x.baslangic) < new Date(o.baslangic); })[0];
    if (!p) { $('hareket-not').textContent = 'Rakiplerinizin yeni yorumlarını ve sıra değişimlerini ikinci ölçümden itibaren burada göreceksiniz.'; return; }
    var satirlar = [];
    var ayni = function (a, b) { return a.place_id && b.place_id ? a.place_id === b.place_id : sadeK(a.ad) === sadeK(b.ad); };
    var siraYaz = function (s) { return s ? s + '. sıra' : 'ilk 20 dışı'; };
    o.izlenen_rakipler.forEach(function (r) {
      var e = p.izlenen_rakipler.find(function (x) { return ayni(x, r); }); if (!e) return;
      if (r.yorum != null && e.yorum != null && r.yorum > e.yorum) satirlar.push({ t: r.ad + ' ' + sayi(r.yorum - e.yorum) + ' yeni yorum aldı (' + sayi(e.yorum) + ' → ' + sayi(r.yorum) + ').', kotu: true });
      if (r.puan != null && e.puan != null && Math.abs(r.puan - e.puan) >= 0.1) satirlar.push({ t: r.ad + ' Google puanı ' + String(e.puan).replace('.', ',') + ' → ' + String(r.puan).replace('.', ',') + '.', kotu: r.puan > e.puan });
      (r.aramalar || []).forEach(function (a) {
        var b = (e.aramalar || []).find(function (x) { return x.kelime === a.kelime; });
        if (!b || (a.sira || 0) === (b.sira || 0)) return;
        var cikti = a.sira && (!b.sira || a.sira < b.sira);
        satirlar.push({ t: r.ad + ' "' + a.kelime + '" aramasında haritada ' + siraYaz(b.sira) + ' → ' + siraYaz(a.sira) + '.', kotu: cikti });
      });
    });
    var bn = (o.isletme_bilgi || {}).yorum, bo = (p.isletme_bilgi || {}).yorum;
    if (bn != null && bo != null) satirlar.push({ t: bn > bo ? 'Siz ' + sayi(bn - bo) + ' yeni yorum aldınız (' + sayi(bo) + ' → ' + sayi(bn) + ').' : 'Sizin yorum sayınız değişmedi (' + sayi(bn) + ').', siz: true, kotu: false });
    $('hareket-not').textContent = 'Önceki ölçüme göre (' + tarih(p.baslangic) + '), izlediğiniz ' + o.izlenen_rakipler.length + ' rakipte:';
    if (!satirlar.some(function (s) { return !s.siz; })) satirlar.unshift({ t: 'Rakiplerinizin yorum sayısında, puanında ve harita sırasında değişiklik yok.' });
    satirlar.forEach(function (s) { ul.appendChild(el('li', s.t, s.siz ? 'siz' : (s.kotu ? 'dikkat' : ''))); });
  }
  function rakipAdaylari() {
    var o = gecmis[0] || {}, gorulen = {}, liste = [];
    var ekle = function (ad, pid) {
      ad = String(ad || '').trim(); if (!ad) return;
      var k = ad.toLocaleLowerCase('tr'); if (gorulen[k]) return; gorulen[k] = 1;
      liste.push({ ad: ad, place_id: pid || null });
    };
    (isletme.secili_rakipler || []).forEach(function (r) { ekle(r.ad, r.place_id); });
    (o.izlenen_rakipler || []).forEach(function (r) { ekle(r.ad, r.place_id); });
    (o.harita_sonuclar || []).forEach(function (r) { if (!r.siz) ekle(r.ad, r.place_id); });
    (o.kelimeler || []).forEach(function (k) { (k.harita_ilk3 || []).forEach(function (ad) { ekle(ad, null); }); });
    return liste.slice(0, 20);
  }
  function rakipFormuDoldur() {
    var kutu = $('rakip-adaylar'); kutu.innerHTML = '';
    var secili = {}; (isletme.secili_rakipler || []).forEach(function (r) { secili[String(r.ad).toLocaleLowerCase('tr')] = 1; });
    var adaylar = rakipAdaylari();
    if (!adaylar.length) { kutu.appendChild(el('p', 'Önce bir ölçüm yapın; haritalarda karşınıza çıkan işletmeler burada listelenecek.', 'kart-alt')); return; }
    adaylar.forEach(function (a, n) {
      var lab = el('label'); lab.style.display = 'flex'; lab.style.gap = '8px'; lab.style.alignItems = 'center'; lab.style.padding = '6px 0';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = String(n); cb.checked = !!secili[a.ad.toLocaleLowerCase('tr')];
      lab.appendChild(cb); lab.appendChild(document.createTextNode(a.ad));
      kutu.appendChild(lab);
    });
    kutu._adaylar = adaylar;
  }
  $('rakip-sec-ac').addEventListener('click', function () { rakipFormuDoldur(); $('rakip-sec-durum').textContent = ''; $('rakip-sec-form').hidden = false; });
  $('rakip-sec-kapat').addEventListener('click', function () { $('rakip-sec-form').hidden = true; });
  $('rakip-adaylar').addEventListener('change', function (e) {
    if (e.target.type !== 'checkbox') return;
    var n = this.querySelectorAll('input:checked').length;
    if (n > RAKIP_EN_COK) { e.target.checked = false; $('rakip-sec-durum').textContent = 'En çok ' + RAKIP_EN_COK + ' rakip seçebilirsiniz.'; }
    else $('rakip-sec-durum').textContent = '';
  });
  $('rakip-sec-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var adaylar = $('rakip-adaylar')._adaylar || [];
    var secim = [].map.call(this.querySelectorAll('#rakip-adaylar input:checked'), function (cb) { return adaylar[Number(cb.value)]; })
      .filter(Boolean).slice(0, RAKIP_EN_COK).map(function (a) { return { ad: a.ad.slice(0, 120), place_id: a.place_id }; });
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true; $('rakip-sec-durum').textContent = 'Kaydediliyor…';
    A.sb.from('isletmeler').update({ secili_rakipler: secim.length ? secim : null }).eq('id', isletme.id).select().single().then(function (r) {
      if (r.error) throw r.error;
      isletme = r.data;
      $('rakip-sec-form').hidden = true;
      izlenenCiz(gecmis[0]);
      $('izlenen-not').textContent = (secim.length ? secim.length + ' rakip seçtiniz.' : 'Seçimi kaldırdınız; haritalarda en sık önünüze çıkan 3 işletmeyi izleyeceğiz.') + ' Değişiklik bir sonraki ölçümde görünecek.';
    }).catch(function (err) { $('rakip-sec-durum').textContent = A.hataMetni(err); }).then(function () { btn.disabled = false; });
  });

  function kelimeFormuDoldur() {
    var kayitli = isletme.anahtar_kelimeler || [], oto = otomatikKelimeler(isletme);
    document.querySelectorAll('#kelime-form input').forEach(function (inp, n) {
      inp.value = kayitli[n] || ''; inp.placeholder = 'Örn. ' + (oto[n] || 'başka bir arama');
    });
    var son = (gecmis[0] && gecmis[0].kelimeler) || [];
    $('kelime-durum').textContent = son.length
      ? 'Son ölçümde bakılan ' + son.length + ' arama: ' + son.map(function (k) { return '"' + k.kelime + '"'; }).join(', ') + '. Kendi yazdıklarınız temel aramadan hemen sonra gelir.'
      : 'İlk ölçümde sektörünüzde en sık yapılan aramalardan 10 tanesini bulup her birinde sıranıza bakacağız.' + (kayitli.length ? ' Kendi yazdıklarınız da listede olacak.' : '');
  }
  $('kelime-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var liste = tekil([].map.call(document.querySelectorAll('#kelime-form input'), function (x) { return x.value.toLocaleLowerCase('tr'); })).filter(function (k) { return k.length >= 2; }).slice(0, 3);
    var btn = this.querySelector('button'); btn.disabled = true; $('kelime-durum').textContent = 'Kaydediliyor…';
    A.sb.from('isletmeler').update({ anahtar_kelimeler: liste.length ? liste : null }).eq('id', isletme.id).select().single().then(function (r) {
      if (r.error) throw r.error;
      isletme = r.data; kelimeFormuDoldur();
      $('kelime-durum').textContent = 'Kaydedildi. ' + $('kelime-durum').textContent;
    }).catch(function (err) { $('kelime-durum').textContent = A.hataMetni(err); }).then(function () { btn.disabled = false; });
  });

  // Sol menü: #ozet, #isler, #yz, #google, #hesap
  var SAYFALAR = ['ozet', 'isler', 'yz', 'google', 'hesap', 'arama'];
  function sayfaGoster(ad, kaydir) {
    var m = /^arama-(\d+)$/.exec(ad || ''), hash = ad;
    if (m) { ad = 'arama'; if (!aramaSayfaCiz(parseInt(m[1], 10))) { ad = 'google'; hash = 'google'; } }
    else if (ad === 'arama') ad = 'google';
    if (SAYFALAR.indexOf(ad) < 0) ad = 'ozet';
    if (ad !== 'arama') hash = ad;
    document.querySelectorAll('[data-sayfa]').forEach(function (s) { s.hidden = s.getAttribute('data-sayfa') !== ad; });
    var menuAd = ad === 'arama' ? 'google' : ad;
    document.querySelectorAll('#yan-menu [data-git]').forEach(function (a) { if (a.getAttribute('data-git') === menuAd) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (location.hash.slice(1) !== hash) history.replaceState(null, '', '#' + hash);
    if (kaydir !== false) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { sayfaGoster(location.hash.slice(1)); });
  // Google sayfası sekmeleri: uzun sayfa yerine bir seferde tek bölüm (kartların kendi "hidden" durumuna dokunmaz)
  function sekmeSec(ad) {
    document.querySelectorAll('#g-sekmeler [data-sekme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sekme') === ad)); });
    document.querySelectorAll('[data-sayfa=google] [data-grup]').forEach(function (k) { k.classList.toggle('sekme-disi', k.getAttribute('data-grup').split(' ').indexOf(ad) < 0); });
  }
  sekmeSec('aramalar');
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#g-sekmeler [data-sekme], [data-sekme-git]');
    if (b) sekmeSec(b.getAttribute('data-sekme') || b.getAttribute('data-sekme-git'));
  });

  // Hesabımı sil (KVKK): e-posta yazılarak onaylanır, bütün veriler silinir
  $('sil-ac').addEventListener('click', function () { $('sil-form').hidden = false; $('sil-ac').hidden = true; $('sil-eposta').textContent = oturum.user.email; $('sil-onay').focus(); });
  $('sil-vazgec').addEventListener('click', function () { $('sil-form').hidden = true; $('sil-ac').hidden = false; $('sil-onay').value = ''; $('sil-durum').textContent = ''; });
  $('sil-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var deger = $('sil-onay').value.trim().toLowerCase();
    if (deger !== String(oturum.user.email || '').toLowerCase()) { $('sil-durum').textContent = 'E-posta adresi eşleşmedi. Adresinizi aynen yazın.'; return; }
    var btn = $('sil-btn'); btn.disabled = true; btn.textContent = 'Siliniyor…'; $('sil-durum').textContent = '';
    A.sb.functions.invoke('hesap-sil', { body: { onay: deger } }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json() : Promise.resolve({})).then(function (j) { throw new Error((j && j.hata) || 'Hesap şu an silinemedi. Biraz sonra tekrar deneyin.'); });
      }
      return A.sb.auth.signOut().catch(function () {}).then(function () { location.replace(A.KOK + 'index.html?hesap=silindi'); });
    }).catch(function (err) { $('sil-durum').textContent = err.message; btn.disabled = false; btn.textContent = 'Hesabımı ve verilerimi sil'; });
  });

  // "Bu sonuç yanlış": kart altında kısa not formu açılır; yapay zekâ ölçüm verisine bakar (yardimci, islem 'yanlis'),
  // cevabı sağ altta sohbet balonunda gösterilir. Bildirim yanlis_bildirimleri tablosuna sunucuda yazılır (sadece yönetici okur).
  // Asistan bir insan gibi sunulmaz: başlıkta "yapay zekâ" yazar
  function destekSaat() { return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  function destekMesaj(metin, kimden, yaziyor) {
    var b = $('destek-balon');
    if (!b) {
      b = el('section', null, 'destek-balon'); b.id = 'destek-balon'; b.setAttribute('aria-label', 'Norevo Asistan');
      var bas = el('div', null, 'destek-bas'), kim = el('div', null, 'destek-kim'), yazi = el('div');
      var kapat = el('button', '×', 'destek-kapat'), liste = el('div', null, 'destek-liste');
      kim.appendChild(el('span', 'N', 'destek-avatar'));
      yazi.appendChild(el('strong', 'Norevo Asistan')); yazi.appendChild(el('small', 'Çevrimiçi · yapay zekâ', 'destek-durum'));
      kim.appendChild(yazi);
      kapat.type = 'button'; kapat.setAttribute('aria-label', 'Sohbeti kapat');
      kapat.addEventListener('click', function () { b.hidden = true; });
      liste.setAttribute('role', 'log'); liste.setAttribute('aria-live', 'polite');
      liste.appendChild(el('p', 'Norevo Asistan sohbete bağlandı · ' + destekSaat(), 'destek-sistem'));
      bas.appendChild(kim); bas.appendChild(kapat); b.appendChild(bas); b.appendChild(liste);
      document.body.appendChild(b);
    }
    b.hidden = false;
    var l = b.querySelector('.destek-liste'), m = el('div', null, 'destek-mesaj destek-' + kimden + (yaziyor ? ' destek-yaziyor' : ''));
    var p = el('p', yaziyor ? null : metin);
    if (yaziyor) { p.setAttribute('aria-label', metin); p.innerHTML = '<i></i><i></i><i></i>'; }
    m.appendChild(p); m.appendChild(el('small', destekSaat(), 'destek-saat'));
    l.appendChild(m); l.scrollTop = l.scrollHeight;
    // Cevap gelince "yazıyor" balonu metne döner
    m.yaz = function (t) { m.classList.remove('destek-yaziyor'); p.removeAttribute('aria-label'); p.textContent = t; m.lastChild.textContent = destekSaat(); l.scrollTop = l.scrollHeight; };
    return m;
  }
  function bildirimBaglam(bolum) {
    var o = gecmis[0] || {}, b = { sayfa: location.hash.slice(1) || 'ozet', olcum_id: o.id || null, olcum_tarih: o.baslangic || null };
    if (bolum === 'site' && isletme.site_saglik) { b.adres = isletme.site_saglik.adres; b.puan = isletme.site_saglik.puan; b.tarih = isletme.site_saglik.tarih; }
    if (bolum === 'yorumlar' && isletme.yorumlar) { b.tarih = isletme.yorumlar.tarih; b.yorum_sayisi = isletme.yorumlar.yorum_sayisi; }
    if (bolum === 'platformlar' && isletme.platformlar) b.tarih = isletme.platformlar.tarih;
    var m = /^arama-(\d+)$/.exec(b.sayfa), k = m && (o.kelimeler || [])[+m[1]];
    if (bolum === 'arama' && k) { b.kelime = k.kelime; b.arama_sira = k.arama_sira || null; b.harita_sira = k.harita_sira || null; }
    return b;
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.yanlis-btn');
    if (!btn) return;
    var acik = btn.nextElementSibling && btn.nextElementSibling.classList.contains('yanlis-form') ? btn.nextElementSibling : null;
    if (acik) { acik.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
    var f = el('form', null, 'yanlis-form'), id = 'yanlis-not-' + btn.getAttribute('data-bolum');
    var lb = el('label', 'Ne yanlış? Doğrusu ne olmalı? (isteğe bağlı)'); lb.htmlFor = id;
    var ta = el('textarea', null, 'girdi'); ta.id = id; ta.rows = 3; ta.maxLength = 1000;
    var alt = el('div', null, 'yanlis-alt'), gon = el('button', 'Gönder', 'btn btn-amber kucuk-btn'), vaz = el('button', 'Vazgeç', 'btn btn-cizgi kucuk-btn'), dr = el('p', null, 'kart-alt');
    gon.type = 'submit'; vaz.type = 'button'; dr.setAttribute('role', 'status');
    alt.appendChild(gon); alt.appendChild(vaz); f.appendChild(lb); f.appendChild(ta); f.appendChild(alt); f.appendChild(dr);
    vaz.addEventListener('click', function () { f.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus(); });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bolum = btn.getAttribute('data-bolum'), notu = ta.value.trim().slice(0, 1000);
      gon.disabled = true; gon.textContent = 'Kontrol ediliyor…'; dr.textContent = '';
      destekMesaj(notu || 'Bu sonuç yanlış görünüyor.', 'siz');
      var bekle = destekMesaj('Asistan ölçüm verilerinize bakıyor, yazıyor…', 'biz', true);
      yardimci({ islem: 'yanlis', bolum: bolum, baglam: bildirimBaglam(bolum), notu: notu || null }).then(function (r) {
        bekle.yaz([r.cevap].concat(r.ek || []).join(' '));
        if (r.site) { isletme.site_saglik = r.site; siteCiz(); isSayaci(); }
        f.remove(); btn.textContent = 'Kontrol ettik, cevabımız sağ altta.'; btn.disabled = true; btn.removeAttribute('aria-expanded');
      }).catch(function (err) { bekle.yaz(err.message); gon.disabled = false; gon.textContent = 'Gönder'; });
    });
    btn.after(f); btn.setAttribute('aria-expanded', 'true'); ta.focus();
  });

  $('site-tara').addEventListener('click', function () { siteTara(false); });
  $('yorum-yenile').addEventListener('click', function () { yorumYenile(false); });
  $('isi-cikar').addEventListener('click', isiCikar);
  $('platform-yenile').addEventListener('click', function () { platformYenile(false); });

  $('olc').addEventListener('click', olc);
  $('yeniden').addEventListener('click', olc);
  $('cikis').addEventListener('click', function () { A.cikis(); });

  var ilkHash = location.hash.slice(1);
  A.girisGerekli().then(function (s) { oturum = s; return A.isletmeGetir(); }).then(function (i) {
    if (!i || !i.kurulum_bitti) { location.replace(A.KOK + 'kurulum.html'); return; }
    isletme = i;
    sayfaGoster(location.hash.slice(1), false);
    A.sb.rpc('yonetici_mi').then(function (r) { if (r && r.data === true) $('yonetim-link').hidden = $('yonetim-kart').hidden = false; }, function () {});
    return Promise.all([
      // Ad, konum ya da iş türü değiştiyse eski ölçümler başka bir işletmeye aittir: gösterilmez
      A.sb.from('olcumler').select('*').eq('isletme_id', i.id).eq('durum', 'bitti').gte('baslangic', (i.degisiklik && i.degisiklik.zaman) || '2000-01-01').order('baslangic', { ascending: false }).limit(12),
      // Yapılan işler de aynı tarihten sonrası: önceki işletmenin "Yaptım" kayıtları yenisine geçmez
      A.sb.from('yapilan_isler').select('*').eq('isletme_id', i.id).gte('yapildi', (i.degisiklik && i.degisiklik.zaman) || '2000-01-01')
    ]).then(function (s) {
      ((s[1] && s[1].data) || []).forEach(function (y) { yapilanlar[y.is_kodu] = y; });
      gecmis = ((s[0] && s[0].data) || []).map(yzDuzelt);
      genelCiz();
      kelimeFormuDoldur();
      if (gecmis.length) sonucCiz(gecmis[0]); else isSayaci();
      if (/^arama-\d+$/.test(ilkHash)) sayfaGoster(ilkHash, false);
      // Sitesi olup hiç taranmamışsa ilk açılışta arka planda tara
      if (isletme.site && !isletme.site_saglik) siteTara(true);
      // Yorumlar ve platformlar hiç getirilmemişse ilk açılışta bir kez getir (önce yorumlar: platform kontrolü harita kaydını kullanır)
      if (!isletme.yorumlar) yorumYenile(true).then(function () { if (!isletme.platformlar) platformYenile(true); });
      // Denetçiden önce yazılmış cevap taslakları: arama harcamadan bir kez denetlet
      else if (!isletme.yorumlar.taslak_denetim && (isletme.yorumlar.yorumlar || []).some(function (y) { return !y.cevaplandi && y.taslak; }))
        yardimci({ islem: 'yorumlar', sadece_denetim: true }).then(function (r) { if (r && r.yorumlar) { isletme.yorumlar = r.yorumlar; yorumCiz(); } }).catch(function () {});
      else if (!isletme.platformlar) platformYenile(true);
      $('yukleniyor').hidden = true; $('panel').hidden = false;
    });
  }).catch(function (err) {
    if (err && err.message === 'oturum-yok') return;
    $('yukleniyor').textContent = A.hataMetni(err);
  });
})();
