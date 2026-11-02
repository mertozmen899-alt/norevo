// İşlerim'de aynı iş/site iki kez çıkmıyor, sitesi olmayana site teklifi gidiyor, önceki işletmenin verisi görünmüyor
// (1 Kasım: diş kliniği hesabı mobilyacıya dönünce diş gönderileri kaldı; Bing, Yandex ve "site açın" iki-üç kez çıkıyordu).
// Anonim örnek mobilyacı verisi. Kullanım: NODE_PATH=<playwright klasörü>/node_modules node testler/isler-tekrar.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = path.resolve(__dirname, '..');
const simdi = Date.now(), once = (g) => new Date(simdi - g * 864e5).toISOString();
const DEGISTI = once(0.1);
const ara = (kelime, ek) => Object.assign({ kelime, kaynak: 'oneri', rehberler: [], arama_ilk3: [{ siz: false, alan: 'rakipa.com', sira: 1, baslik: 'Rakip A' }], arama_sira: null, harita_sira: null, harita_bakilan: null }, ek);
const OLCUM = { id: 'o2', durum: 'bitti', kaynak: 'elle', baslangic: once(0.05), harita_sorgu: 'çorum mobilya', harita_sira: 3, arama_sorgu: 'çorum mobilya', arama_sira: null,
  arama_sonuclar: { konum: 'Corum,Turkiye' }, marka_arama: { sira: null }, yz_gecen: 0, yz_soru_sayisi: 13, cg_soru_sayisi: 3, cg_gecen: 0, yz_cevaplar: [],
  gyz_cevaplar: [{ soru: 's', kaynaklar: ['ornekhabernet.teimg.com', 'yandex.com.tr', 'armut.com', 'i.teimg.com', 'yerelrehber.com'] }],
  cg_cevaplar: [{ soru: 's1', kaynaklar: ['ornekhabernet.teimg.com', 'yerelrehber.com'] }],
  isletme_bilgi: { ad: 'Örnek Mobilya', puan: 4.8, yorum: 25, bulundu: true },
  harita_sonuclar: [{ sira: 1, ad: 'Rakip A', siz: false, puan: 4.6, yorum: 480, site: 'https://rakipa.com' }, { sira: 2, ad: 'Rakip B', siz: false, puan: 4.9, yorum: 40 }, { sira: 3, ad: 'Örnek Mobilya', siz: true, puan: 4.8, yorum: 25 }],
  kelimeler: [ara('çorum mobilya', { harita_sira: 3, rehberler: [{ alan: 'yandex.com.tr', link: 'https://yandex.com.tr/maps/corum/mobilya', sira: 2, baslik: 'Mobilya mağazaları Çorum' }] }),
    ara('çorum mobilya siteleri', { rehberler: [{ alan: 'armut.com', link: 'https://armut.com/corum/mobilya', sira: 1, baslik: 'Çorum Mobilya Ustaları' }] })],
  rehber_sayfalari: [{ tur: 'rehber', alan: 'yandex.com.tr', link: 'https://yandex.com.tr/maps/corum/mobilya', sira: 2, baslik: 'Mobilya mağazaları Çorum', kelime: 'çorum mobilya' },
    { tur: 'rehber', alan: 'armut.com', link: 'https://armut.com/corum/mobilya', sira: 1, baslik: 'Çorum Mobilya Ustaları', kelime: 'çorum mobilya siteleri' },
    { tur: 'rakip', alan: 'rakipa.com', link: 'https://rakipa.com/corum-koltuk', sira: 1, baslik: 'Çorum Koltuk Takımı', kelime: 'çorum koltuk takımı' }] };
