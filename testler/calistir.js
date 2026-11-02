// Norevo otomatik testleri (test ekibi ajanı her gün çalıştırır)
// Kullanım: node testler/calistir.js   (Playwright gerekir; sonuç JSON olarak yazdırılır, hata varsa çıkış kodu 1)
// Gerçek Supabase'e bağlanmaz: supabase-js yerine testler/sahte-supabase.js yüklenir.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const KOK = path.resolve(__dirname, '..');
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const sunucu = http.createServer((q, r) => {
  const yol = path.join(KOK, decodeURIComponent(q.url.split('?')[0].split('#')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  if (!yol.startsWith(KOK) || !fs.existsSync(yol) || fs.statSync(yol).isDirectory()) { r.writeHead(404); return r.end('yok'); }
  r.writeHead(200, { 'Content-Type': TUR[path.extname(yol)] || 'application/octet-stream' });
  // supabase-js SRI (integrity) ile yükleniyor; testte yerine sahte-supabase.js verildiği için yerel sunucu bu özelliği kaldırır
  if (path.extname(yol) === '.html') return r.end(fs.readFileSync(yol, 'utf8').replace(/ integrity="sha384-[^"]+" crossorigin="anonymous"/g, ''));
  fs.createReadStream(yol).pipe(r);
}).listen(0);
const ADRES = 'http://127.0.0.1:' + sunucu.address().port;
const SAHTE = fs.readFileSync(path.join(__dirname, 'sahte-supabase.js'), 'utf8');
const sonuc = { tarih: new Date().toISOString(), gecen: [], kalan: [] };
// Bir sayfa takılırsa (ör. panel hiç açılmazsa) testler sonsuza kadar beklemesin: 6 dakikada hata say
setTimeout(() => { sonuc.kalan.push('ZAMAN AŞIMI: testler 6 dakikada bitmedi (bir sayfa takılıyor olabilir)'); console.log(JSON.stringify(sonuc, null, 2)); process.exit(1); }, 360000).unref();
const kontrol = (ad, ok, detay) => (ok ? sonuc.gecen.push(ad) : sonuc.kalan.push(detay ? ad + ': ' + detay : ad));

(async () => {
  const b = await chromium.launch();
  for (const [cihaz, vp] of [['masaüstü', { width: 1280, height: 900 }], ['telefon', { width: 375, height: 780 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.route('**/assets/vendor/supabase-js-*.js', (r) => r.fulfill({ body: SAHTE, contentType: 'application/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    // Haber listesi kaydı ve e-posta işlemleri (onay, çıkış): gerçek sunucuya gitmez
    await ctx.route('**/rest/v1/rpc/katil_bekleme_listesi', (r) => r.fulfill({ body: '"tamam"', contentType: 'application/json' }));
    await ctx.route('**/functions/v1/eposta', (r) => {
      let g = {}; try { g = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const iyi = g.anahtar === 'a'.repeat(32) && (g.tur === 'onay' || g.tur === 'cikis');
      return r.fulfill({ status: iyi ? 200 : 400, body: JSON.stringify(iyi ? { tamam: true } : { tamam: false, hata: 'gecersiz' }), contentType: 'application/json' });
    });
    const p = await ctx.newPage(); const hatalar = [];
    p.on('pageerror', (e) => hatalar.push(e.message));
    const tasma = async (ad) => { const [g, e] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); kontrol(cihaz + ' ' + ad + ' yatay taşma yok', g <= e, g + 'px > ' + e + 'px'); };
    // Açık sayfalar
    for (const s of ['index.html', 'test.html', 'giris.html', 'aydinlatma.html', 'gizlilik.html', 'kullanim-sartlari.html', 'cerez.html', 'cikis.html', 'onay.html', '404.html']) {
      hatalar.length = 0;
      const yanit = await p.goto(ADRES + '/' + s); await p.waitForTimeout(1200);
      kontrol(cihaz + ' ' + s + ' açılıyor', yanit && yanit.ok(), String(yanit && yanit.status()));
      kontrol(cihaz + ' ' + s + ' sayfa hatası yok', !hatalar.length, hatalar.join(' | '));
      await tasma(s);
    }
    // Haber listesi formu: kayıttan sonra "onay bağlantısı gönderdik" yazıyor
    await p.goto(ADRES + '/index.html#liste'); await p.waitForTimeout(300);
    await p.fill('#eposta', 'deneme@ornek.com'); await p.check('#liste-form input[type=checkbox]'); await p.click('#liste-form button[type=submit]');
    await p.waitForSelector('#liste .tesekkur:not([hidden])', { timeout: 5000 }).catch(() => {});
    const tsk = (await p.textContent('#liste .tesekkur').catch(() => '')) || '';
    kontrol(cihaz + ' haber listesi formu onay e-postası gönderildi diyor', /onay bağlantısı gönderdik/.test(tsk) && /deneme@ornek\.com/.test(tsk), tsk.slice(0, 120));
    // Onay sayfası: doğru anahtar onaylanıyor, geçersiz bağlantı nazik hata veriyor
    await p.goto(ADRES + '/onay.html?a=' + 'a'.repeat(32)); kontrol(cihaz + ' onay.html kendiliğinden onaylamıyor (düğme bekliyor)', await p.isVisible('#onayla')); await p.click('#onayla'); await p.waitForSelector('#bitti:not([hidden])', { timeout: 5000 }).catch(() => {});
    kontrol(cihaz + ' onay.html doğru bağlantıyı onaylıyor', /Kaydınız onaylandı/.test((await p.textContent('#bitti').catch(() => '')) || '') && await p.isVisible('#bitti'));
    await p.goto(ADRES + '/onay.html?a=' + 'b'.repeat(32)); await p.click('#onayla'); await p.waitForSelector('#hata:not([hidden])', { timeout: 5000 }).catch(() => {});
    kontrol(cihaz + ' onay.html süresi dolmuş bağlantıda hata gösteriyor', await p.isVisible('#hata') && !(await p.isVisible('#bitti')));
    await p.goto(ADRES + '/onay.html?a=xyz'); await p.waitForTimeout(200);
    kontrol(cihaz + ' onay.html bozuk bağlantıda hata gösteriyor', await p.isVisible('#hata'));
    // Çıkış sayfası: düğmeye basınca listeden çıkılıyor; bozuk bağlantıda düğme kapalı
    await p.goto(ADRES + '/cikis.html?a=' + 'a'.repeat(32)); await p.click('#cik').catch(() => {});
    await p.waitForSelector('#bitti:not([hidden])', { timeout: 5000 }).catch(() => {});
    kontrol(cihaz + ' cikis.html listeden çıkarıyor', await p.isVisible('#bitti'));
    await p.goto(ADRES + '/cikis.html?a=xyz'); await p.waitForTimeout(150);
    kontrol(cihaz + ' cikis.html bozuk bağlantıda düğme kapalı', await p.isDisabled('#cik') && /geçersiz/.test((await p.textContent('#durum')) || ''));
    // 404 sayfası
    await p.goto(ADRES + '/404.html'); await p.waitForTimeout(150);
    kontrol(cihaz + ' 404.html başlık ve ana sayfa düğmesi görünüyor', /bulunamadı/.test((await p.textContent('h1')) || '') && await p.isVisible('.yok-dugmeler a[href="./"]'));
    // Üst menü: oturum kayıtlıysa "Panelim", değilse "Giriş yap"
    await p.goto(ADRES + '/index.html'); await p.evaluate(() => localStorage.removeItem('sb-test-auth-token')); await p.reload(); await p.waitForTimeout(200);
    kontrol(cihaz + ' oturum yokken menüde "Giriş yap" var', ((await p.textContent('header a.erken')) || '').trim() === 'Giriş yap');
    await p.evaluate(() => localStorage.setItem('sb-test-auth-token', JSON.stringify({ refresh_token: 'r' }))); await p.reload(); await p.waitForTimeout(200);
    const pm = await p.$eval('header a.erken', (a) => [a.textContent.trim(), a.getAttribute('href')].join(' ')).catch(() => '');
    kontrol(cihaz + ' oturum varken menüde "Panelim" var', pm === 'Panelim panel.html', pm);
    await p.evaluate(() => localStorage.removeItem('sb-test-auth-token'));
    // Kurulum düzenleme: son adımda kaydet, upsert çağrılıyor ve panele dönülüyor
    await p.goto(ADRES + '/kurulum.html?adim=5'); await p.waitForSelector('#kurulum:not([hidden])', { timeout: 8000 }).catch(() => {});
    const upOnce = await p.evaluate(() => (JSON.parse(localStorage.getItem('fake') || '{}').upsert || 0));
    await p.fill('#whatsapp', '0532 765 43 21').catch(() => {});
    await p.click('#ileri').catch(() => {});
    await p.waitForURL(/panel\.html/, { timeout: 8000 }).catch(() => {});
    const upSonra = await p.evaluate(() => [JSON.parse(localStorage.getItem('fake') || '{}').upsert || 0, (JSON.parse(localStorage.getItem('fake') || '{}').isl || {}).whatsapp].join(' '));
    kontrol(cihaz + ' kurulum düzenlemesi kaydediliyor (upsert) ve panele dönülüyor', /panel\.html/.test(p.url()) && upSonra === (upOnce + 1) + ' 05327654321', p.url() + ' ' + upOnce + ' -> ' + upSonra + ' ' + ((await p.textContent('#uyari').catch(() => '')) || ''));
    await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('fake') || '{}'); delete st.isl; delete st.upsert; localStorage.setItem('fake', JSON.stringify(st)); });
    // Panel: menü sayfaları
    hatalar.length = 0;
    await p.goto(ADRES + '/panel.html#ozet'); await p.waitForSelector('#panel:not([hidden])', { timeout: 10000 }).catch(() => {});
    // Sahte veri tabanı yönetici gibi davranır (süzgeçsiz sorguya hata döner): panel yine de açılmalı
    kontrol(cihaz + ' panel, birden çok işletme varken de açılıyor (sahip süzgeci)', await p.isVisible('#panel').catch(() => false));
    kontrol(cihaz + ' panel yükleniyor', await p.isVisible('#panel'));
    for (const s of ['ozet', 'isler', 'yz', 'google', 'hesap']) {
      await p.click('#yan-menu [data-git=' + s + ']').catch(() => {});
      await p.waitForTimeout(150);
      kontrol(cihaz + ' panel ' + s + ' sayfası açılıyor', await p.isVisible('[data-sayfa=' + s + ']'));
      await tasma('panel #' + s);
    }
    // Yapay zekâ: motor motor özet (Gemini, Google Yapay Zekâ Modu, ChatGPT)
    await p.click('#yan-menu [data-git=yz]').catch(() => {}); await p.waitForTimeout(150);
    const gyz = (await p.textContent('#motor-gyz summary').catch(() => '')) || '';
    kontrol(cihaz + ' panelde Google Yapay Zekâ Modu satırı var', /Google Yapay Zekâ Modu/.test(gyz) && /2 sorunun 1 tanesinde/.test(gyz), gyz);
    await p.click('#motor-gyz > summary').catch(() => {}); await p.click('#motor-gyz .yz-cevap summary').catch(() => {}); await p.waitForTimeout(100);
    kontrol(cihaz + ' Google Yapay Zekâ Modu cevabında işletmeler ve siz işareti görünüyor', await p.isVisible('#motor-gyz .yz-isletmeler li.siz'));
    kontrol(cihaz + ' ChatGPT verisi yokken "sıradaki ölçümde" görünüyor', /sıradaki ölçümde/.test((await p.textContent('#motor-cg summary').catch(() => '')) || ''));
    await tasma('panel yapay zekâ motorları');
    // Aramalar ve tek arama sayfası
    await p.click('#yan-menu [data-git=google]');
    const satir = await p.$$('#arama-liste .arama-satir');
    kontrol(cihaz + ' aramalar listesi dolu', satir.length > 0, satir.length + ' satır');
    if (satir.length) {
      await satir[0].click(); await p.waitForFunction(() => location.hash === '#arama-0').catch(() => {}); await p.waitForTimeout(300);
      kontrol(cihaz + ' tek arama sayfası açılıyor', await p.isVisible('[data-sayfa=arama]'), await p.evaluate(() => location.hash + ' ' + [...document.querySelectorAll('[data-sayfa]')].filter((x) => !x.hidden).map((x) => x.dataset.sayfa).join(',')));
      kontrol(cihaz + ' tek arama sayfasında iş var', (await p.$$('#ar-isler .is-satir')).length > 0);
      await tasma('tek arama sayfası');
    }
    // Yeniden ölç: ölçüm arka planda sürer, panel kaydı sorgulayıp sonucu gösterir; hatalı biterse Türkçe uyarı
    await p.goto(ADRES + '/panel.html#ozet'); await p.waitForSelector('#panel:not([hidden])').catch(() => {});
    await p.click('#yeniden').catch(() => {});
    await p.waitForSelector('#sonuc:not([hidden])', { timeout: 10000 }).catch(() => {});
    await p.waitForFunction(() => !document.getElementById('olc').disabled, null, { timeout: 10000 }).catch(() => {});
    kontrol(cihaz + ' yeniden ölçüm arka planda bitip sonucu gösteriyor', await p.isVisible('#sonuc') && !((await p.textContent('#olcum-uyari')) || '').trim(), (await p.textContent('#olcum-uyari').catch(() => '')) || '');
    await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('fake') || '{}'); st.olcumHata = true; localStorage.setItem('fake', JSON.stringify(st)); });
    await p.click('#yeniden').catch(() => {});
    await p.waitForFunction(() => /sayılmadı/.test(document.getElementById('olcum-uyari').textContent), null, { timeout: 10000 }).catch(() => {});
    kontrol(cihaz + ' hatalı biten ölçümde Türkçe uyarı ve hak sayılmadı notu', /sayılmadı/.test((await p.textContent('#olcum-uyari')) || ''), (await p.textContent('#olcum-uyari').catch(() => '')) || '');
    await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('fake') || '{}'); delete st.olcumHata; localStorage.setItem('fake', JSON.stringify(st)); });
    // Hesabımı sil: form açılıyor, yanlış e-postayla silmiyor
    await p.goto(ADRES + '/panel.html#hesap'); await p.waitForSelector('#panel:not([hidden])').catch(() => {});
    await p.click('#sil-ac').catch(() => {});
    kontrol(cihaz + ' hesap silme formu açılıyor', await p.isVisible('#sil-form'));
    await p.fill('#sil-onay', 'yanlis@ornek.com').catch(() => {}); await p.click('#sil-btn').catch(() => {}); await p.waitForTimeout(200);
    kontrol(cihaz + ' yanlış e-postayla silme engelleniyor', /eşleşmedi/.test((await p.textContent('#sil-durum')) || ''));
    await tasma('hesap sayfası');
    // Yaptım düğmesi
    await p.goto(ADRES + '/panel.html#isler'); await p.waitForSelector('#panel:not([hidden])').catch(() => {});
    const once = (await p.textContent('#isler-ozet')) || '';
    // Bu haftanın işleri: hedef sorusu, en fazla 3 iş, diğer bölümler kapalı
    kontrol(cihaz + ' İşlerim’de hedef sorusu var', (await p.$$('#hedef-kutu .hedef-secenekler button')).length === 3);
    const haftaSayi = (await p.$$('#hafta-isler .is-satir')).length;
    kontrol(cihaz + ' bu hafta en fazla 3 iş gösteriliyor', haftaSayi >= 1 && haftaSayi <= 3, String(haftaSayi));
    kontrol(cihaz + ' diğer iş bölümleri başta kapalı', !(await p.isVisible('#genel-isler-kart')));
    const hb = await p.$('#hedef-kutu .hedef-secenekler button');
    if (hb) { await hb.click(); await p.waitForTimeout(300); }
    kontrol(cihaz + ' hedef seçilince kaydediliyor', /Hedefiniz:/.test((await p.textContent('#hedef-kutu')) || ''));
    const dugme = await p.$('#hafta-isler .is-alt .btn-amber');
    if (dugme) { await dugme.click(); await p.waitForTimeout(400); }
    const sonra = (await p.textContent('#isler-ozet')) || '';
    kontrol(cihaz + ' Yaptım düğmesi sayacı değiştiriyor', !!dugme && once !== sonra, once + ' -> ' + sonra);
    kontrol(cihaz + ' yapılan iş tam tarihle görünüyor', /Yaptınız · \d+ [A-ZÇĞİÖŞÜ][a-zçğıöşü]{3,}/.test((await p.textContent('#hafta-isler')) || ''));
    // Tüm işleri göster: diğer bölümler açılır
    await p.click('#tum-isler-btn').catch(() => {}); await p.waitForTimeout(150);
    kontrol(cihaz + ' "Tüm işleri göster" diğer bölümleri açıyor', await p.isVisible('#genel-isler-kart'));
    // Hazır metin: açıklamayı yazdır
    const yazB = await p.$('#metin-isler .yaz-alt .btn-amber');
    if (yazB) { await yazB.click(); await p.waitForSelector('#metin-isler .yazilan', { timeout: 3000 }).catch(() => {}); }
    kontrol(cihaz + ' hazır metin yazılıp gösteriliyor', !!yazB && !!(await p.$('#metin-isler .yazilan')));
    kontrol(cihaz + ' sayfa işinde "metnini yazın" düğmesi var', (await p.$$('#olcum-isler .yaz-alt .btn-amber, #yz-isler .yaz-alt .btn-amber')).length > 0);
    await tasma('hazır metinler');
    // Site sağlığı: otomatik tarandı, puan ve eksik işi görünüyor
    await p.click('#yan-menu [data-git=google]').catch(() => {}); await p.waitForTimeout(200);
    kontrol(cihaz + ' site sağlığı puanı görünüyor', /62/.test((await p.textContent('#site-saglik')) || ''));
    kontrol(cihaz + ' site eksikleri İşlerim’e iş oldu', (await p.$$('#site-isler .is-satir')).length === 1);
    await tasma('site sağlığı');
    // Google yorumları: ilk açılışta kendiliğinden geldi, özet, cevapsız yoruma taslak ve Kopyala var
    const yorumYazi = (await p.textContent('#yorum-icerik').catch(() => '')) || '';
    kontrol(cihaz + ' Google yorumları kendiliğinden geldi', /37/.test(yorumYazi) && /4,3/.test(yorumYazi), yorumYazi.slice(0, 120));
    kontrol(cihaz + ' cevapsız yorumlara taslak ve Kopyala düğmesi var', (await p.$$('#yorum-icerik .yorum-taslak button')).length === 3);
    kontrol(cihaz + ' taslağın altında Yanıtla talimatı var', /Yanıtla/.test((await p.textContent('#yorum-icerik .yorum-taslak').catch(() => '')) || ''));
    { const ty = (await p.textContent('#yorum-icerik .yorum-taslak').catch(() => '')) || ''; kontrol(cihaz + ' taslakta [TELEFON] kişisel numarayla doldurulmuyor, uyarı var', /\[TELEFON\]/.test(ty) && /telefonunuzu yazmadan yayınlamayın/.test(ty), ty.slice(0, 160)); }
    kontrol(cihaz + ' cevaplanmış yorumda taslak yok', (await p.$$('#yorum-icerik .yorum.cevapli .yorum-taslak')).length === 0);
    // Platformlar: durum etiketleri
    const pl = (await p.textContent('#platform-icerik').catch(() => '')) || '';
    kontrol(cihaz + ' platform listesinde Var, Bulunamadı ve Kendiniz kontrol edin görünüyor', /Var/.test(pl) && /Bulunamadı/.test(pl) && /Kendiniz kontrol edin/.test(pl), pl.slice(0, 120));
    kontrol(cihaz + ' Apple Haritalar için adımlar var', (await p.$$('#platform-icerik .p-kendiniz .adim-liste li')).length >= 3);
    await tasma('yorumlar ve platformlar');
    // "Bu sonuç yanlış": site kartında form açılıyor, not gönderiliyor, bildirim kaydediliyor
    kontrol(cihaz + ' Google sayfasında "Bu sonuç yanlış" düğmeleri var', (await p.$$('[data-sayfa=google] .yanlis-btn')).length === 5);
    await p.click('#site-kart .yanlis-btn').catch(() => {});
    kontrol(cihaz + ' "Bu sonuç yanlış" formu açılıyor', await p.isVisible('#site-kart .yanlis-form textarea'));
    await p.fill('#site-kart .yanlis-form textarea', 'Sitem https ile açılıyor').catch(() => {});
    await p.click('#site-kart .yanlis-form .btn-amber').catch(() => {}); await p.waitForTimeout(200);
    const yb = await p.evaluate(() => (JSON.parse(localStorage.getItem('fake') || '{}').yanlis || []).slice(-1)[0] || null);
    kontrol(cihaz + ' bildirim bölüm, not ve site puanıyla kaydediliyor', !!yb && yb.bolum === 'site' && yb.notu === 'Sitem https ile açılıyor' && yb.baglam && yb.baglam.puan === 62, JSON.stringify(yb));
    kontrol(cihaz + ' gönderince teşekkür yazıyor', /teşekkürler/.test((await p.textContent('#site-kart .yanlis-btn').catch(() => '')) || '') && !(await p.$('#site-kart .yanlis-form')));
    await tasma('bu sonuç yanlış');
    // İşlerim: yorum ve platform işleri
    await p.click('#yan-menu [data-git=isler]').catch(() => {}); await p.waitForTimeout(150);
    const ypi = (await p.textContent('#yp-isler').catch(() => '')) || '';
    kontrol(cihaz + ' İşlerim’de "3 yoruma cevap verin" işi var', /3 yoruma cevap verin/.test(ypi), ypi.slice(0, 120));
    kontrol(cihaz + ' İşlerim’de eksik platform işleri var (en fazla 2)', (await p.$$('#yp-isler .is-satir')).length === 3 && /Facebook’ta profil açın/.test(ypi));
    kontrol(cihaz + ' panelde sayfa hatası yok', !hatalar.length, hatalar.join(' | '));
    // Karanlık tema: düğme var, tıklayınca tema değişip kaydediliyor
    for (const s of ['index.html', 'panel.html#ozet']) {
      await p.evaluate(() => localStorage.removeItem('gorunur_tema'));
      await p.emulateMedia({ colorScheme: 'light' });
      await p.goto(ADRES + '/' + s); await p.waitForSelector('#tema-dugme', { timeout: 5000 }).catch(() => {});
      kontrol(cihaz + ' ' + s + ' tema düğmesi var', await p.isVisible('#tema-dugme'));
      const once = await p.evaluate(() => document.documentElement.dataset.tema);
      await p.click('#tema-dugme').catch(() => {});
      const sonra = await p.evaluate(() => [document.documentElement.dataset.tema, (document.getElementById('tema-dugme') || {}).getAttribute && document.getElementById('tema-dugme').getAttribute('aria-pressed'), localStorage.getItem('gorunur_tema')].join(','));
      kontrol(cihaz + ' ' + s + ' tema düğmesi karanlığa geçiriyor', once === 'acik' && sonra === 'koyu,true,koyu', once + ' -> ' + sonra);
    }
    // Cihaz karanlıkta ve elle seçim yokken sayfa koyu açılıyor, yatay taşma yok
    await p.evaluate(() => localStorage.removeItem('gorunur_tema'));
    await p.emulateMedia({ colorScheme: 'dark' });
    for (const s of ['index.html', 'test.html', 'giris.html', 'panel.html#isler']) {
      await p.goto(ADRES + '/' + s); await p.waitForTimeout(s.startsWith('panel') ? 1200 : 600);
      kontrol(cihaz + ' ' + s + ' cihaz karanlıkken koyu açılıyor', (await p.evaluate(() => document.documentElement.dataset.tema)) === 'koyu');
      await tasma(s + ' (koyu tema)');
    }
    await p.emulateMedia({ colorScheme: 'light' });
    await p.evaluate(() => localStorage.clear());
    await ctx.close();
  }
  // Dosya denetimi: supabase-js yükleyen her sayfa SRI (integrity) ile yüklüyor
  for (const s of fs.readdirSync(KOK).filter((f) => f.endsWith('.html'))) {
    const etiketler = fs.readFileSync(path.join(KOK, s), 'utf8').match(/<script[^>]+supabase-js[^>]*>/g) || [];
    if (etiketler.length) kontrol(s + ' supabase-js integrity ile yükleniyor', etiketler.every((e) => /integrity="sha384-[A-Za-z0-9+/=]{64}"/.test(e) && /crossorigin="anonymous"/.test(e)), etiketler.join(' '));
  }
  await b.close(); sunucu.close();
  console.log(JSON.stringify(sonuc, null, 2));
  process.exit(sonuc.kalan.length ? 1 : 0);
})().catch((e) => { console.error(e); sunucu.close(); process.exit(2); });
