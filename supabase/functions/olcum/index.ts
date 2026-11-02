// Norevo ölçüm motoru
// Giriş yapmış kullanıcının işletmesi için: Google Haritalar sırası, Google arama sırası
// ve yapay zekâ cevaplarında (Gemini, Google Yapay Zekâ Modu, ChatGPT) adının geçip geçmediğini ölçer.
// Gerekli gizli anahtarlar (Supabase > Edge Functions > Secrets): SERPAPI_KEY, GEMINI_API_KEY
// İsteğe bağlı anahtar: OPENAI_API_KEY (yoksa ChatGPT ölçümü sessizce atlanır, cg_* alanları boş kalır)
// İsteğe bağlı ayarlar: GEMINI_MODEL, GEMINI_ARAMALI, AYLIK_OLCUM_HAKKI (varsayılan 8, Türkiye takvim ayı), HARITA_ARAMA (varsayılan 5), YZ_TEKRAR, YZ_SORU,
//   GOOGLE_YZ_SORU (Google Yapay Zekâ Modu soru sayısı, varsayılan 2, en fazla 4),
//   OPENAI_MODEL, CHATGPT_SORU (varsayılan 3, en fazla 6), CHATGPT_TEKRAR (varsayılan 1, en fazla 3)
// SerpApi harcaması (bir ölçümde): Haritalar 5 (+1 adla arama, bulunamazsa) + Google arama 10 (+1 marka araması, gerekirse)
//   + Google Yapay Zekâ Modu 2 (GOOGLE_YZ_SORU; konumlu deneme reddedilirse o soru +1) = ~17-20 arama.
//   Ayrıca 30 günde bir Google önerileri 2-3 arama. Konum ve hesap sorguları arama hakkı harcamaz.
// Sistem geneli SerpApi bütçesi: ölçüm başlamadan public.serp_harca(OLCUM_SERP_TAHMIN=20, SERP_GUNLUK_SINIR=25,
//   SERPAPI_AYLIK_SINIR=230) düşülür; bütçe yoksa elle ölçüm kibar bir mesajla reddedilir (aylık doluysa ay başı mesajı),
//   haftalık ölçüm o tur atlanır.
// Yarış durumuna karşı ölçüm kaydı ("suruyor") her dış çağrıdan ÖNCE eklenir; aylık elle ölçüm hakkı bu kayıtlar dahil sayılır.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
// Gemini modelleri sabit sürüm: "-latest" adlarının arkasını Google değiştirebiliyor (1 Kasım: flash-latest = 3.8 Flash,
// fiyatı 1 Ocak 2027'de artıyor). Sabit sürüm kaldırılırsa en sondaki "-latest" yedek olarak çalışır.
const GEMINI_MODELLER = () => [Deno.env.get("GEMINI_MODEL"), "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-flash-lite-latest"].filter(Boolean) as string[];
// Türkiye takvim ayının başı (UTC+3, yaz saati yok), ISO
const ayBasiTR = () => { const t = new Date(Date.now() + 3 * 36e5); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - 3 * 36e5).toISOString(); };