// İşletme değişmeden önceki (diş kliniği) ölçüm, "Yaptım" kaydı ve hazır metinler
const ESKI = Object.assign({}, OLCUM, { id: 'o1', baslangic: once(1), harita_sorgu: 'çorum diş kliniği', yz_gecen: 3, isletme_bilgi: { ad: 'Eski Diş', bulundu: true } });
const VERI = {
  isl: { id: 'x', ad: 'Örnek Mobilya', semt: 'Çorum', is_turu: 'Mobilyacı', site: null, kurulum_bitti: true, hedef: 'telefon', degisiklik: { zaman: DEGISTI }, anahtar_kelimeler: null, secili_rakipler: null, sektor_profili: { ad: 'mobilyacı' },
    hazir_metinler: { aciklama: { tur: 'aciklama', tarih: once(0.5), icerik: { metin: 'Eski Diş, Çorum bölgesinde diş kliniği olarak hizmet veren bir sağlık merkezidir.' } },
      gonderi: { tur: 'gonderi', tarih: once(0.4), icerik: { gonderiler: [{ konu: 'Diş', metin: 'Eski Diş olarak diş ipi kullanın.', fotograf: 'Diş fırçası' }] } } },
    platformlar: { gun: '2026-11-01', tarih: new Date().toISOString(), liste: [{ ad: 'Trendyol', alan: 'trendyol.com', durum: 'bulunamadi', ne_yapmali: 'Trendyol sayfanız çıkmadı.' }, { ad: 'Facebook', alan: 'facebook.com', durum: 'bulunamadi', ne_yapmali: 'Facebook sayfası çıkmadı.' }, { ad: 'Yandex Haritalar', alan: 'yandex.com.tr/harita', durum: 'bulunamadi', ne_yapmali: 'Yandex kaydınız çıkmadı.' }] },
    yorumlar: { gun: '2026-11-01', tarih: new Date().toISOString(), puan: 4.8, yorum_sayisi: 25, cevapsiz_sayi: 1, bakilan: 5, yorumlar: [{ ad: 'A.', puan: 2, metin: 'Teşhir ürün geldi', cevaplandi: false }] },
    sektor_rehberleri: [{ ad: 'Armut', alan: 'armut.com', ne_ise_yarar: 'x' }, { ad: 'Trendyol', alan: 'trendyol.com', ne_ise_yarar: 'x' }] },
  gecmis: [OLCUM, ESKI], olcum: OLCUM,
  yapilan: [{ is_kodu: 'site-baslik', baslik: 'Sitenizin Google’da görünen başlığını düzeltin', yapildi: once(2), onceki: {} }]
};
const sunucu = http.createServer((q, r) => {
  const yol = path.join(KOK, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
  if (!yol.startsWith(KOK) || !fs.existsSync(yol) || fs.statSync(yol).isDirectory()) { r.writeHead(404); return r.end(); }
  if (path.extname(yol) === '.html') return r.end(fs.readFileSync(yol, 'utf8').replace(/ integrity="sha384-[^"]+" crossorigin="anonymous"/g, ''));
  fs.createReadStream(yol).pipe(r);
}).listen(0);
const ADRES = 'http://127.0.0.1:' + sunucu.address().port;
const sonuc = { gecen: [], kalan: [] };
const kontrol = (ad, ok, detay) => (ok ? sonuc.gecen.push(ad) : sonuc.kalan.push(detay ? ad + ': ' + String(detay).slice(0, 300) : ad));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/assets/vendor/supabase-js-*.js', (r) => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'sahte-supabase.js'), 'utf8'), contentType: 'application/javascript' }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript((v) => { localStorage.setItem('fake', JSON.stringify({ isl: v.isl, gecmis: v.gecmis, olcum: v.olcum, yapilan: v.yapilan })); }, VERI);
  const p = await ctx.newPage(); const hata = []; p.on('pageerror', (e) => hata.push(e.message));
  await p.goto(ADRES + '/panel.html#isler'); await p.waitForSelector('#panel:not([hidden])', { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(700); await p.click('#tum-isler-btn').catch(() => {}); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelectorAll('.is-satir.kapali').forEach((d) => d.classList.add('acik')));
  const isler = await p.evaluate(() => document.querySelector('[data-sayfa=isler]').innerText);
  const bolum = await p.evaluate(() => ['olcum-isler', 'yp-isler', 'site-isler', 'yz-isler', 'metin-isler', 'isler'].map((id) => {
    const k = document.getElementById(id); if (!k) return { id, basliklar: [], alanlar: [] };
    return { id, basliklar: [...k.querySelectorAll('.is-govde > b')].map((x) => x.innerText), alanlar: [...k.querySelectorAll('.site-alan')].map((x) => x.innerText.trim()), wa: [...k.querySelectorAll('a[href*="wa.me"]')].map((a) => a.href) };
  }));
  const basliklar = bolum.flatMap((x) => x.basliklar), alanlar = bolum.flatMap((x) => x.alanlar);
  const tekrar = (l) => l.filter((x, k) => l.indexOf(x) !== k);
  await p.goto(ADRES + '/panel.html#ozet'); await p.waitForTimeout(500);
  const ozet = await p.evaluate(() => (document.querySelector('[data-sayfa=ozet]') || {}).innerText || '');
  kontrol('sayfa hatası yok', !hata.length, hata.join(' / '));
  kontrol('hiçbir iş iki bölümde birden yok', !tekrar(basliklar).length, tekrar(basliklar).join(', '));
  kontrol('hiçbir site iki listede birden yok', !tekrar(alanlar).length, tekrar(alanlar).join(', '));
  kontrol('sitesi olmayana site teklifi bir kez, WhatsApp bağlantısıyla', basliklar.filter((t) => t === 'Bir web siteniz olsun').length === 1 && bolum.some((x) => x.wa.some((h) => /web%20sitesi/.test(h))) && /1-2 gün içinde teslim/.test(isler), basliklar.join(' | '));
  kontrol('eski "Tek sayfalık site" kartı yok', !/Tek sayfalık basit/.test(isler));
  kontrol('sitesi yokken "sitenizi yapan kişiye" rakip sayfası işi yok', !/benzerini yapın/.test(isler));
  kontrol('Yandex tek kartta (platform kartı), site listelerinde yok', basliklar.filter((t) => /Yandex/.test(t)).length === 1 && !alanlar.includes('yandex.com.tr'), basliklar.filter((t) => /Yandex/.test(t)).join(' | ') + ' / ' + alanlar.join(','));
  kontrol('Bing ve Apple birer kez', basliklar.filter((t) => /Bing/.test(t)).length === 1 && basliklar.filter((t) => /Apple/.test(t)).length === 1);
  kontrol('resim sunucusu yerine haber sitesinin adı (ornekhaber.net), teimg yok', alanlar.includes('ornekhaber.net') && !/teimg/.test(isler), alanlar.join(','));
  kontrol('Armut tek listede', alanlar.filter((a) => a === 'armut.com').length === 1, alanlar.join(','));
  const platform = await p.evaluate(() => (document.getElementById('platform-icerik') || {}).textContent || '');
  kontrol('aramada görünmeyen sektör sitesi (Trendyol) platform listesinde ve İşlerim’de yok', !/Trendyol/.test(platform) && !/Trendyol/.test(isler) && /Facebook/.test(platform), platform.slice(0, 200));
  kontrol('önceki işletmenin hazır metinleri görünmüyor', !/Eski Diş|diş ipi/.test(isler));
  kontrol('önceki işletmenin "Yaptım" kaydı görünmüyor', !/başlığını düzeltin/.test(isler));
  kontrol('özet önceki işletmenin ölçümüyle karşılaştırmıyor', !/Önceki ölçüme göre/.test(ozet), ozet.match(/Önceki ölçüme göre[^\n]*/));
  console.log('Geçen: ' + sonuc.gecen.length + '/' + (sonuc.gecen.length + sonuc.kalan.length));
  sonuc.kalan.forEach((x) => console.log('  KALDI: ' + x));
  await b.close(); sunucu.close(); process.exit(sonuc.kalan.length ? 1 : 0);
})();