// Türkçe karakterleri sadeleştirip karşılaştırmaya hazırlar
function sade(x: string): string {
  return (x || "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const GENEL = new Set([
  "ve", "the", "ltd", "sti", "as", "a", "s", "limited", "sirketi", "san", "tic", "ticaret", "sube", "subesi",
  "klinik", "klinigi", "kliniği", "veteriner", "veterinerlik", "hayvan", "hastanesi", "hastane", "poliklinigi", "merkezi", "merkez",
  "salonu", "salon", "kuafor", "berber", "guzellik", "dis", "agiz", "sagligi", "restoran", "restaurant", "kafe", "cafe",
  "emlak", "ofisi", "ofis", "hukuk", "burosu", "avukatlik", "danismanlik", "kursu", "kurs", "spor", "studio", "studyo",
  "petshop", "pet", "shop", "magaza", "magazasi", "istanbul", "ankara", "izmir",
  "evden", "eve", "nakliyat", "nakliye", "sac", "tasarim", "evi", "insaat", "otomotiv", "oto", "yapi", "dekorasyon", "grup", "group",
  "hizmetleri", "hizmet", "servis", "servisi", "atolyesi", "atolye", "burosu", "ofisi", "firmasi", "sirketi",
]);
function cekirdek(ad: string): string[] {
  return sade(ad).split(" ").filter((t) => t.length >= 3 && !GENEL.has(t));
}
// Pek çok işletme adında geçen kelimeler: tek başına geçmesi o işletme olduğunu göstermez ("Güneş Diş" ile "Güneş Kuaför")
// (yardimci/index.ts'de aynı liste var, birlikte değiştirin)
const YAYGIN = new Set([
  "gunes", "yildiz", "deniz", "umut", "guven", "yeni", "ozel", "altin", "gul", "inci", "yesil", "mavi", "beyaz", "kartal", "aslan",
  "can", "huzur", "saglik", "hayat", "nur", "bereket", "baris", "dost", "aile", "sevgi", "ozgur", "ege", "anadolu", "defne", "cicek",
  "bahar", "lale", "star", "park", "life", "city", "center", "plus", "pro", "prime", "royal", "elit", "lux", "vip", "moda", "nova",
  "ali", "mehmet", "ahmet", "mustafa", "ayse", "fatma", "elif", "zeynep", "emre", "murat", "hasan", "huseyin", "yusuf", "osman", "omer",
]);
// Cevaptaki bağlantıların alan adları (ChatGPT kaynakları "([site](adres))" biçiminde veriyor); panel "kaynak siteler" işi için
const metindekiAlanlar = (m: string) => [...new Set((m.match(/https?:\/\/[^\s)\]"']+/g) || []).map((u) => alanAdi(u)).filter(Boolean))].slice(0, 10);
function alanAdi(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
// ================= ARAMA SEÇİCİ (her sektörde çalışır) =================
// Silinmesi güvenli ekler ("mobilya satıcısı" -> "mobilya", "diş kliniği" -> "diş").
// "salonu", "servisi", "evi", "merkezi" bilerek yok: "düğün salonu", "kombi servisi", "çay evi" bütün olarak aranır.
const EKLER = new Set(["satıcısı", "satıcı", "satış", "mağazası", "mağaza", "firması", "firma", "şirketi", "kliniği", "bürosu", "ofisi", "işletmesi", "hizmetleri", "hizmeti", "noktası", "dükkanı", "dükkânı", "imalatçısı"]);
function cekirdekIs(isK: string): string {
  return isK.split(/\s+/).filter((k) => k && !EKLER.has(k)).join(" ") || isK;
}
// Müşteri niyeti taşımayan aramalar (iş arayan, işletme açmak isteyen, bilgi arayan)
const NIYET_DISI = /(iş ilan|is ilan|ilanlari|ilanları|eleman|maaş|maas|nedir|nasıl|nasil|kariyer|staj|sahibinden|letgo|dolandırıcı|dolandirici|şikayet|sikayet|telefon numarası|haritası|wiki|fuar|sergi|ihale|toptan|açma şart|acma sart|şartları|sartlari|isim öneri|isim oneri|isimleri|logo|ne iş yapar|kaç para|kac para|kursu|kurs |okulu|bölümü|bolumu|üniversite|universite|başvuru|basvuru|anlamı|anlami|ingilizce|ödev|odev|fiyat|ücret|ucret|indir|pdf|ekşi|eksi sozluk|forum|nöbetçi eczane|lar odası|ler odası|lar odasi|ler odasi|başkan|baskan|dernek|sendika|federasyon)/i;
// "çorum mobilyacılar sitesi" çarşı adı, "çorum mobilya siteleri" internet mağazası arar: dükkânın müşterisi değil (Loca Mobilya, 1 Kasım).
// İş türünde site/web geçen işletme (web tasarım) hariç.
const SITE_ARAMA = /(^|\s)site(si|leri|ler)?(\s|$)/i;
// "çorum" kelimesi tam kelime olarak (Türkçe ekleriyle: çorumda, çorum'daki) geçiyor mu
function yerGeciyor(k: string, yerler: string[]): boolean {
  const m = " " + sade(k) + " ";
  return yerler.filter(Boolean).some((y) => new RegExp(" " + sade(y).replace(/ /g, " ") + "(da|de|ta|te|daki|deki|taki|teki|dan|den|un|in|nin|nun)? ").test(m));
}
// Sektör ifadesi ("mobilya", "diş hekimi") tam kelime olarak, sonuna kısa ek gelebilir (mobilyacı, mobilyacılar)
function ifadeGeciyor(k: string, ifadeler: string[]): boolean {
  const m = " " + sade(k) + " ";
  return ifadeler.filter((x) => x && sade(x).length >= 3).some((x) => new RegExp(" " + sade(x).split(" ").join(" ") + "[a-z]{0,6} ").test(m));
}
// Aynı aramanın çoğulu/eki aynı sayılır ("restoran" = "restoranlar", "mağazası" = "mağazaları")
// Anlamı değiştirmeyen dolgu kelimeler: "ceza avukatı bul" = "ceza avukatı", "en iyi kuaför bornova" = "bornova kuaför"
const DOLGU = new Set(["bul", "bulun", "bulmak", "en", "iyi", "satan", "yerler", "yerleri", "nerede", "tavsiye", "oneri", "onerisi", "onerileri", "uygun", "hangi", "hangisi"]);
function imza(k: string): string {
  return sade(k).split(" ").filter((t) => t && !DOLGU.has(t)).map((t) => {
    let x = t.replace(/(lari|leri|lar|ler)$/, "");
    if (x.length > 5) x = x.replace(/(si|su|i|u)$/, "");
    return x;
  }).sort().join(" ");
}
function tekillestir(liste: string[]): string[] {
  const gorulen = new Set<string>(), sonuc: string[] = [];
  for (const k of liste.map((x) => (x || "").replace(/\s+/g, " ").trim()).filter(Boolean)) {
    const im = imza(k);
    if (!gorulen.has(im)) { gorulen.add(im); sonuc.push(k); }
  }
  return sonuc;
}
function temizArama(x: unknown): string {
  return String(x || "").toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Sektör profili: müşterilerin bu işi nasıl aradığı (Gemini, 30 günde bir)
// ad: soru cümlelerinde kullanılan Türkçe iş adı ("dentist" -> "diş hekimi"); uzmanlik: işletme adındaki uzmanlık ("çorum ortodonti" -> "ortodonti")
// isim: profilin hangi işletme adıyla çıkarıldığı; ozel_adlar: Google önerilerinden ayıklanan kişi/işletme adı içeren aramalar
type Profil = { temel: string; esler: string[]; urunler: string[]; aramalar: string[]; ad?: string; uzmanlik?: string | null; isim?: string; ozel_adlar?: string[]; ozel_imza?: string };
async function sektorProfili(isK: string, yerAd: string, GEM: string, modeller: string[], isletmeAdi = ""): Promise<Profil | null> {
  const soru = `Bir yerel işletme Google'da müşterilerin aramalarında görünmek istiyor. İşletmenin türü: "${isK}". İşletmenin adı: "${isletmeAdi}". Bölge: "${yerAd || "Türkiye geneli"}".
İşletme türü İngilizce ya da eksik yazılmış olabilir; Türkçe karşılığını kullan. İşletmenin adında bir uzmanlık geçiyorsa (örnek: ortodonti, implant, kombi, gelinlik) aramalarda onu da düşün.
Türkiye'deki müşterilerin bu tür bir işletmeyi bulmak için Google'a yazdığı aramaları düşün. Sadece JSON döndür:
{"ad":"bu işletme türünün Türkçe adı, bir müşterinin 'iyi bir ... önerir misin?' cümlesinde kullanacağı biçimde, tekil, küçük harf (örnek: diş hekimi, mobilyacı, veteriner kliniği, küçük ev aletleri tamircisi)",
"uzmanlik":"işletme adında geçen uzmanlık ya da ana ürün, 1-2 kelime, küçük harf; adında yoksa null (örnek: 'Çorum Ortodonti' için ortodonti)",
"temel":"müşterilerin bu işi aramak için en çok yazdığı kısa ifade, 1-2 kelime, küçük harf (örnek: mobilya, veteriner, diş hekimi, kuaför, düğün salonu, kombi servisi)",
"esler":["aynı işi anlatan başka yaygın ifadeler, en fazla 4, küçük harf (örnek: mobilyacı, mobilya mağazası)"],
"urunler":["bu işletmede müşterilerin en çok aradığı ürün veya hizmetler, en fazla 5, 1-3 kelime, küçük harf, marka adı olmadan (örnek: koltuk takımı, yatak odası takımı)"],
"aramalar":["müşterilerin hizmet almak ya da satın almak için Google'a yazdığı 12 arama, küçük harf, ${yerAd ? `her birinde '${yerAd.toLocaleLowerCase("tr")}' geçsin` : "yer adı olmadan"}, fiyat, iş ilanı, nasıl yapılır ve marka adı olmasın, en sık yazılanlar önce"]}`;
  try {
    const { metin } = await gemini(soru, GEM, modeller, true);
    const j = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim());
    const liste = (x: unknown, n: number) => (Array.isArray(x) ? x : []).map(temizArama).filter((k) => k && k.split(" ").length <= 6).slice(0, n);
    const temel = temizArama(j.temel);
    if (!temel || temel.split(" ").length > 3) return null;
    const ad = temizArama(j.ad);
    const uzm = temizArama(j.uzmanlik);
    return { temel, esler: liste(j.esler, 4), urunler: liste(j.urunler, 5), aramalar: liste(j.aramalar, 12),
      ad: ad && ad.split(" ").length <= 5 ? ad : temel,
      uzmanlik: uzm && uzm !== "null" && uzm.split(" ").length <= 2 && sade(uzm) !== sade(temel) ? uzm : null,
      isim: isletmeAdi };
  } catch (e) { console.log("sektor profili alinamadi", String(e)); return null; }
}
// Google otomatik tamamlama: insanların gerçekten yazdığı aramalar (Google'ın kendi sırasıyla)
async function googleOnerileri(tohumlar: string[], anahtar: string): Promise<string[]> {
  const sonuc = await Promise.allSettled(tohumlar.map((q) => serp({ engine: "google_autocomplete", q, gl: "tr", hl: "tr" }, anahtar)));
  const listeler = sonuc.map((r) => r.status === "fulfilled" ? ((r.value.suggestions || []) as Array<{ value?: string }>).map((x) => temizArama(x.value)) : []);
  const karisik: string[] = [];
  for (let i = 0; i < 10; i++) for (const l of listeler) if (l[i]) karisik.push(l[i]);
  return karisik;
}
// Google önerilerinde başka kişilerin ya da işletmelerin adı geçen aramalar ("gözde koçak diş hekimi çorum") müşterinin aramasıdır
// ama bu işletmenin hedefi değildir: yapay zekâya bir kez sorup ayıklarız (sonuç profile kaydedilir, 30 günde bir).
const UNVAN = /(^| )(dr|dt|uzm|doç|doc|prof|op|av|ecz|vet|hekim) /;
async function ozelAdlariBul(oneriler: string[], GEM: string, modeller: string[]): Promise<string[] | null> {
  const liste = oneriler.slice(0, 30);
  if (!liste.length) return [];
  const soru = `Aşağıdaki Google aramalarından hangileri belirli bir kişinin adını (doktor, avukat, usta adı gibi) ya da belirli bir işletmenin/markanın adını içeriyor? Yer adları (şehir, ilçe, semt) ve genel iş ya da ürün kelimeleri sayılmaz.
Sadece JSON döndür: {"ozel":["...aramanın aynısı..."]}
Aramalar:
${liste.map((x) => "- " + x).join("\n")}`;
  try {
    const { metin } = await gemini(soru, GEM, modeller, true);
    const j = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim());
    const kume = new Set(liste.map(temizArama));
    return (Array.isArray(j.ozel) ? j.ozel : []).map(temizArama).filter((x: string) => kume.has(x));
  } catch (e) { console.log("ozel ad ayiklanamadi", String(e)); return null; }
}
type Aday = { kelime: string; kaynak: string; populer?: boolean };
type Secim = { liste: Aday[]; temel: string; denetim: Array<{ kod: string; mesaj: string }> };
// 10 aramayı seçer ve kendini denetler
function aramalariSec(o: { yer: string; sehir: string; turkiye: boolean; isK: string; profil: Profil | null; oneriler: string[]; elle: string[]; konumVar: boolean }): Secim {
  const denetim: Array<{ kod: string; mesaj: string }> = [];
  const isTemiz = cekirdekIs(o.isK);
  const temel = o.profil?.temel || isTemiz;
  const yerler = [o.yer, o.sehir].filter(Boolean);
  const ile = (yer: string, ifade: string) => `${yer} ${ifade}`.trim();
  // Sektör ifadeleri; yapay zekâ profili yoksa iş türünün ayırt edici kelimeleri de sayılır ("kuaför salonu" -> "kuaför")
  const KATEGORI = new Set(["salonu", "salon", "servisi", "servis", "merkezi", "merkez", "evi", "kliniği", "klinik", "bürosu", "ofisi", "atölyesi", "hizmetleri", "hizmeti"]);
  const isKelimeleri = o.isK.split(" ").filter((t) => t.length >= 4 && !KATEGORI.has(t) && !EKLER.has(t));
  const sektor = [temel, isTemiz, o.isK, ...(o.profil?.esler || []), ...(o.profil?.urunler || []), ...(o.profil ? [] : isKelimeleri)];
  const siteIsi = /(site|web|internet)/.test(o.isK);
  const uygun = (k: string) => !NIYET_DISI.test(k) && (siteIsi || !SITE_ARAMA.test(k)) && k.split(" ").length <= 6 && ifadeGeciyor(k, sektor) && (o.turkiye || yerGeciyor(k, yerler));
  const S1 = ile(o.turkiye ? "" : o.yer, temel);                                   // "çorum mobilya"  (temel arama)
  const S2 = o.sehir && !o.turkiye ? ile(o.sehir, temel) : "";                      // "istanbul veteriner" (ilçedeki işletme için şehir araması)
  const S3 = ile(o.turkiye ? "" : o.yer, isTemiz);                                  // iş türünün kendisi ("çorum mobilya satıcısı" yerine "çorum mobilya")
  const S4 = o.isK !== isTemiz ? ile(o.turkiye ? "" : o.yer, o.isK) : "";
  // "yakınımda" araması ölçülmez: Google sonucu telefonun gerçek konumuna göre verir, SerpApi konumu (şehir düzeyi bile)
  // bunu taklit edemiyor; 1 Kasım'da Çorum için Samsun/Ankara sonuçları geldi.
  const elle = o.elle.map((k) => (o.turkiye || yerGeciyor(k, yerler)) ? k : ile(o.yer, k));
  // Başka kişi/işletme adı geçen öneriler ("gözde koçak diş hekimi çorum", "dr ahmet ...") listeye girmez
  const ozel = new Set((o.profil?.ozel_adlar || []).map(imza));
  const kisiAdiYok = (k: string) => !ozel.has(imza(k)) && !UNVAN.test(" " + sade(k) + " ");
  // Google önerisindeki her kelime tanıdık olmalı (yer, iş türü, eş anlamlılar, ürünler, yapay zekânın önerdiği aramalar).
  // Yoksa başka bir işin ya da işletmenin aramasıdır: "çorum hayvan rehabilitasyon merkezi", "çorum belediyesi ...",
  // rakip adı ("defne rehabilitasyon merkezi çorum"). Türkçe ek için kelimenin sonunda 3 harfe kadar fazlalık sayılmaz.
  const bilinen = [temel, isTemiz, o.isK, o.profil?.uzmanlik || "", ...(o.profil?.esler || []), ...(o.profil?.urunler || []),
    ...(o.profil?.aramalar || []), ...o.elle, ...yerler, "özel", "acil", "yakın", "yakınımda", "merkez", "merkezi", "hizmet"]
    .flatMap((x) => imza(x).split(" ")).filter((t) => t.length >= 2);
  const tanidik = (k: string) => imza(k).split(" ").every((t) => !t || bilinen.some((b) => t.startsWith(b) && t.length - b.length <= 3));
  const oneriler = o.oneriler.filter((k) => uygun(k) && kisiAdiYok(k) && tanidik(k));
  const uzm = o.profil?.uzmanlik ? ile(o.turkiye ? "" : o.yer, o.profil.uzmanlik) : "";   // "çorum ortodonti" (işletme adındaki uzmanlık)
  const populerImza = new Set(oneriler.map(imza));
  const esler = (o.profil?.esler || []).slice(0, 2).map((x) => ile(o.turkiye ? "" : o.yer, x));
  const urunler = (o.profil?.urunler || []).map((x) => ile(o.turkiye ? "" : o.yer, x));
  const yzAramalar = (o.profil?.aramalar || []).filter((k) => uygun(k) && kisiAdiYok(k));
  const sira: Aday[] = [];
  const ekle = (k: string, kaynak: string) => { if (k) sira.push({ kelime: k, kaynak }); };
  ekle(S1, "temel"); ekle(uzm, "temel"); ekle(S2, "sehir");
  elle.slice(0, 3).forEach((k) => ekle(k, "elle"));
  const sec = [oneriler[0], oneriler[1], esler[0], urunler[0], oneriler[2], urunler[1], oneriler[3], esler[1], urunler[2], oneriler[4], oneriler[5], ...yzAramalar, ...oneriler.slice(6), ...urunler.slice(3), ...esler.slice(2)];
  sec.forEach((k) => ekle(k, "oneri"));
  ekle(S3, "temel"); ekle(S4, "temel"); // iş türünün yazıldığı hâli ("çorum mobilya satıcısı"): yer kalırsa
  // Neredeyse aynı aramalar: biri ötekinin aynısı + tek bir yan kelime ("bornova gelin başı" = "bornova gelin başı kuaförü",
  // "antalya arsa" = "antalya yatırımlık arsa"). Aynı işin eş anlamlıları (diş kliniği, diş hekimi, diş hastanesi...) en fazla 3 kez.
  const yerTok = new Set(sade(yerler.join(" ")).split(" ").filter(Boolean));
  const tok = (k: string) => imza(k).split(" ").filter((t) => t && !yerTok.has(t));
  const sektorTok = new Set([temel, isTemiz, o.isK].flatMap(tok));   // eş anlamlıların kelimeleri sayılmaz ("kadın kuaförü" ayrı bir aramadır)
  const YAN = new Set(["salon", "kuafor", "klinig", "merkez", "hizmet", "ofis", "buro", "magaza", "danismanlig", "danismanl", "yatirimlik", "yatirim", "firma", "sirket", "servis", "atolye", "modeller", "cesit", "secenek", "ozel", "profesyonel", "kalite", "kaliteli", "satilik"].map((x) => imza(x)));
  const yakinKopya = (a: string[], b: string[]) => {
    const [kisa, uzun] = a.length <= b.length ? [a, b] : [b, a];
    if (uzun.length - kisa.length !== 1 || !kisa.every((t) => uzun.includes(t))) return false;
    const fazla = uzun.find((t) => !kisa.includes(t)) as string;
    return YAN.has(fazla) || sektorTok.has(fazla);
  };
  const esCekirdek = new Set([temel, isTemiz, o.isK, ...(o.profil?.esler || [])].map((x) => tok(x).sort().join(" ")));
  const goruldu = new Set<string>(); let liste: Aday[] = []; const secilenTok: string[][] = []; let esSayisi = 0;
  for (const a of sira) {
    const im = imza(a.kelime), t = tok(a.kelime);
    if (goruldu.has(im)) continue;
    if (a.kaynak !== "elle" && secilenTok.some((x) => yakinKopya(x, t))) continue;
    const es = esCekirdek.has(t.slice().sort().join(" "));
    if (es && a.kaynak !== "elle" && esSayisi >= 3) continue;
    if (es) esSayisi++;
    goruldu.add(im); secilenTok.push(t); liste.push(a);
  }
  liste = liste.slice(0, 10);
  liste.forEach((a) => { a.populer = populerImza.has(imza(a.kelime)); if (oneriler.some((x) => imza(x) === imza(a.kelime)) && a.kaynak === "oneri") a.kaynak = "google"; });
  // ---- Otomatik denetim (her ölçümde) ----
  if (!liste.length || imza(liste[0].kelime) !== imza(S1)) denetim.push({ kod: "temel-yok", mesaj: `Temel arama "${S1}" ilk sırada değil` });
  if (!o.turkiye) { const yersiz = liste.filter((a) => a.kaynak !== "yakin" && !yerGeciyor(a.kelime, yerler)); if (yersiz.length) denetim.push({ kod: "yer-yok", mesaj: "Yer adı geçmeyen arama: " + yersiz.map((a) => a.kelime).join(", ") }); }
  const sektorsuz = liste.filter((a) => a.kaynak !== "elle" && !ifadeGeciyor(a.kelime, sektor)); if (sektorsuz.length) denetim.push({ kod: "sektor-yok", mesaj: "Sektör kelimesi geçmeyen arama: " + sektorsuz.map((a) => a.kelime).join(", ") });
  const niyetsiz = liste.filter((a) => a.kaynak !== "elle" && NIYET_DISI.test(a.kelime)); if (niyetsiz.length) denetim.push({ kod: "niyet-disi", mesaj: "Müşteri araması olmayan: " + niyetsiz.map((a) => a.kelime).join(", ") });
  if (liste.length < 8) denetim.push({ kod: "az-arama", mesaj: `Sadece ${liste.length} arama bulunabildi` });
  if (!o.oneriler.length) denetim.push({ kod: "oneri-yok", mesaj: "Google önerileri alınamadı" });
  if (!o.profil) denetim.push({ kod: "profil-yok", mesaj: "Sektör profili (yapay zekâ) alınamadı, yedek kurallar kullanıldı" });
  return { liste, temel, denetim };
}
// Google sonuçlarında rehber / liste sayfası olanları ayırır
const REHBER_ALAN = /(yandex\.|cybo\.com|foursquare\.com|tripadvisor\.|armut\.com|doktortakvimi\.com|bulurum\.com|rehber|infobel|kompass|cylex|hotfrog|mapcarta|wanderlog|yelp\.|sikayetvar\.com|firma|nerede|yakinimda|eniyi|listele|kurumsal|sarisayfa|yellowpages|ilan|zingat|hepsiemlak|sahibinden\.com|trendyol\.com|hepsiburada\.com|n11\.com|getir|yemeksepeti|booking\.com|etstur|obilet)/i;
const REHBER_BASLIK = /(listesi|rehberi|firmaları|firmalari|mağazaları|magazalari|en iyi|yakınımda|yakinimda|adresleri|telefonları|telefonlari|nerede|tavsiye|önerileri|onerileri)/i;
// "rehber": liste/rehber sitesi (adınızı ekletin); "rakip": rakibin kendi sitesindeki liste başlıklı sayfa (siz de yapın)
function rehberTuru(baslik: string, alan: string): "rehber" | "rakip" | null {
  if (!alan || /google\.|instagram\.com|facebook\.com|youtube\.com|tiktok\.com|wikipedia/i.test(alan)) return null;
  if (REHBER_ALAN.test(alan)) return "rehber";
  if (REHBER_BASLIK.test(baslik)) return "rakip";
  return null;
}
// ---------------- Güvenli adres denetimi (SSRF koruması) ----------------
// Sadece http/https, kullanıcı adı/şifre yok, port 80/443, iç ağ adı yok ve alan adı özel/iç IP'ye çözülmüyor.
class GuvenlikHatasi extends Error {}
function ozelIp4(ip: string): boolean {
  const p = ip.split(".").map((x) => Number(x));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
function ozelIp6(ip: string): boolean {
  const x = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (x === "::" || x === "::1") return true;
  if (/^f[cd][0-9a-f]{0,2}:/.test(x)) return true;          // fc00::/7
  if (/^fe[89ab][0-9a-f]?:/.test(x)) return true;            // fe80::/10
  if (/^ff/.test(x)) return true;                             // çoklu yayın
  if (x.startsWith("::ffff:") || x.startsWith("64:ff9b:") || x.startsWith("2002:") || /^::[0-9.]+$/.test(x)) return true; // IPv4 gömülü adresler
  return false;
}
// Alan adının IP adresleri (A ve AAAA). Deno.resolveDns hiç çalışmazsa DNS-over-HTTPS yedeği.
async function cozumle(host: string): Promise<string[]> {
  const ipler: string[] = [];
  let hata = 0;
  for (const tur of ["A", "AAAA"] as const) {
    try { ipler.push(...await Deno.resolveDns(host, tur, { signal: AbortSignal.timeout(5000) })); } catch { hata++; }
  }
  if (ipler.length || hata < 2) return ipler;
  for (const tur of ["A", "AAAA"]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${tur}`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      for (const a of (j?.Answer || []) as Array<{ type: number; data: string }>) if (a.type === 1 || a.type === 28) ipler.push(String(a.data));
    } catch { /* yok */ }
  }
  return ipler;
}
async function adresDenetle(adres: string | URL): Promise<URL> {
  let u: URL;
  try { u = new URL(String(adres)); } catch { throw new GuvenlikHatasi("Web sitesi adresi geçersiz."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  if (u.username || u.password) throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.includes("[") ||
    /(^|\.)(localhost|local|internal|lan|localdomain|home|corp)$/.test(host) || /supabase\.(co|in)$/.test(host)) {
    throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  }
  const ipler = await cozumle(host);
  if (!ipler.length) throw new Error("Alan adı çözülemedi.");
  if (ipler.some((ip) => ip.includes(":") ? ozelIp6(ip) : ozelIp4(ip))) throw new GuvenlikHatasi("Bu web sitesi adresi taranamıyor.");
  return u;
}
// Yönlendirmeleri elle izler (en fazla 3), her adımda adresi yeniden denetler
async function guvenliGetir(adres: string | URL, ms: number, headers: Record<string, string> = {}) {
  const sinyal = AbortSignal.timeout(ms);
  let u = await adresDenetle(adres);
  for (let adim = 0; ; adim++) {
    const r = await fetch(u, { redirect: "manual", signal: sinyal, headers });
    const yer = r.headers.get("location");
    if ([301, 302, 303, 307, 308].includes(r.status) && yer) {
      await r.body?.cancel();
      if (adim >= 3) throw new GuvenlikHatasi("Siteniz çok fazla kez yönlendiriyor, taranamadı.");
      try { u = await adresDenetle(new URL(yer, u)); } catch (e) {
        if (e instanceof GuvenlikHatasi) throw new GuvenlikHatasi("Siteniz taranmasına izin verilmeyen bir adrese yönlendiriyor.");
        throw e;
      }
      continue;
    }
    return { r, son: u.toString() };
  }
}

// Sektöre özel rehber ve platform siteleri: yapay zekâya sorulur, her alan adının gerçekten açıldığı denetlenir
async function sektorRehberleri(isK: string, GEM: string, modeller: string[]) {
  // 4KDent'e (diş kliniği) Armut, Hepsiburada ve N11 önerilmişti: site, bu iş türünün müşterisinin gerçekten baktığı yer olmalı
  const soru = `Türkiye'de "${isK}" arayan müşterilerin işletme seçerken gerçekten baktığı ve "${isK}" işletmesinin kendine profil, ilan ya da mağaza açabildiği Türk siteleri listele.
Kurallar:
- Site bu iş türüne özel olmalı ya da bu iş türünün müşterileri onu yaygın olarak kullanmalı (örnek: diş kliniği için doktor randevu siteleri; restoran için yemek ve mekân siteleri).
- Genel alışveriş siteleri (Hepsiburada, Trendyol, N11, Amazon, Çiçeksepeti) sadece işletme internetten ürün satabiliyorsa yazılır; sağlık, güzellik ve yerinde hizmet işletmelerine yazılmaz.
- Usta ve ev hizmeti siteleri (Armut gibi) sadece eve gelen hizmet işlerine (tadilat, temizlik, nakliyat, tesisat vb.) yazılır.
- Sadece gerçekten var olan, Türkiye'de bilinen siteler. Emin olmadığın siteyi yazma; az ama doğru site daha iyi.
- Google, Bing, Apple, Yandex haritaları, Instagram ve Facebook'u yazma. En fazla 6 site.
Sadece şu biçimde JSON dizi döndür (uygun site yoksa boş dizi): [{"ad":"Site adı","alan":"ornek.com","ne_ise_yarar":"Bu işletmenin müşterileri bu siteyi neden kullanıyor, tek kısa cümle"}]`;
  const { metin } = await gemini(soru, GEM, modeller, true);
  let liste: Array<{ ad?: string; alan?: string; ne_ise_yarar?: string }> = [];
  try { liste = JSON.parse(metin.replace(/^```(json)?|```$/g, "").trim()); } catch { return []; }
  if (!Array.isArray(liste)) return [];
  const temiz = liste.map((x) => ({ ad: String(x.ad || "").slice(0, 60), alan: alanAdi(String(x.alan || "")), ne_ise_yarar: String(x.ne_ise_yarar || "").slice(0, 200) }))
    .filter((x) => x.ad && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(x.alan) && !/google\.|bing\.|apple\.|yandex\.|instagram\.|facebook\./.test(x.alan));
  // Alan adı gerçekten açılıyor mu? (uydurma siteleri ele)
  const denetim = await Promise.allSettled(temiz.map(async (x) => {
    // SSRF koruması: yönlendirmeler elle (en fazla 3), sadece http/https, port 80/443, iç adres ve iç IP yok
    const { r } = await guvenliGetir("https://" + x.alan, 7000, { "User-Agent": "Mozilla/5.0 (NorevoDenetim)" });
    await r.body?.cancel();
    if (r.status >= 500 && r.status !== 503) throw new Error("kapali");
    return x;
  }));
  return denetim.filter((d) => d.status === "fulfilled").map((d) => (d as PromiseFulfilledResult<typeof temiz[number]>).value).slice(0, 6);
}
// Adres istenen semt/şehirde mi? (adres yoksa kabul)
function yerdeMi(adres: unknown, semtKisa: string, sehir: string, turkiye: boolean): boolean {
  if (turkiye || !adres) return true;
  const a = " " + sade(String(adres)) + " ";
  return [semtKisa, sehir].filter(Boolean).some((y) => a.includes(" " + sade(y)));
}
// İşletme adı bir başlıkla/metinle eşleşiyor mu?
// haric: her cevapta zaten geçen kelimeler (şehir, semt, sektör); bunlar ad eşleşmesi sayılmaz
function adGeciyor(metin: string, ad: string, haric?: Set<string>): boolean {
  const m = " " + sade(metin) + " ";
  const c = cekirdek(ad).filter((t) => !haric || !haric.has(t));
  if (c.length === 0) return m.includes(" " + sade(ad) + " ");
  // Tam kelime olarak (sonuna iyelik/yer eki gelebilir: macitlerde, macitlerin)
  const var_ = (t: string) => new RegExp(" " + t + "(da|de|ta|te|in|nin|un|nun|i|u)? ").test(m);
  const bulunan = c.filter(var_).length;
  if (YAYGIN.has(c[0])) {
    // Yaygın kelimeyle başlayan ad: en az iki ayırt edici kelime ya da yanındaki kelimeyle birlikte ("güneş diş") geçmeli
    if (c.length > 1) return var_(c[0]) && bulunan >= Math.max(2, Math.ceil(c.length * 0.5));
    const k = sade(ad).split(" "), i = k.indexOf(c[0]);
    if (k[i + 1]) return m.includes(" " + c[0] + " " + k[i + 1]);
    if (i > 0) return m.includes(" " + k[i - 1] + " " + c[0]);
  }
  // İlk ayırt edici kelime (genelde marka) mutlaka geçmeli; çok kelimeli adlarda en az yarısı
  return var_(c[0]) && (c.length === 1 ? c[0].length >= 3 : bulunan >= Math.ceil(c.length * 0.5));
}

async function serp(params: Record<string, string>, anahtar: string) {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("api_key", anahtar);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("SerpApi: " + (j.error || r.status));
  return j;
}

// Google aramasını işletmenin şehrinden yapılmış gibi yapmak için SerpApi konum adı (ücretsiz uç nokta, arama hakkı harcamaz)
async function serpKonumBul(adlar: string[]): Promise<string> {
  for (const ad of adlar.filter(Boolean)) {
    try {
      const r = await fetch(`https://serpapi.com/locations.json?q=${encodeURIComponent(sade(ad))}&limit=10`, { signal: AbortSignal.timeout(8000) });
      const l = (await r.json()) as Array<{ canonical_name?: string; country_code?: string; target_type?: string }>;
      const tr = (Array.isArray(l) ? l : []).filter((x) => x.country_code === "TR" && x.canonical_name);
      // Şehir, il düzeyinden önce: "Corum,Turkiye" (il) ile "yakınımda" araması Samsun/Ankara sonuçları getirmişti (1 Kasım)
      const sira = (x: { target_type?: string }) => ["neighborhood", "district", "city", "municipality", "province"].findIndex((t) => new RegExp(t, "i").test(String(x.target_type)));
      const iyi = tr.filter((x) => sira(x) >= 0).sort((a, b) => sira(a) - sira(b))[0] || tr[0];
      if (iyi) return String(iyi.canonical_name);
    } catch (e) { console.log("konum bulunamadi", ad, String(e)); }
  }
  return "";
}

let aramaKotasiYok = false; // bir istekte arama kotası yoksa diğer sorularda tekrar denenmez
async function gemini(soru: string, anahtar: string, modeller: string[], jsonMod = false, sicaklik?: number) {
  let sonHata = "";
  for (const model of modeller) {
    // Önce Google arama destekli dene; arama ücretsiz kotada yoksa aramasız sor
    for (const aramali of aramaKotasiYok ? [false] : [true, false]) {
      const t0 = Date.now();
      let r: Response;
      try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": anahtar },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: soru }] }],
          ...(aramali && !jsonMod ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: { temperature: sicaklik ?? (jsonMod ? 0.2 : 0.4), maxOutputTokens: 1500, ...(jsonMod ? { responseMimeType: "application/json" } : {}) },
        }),
        signal: AbortSignal.timeout(jsonMod ? 25000 : 35000),
      });
      } catch (e) { sonHata = `${model}: ${/timed out|abort/i.test(String(e)) ? "zaman aşımı" : "bağlantı hatası"}`; break; }
      const j = await r.json().catch(() => ({}));
      const mesaj = String(j?.error?.message || r.status);
      if (r.status === 404 || r.status === 400 && /not found|not supported/i.test(mesaj)) { sonHata = `${model}: bulunamadı`; break; }
      if (r.status === 429 || r.status === 403) { sonHata = `${model}${aramali ? " (aramalı)" : ""}: kota`; if (aramali) aramaKotasiYok = true; continue; }
      // Model geçici olarak yoğunsa (500/503) sıradaki modeli dene
      if (r.status >= 500) { sonHata = `${model}: yoğun`; break; }
      if (!r.ok) throw new Error("Gemini: " + mesaj);
      const metin = (j?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("").trim();
      console.log("gemini", model, aramali ? "aramali" : "aramasiz", Date.now() - t0, "ms");
      if (!metin) { sonHata = `${model}: boş cevap`; continue; }
      return { model, metin, aramali };
    }
  }
  throw new Error("Gemini: ücretsiz kota yetmedi ya da model bulunamadı (" + sonHata + ")");
}

type Db = ReturnType<typeof createClient>;
type Isl = Record<string, any>;
function anahtarlar() {
  const ortam = Deno.env.toObject();
  const bul = (ad: string) => (ortam[ad] || Object.entries(ortam).find(([k]) => k.trim().toUpperCase() === ad)?.[1] || "").trim();
  return { SERP: bul("SERPAPI_KEY"), GEM: bul("GEMINI_API_KEY"), OAI: bul("OPENAI_API_KEY") };
}

// Google Yapay Zekâ Modu (SerpApi google_ai_mode): bir soru = bir SerpApi araması.
// Konum (SerpApi konum adı) reddedilirse konumsuz tekrar denenir.
async function googleYzSor(q: string, konum: string, anahtar: string) {
  const p: Record<string, string> = { engine: "google_ai_mode", q, hl: "tr", gl: "tr" };
  let j: Record<string, any> | null = null;
  if (konum) { try { j = await serp({ ...p, location: konum }, anahtar); } catch (e) { console.log("konumlu yz modu olmadi", konum, String(e)); } }
  if (!j) j = await serp(p, anahtar);
  const parcalar: string[] = [], isletmeler: string[] = [];
  const gez = (b: Record<string, any>) => {
    if (!b || typeof b !== "object") return;
    if (b.title) parcalar.push(String(b.title));
    if (b.snippet) parcalar.push(String(b.snippet));
    const lr = b.local_result;
    if (lr?.title) { const t = String(lr.title).slice(0, 80); if (!isletmeler.includes(t)) isletmeler.push(t); parcalar.push(t + (lr.address ? " (" + lr.address + ")" : "")); }
    if (Array.isArray(b.list)) b.list.forEach(gez);
  };
  (Array.isArray(j.text_blocks) ? j.text_blocks : []).forEach(gez);
  const md = String(j.reconstructed_markdown || "").trim();
  const metin = ((md || parcalar.join("\n")) + (isletmeler.length ? "\n" + isletmeler.join("\n") : "")).trim();
  const kaynaklar = (Array.isArray(j.references) ? j.references : []).map((r: Record<string, unknown>) => alanAdi(String(r.link || ""))).filter(Boolean) as string[];
  if (!metin) throw new Error("Google Yapay Zekâ Modu: boş cevap");
  return { metin, isletmeler: isletmeler.slice(0, 10), kaynaklar };
}

// ChatGPT: OpenAI Responses API, internette arama açık. Düz metin cevap (adlar adGeciyor ile aranır).
async function chatgptSor(soru: string, sehir: string, anahtar: string) {
  const modeller = [Deno.env.get("OPENAI_MODEL"), "gpt-5-mini", "gpt-4.1-mini"].filter(Boolean) as string[];
  let son = "";
  for (const model of modeller) {
    const govde: Record<string, unknown> = {
      model, input: soru,
      tools: [{ type: "web_search", user_location: { type: "approximate", country: "TR", ...(sehir ? { city: sehir } : {}) } }],
    };
    // OPENAI_EFFORT: ChatGPT uygulaması daha çok düşünüp daha çok site tarıyor; low dışında soru başına süre 75 sn
    const effort = Deno.env.get("OPENAI_EFFORT") || "low";
    if (model.startsWith("gpt-5")) govde.reasoning = { effort };
    let r: Response;
    try {
      r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + anahtar },
        body: JSON.stringify(govde), signal: AbortSignal.timeout(effort === "low" ? 45000 : 75000),
      });
    } catch (e) {
      // Zaman aşımında başka modele geçilmez (toplam süre uzamasın)
      throw new Error(`ChatGPT ${model}: ${/timed out|abort/i.test(String(e)) ? "zaman aşımı" : "bağlantı hatası"}`);
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { son += ` ${model}: ${r.status} ${String(j?.error?.message || "").slice(0, 100)};`; continue; }
    const metin = String(j.output_text || (j.output || []).flatMap((o: { content?: Array<{ text?: string }> }) => o.content || []).map((c: { text?: string }) => c.text || "").join("\n")).trim();
    if (metin) return { model, metin };
    son += ` ${model}: boş;`;
  }
  throw new Error("ChatGPT:" + son);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ hata: "Sadece POST" }, 405);

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { SERP, GEM } = anahtarlar();

  // Haftalık otomatik ölçüm: veritabanındaki zamanlanmış iş çağırır
  const cronAnahtar = req.headers.get("x-gorunur-cron");
  if (cronAnahtar) {
    const { data: ayar } = await db.from("cron_ayar").select("deger").eq("ad", "olcum_anahtari").maybeSingle();
    if (!ayar || ayar.deger !== cronAnahtar) return json({ hata: "Yetkisiz" }, 401);
    // Deneme modu (denetçi ajan için): verilen işletme türleri için seçilecek aramaları döndürür.
    // SerpApi harcamaz (Google önerileri kullanılmaz), sadece yapay zekâ profili ve kurallar denenir.
    const govde = await req.json().catch(() => ({}));
    if (Array.isArray(govde?.deneme)) {
      const modellerP = GEMINI_MODELLER();
      const sonuc = [];
      for (const d of govde.deneme.slice(0, 12)) {
        const parca = String(d.semt || "").split(/[,/]/).map((x: string) => x.trim()).filter(Boolean);
        const turkiye = d.semt === "Türkiye geneli";
        const yer = turkiye ? "" : (parca[0] || "").toLocaleLowerCase("tr");
        const sehir = parca[1] && sade(parca[1]) !== sade(parca[0]) ? parca[1].toLocaleLowerCase("tr") : "";
        const isK = temizArama(d.is_turu);
        const profil = GEM ? await sektorProfili(isK, turkiye ? "" : parca[0], GEM, modellerP) : null;
        const secim = aramalariSec({ yer, sehir, turkiye, isK, profil, oneriler: [], elle: [], konumVar: !turkiye });
        sonuc.push({ is_turu: d.is_turu, semt: d.semt, profil, aramalar: secim.liste, denetim: secim.denetim });
      }
      return json({ deneme: sonuc });
    }
    // Nöbet: son turu ve SerpApi kalan arama sayısını kaydet (hesap sorgusu arama hakkı harcamaz)
    await db.from("cron_ayar").upsert({ ad: "nobet_son_tur", deger: new Date().toISOString() });
    if (SERP) {
      try {
        const r = await fetch(`https://serpapi.com/account.json?api_key=${SERP}`, { signal: AbortSignal.timeout(10000) });
        const a = await r.json();
        if (r.ok) await db.from("cron_ayar").upsert({ ad: "serpapi_durum", deger: JSON.stringify({ kalan: a.total_searches_left ?? a.plan_searches_left, bu_ay: a.this_month_usage, aylik: a.searches_per_month, plan: a.plan_name, zaman: new Date().toISOString() }) });
      } catch (e) { console.log("serpapi hesap bilgisi alinamadi", String(e)); }
    }
    if (!SERP && !GEM) return json({ hata: "Anahtar yok" }, 503);
    await takiliTemizle(db);
    const sinir = new Date(Date.now() - 6.5 * 864e5).toISOString();
    const { data: isletmeler } = await db.from("isletmeler").select("*").eq("kurulum_bitti", true).eq("haftalik_olcum", true);
    const sirada: Isl[] = [];
    for (const isl of isletmeler || []) {
      // Hatalı ölçüm sırayı bekletmez; süren ölçüm (takılı olanlar yukarıda temizlendi) ikinci kez başlatılmaz
      const { data: son } = await db.from("olcumler").select("baslangic").eq("isletme_id", isl.id).in("durum", ["bitti", "suruyor"]).order("baslangic", { ascending: false }).limit(1).maybeSingle();
      if (!son || son.baslangic < sinir) sirada.push(isl);
      if (sirada.length >= 1) break; // bir çağrıda tek işletme (süre sınırı); zamanlanmış iş saatte bir çalışır
    }
    // Arka planda sırayla ölç, isteğe hemen cevap ver
    // @ts-ignore EdgeRuntime Supabase ortamında var
    EdgeRuntime.waitUntil((async () => {
      for (const isl of sirada) {
        try {
          const r = await olcumYap(db, isl, SERP, GEM, "haftalik");
          if (r.butceYok) { console.log("haftalik olcum atlandi: SerpApi butcesi doldu", r.butceYok, isl.id); break; }
          // Haftalık özet e-postası (sahibin tercihine göre eposta fonksiyonu karar verir; gönderilemezse ölçüm etkilenmez)
          const sonId = (r.son as { id?: string } | undefined)?.id;
          if (sonId && !r.hepsiHata) {
            const e = await fetch(`${URL_}/functions/v1/eposta`, { method: "POST", headers: { "Content-Type": "application/json", "x-gorunur-cron": cronAnahtar }, body: JSON.stringify({ tur: "haftalik", olcum_id: sonId }), signal: AbortSignal.timeout(30000) }).catch((x) => ({ status: 0, text: () => Promise.resolve(String(x)) }));
            if (e.status !== 200) console.log("haftalik ozet gonderilemedi", isl.id, e.status, (await e.text()).slice(0, 200));
          }
        } catch (e) { console.log("haftalik olcum hatasi", isl.id, String(e)); }
      }
    })());
    return json({ sirada: sirada.length }, 202);
  }

  // Kullanıcının kendi başlattığı ölçüm
  const auth = req.headers.get("Authorization") || "";
  const kullaniciDb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await kullaniciDb.auth.getUser();
  if (!u?.user) return json({ hata: "Giriş yapmanız gerekiyor." }, 401);

  const { data: isl } = await db.from("isletmeler").select("*").eq("sahip", u.user.id).maybeSingle();
  if (!isl || !isl.kurulum_bitti) return json({ hata: "Önce kurulumu tamamlayın." }, 400);

  if (!SERP && !GEM) return json({ hata: "Ölçüm anahtarları henüz eklenmedi: SERPAPI_KEY, GEMINI_API_KEY" }, 503);

  await takiliTemizle(db, u.user.id);
  // Ölçüm kaydı önce eklenir, sonra sayılır: aynı anda gelen istekler birbirini görür (yarış durumu yok).
  const { data: kayit, error: kayitHata } = await db.from("olcumler").insert({ isletme_id: isl.id, sahip: isl.sahip, durum: "suruyor", kaynak: "elle" }).select("id").single();
  if (kayitHata || !kayit) return json({ hata: "Ölçüm başlatılamadı. Birazdan tekrar deneyin." }, 500);
  const kayitSil = () => db.from("olcumler").delete().eq("id", kayit.id);

  // Aylık ölçüm hakkı, Türkiye takvim ayı (otomatik haftalık ölçümler sayılmaz; süren ölçümler dahil). Yöneticiler (deneme için) sınırsız.
  // Günlük sınır her gün kullanılınca ayda ~3.400 TL SerpApi maliyeti çıkarıyordu (raporlar/2026-11-01-maliyet-kar.md).
  const { data: ymt } = await db.from("yoneticiler").select("eposta").eq("eposta", String(u.user.email || "").toLowerCase()).maybeSingle();
  if (!ymt) {
    const hak = parseInt(Deno.env.get("AYLIK_OLCUM_HAKKI") || "8", 10);
    // Hatalı biten ölçümler ve "Yanlış mı?" ile iade edilenler (yardimci) hakka sayılmaz
    const { count } = await db.from("olcumler").select("id", { count: "exact", head: true })
      .eq("sahip", u.user.id).eq("kaynak", "elle").neq("durum", "hata").eq("hak_iade", false).gte("baslangic", ayBasiTR());
    if ((count || 0) > hak) { await kayitSil(); return json({ hata: `Bu ayki ölçüm hakkınız (${hak}) doldu. Haftalık otomatik ölçüm devam ediyor; hakkınız ayın 1'inde yenilenir.` }, 429); }
  }

  // Bütçe hemen kontrol edilir ki kullanıcı "kapasite doldu" cevabını beklemeden alsın
  const butce = await serpButce(db, SERP, !!ymt);
  if (butce === "aylik") { await kayitSil(); return json({ hata: "Bu ayki ölçüm kapasitemiz doldu, ölçümler ay başında devam edecek." }, 503); }
  if (butce) { await kayitSil(); return json({ hata: "Bugün çok yoğunuz, günlük ölçüm kapasitemiz doldu. Yarın tekrar deneyin." }, 503); }

  // Ölçüm 1-3 dakika sürer (istek süre sınırı 150 sn): arka planda ölç, panel kaydın durumunu sorgular
  // @ts-ignore EdgeRuntime Supabase ortamında var
  EdgeRuntime.waitUntil((async () => {
    try { await olcumYap(db, isl, SERP, GEM, "elle", kayit.id, true); }
    catch (e) {
      console.log("elle olcum hatasi", isl.id, String(e));
      await db.from("olcumler").update({ durum: "hata", hatalar: [String(e).slice(0, 200)], bitis: new Date().toISOString() }).eq("id", kayit.id);
    }
  })());
  return json({ kayit: kayit.id }, 202);
});

// 10 dakikada bitmeyen ölçüm takılmıştır (süre sınırında kesilmiş): "hata" yap ki hakka ve sıraya sayılmasın
async function takiliTemizle(db: Db, sahip?: string) {
  let q = db.from("olcumler").update({ durum: "hata", hatalar: ["Ölçüm 10 dakikada bitmedi"] })
    .eq("durum", "suruyor").lt("baslangic", new Date(Date.now() - 10 * 6e4).toISOString());
  if (sahip) q = q.eq("sahip", sahip);
  const { error } = await q;
  if (error) console.log("takili olcum temizlenemedi", error.message);
}

// Sistem geneli SerpApi bütçesi: günlük ve aylık (bir ölçüm yaklaşık 20 arama). Yer ayırır; doluysa hangisinin dolduğunu döner.
// Yönetici (deneme ölçümü) günlük bütçeden muaf; aylık bütçe herkese uygulanır
async function serpButce(db: Db, SERP: string, gunlukMuaf = false): Promise<"gunluk" | "aylik" | null> {
  if (!SERP) return null;
  const tahmin = parseInt(Deno.env.get("OLCUM_SERP_TAHMIN") || "20", 10) || 20;
  const sinir = gunlukMuaf ? 1e6 : parseInt(Deno.env.get("SERP_GUNLUK_SINIR") || "25", 10) || 25;
  const aylik = parseInt(Deno.env.get("SERPAPI_AYLIK_SINIR") || "230", 10) || 230;
  const { data: izin, error } = await db.rpc("serp_harca", { adet: tahmin, sinir, p_aylik: aylik });
  if (error) console.log("serp_harca hata", error.message);
  if (izin === true) return null;
  const { data: ayN } = await db.rpc("serp_aylik_kullanim");
  return (Number(ayN) || 0) + tahmin > aylik ? "aylik" : "gunluk";
}

async function olcumYap(db: Db, isl: Isl, SERP: string, GEM: string, kaynak: "elle" | "haftalik", kayitId?: string, butceAlindi = false): Promise<{ son?: unknown; hepsiHata?: boolean; butceYok?: "gunluk" | "aylik" }> {
  const t0 = Date.now();
  // Ölçüm kaydı her dış çağrıdan (Google önerileri, konum, yapay zekâ) önce
  let kayit: { id: string } | null = kayitId ? { id: kayitId } : null;
  if (!kayit) {
    const { data } = await db.from("olcumler").insert({ isletme_id: isl.id, sahip: isl.sahip, durum: "suruyor", kaynak }).select("id").single();
    kayit = data as { id: string } | null;
    if (!kayit) throw new Error("olcum kaydi eklenemedi");
  }
  // Sunucu işi yine de keserse panel dakikalarca "ölçülüyor"da kalmasın: kayıt hemen "hata" olur (hakka sayılmaz)
  const kayitId2 = kayit.id;
  addEventListener("beforeunload", () => {
    db.from("olcumler").update({ durum: "hata", hatalar: ["Ölçüm sunucu tarafında yarıda kesildi"], bitis: new Date().toISOString() })
      .eq("id", kayitId2).eq("durum", "suruyor").then(() => {}, () => {});
  });
  if (!butceAlindi) {
    const butceYok = await serpButce(db, SERP);
    if (butceYok) {
      if (!kayitId) await db.from("olcumler").delete().eq("id", kayit.id);
      return { butceYok };
    }
  }
  const eksik = [!SERP && "SERPAPI_KEY", !GEM && "GEMINI_API_KEY"].filter(Boolean) as string[];
  const parca = String(isl.semt || "").split(/[,/]/).map((x) => x.trim()).filter(Boolean);
  const semtKisa = parca[0] || "";
  const sehir = parca[1] && sade(parca[1]) !== sade(parca[0]) ? parca[1] : "";
  const turkiye = isl.semt === "Türkiye geneli";
  const isK = temizArama(isl.is_turu)
    .split(" ").filter((t) => !turkiye && [semtKisa, sehir].some((y) => y && sade(y) === sade(t)) ? false : true).join(" ") || temizArama(isl.is_turu);
  const yerK = turkiye ? "" : semtKisa.toLocaleLowerCase("tr");
  const sehirK = sehir.toLocaleLowerCase("tr");
  const elle = ((isl.anahtar_kelimeler || []) as string[]).map(temizArama).filter((k) => k.length >= 2).slice(0, 3);
  const modellerP = GEMINI_MODELLER();
  // Yer veya iş türü değiştiyse eski öneriler, profil ve konum çöpe
  const kaynakImza = sade(String(isl.semt || "") + "|" + String(isl.is_turu || ""));
  const degisti = isl.kelime_kaynak !== kaynakImza;
  const guncelle: Record<string, unknown> = {};
  if (degisti) { guncelle.kelime_kaynak = kaynakImza; if (isl.kelime_kaynak) { isl.serp_konum = null; } }
  // Sektör profili (yapay zekâ): 30 günde bir
  let profil = (degisti ? null : isl.sektor_profili) as Profil | null;
  // Eski profillerde Türkçe iş adı (ad) yok ya da işletme adı değişmiş olabilir: o zaman da yenilenir
  if (GEM && (!profil || !profil.ad || profil.isim !== isl.ad || !isl.sektor_profili_tarih || Date.now() - new Date(isl.sektor_profili_tarih).getTime() > 30 * 864e5)) {
    const p = await sektorProfili(isK, turkiye ? "" : semtKisa, GEM, modellerP, String(isl.ad || ""));
    if (p) { profil = p; guncelle.sektor_profili = p; guncelle.sektor_profili_tarih = new Date().toISOString(); }
  }
  const temelIfade = profil?.temel || cekirdekIs(isK);
  // Google önerileri: 30 günde bir (3 tohum: "çorum mobilya", "mobilya çorum", "istanbul veteriner")
  let oneriler = (degisti ? [] : (isl.oto_kelimeler || [])) as string[];
  const eskiO = degisti || !isl.oto_kelimeler_tarih || Date.now() - new Date(isl.oto_kelimeler_tarih).getTime() > 30 * 864e5 || !oneriler.length;
  if (SERP && eskiO) {
    try {
      const tohum = turkiye ? [temelIfade] : [`${yerK} ${temelIfade}`, `${temelIfade} ${yerK}`, ...(sehirK ? [`${sehirK} ${temelIfade}`] : [])];
      const yeni = await googleOnerileri(tohum, SERP);
      if (yeni.length) { oneriler = yeni.slice(0, 30); guncelle.oto_kelimeler = oneriler; guncelle.oto_kelimeler_tarih = new Date().toISOString(); }
    } catch (e) { console.log("google onerileri alinamadi", String(e)); }
  }
  // Önerilerdeki kişi/işletme adlarını ayıkla (öneri listesi değişince bir kez; sonuç profile yazılır)
  const ozelImza = sade(oneriler.join("|")).slice(0, 2000);
  if (GEM && profil && oneriler.length && profil.ozel_imza !== ozelImza) {
    const ozel = await ozelAdlariBul(oneriler, GEM, modellerP);
    if (ozel) { profil = { ...profil, ozel_adlar: ozel, ozel_imza: ozelImza }; guncelle.sektor_profili = profil; }
  }
  // Aramanın yapılacağı konum (bir kez bulunur, işletmeye kaydedilir)
  let konum = turkiye ? "" : (isl.serp_konum || "");
  // İl düzeyinde kayıtlı eski konum ("Corum,Turkiye", 2 parça) şehir düzeyine yükseltilir (konum araması ücretsiz)
  const ilDuzeyi = !!isl.serp_konum && String(isl.serp_konum).split(",").length < 3;
  if (!turkiye && (!isl.serp_konum || ilDuzeyi) && SERP) {
    const yeni = await serpKonumBul([semtKisa, sehir]);
    if (yeni) { konum = yeni; if (yeni !== isl.serp_konum) guncelle.serp_konum = yeni; }
  }
  if (Object.keys(guncelle).length) await db.from("isletmeler").update(guncelle).eq("id", isl.id);
  // 10 arama seç ve denetle
  const secim = aramalariSec({ yer: yerK, sehir: sehirK, turkiye, isK, profil, oneriler, elle, konumVar: !!konum });
  const adaylar = secim.liste;
  const kelimeler = adaylar.map((a) => a.kelime);
  const denetim = [...secim.denetim];
  const siteAlan = alanAdi(isl.site);
  // Ad eşleşmesinde sayılmayacak kelimeler: sadece yer ve sektör (öneri artıkları değil)
  const haric = new Set(sade([semtKisa, sehir, isK, temelIfade, ...(profil?.esler || [])].join(" ")).split(" ").filter((t) => t.length >= 3));
  // Kendi adımızla eşleşmiyorsa (ör. ad sadece yer+sektörden oluşuyorsa) hariç listesi kullanılmaz
  const adHaric = adGeciyor(isl.ad, isl.ad, haric) ? haric : undefined;
  if (!adHaric) denetim.push({ kod: "ad-eslesmiyor", mesaj: `"${isl.ad}" adı sadece yer/sektör kelimelerinden oluşuyor; eşleştirme site adresine göre yapılacak` });

  const hatalar: string[] = eksik.map((e) => `${e} eksik`);
  const s: Record<string, unknown> = {};
  type Satir = { sira: number; ad: unknown; puan: unknown; yorum: unknown; adres: unknown; site: unknown; tur: unknown; place_id: unknown; siz?: boolean };
  const kelimeSonuc: Array<Record<string, unknown>> = adaylar.map((a) => ({ kelime: a.kelime, kaynak: a.kaynak, populer: !!a.populer }));
  const benMi = (r: Satir) => ((siteAlan && alanAdi(String(r.site || "")) === siteAlan) || adGeciyor(String(r.ad || ""), isl.ad, adHaric)) && yerdeMi(r.adres, semtKisa, sehir, turkiye);

  // 1) Google Haritalar: ilk 5 aramada ("yakınımda" hariç; haritalar konumsuz onu anlamaz)
  const HARITA_SAYI = Number(Deno.env.get("HARITA_ARAMA") || "5");
  const haritaIdx = adaylar.map((a, i) => a.kaynak === "yakin" ? -1 : i).filter((i) => i >= 0).slice(0, HARITA_SAYI);
  const haritaListeleri: Satir[][] = [];
  const harita = async () => {
    if (!SERP) return;
    const sonuc = await Promise.allSettled(haritaIdx.map((i) => serp({ engine: "google_maps", type: "search", q: kelimeler[i], hl: "tr" }, SERP)));
    sonuc.forEach((r, n) => {
      const i = haritaIdx[n];
      if (r.status === "rejected") { kelimeSonuc[i].harita_hata = true; hatalar.push(`Haritalar (${kelimeler[i]}): ` + String(r.reason?.message || r.reason).slice(0, 120)); return; }
      const lr = (r.value.local_results || []) as Array<Record<string, unknown>>;
      const liste: Satir[] = lr.slice(0, 20).map((x, j) => ({
        sira: (x.position as number) || j + 1, ad: x.title, puan: x.rating ?? null, yorum: x.reviews ?? null,
        adres: x.address ?? null, site: x.website ?? null, tur: x.type ?? null, place_id: x.place_id ?? null,
      }));
      haritaListeleri[i] = liste;
      const ben = liste.find(benMi);
      kelimeSonuc[i].harita_sira = ben ? ben.sira : null;
      kelimeSonuc[i].harita_bakilan = liste.length;
      const digerleri = liste.filter((x) => x !== ben);
      kelimeSonuc[i].harita_ilk3 = digerleri.slice(0, 3).map((x) => x.ad);
      // Panelde sıralama listesi: ilk 5, işletme 5'ten aşağıdaysa kendi satırı da
      kelimeSonuc[i].harita_liste = [...liste.slice(0, 5), ...(ben && !liste.slice(0, 5).includes(ben) ? [ben] : [])]
        .map((x) => ({ sira: x.sira, ad: x.ad, puan: x.puan, yorum: x.yorum, siz: x === ben }));
      const bir = digerleri[0];
      if (bir) kelimeSonuc[i].harita_birinci = { ad: bir.ad, puan: bir.puan, yorum: bir.yorum, sira: bir.sira };
      // Denetim: adımız rakip bir işletmeyle karışıyor mu?
      const karisan = ben ? digerleri.filter((x) => adGeciyor(String(x.ad || ""), isl.ad, adHaric) && yerdeMi(x.adres, semtKisa, sehir, turkiye)) : [];
      if (karisan.length && !denetim.some((d) => d.kod === "ad-karisiyor")) denetim.push({ kod: "ad-karisiyor", mesaj: `Ad, başka işletmelerle de eşleşiyor: ${karisan.slice(0, 2).map((x) => x.ad).join(", ")}` });
    });
    // Ana gösterim ve rakip karşılaştırması: temel arama (listenin başı), ölçülemediyse sıradaki.
    // En iyi sıradaki arama seçiliyordu: 4KDent başlıkta "zirkonyum kaplama"da 1. görünüyor, asıl aramada 3.'ydü (2 Kasım)
    const ana = haritaListeleri.findIndex((l) => l);
    if (ana < 0) return;
    const liste = haritaListeleri[ana], ben = liste.find(benMi);
    s.harita_sorgu = kelimeler[ana];
    s.harita_sira = ben ? ben.sira : null;
    s.harita_sonuclar = liste.slice(0, 10).map((r) => ({ ...r, siz: r === ben }));
    s.rakipler = liste.filter((r) => r !== ben).slice(0, 5);
    if (ben) {
      s.isletme_bilgi = { ad: ben.ad, puan: ben.puan, yorum: ben.yorum, adres: ben.adres, tur: ben.tur, bulundu: true };
    } else {
      // Hiçbir aramada çıkmadıysa işletmeyi adıyla bulmayı dene (profil var mı?)
      const j2 = await serp({ engine: "google_maps", type: "search", q: `${isl.ad} ${turkiye ? "" : semtKisa}`.trim(), hl: "tr" }, SERP);
      const bulunan = [...(j2.local_results || []), ...(j2.place_results ? [j2.place_results] : [])] as Array<Record<string, unknown>>;
      const ayni = bulunan.filter((r) => (siteAlan && alanAdi(String(r.website || "")) === siteAlan) || adGeciyor(String(r.title || ""), isl.ad, adHaric));
      const b = ayni.find((r) => yerdeMi(r.address, semtKisa, sehir, turkiye));
      const baska = !b && ayni[0];
      s.isletme_bilgi = b
        ? { ad: b.title, puan: b.rating ?? null, yorum: b.reviews ?? null, adres: b.address ?? null, tur: b.type ?? null, bulundu: true }
        : { bulundu: false, baska_sube: baska ? { ad: baska.title, adres: baska.address ?? null, puan: baska.rating ?? null, yorum: baska.reviews ?? null } : null };
    }
  };

  const rehberSayfalari: Array<{ baslik: string; alan: string; kelime: string; sira: number; tur: string }> = [];
  // 2) Google arama: 10 aramanın hepsi (normal sonuçlar + üstteki harita kutusu)
  const ara = async (q: string) => {
    const p: Record<string, string> = { engine: "google", q, hl: "tr", gl: "tr", google_domain: "google.com.tr" };
    if (konum) { try { return await serp({ ...p, location: konum }, SERP); } catch (e) { console.log("konumlu arama olmadi", konum, String(e)); } }
    return serp(p, SERP);
  };
  const arama = async () => {
    if (!SERP) return;
    const sonuc = await Promise.allSettled(kelimeler.map(ara));
    let enIyi: Record<string, unknown> | null = null;
    sonuc.forEach((r, i) => {
      if (r.status === "rejected") { kelimeSonuc[i].arama_hata = true; hatalar.push(`Google arama (${kelimeler[i]}): ` + String(r.reason?.message || r.reason).slice(0, 120)); return; }
      const j = r.value;
      const org = ((j.organic_results || []) as Array<Record<string, unknown>>).map((x, n) => ({
        sira: (x.position as number) || n + 1, baslik: x.title,
        link: /^https?:/.test(String(x.link || "")) ? x.link : (x.redirect_link && /^https?:/.test(String(x.redirect_link)) && !/google\./.test(String(x.redirect_link)) ? x.redirect_link : null),
        gorunen: String(x.displayed_link || x.source || "").split(" ")[0],
      }));
      // Bağlantı yoksa ekranda görünen adresin sadece ilk parçası alınır; içinde gerçek bir alan adı yoksa boş kalır ("1,2" ya da "com.com.tr" gibi)
      const alanOf = (x: { link: unknown; gorunen: string }) => {
        if (x.link) return alanAdi(String(x.link));
        const ilk = String(x.gorunen || "").trim().split(/[\s›>]+/)[0] || "";
        const a = alanAdi(ilk);
        return /^[a-z0-9-]{2,}(\.[a-z0-9-]{2,})+$/i.test(a) && !/^(com|net|org|gov|edu)\./i.test(a) ? a : "";
      };
      // Önce site adresiyle; ad eşleşmesi rehber sitelerinde sayılmaz
      const ben = org.find((x) => siteAlan && alanOf(x) === siteAlan) || org.find((x) => !rehberTuru(String(x.baslik || ""), alanOf(x)) && adGeciyor(String(x.baslik || ""), isl.ad, adHaric));
      const yerel = (((j.local_results || {}) as Record<string, unknown>).places || []) as Array<Record<string, unknown>>;
      const yerelBen = yerel.findIndex((p) => adGeciyor(String(p.title || ""), isl.ad, adHaric));
      const rehberler: Array<Record<string, unknown>> = [];
      for (const x of org) {
        const alan = alanOf(x);
        const tur = x !== ben ? rehberTuru(String(x.baslik || ""), alan) : null;
        if (tur === "rehber" && alan !== siteAlan && rehberler.length < 4) rehberler.push({ baslik: x.baslik, alan, sira: x.sira, link: x.link });
        if (tur && alan !== siteAlan && !rehberSayfalari.some((y) => y.alan === alan))
          rehberSayfalari.push({ baslik: String(x.baslik || ""), alan, kelime: kelimeler[i], sira: x.sira as number, tur });
      }
      kelimeSonuc[i].arama_sira = ben ? ben.sira : null;
      kelimeSonuc[i].arama_link = ben ? ben.link || null : null;
      kelimeSonuc[i].yerel_kutuda = yerelBen >= 0 ? yerelBen + 1 : null;
      kelimeSonuc[i].yerel_kutu = yerel.slice(0, 3).map((p) => p.title);
      kelimeSonuc[i].arama_ilk3 = org.slice(0, 3).map((x) => ({ sira: x.sira, baslik: x.baslik, alan: alanOf(x), tur: rehberTuru(String(x.baslik || ""), alanOf(x)), siz: x === ben }));
      kelimeSonuc[i].rehberler = rehberler;
      kelimeSonuc[i].arama_liste = [...org.slice(0, 5), ...(ben && !org.slice(0, 5).includes(ben) ? [ben] : [])]
        .map((x) => ({ sira: x.sira, baslik: x.baslik, alan: alanOf(x), siz: x === ben }));
      const ozet = { kelime: kelimeler[i], sira: ben ? ben.sira : null, organik: org.slice(0, 10).map((x) => ({ ...x, siz: x === ben })), yerel_kutu: yerel.slice(0, 3).map((p) => p.title), yerel_kutuda: yerelBen >= 0 ? yerelBen + 1 : null };
      if (!enIyi || (ozet.sira && (!enIyi.sira || ozet.sira < (enIyi.sira as number)))) enIyi = ozet;
    });
    if (enIyi) {
      const e = enIyi as Record<string, unknown>;
      s.arama_sorgu = e.kelime; s.arama_sira = e.sira;
      s.arama_sonuclar = { organik: e.organik, yerel_kutu: e.yerel_kutu, yerel_kutuda: e.yerel_kutuda, konum: konum || null, bakilan: kelimeler };
    }
    // Denetim: sitesi var ama 10 aramanın hiçbirinde çıkmıyorsa, adıyla aratıp sitenin Google'da olup olmadığına bak
    const olculen = kelimeSonuc.filter((k) => "arama_sira" in k);
    if (siteAlan && olculen.length && !olculen.some((k) => k.arama_sira)) {
      try {
        const j = await ara(`${isl.ad} ${turkiye ? "" : yerK}`.trim());
        const org = (j.organic_results || []) as Array<Record<string, unknown>>;
        const bul = org.findIndex((x) => alanAdi(String(x.link || "")) === siteAlan || alanAdi(String(x.displayed_link || "").split(" ")[0]) === siteAlan);
        s.marka_arama = { kelime: `${isl.ad} ${yerK}`.trim(), sira: bul >= 0 ? bul + 1 : null };
        if (bul < 0) denetim.push({ kod: "site-gorunmuyor", mesaj: `Site (${siteAlan}) işletme adıyla aratınca bile ilk 10'da çıkmadı` });
      } catch (e) { console.log("marka aramasi olmadi", String(e)); }
    }
  };

  // 3) Yapay zekâ: 6 müşteri sorusu, her biri 3 kez (yapay zekâ her seferinde farklı cevap verebilir).
  //    Sonuç bir orandır: her 100 cevabın kaçında adınız geçiyor.
  // Müşteri soruları (tüm yapay zekâ motorları aynı listeden sorar; az soran motorlar baştakileri alır)
  const yzYer = turkiye ? "Türkiye'de" : `${semtKisa}${sehir ? ", " + sehir : ""} bölgesinde`;
  // Sorularda işletmenin yazdığı tür değil, müşterinin kullanacağı Türkçe ad ("dentist" -> "diş hekimi")
  const soruAdi = profil?.ad || isK;
  const sablon = [
    `${yzYer} iyi bir ${soruAdi} önerir misin?`,
    `${yzYer} en çok tavsiye edilen ${soruAdi} hangileri?`,
    `${yzYer} ${soruAdi} arıyorum, güvenilir bir yer söyler misin?`,
    `${yzYer} kaliteli ${temelIfade} için hangi işletmeyi önerirsin?`,
  ];
  const kelimeSorulari = kelimeler.map((k) => `"${k}" diye arıyorum. Hangi işletmeleri önerirsin?`);
  // Şablon ve arama kelimelerini karıştır: 3 şablon + kelimeler, sonra kalan şablonlar
  const tumSorular = tekillestir([...sablon.slice(0, 3), ...kelimeSorulari.slice(0, 3), ...sablon.slice(3), ...kelimeSorulari.slice(3)]);
  // Sayı sınırı yok: gerçek kullanıcıya ChatGPT 8-10 işletme sayıyor; "3-5 işletme" deyince 4KDent listeden düşüyordu (1 Kasım)
  const KISA = " Her işletme için tek cümle yeter.";
  // Site adresi kaynaklarda/metinde geçiyorsa da "geçiyor" sayılır (Google Yapay Zekâ Modu ve ChatGPT kaynak gösterir)
  const siteGeciyor = (metin: string, kaynaklar: string[] = []) => !!siteAlan && (kaynaklar.includes(siteAlan) || metin.toLowerCase().includes(siteAlan));
  let yzMetinleri: string[] = [];

  const yz = async () => {
    if (!GEM) return;
    // Ücretsiz planda Google arama aracı yok; GEMINI_ARAMALI=1 ise (ücretli plan) aramalı sorar
    aramaKotasiYok = (Deno.env.get("GEMINI_ARAMALI") || "") !== "1";
    const TEKRAR = Math.min(5, Math.max(1, Number(Deno.env.get("YZ_TEKRAR") || "3")));
    const SORU_SAYISI = Math.min(10, Math.max(3, Number(Deno.env.get("YZ_SORU") || "6")));
    const sorular = tumSorular.slice(0, SORU_SAYISI);
    const modeller = GEMINI_MODELLER();
    const isler: Array<{ soru: string; tekrar: number }> = [];
    for (let t = 1; t <= TEKRAR; t++) for (const soru of sorular) isler.push({ soru, tekrar: t });
    const cevaplar: Array<Record<string, unknown>> = new Array(isler.length);
    const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // Dakikalık sınıra takılmamak için aynı anda en fazla 3 istek; kota dolarsa 20 sn bekleyip bir kez daha dene
    let sira = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (sira < isler.length) {
        const n = sira++, { soru, tekrar } = isler[n];
        for (let deneme = 0; deneme < 2; deneme++) {
          try {
            // Gerçek kullanıcılar gibi her seferinde biraz farklı cevap alabilmek için sıcaklık 1
            const { model, metin, aramali } = await gemini(soru + KISA, GEM, modeller, false, 1);
            cevaplar[n] = { soru, tekrar, model, aramali, geciyor: adGeciyor(metin, isl.ad, adHaric), ozet: metin.slice(0, 1000) };
            break;
          } catch (e) {
            const m = String((e as Error).message);
            cevaplar[n] = { soru, tekrar, hata: /timed out|aborted|zaman aşımı/i.test(m) ? "Yapay zekâ zamanında cevap vermedi." : m.slice(0, 200) };
            if (deneme === 0 && /: kota\)$/.test(m)) await bekle(20000); else break;
          }
        }
      }
    }));
    // İkinci tur yok: dakikalık sınırın sıfırlanmasını beklemek (61 sn) ölçümü arka plan süre sınırının dışına taşıyordu
    const basarili = cevaplar.filter((c) => c && !("hata" in c));
    s.yz_soru_sayisi = basarili.length;
    s.yz_gecen = basarili.filter((c) => (c as { geciyor: boolean }).geciyor).length;
    s.yz_cevaplar = cevaplar;
    const hataliYz = cevaplar.filter((c) => c && "hata" in c);
    // Birkaç cevabın eksik olması ölçümü bozmaz; yarıdan fazlası eksikse uyar
    if (hataliYz.length && hataliYz.length * 2 >= cevaplar.length) hatalar.push(`Yapay zekâ: ${cevaplar.length} cevaptan ${hataliYz.length} tanesi alınamadı (${String(hataliYz[0].hata).slice(0, 140)})`);
    else if (hataliYz.length) console.log("yz eksik cevap", hataliYz.length, String(hataliYz[0].hata).slice(0, 140));
    yzMetinleri.push(...basarili.map((c) => String((c as { ozet: string }).ozet || "")));
  };

  // 3b) Google Yapay Zekâ Modu (SerpApi): GOOGLE_YZ_SORU soru (varsayılan 2), tekrar yok. Her soru 1 SerpApi araması.
  const googleYz = async () => {
    if (!SERP) return;
    const SAYI = Math.min(4, Math.max(1, Number(Deno.env.get("GOOGLE_YZ_SORU") || "2")));
    const sorular = tumSorular.slice(0, SAYI);
    const sonuc = await Promise.allSettled(sorular.map((soru) => googleYzSor(soru, konum, SERP)));
    const cevaplar: Array<Record<string, unknown>> = sonuc.map((r, n) => {
      const soru = sorular[n];
      if (r.status === "rejected") return { soru, tekrar: 1, hata: String(r.reason?.message || r.reason).slice(0, 200) };
      const { metin, isletmeler, kaynaklar } = r.value;
      const geciyor = adGeciyor(metin, isl.ad, adHaric) || isletmeler.some((t) => adGeciyor(t, isl.ad, adHaric)) || siteGeciyor(metin, kaynaklar);
      return { soru, tekrar: 1, model: "google-ai-mode", aramali: true, geciyor, ozet: metin.slice(0, 1000), isletmeler, kaynaklar: [...new Set(kaynaklar)].slice(0, 10), _metin: metin };
    });
    const basarili = cevaplar.filter((c) => !("hata" in c));
    s.gyz_soru_sayisi = basarili.length;
    s.gyz_gecen = basarili.filter((c) => c.geciyor).length;
    yzMetinleri.push(...basarili.map((c) => String(c._metin || "")));
    s.gyz_cevaplar = cevaplar.map(({ _metin, ...c }) => c);
    const hatali = cevaplar.filter((c) => "hata" in c);
    if (hatali.length) hatalar.push(`Google Yapay Zekâ Modu: ${cevaplar.length} sorudan ${hatali.length} tanesi alınamadı (${String(hatali[0].hata).slice(0, 140)})`);
  };

  // 3c) ChatGPT (OpenAI, internette arama açık): CHATGPT_SORU soru (varsayılan 3) x CHATGPT_TEKRAR (varsayılan 1), aynı anda 2 istek.
  //     OPENAI_API_KEY yoksa sessizce atlanır.
  const chatgptYz = async () => {
    const { OAI } = anahtarlar();
    if (!OAI) return;
    const SAYI = Math.min(6, Math.max(1, Number(Deno.env.get("CHATGPT_SORU") || "3")));
    const TEKRAR = Math.min(3, Math.max(1, Number(Deno.env.get("CHATGPT_TEKRAR") || "1")));
    const sorular = tumSorular.slice(0, SAYI);
    const cgSehir = turkiye ? "" : (sehir || semtKisa);
    const isler: Array<{ soru: string; tekrar: number }> = [];
    for (let t = 1; t <= TEKRAR; t++) for (const soru of sorular) isler.push({ soru, tekrar: t });
    const cevaplar: Array<Record<string, unknown>> = new Array(isler.length);
    const metinler: string[] = [];
    // Süre sınırı: 100 sn sonra yeni soru başlatılmaz (Edge Function süresi aşılmasın)
    const bitis = Date.now() + 70000;
    let sira = 0;
    // Her cevap gelince kaydedilir: 60 sn bölüm sınırı dolarsa gelmiş cevaplar kaybolmaz (1 Kasım: gpt-5 x2 tekrarda hepsi düşüyordu)
    const kaydet = () => {
      const b = cevaplar.filter((c) => c && !("hata" in c));
      s.cg_soru_sayisi = b.length; s.cg_gecen = b.filter((c) => c.geciyor).length; s.cg_cevaplar = cevaplar.filter(Boolean);
    };
    // Sorular aynı anda gider (en fazla 6): gpt-5'te bir cevap ~15-20 sn, 2'şer gidince 6 soru sınıra sığmıyordu
    await Promise.all(Array.from({ length: Math.min(6, isler.length) }, async () => {
      while (sira < isler.length) {
        const n = sira++, { soru, tekrar } = isler[n];
        if (Date.now() > bitis) { cevaplar[n] = { soru, tekrar, hata: "Süre doldu, sorulmadı." }; continue; }
        try {
          const { model, metin } = await chatgptSor(soru + KISA, cgSehir, OAI);
          const kaynaklar = metindekiAlanlar(metin);
          cevaplar[n] = { soru, tekrar, model, aramali: true, geciyor: adGeciyor(metin, isl.ad, adHaric) || siteGeciyor(metin, kaynaklar), ozet: metin.slice(0, 1000), kaynaklar };
          metinler.push(metin); yzMetinleri.push(metin);
        } catch (e) {
          cevaplar[n] = { soru, tekrar, hata: String((e as Error).message).slice(0, 200) };
        }
        kaydet();
      }
    }));
    const basarili = cevaplar.filter((c) => c && !("hata" in c));
    s.cg_soru_sayisi = basarili.length;
    s.cg_gecen = basarili.filter((c) => c.geciyor).length;
    s.cg_cevaplar = cevaplar;
    const hatali = cevaplar.filter((c) => c && "hata" in c);
    if (hatali.length && hatali.length * 2 >= cevaplar.length) hatalar.push(`ChatGPT: ${cevaplar.length} cevaptan ${hatali.length} tanesi alınamadı (${String(hatali[0].hata).slice(0, 140)})`);
    else if (hatali.length) console.log("chatgpt eksik cevap", hatali.length, String(hatali[0].hata).slice(0, 140));
  };

  // 4) Sektöre özel rehber siteleri (30 günde bir yenilenir)
  const rehber = async () => {
    if (!GEM) return;
    const eskiR = !isl.sektor_rehberleri_tarih || Date.now() - new Date(isl.sektor_rehberleri_tarih).getTime() > 30 * 864e5;
    if (!eskiR) return;
    const modeller = GEMINI_MODELLER();
    try {
      const liste = await sektorRehberleri(isK, GEM, modeller);
      if (liste.length) await db.from("isletmeler").update({ sektor_rehberleri: liste, sektor_rehberleri_tarih: new Date().toISOString() }).eq("id", isl.id);
    } catch (e) { console.log("sektor rehberleri alinamadi", String(e)); }
  };

  // Sıra önemli: hepsiHata ilk 3 adıma (harita, arama, yz) bakar; yeni yapay zekâ motorları ölçümü "hata" yapmaz
  // Supabase arka plan işini ~75 sn'de kesiyor (EarlyDrop): 60. saniyede bitmeyen adım beklenmez, eldeki sonuç kaydedilir
  const sureDoldu = new Promise<never>((_, red) => setTimeout(() => red(new Error("Süre doldu, bu bölüm bu ölçümde tamamlanamadı")), Math.max(0, t0 + 60000 - Date.now())));
  sureDoldu.catch(() => {});
  const sonuclar = await Promise.allSettled([harita(), arama(), yz(), rehber(), googleYz(), chatgptYz()].map((p) => Promise.race([p, sureDoldu])));
  sonuclar.forEach((r) => {
    const m = r.status === "rejected" ? String(r.reason?.message || r.reason).slice(0, 200) : "";
    if (m && !hatalar.includes(m)) hatalar.push(m);
  });
  s.kelimeler = kelimeSonuc;
  s.rehber_sayfalari = rehberSayfalari.slice(0, 8);
  if (yzMetinleri.length) {
    const adaylar = new Map<string, string>();
    for (const l of haritaListeleri) for (const r of (l || []).slice(0, 10)) {
      const ad = String(r.ad || ""); const k = sade(ad);
      if (ad && !adaylar.has(k) && !benMi(r)) adaylar.set(k, ad);
    }
    const pay = [...adaylar.values()].slice(0, 25).map((ad) => ({ ad, sayi: yzMetinleri.filter((m) => adGeciyor(m, ad, haric)).length }))
      .filter((x) => x.sayi > 0).sort((a, b) => b.sayi - a.sayi).slice(0, 6);
    s.yz_rakipler = pay;
  }

  // İzlenen rakipler: kullanıcının seçtikleri (en çok 5), seçmediyse haritalarda en sık öne çıkan 3 işletme.
  // Sadece bu ölçümde zaten alınan harita sonuçlarından ve yapay zekâ cevaplarından hesaplanır; ek ücretli sorgu yok.
  // Bir rakip bir aramanın harita listesinde yoksa sırası null kalır ("listede yok"); tahmin yazılmaz.
  {
    type Hedef = { ad: string; place_id: string | null; secili: boolean };
    const ayniMi = (r: Satir, h: Hedef) => (h.place_id && r.place_id) ? String(r.place_id) === h.place_id : sade(String(r.ad || "")) === sade(h.ad);
    const kayitli = (Array.isArray(isl.secili_rakipler) ? isl.secili_rakipler : []) as Array<Record<string, unknown>>;
    let hedefler: Hedef[] = kayitli.filter((x) => x && typeof x.ad === "string" && String(x.ad).trim()).slice(0, 5)
      .map((x) => ({ ad: String(x.ad).trim().slice(0, 120), place_id: typeof x.place_id === "string" ? x.place_id : null, secili: true }));
    if (!hedefler.length) {
      const say = new Map<string, { r: Satir; adet: number; toplam: number }>();
      for (const l of haritaListeleri) for (const r of (l || []).slice(0, 10)) {
        if (benMi(r) || !r.ad) continue;
        const k = r.place_id ? String(r.place_id) : sade(String(r.ad));
        const v = say.get(k) || { r, adet: 0, toplam: 0 }; v.adet++; v.toplam += r.sira; say.set(k, v);
      }
      hedefler = [...say.values()].sort((a, b) => b.adet - a.adet || a.toplam / a.adet - b.toplam / b.adet).slice(0, 3)
        .map((v) => ({ ad: String(v.r.ad), place_id: v.r.place_id ? String(v.r.place_id) : null, secili: false }));
    }
    s.izlenen_rakipler = hedefler.map((h) => {
      let son: Satir | null = null;
      const aramalar = haritaIdx.filter((i) => haritaListeleri[i]).map((i) => {
        const r = haritaListeleri[i].find((x) => ayniMi(x, h)) || null;
        if (r) son = r;
        return { kelime: kelimeler[i], sira: r ? r.sira : null, siz: (kelimeSonuc[i].harita_sira as number | null) ?? null };
      });
      const bulunan = son as Satir | null;
      return {
        ad: h.ad, place_id: h.place_id, secili: h.secili, aramalar,
        puan: bulunan ? bulunan.puan : null, yorum: bulunan ? bulunan.yorum : null,
        yz_sayi: yzMetinleri.length ? yzMetinleri.filter((m) => adGeciyor(m, h.ad, haric)).length : null,
        yz_toplam: yzMetinleri.length,
      };
    });
  }

  // SerpApi çökünce harita/arama fonksiyonları hata fırlatmaz, bayrak koyar; ölçüm yine de "hata" sayılmalı
  const serpCoktu = kelimeSonuc.length > 0 && kelimeSonuc.every((k) => k.arama_hata && (k.harita_hata || k.harita_bakilan == null));
  const hepsiHata = serpCoktu || sonuclar.slice(0, 3).every((r) => r.status === "rejected");
  if (denetim.length) console.log("denetim", isl.id, JSON.stringify(denetim));
  const guncel = { ...s, hatalar, denetim, durum: hepsiHata ? "hata" : "bitti", bitis: new Date().toISOString() };
  const { data: son, error: yazHata } = await db.from("olcumler").update(guncel).eq("id", (kayit as { id: string }).id).select("*").single();
  // Sonuç yazılamazsa kayıt "sürüyor"da kalmasın
  if (yazHata) {
    console.log("olcum sonucu yazilamadi", yazHata.message);
    await db.from("olcumler").update({ durum: "hata", hatalar: ["Sonuç kaydedilemedi: " + yazHata.message.slice(0, 160)], bitis: new Date().toISOString() }).eq("id", (kayit as { id: string }).id);
  }
  return { son, hepsiHata };
}
