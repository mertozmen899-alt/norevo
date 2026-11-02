// Norevo: 3 soruluk hızlı test
(function () {
  'use strict';
  var durum = { adim: 1, mod: ['gelir'], sehir: '', sehirSecili: false, is: '', isSecili: false };

  var YERLER = ['Çorum', 'Alaca, Çorum', 'Bayat, Çorum', 'Boğazkale, Çorum', 'Dodurga, Çorum', 'İskilip, Çorum', 'Kargı, Çorum', 'Laçin, Çorum', 'Mecitözü, Çorum', 'Oğuzlar, Çorum', 'Ortaköy, Çorum', 'Osmancık, Çorum', 'Sungurlu, Çorum', 'Uğurludağ, Çorum', 'Kadıköy, İstanbul', 'Kartal, İstanbul', 'Kağıthane, İstanbul', 'Beşiktaş, İstanbul', 'Üsküdar, İstanbul', 'Bakırköy, İstanbul', 'Şişli, İstanbul', 'Ataşehir, İstanbul', 'Maltepe, İstanbul', 'Beylikdüzü, İstanbul', 'Çankaya, Ankara', 'Keçiören, Ankara', 'Yenimahalle, Ankara', 'Karşıyaka, İzmir', 'Bornova, İzmir', 'Konak, İzmir', 'Nilüfer, Bursa', 'Osmangazi, Bursa', 'Muratpaşa, Antalya', 'Konyaaltı, Antalya', 'Seyhan, Adana', 'Çukurova, Adana', 'Selçuklu, Konya', 'Tepebaşı, Eskişehir', 'Odunpazarı, Eskişehir', 'Melikgazi, Kayseri', 'Ortahisar, Trabzon', 'Şahinbey, Gaziantep', 'İzmit, Kocaeli', 'Atakum, Samsun', 'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];

  var ISLER = [
    ['Veteriner kliniği', ['veteriner', 'hayvan hastanesi', 'vet']],
    ['Pet kuaförü', ['pet kuafor', 'kopek tiras', 'kedi tiras']],
    ['Pet shop', ['evcil hayvan dukkani', 'mama', 'petshop']],
    ['Köpek eğitimi', ['kopek egitmeni', 'kopek okulu']],
    ['Hayvan oteli', ['kedi oteli', 'kopek oteli', 'pansiyon']],
    ['Kuaför', ['sac tasarim', 'sac kesim', 'bayan kuafor']],
    ['Berber', ['erkek kuaforu', 'sakal tiras']],
    ['Güzellik salonu', ['guzellik merkezi', 'cilt bakimi', 'estetisyen']],
    ['Lazer epilasyon', ['epilasyon', 'buz lazer']],
    ['Tırnak stüdyosu', ['manikur', 'pedikur', 'protez tirnak', 'nail art']],
    ['Kaş ve kirpik stüdyosu', ['ipek kirpik', 'kas laminasyon', 'microblading']],
    ['Kalıcı makyaj', ['dudak renklendirme', 'kas kontur']],
    ['Masaj salonu', ['masaj', 'spa', 'hamam']],
    ['Solaryum', ['bronzlasma']],
    ['Dövme stüdyosu', ['dovme', 'tattoo', 'piercing']],
    ['Diş kliniği', ['dis hekimi', 'disci', 'agiz ve dis']],
    ['Ortodonti', ['ortodontist', 'tel tedavisi', 'seffaf plak']],
    ['İmplant kliniği', ['implant', 'dis implanti']],
    ['Çocuk diş hekimi', ['pedodonti', 'pedodontist']],
    ['Özel muayenehane', ['doktor', 'hekim', 'uzman doktor']],
    ['Aile hekimi', ['pratisyen hekim']],
    ['Göz doktoru', ['goz hastaliklari', 'oftalmoloji', 'lazer goz']],
    ['Kulak burun boğaz', ['kbb', 'kbb doktoru']],
    ['Burun estetiği', ['rinoplasti', 'burun ameliyati']],
    ['Estetik cerrah', ['plastik cerrahi', 'estetik ameliyat', 'liposuction', 'meme estetigi']],
    ['Medikal estetik', ['botoks', 'dolgu', 'mezoterapi', 'cilt genclestirme']],
    ['Saç ekimi', ['sac ekim merkezi', 'fue']],
    ['Dermatolog', ['cildiye', 'cilt hastaliklari', 'dermatoloji']],
    ['Kadın doğum', ['jinekolog', 'kadin hastaliklari', 'tup bebek']],
    ['Çocuk doktoru', ['pediatri', 'cocuk hastaliklari']],
    ['Ortopedi', ['ortopedist', 'kemik hastaliklari']],
    ['Kardiyolog', ['kalp doktoru', 'kardiyoloji']],
    ['Üroloji', ['urolog']],
    ['Nöroloji', ['norolog', 'sinir hastaliklari']],
    ['Psikiyatrist', ['psikiyatri']],
    ['Psikolog', ['terapist', 'psikolojik danisman', 'psikoterapi']],
    ['Aile danışmanı', ['cift terapisi', 'evlilik danismani']],
    ['Diyetisyen', ['beslenme uzmani', 'diyet', 'kilo verme']],
    ['Fizyoterapi', ['fizik tedavi', 'fizyoterapist', 'manuel terapi']],
    ['Özel eğitim ve rehabilitasyon merkezi', ['ozel egitim', 'rehabilitasyon', 'otizm', 'ozel egitim merkezi']],
    ['Dil ve konuşma terapisi', ['konusma terapisti', 'kekemelik', 'dil terapisi']],
    ['Ergoterapi', ['ergoterapist', 'duyu butunleme']],
    ['Odyoloji', ['isitme cihazi', 'isitme merkezi', 'odyolog']],
    ['Optik', ['gozlukcu', 'gozluk', 'lens']],
    ['Eczane', ['eczaci', 'nobetci eczane']],
    ['Medikal ürünler', ['medikal', 'ortopedik urunler', 'hasta bezi']],
    ['Laboratuvar', ['tahlil', 'kan tahlili', 'tibbi laboratuvar']],
    ['Görüntüleme merkezi', ['mr', 'tomografi', 'rontgen', 'ultrason']],
    ['Poliklinik', ['tip merkezi', 'saglik merkezi']],
    ['Özel hastane', ['hastane']],
    ['Evde sağlık hizmeti', ['evde bakim', 'hasta bakici', 'evde hemsire']],
    ['Huzurevi', ['yasli bakim evi', 'bakimevi']],
    ['Ambulans hizmeti', ['ozel ambulans', 'hasta nakil']],
    ['Akupunktur', ['alternatif tip', 'hacamat', 'kupa tedavisi']],
    ['Restoran', ['lokanta', 'yemek']],
    ['Kafe', ['kahveci', 'cafe', 'kahve dukkani']],
    ['Pastane', ['tatlici', 'pasta', 'yas pasta']],
    ['Fırın', ['ekmek', 'unlu mamul', 'simit']],
    ['Baklavacı', ['baklava', 'serbetli tatli']],
    ['Kebapçı', ['kebap', 'adana', 'iskender']],
    ['Dönerci', ['doner', 'durum']],
    ['Pideci', ['pide', 'lahmacun', 'kiremit']],
    ['Pizzacı', ['pizza']],
    ['Burger', ['hamburger', 'burgerci']],
    ['Balık restoranı', ['balikci', 'deniz urunleri', 'meyhane']],
    ['Ev yemekleri', ['esnaf lokantasi', 'tencere yemekleri']],
    ['Çiğ köfteci', ['cig kofte']],
    ['Kahvaltı salonu', ['serpme kahvalti', 'kahvalti']],
    ['Mantı evi', ['manti', 'gozleme']],
    ['Tantuni', ['tantunici']],
    ['Kokoreççi', ['kokorec']],
    ['Köfteci', ['kofte', 'izgara']],
    ['Çorbacı', ['corba', 'iskembe', 'kelle paca']],
    ['Tatlıcı', ['kunefe', 'sutlac', 'dondurma']],
    ['Dondurmacı', ['dondurma', 'gelato']],
    ['Çay bahçesi', ['cay ocagi', 'nargile kafe']],
    ['Bar', ['pub', 'meyhane', 'bira']],
    ['Catering', ['toplu yemek', 'yemek sirketi', 'organizasyon yemegi']],
    ['Kuruyemişçi', ['kuruyemis', 'kuru meyve']],
    ['Kasap', ['et', 'sarkuteri', 'kasaplik']],
    ['Şarküteri', ['peynir', 'sucuk', 'pastirma']],
    ['Manav', ['meyve sebze', 'organik']],
    ['Market', ['bakkal', 'sarkuteri', 'gida']],
    ['Su bayii', ['damacana', 'su servisi']],
    ['Tüp bayii', ['tupcu', 'mutfak tupu']],
    ['Çiçekçi', ['cicek', 'buket', 'cicek siparisi']],
    ['Düğün salonu', ['dugun', 'nikah salonu', 'kina salonu']],
    ['Organizasyon', ['dugun organizasyonu', 'dogum gunu', 'nisan organizasyonu', 'etkinlik']],
    ['Gelinlik', ['gelinlikci', 'nisanlik', 'abiye']],
    ['Damatlık', ['damatlik', 'takim elbise']],
    ['Kına evi', ['kina', 'kina gecesi']],
    ['Fotoğrafçı', ['dugun fotografcisi', 'fotograf studyosu', 'vesikalik']],
    ['Videografi', ['dugun videosu', 'klip cekimi', 'drone cekimi']],
    ['DJ ve müzik', ['dj', 'orkestra', 'ses sistemi kiralama']],
    ['Kuyumcu', ['altin', 'pirlanta', 'bilezik']],
    ['Saatçi', ['saat tamiri', 'saat']],
    ['Terzi', ['tadilat', 'elbise dikimi']],
    ['Kuru temizleme', ['kuru temizlemeci', 'camasirhane', 'utu']],
    ['Ayakkabı tamiri', ['kunduraci', 'ayakkabici']],
    ['Butik', ['giyim', 'kadin giyim', 'moda']],
    ['Erkek giyim', ['erkek kiyafeti', 'gomlek']],
    ['Çocuk giyim', ['bebek giyim', 'cocuk kiyafeti']],
    ['Ayakkabı mağazası', ['ayakkabi', 'canta']],
    ['Tesettür giyim', ['tesettur', 'ferace', 'esarp']],
    ['İç giyim', ['ic camasiri', 'pijama']],
    ['Spor mağazası', ['spor giyim', 'spor malzemeleri']],
    ['Kozmetik mağazası', ['kozmetik', 'parfum', 'makyaj malzemesi']],
    ['Optik mağazası', ['gunes gozlugu']],
    ['Oyuncakçı', ['oyuncak']],
    ['Kırtasiye', ['kirtasiyeci', 'fotokopi', 'okul malzemeleri']],
    ['Kitapçı', ['kitap', 'sahaf']],
    ['Matbaa', ['baski', 'kartvizit', 'brosur', 'afis']],
    ['Reklam ajansı', ['reklamci', 'tabela', 'dijital ajans']],
    ['Tabelacı', ['tabela', 'kutu harf', 'totem']],
    ['Promosyon', ['promosyon urunleri', 'baskili urun']],
    ['Dijital pazarlama ajansı', ['sosyal medya ajansi', 'seo', 'google reklamlari']],
    ['Web tasarım', ['web sitesi', 'yazilim firmasi', 'e ticaret sitesi']],
    ['Yazılım şirketi', ['yazilim', 'mobil uygulama']],
    ['Bilgisayarcı', ['bilgisayar tamiri', 'teknik servis', 'laptop']],
    ['Telefoncu', ['cep telefonu', 'telefon tamiri', 'ekran degisimi']],
    ['Elektronik mağazası', ['beyaz esya', 'televizyon', 'elektronik']],
    ['Beyaz eşya servisi', ['camasir makinesi tamiri', 'buzdolabi tamiri', 'bulasik makinesi']],
    ['Küçük ev aletleri tamiri', ['elektrikli supurge tamiri', 'utu tamiri', 'ev aletleri servisi']],
    ['Klima servisi', ['klima', 'klima montaj', 'klima bakim']],
    ['Kombi servisi', ['kombi tamiri', 'kalorifer', 'petek temizligi']],
    ['Doğalgaz tesisatı', ['dogalgaz', 'dogalgaz projesi']],
    ['Elektrikçi', ['elektrik tamiri', 'elektrik tesisati']],
    ['Tesisatçı', ['su tesisati', 'tikaniklik', 'su kacagi']],
    ['Su kaçağı tespiti', ['kacak tespiti', 'kamerali tespit']],
    ['Çilingir', ['anahtarci', 'kapi acma', 'kilit']],
    ['Boyacı', ['boya badana', 'ic cephe boya']],
    ['Alçı ve asma tavan', ['alcipan', 'asma tavan', 'kartonpiyer']],
    ['Fayans ve seramik', ['fayansci', 'seramik', 'karo']],
    ['Parke', ['laminat', 'parke doseme']],
    ['İnşaat firması', ['muteahhit', 'insaat', 'yapi']],
    ['Tadilat ve dekorasyon', ['tadilat', 'renovasyon', 'dekorasyon']],
    ['Mimarlık ofisi', ['mimar', 'ic mimar', 'proje']],
    ['Mühendislik bürosu', ['insaat muhendisi', 'statik proje', 'harita muhendisi']],
    ['Çatı ustası', ['cati', 'cati tamiri', 'izolasyon']],
    ['Yalıtım', ['mantolama', 'isi yalitimi', 'su yalitimi']],
    ['PVC ve pencere', ['pvc', 'pencere', 'cam balkon']],
    ['Cam balkon', ['cam balkon', 'giyotin cam']],
    ['Kapı', ['celik kapi', 'ahsap kapi', 'kapi imalati']],
    ['Demir doğrama', ['demirci', 'korkuluk', 'ferforje']],
    ['Alüminyum doğrama', ['aluminyum', 'dograma']],
    ['Marangoz', ['ahsap', 'mobilya tamiri']],
    ['Mobilyacı', ['mobilya', 'mobilya imalati', 'koltuk takimi']],
    ['Mutfak dolabı', ['mutfak', 'mutfak tasarim', 'dolap imalati']],
    ['Döşemeci', ['koltuk doseme', 'sandalye doseme']],
    ['Perde', ['perdeci', 'stor perde', 'tul']],
    ['Halı mağazası', ['hali', 'kilim']],
    ['Halı yıkama', ['hali yikama', 'koltuk yikama']],
    ['Temizlik şirketi', ['ev temizligi', 'ofis temizligi', 'insaat sonrasi temizlik']],
    ['İlaçlama', ['hasere ilaclama', 'bocek ilaclama', 'fare']],
    ['Bahçe düzenleme', ['peyzaj', 'bahcivan', 'cim']],
    ['Havuz', ['havuz yapimi', 'havuz bakim']],
    ['Güvenlik sistemleri', ['kamera sistemi', 'alarm', 'guvenlik kamerasi']],
    ['Güvenlik şirketi', ['ozel guvenlik', 'guvenlik gorevlisi']],
    ['Asansör', ['asansor bakim', 'asansor servisi']],
    ['Jeneratör', ['jenerator', 'enerji']],
    ['Güneş enerjisi', ['gunes paneli', 'solar', 'ges']],
    ['Hırdavat', ['nalbur', 'hirdavatci', 'yapi market']],
    ['Boya mağazası', ['boya', 'boya satisi']],
    ['Elektrik malzemeleri', ['elektrik malzemesi', 'aydinlatma', 'avize']],
    ['Seramik mağazası', ['seramik', 'banyo', 'vitrifiye']],
    ['Banyo', ['banyo dolabi', 'dus kabini']],
    ['Mermer', ['mermerci', 'granit', 'tezgah']],
    ['Kereste', ['kerestecilik', 'ahsap malzeme']],
    ['Nakliyat', ['evden eve', 'tasimacilik', 'nakliye']],
    ['Kargo', ['kurye', 'kargo subesi']],
    ['Lojistik', ['depo', 'depolama', 'antrepo']],
    ['Vinç kiralama', ['vinc', 'sepetli vinc', 'forklift']],
    ['İş makinesi kiralama', ['kepce', 'ekskavator', 'hafriyat']],
    ['Oto servis', ['tamirci', 'oto tamir', 'sanayi']],
    ['Oto elektrik', ['oto elektrikci', 'aku']],
    ['Oto boya', ['boya kaporta', 'kaportaci', 'hasar onarim']],
    ['Lastikçi', ['lastik', 'rot balans', 'jant']],
    ['Oto yıkama', ['arac yikama', 'oto kuafor', 'detayli temizlik']],
    ['Oto ekspertiz', ['ekspertiz', 'arac muayene']],
    ['Oto kiralama', ['rent a car', 'arac kiralama', 'araba kiralama']],
    ['Oto galeri', ['ikinci el araba', 'galerici', 'araba al sat']],
    ['Oto yedek parça', ['yedek parca', 'oto parca']],
    ['Oto cam', ['arac cami', 'cam degisimi']],
    ['Oto döşeme', ['koltuk kilifi', 'oto doseme']],
    ['Motosiklet', ['motor servisi', 'motosiklet tamiri']],
    ['Bisikletçi', ['bisiklet', 'bisiklet tamiri']],
    ['Çekici', ['oto kurtarma', 'yol yardim']],
    ['Akaryakıt istasyonu', ['benzinlik', 'petrol']],
    ['Sürücü kursu', ['ehliyet', 'direksiyon dersi']],
    ['Taksi', ['taksi duragi', 'transfer']],
    ['Servis ve transfer', ['personel servisi', 'okul servisi', 'havalimani transferi']],
    ['Turizm acentesi', ['tur', 'seyahat acentesi', 'umre']],
    ['Otel', ['konaklama', 'pansiyon', 'butik otel']],
    ['Apart otel', ['gunluk kiralik', 'apart']],
    ['Kamp alanı', ['kamp', 'bungalov', 'glamping']],
    ['Emlak ofisi', ['emlakci', 'gayrimenkul']],
    ['Avukatlık bürosu', ['avukat', 'hukuk burosu', 'bosanma avukati']],
    ['Arabulucu', ['arabuluculuk', 'uzlastirma']],
    ['Noter', ['noterlik']],
    ['Mali müşavir', ['muhasebeci', 'smmm', 'muhasebe burosu']],
    ['Sigorta acentesi', ['sigortaci', 'kasko', 'trafik sigortasi']],
    ['Danışmanlık', ['is danismanligi', 'kobi danismanligi']],
    ['İnsan kaynakları', ['ik danismanligi', 'personel bulma']],
    ['Tercüme bürosu', ['ceviri', 'yeminli tercuman']],
    ['Kreş', ['anaokulu', 'yuva', 'gunduz bakimevi']],
    ['Özel okul', ['kolej', 'ozel ilkokul']],
    ['Dershane', ['etut merkezi', 'kurs', 'lgs', 'yks']],
    ['Özel ders', ['ozel ogretmen', 'birebir ders']],
    ['Yabancı dil kursu', ['ingilizce kursu', 'dil okulu']],
    ['Müzik kursu', ['gitar kursu', 'piyano kursu', 'muzik okulu']],
    ['Dans kursu', ['dans okulu', 'salsa', 'bale']],
    ['Resim kursu', ['resim atolyesi', 'sanat atolyesi']],
    ['Yüzme kursu', ['yuzme', 'havuz']],
    ['Robotik kodlama', ['kodlama kursu', 'robotik']],
    ['Bilgisayar kursu', ['ofis programlari', 'muhasebe kursu']],
    ['Spor salonu', ['gym', 'fitness']],
    ['Pilates stüdyosu', ['pilates', 'reformer']],
    ['Yoga stüdyosu', ['yoga', 'meditasyon']],
    ['Dövüş sanatları', ['boks', 'kickboks', 'karate', 'taekwondo']],
    ['Futbol okulu', ['futbol', 'spor okulu']],
    ['Halı saha', ['hali saha', 'futbol sahasi']],
    ['Oyun alanı', ['cocuk oyun alani', 'oyun parki', 'dogum gunu']],
    ['Oyun salonu', ['playstation', 'internet kafe', 'bilardo']],
    ['Sinema', ['sinema salonu']],
    ['Fotokopi', ['fotokopici', 'cikti', 'ciltleme']],
    ['Çerçeveci', ['cerceve', 'tablo']],
    ['Hediyelik eşya', ['hediyelik', 'hediye']],
    ['Züccaciye', ['zuccaciye', 'mutfak esyalari']],
    ['Ev tekstili', ['nevresim', 'havlu', 'ceyiz']],
    ['Antikacı', ['antika', 'eski esya']],
    ['İkinci el eşya', ['spot', 'ikinci el mobilya']],
    ['Tarım ürünleri', ['zirai ilac', 'tohum', 'gubre']],
    ['Yem bayii', ['yem', 'hayvan yemi']],
    ['Fidancı', ['fidan', 'bitki', 'saksi']],
    ['Arıcılık', ['bal', 'organik bal']],
    ['Süt ürünleri', ['mandira', 'peynir', 'yogurt']],
    ['Toptan gıda', ['toptanci', 'gida toptan']],
    ['Tekstil atölyesi', ['konfeksiyon', 'fason dikim']],
    ['Matbaa ve ambalaj', ['ambalaj', 'karton kutu']],
    ['Plastik imalat', ['plastik', 'enjeksiyon']],
    ['Metal işleme', ['torna', 'cnc', 'kaynak']],
    ['Kaynakçı', ['kaynak', 'demir isleri']],
    ['Cenaze hizmetleri', ['cenaze', 'mezar yapimi']],
    ['Mezar taşı', ['mezar', 'mermer mezar']],
    ['Dernek', ['vakif', 'sivil toplum']],
    ['Cami ve Kuran kursu', ['kuran kursu', 'hafizlik']],
    ['Kırtasiye toptan', ['toptan kirtasiye']],
    ['Fotoğraf baskı', ['fotograf tab', 'fotokitap']],
    ['Çanta tamiri', ['canta', 'deri tamiri']],
    ['Anahtar ve kaşe', ['kase', 'muhur', 'anahtar kopyalama']],
    ['Tamir atölyesi', ['tamirhane', 'tamir']]
  ];

  function n(x) { return (x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim(); }
  function $(id) { return document.getElementById(id); }

  function guncelle() {
    for (var i = 1; i <= 5; i++) $('s' + i).hidden = durum.adim !== i;
    $('adim-etiket').textContent = durum.adim < 4 ? 'Soru ' + durum.adim + ' / 3' : (durum.adim === 4 ? 'Hazırlanıyor' : 'Hazır');
    var vz = $('vazgec'); if (vz) { vz.textContent = durum.adim === 5 ? 'Baştan başla' : 'Vazgeç'; vz.href = durum.adim === 5 ? 'test.html' : './'; }
    var yuzde = Math.min(100, durum.adim * 20);
    $('ilerleme').style.width = yuzde + '%';
    document.querySelector('.ilerleme').setAttribute('aria-valuenow', yuzde);
    $('gezinme').hidden = durum.adim > 3;
    $('geri').style.visibility = durum.adim === 1 ? 'hidden' : 'visible';
    $('ileri').textContent = durum.adim === 3 ? 'Göster' : 'Devam';
    $('ileri').disabled = !gecerli();
    $('turkiye').hidden = !(durum.mod.length === 1 && durum.mod[0] === 'online');
  }

  function gecerli() {
    if (durum.adim === 1) return durum.mod.length > 0;
    if (durum.adim === 2) return durum.sehir.trim().length > 1;
    if (durum.adim === 3) return durum.isSecili && durum.is.trim().length > 1;
    return false;
  }

  function odakla() { var h = $('s' + durum.adim).querySelector('h1'); if (h) h.focus(); }

  // 1. soru
  document.querySelectorAll('.secenek').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-mod'), i = durum.mod.indexOf(m);
      if (i >= 0) durum.mod.splice(i, 1); else durum.mod.push(m);
      b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      guncelle();
    });
  });

  // 2. soru
  var sehir = $('sehir'), sehirOneri = $('sehir-oneri');
  sehir.addEventListener('input', function () {
    durum.sehir = sehir.value; durum.sehirSecili = false;
    var q = n(sehir.value);
    sehirOneri.innerHTML = '';
    if (q.length >= 2) {
      YERLER.filter(function (y) { return n(y).indexOf(q) >= 0; }).slice(0, 6).forEach(function (y) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = y;
        b.addEventListener('click', function () { sehir.value = y; durum.sehir = y; durum.sehirSecili = true; sehirOneri.hidden = true; guncelle(); });
        sehirOneri.appendChild(b);
      });
    }
    sehirOneri.hidden = !sehirOneri.children.length;
    guncelle();
  });
  $('turkiye').addEventListener('click', function () { sehir.value = 'Türkiye geneli'; durum.sehir = 'Türkiye geneli'; durum.sehirSecili = true; sehirOneri.hidden = true; guncelle(); });

  // 3. soru
  var is = $('is'), isOneri = $('is-oneri'), isSecili = $('is-secili');
  function isSec(ad) {
    durum.is = ad; durum.isSecili = true; is.value = ad;
    isOneri.hidden = true; isSecili.hidden = false; isSecili.textContent = '✓ ' + ad;
    guncelle();
  }
  is.addEventListener('input', function () {
    durum.is = is.value; durum.isSecili = false; isSecili.hidden = true;
    var q = n(is.value);
    isOneri.innerHTML = '';
    if (q.length >= 2) {
      ISLER.filter(function (j) { return n(j[0]).indexOf(q) >= 0 || j[1].some(function (a) { return a.indexOf(q) >= 0; }); }).slice(0, 5).forEach(function (j) {
        var es = j[1].filter(function (a) { return a.indexOf(q) >= 0; })[0];
        var b = document.createElement('button'); b.type = 'button';
        var s1 = document.createElement('b'); s1.textContent = j[0]; b.appendChild(s1);
        if (es && n(j[0]).indexOf(q) < 0) { var s2 = document.createElement('small'); s2.textContent = '"' + es + '" olarak da aranır'; b.appendChild(s2); }
        b.addEventListener('click', function () { isSec(j[0]); });
        isOneri.appendChild(b);
      });
      var k = document.createElement('button'); k.type = 'button'; k.className = 'kendim';
      var kb = document.createElement('b'); kb.textContent = 'Listede yok, kendim yazayım';
      var ks = document.createElement('small'); ks.textContent = 'Yazdığınızı aynen kullanırız: "' + is.value.trim() + '"';
      k.appendChild(kb); k.appendChild(ks);
      k.addEventListener('click', function () { isSec(is.value.trim().slice(0, 120)); });
      isOneri.appendChild(k);
    }
    isOneri.hidden = !isOneri.children.length;
    guncelle();
  });

  // Gezinme
  $('geri').addEventListener('click', function () { if (durum.adim > 1) { durum.adim--; guncelle(); odakla(); } });
  $('ileri').addEventListener('click', function () {
    if (!gecerli()) return;
    durum.adim++;
    guncelle(); odakla();
    if (durum.adim === 4) hazirla();
  });

  // Gerçek sonuç: Google Haritalar ilk 20 + yapay zekânın önerdikleri (hizli-test fonksiyonu)
  var OLCUM_ADRES = 'https://drlqbwdupntqqtkmdncc.supabase.co/functions/v1/hizli-test';
  function sehirDuzelt(x) {
    x = (x || '').trim();
    if (x === 'Türkiye geneli') return x;
    var bul = YERLER.filter(function (y) { return n(y) === n(x) || n(y.split(',')[0]) === n(x); })[0];
    if (bul) return bul;
    return x.split(/\s+/).map(function (k) { return k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr'); }).join(' ');
  }
  function olc() {
    if (!window.fetch || navigator.webdriver && !window.__hizliTestDene) return Promise.resolve(null);
    var kontrol = window.AbortController ? new AbortController() : null;
    var zaman = setTimeout(function () { if (kontrol) kontrol.abort(); }, 45000);
    return fetch(OLCUM_ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sehir: durum.sehir.split(',')[0].trim(), is: durum.is }), signal: kontrol ? kontrol.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return null; }); }).then(function (j) {
        clearTimeout(zaman);
        if (j && (j.harita || j.yz)) return j;
        // Sunucu açıklama gönderdiyse (ör. hata 'sinir': bugünkü deneme hakkı doldu, HTTP 429) örnek ekran yerine onu gösteririz
        if (j && j.mesaj) return { hataMesaj: String(j.mesaj).slice(0, 300), sinir: j.hata === 'sinir' };
        return null;
      })
      .catch(function () { clearTimeout(zaman); return null; });
  }
  var GENEL = ['ve', 'ltd', 'sti', 'san', 'tic', 'sube', 'subesi', 'merkez', 'merkezi', 'hizmetleri', 'servis', 'servisi', 'firmasi', 'sirketi'];
  function kelimeler(x) { return n(x).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (t) { return t.length >= 3; }); }
  function eslesir(ad, aday) {
    var haric = kelimeler(durum.is + ' ' + durum.sehir).concat(GENEL);
    var c = kelimeler(ad).filter(function (t) { return haric.indexOf(t) < 0; });
    if (!c.length) c = kelimeler(ad);
    if (!c.length) return false;
    var a = kelimeler(aday);
    var var_ = function (t) { return a.some(function (k) { return k === t || (k.indexOf(t) === 0 && k.length - t.length <= 3); }); };
    var bulunan = c.filter(var_).length;
    return var_(c[0]) && bulunan >= Math.ceil(c.length / 2);
  }
  var sonVeri = null;
  // Önbellekten gelen sonuç kaç gün önceki aramaya ait? ("bugün" ya da "3 gün önce")
  function aramaZamani(v) {
    if (!v || !v.onbellek || !v.tarih) return '';
    var t = new Date(v.tarih); if (isNaN(t)) return '';
    var bas = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    var g = Math.round((bas(new Date()) - bas(t)) / 864e5);
    return g <= 0 ? 'bugün' : g + ' gün önce';
  }
  var ACIKLAMA_ILK = null;
  // İşletme adını karşılaştırmak için sade kelimeler (Türkçe harfler sadeleşir, sektör ve şirket ekleri sayılmaz)
  var GENEL_AD = ['ozel', 'egitim', 'rehabilitasyon', 'merkez', 'merkezi', 'klinik', 'klinigi', 'dis', 'agiz', 'sagligi', 'saglik', 'poliklinik', 'poliklinigi',
    'hastane', 'hastanesi', 've', 'ltd', 'sti', 'san', 'tic', 'sirketi', 'magaza', 'magazasi', 'hizmetleri', 'dr', 'uzm', 'the'];
  function adParca(x) {
    return String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(function (t) { return t.length >= 3 && GENEL_AD.indexOf(t) < 0; });
  }
  // Önerilen adın ayırt edici ilk kelimesi Haritalar listesindeki bir adda geçiyor mu (yalnız genel kelimelerden oluşan adda karar verilmez)
  function haritadaVar(ad, harita, haric) {
    var t = adParca(ad).filter(function (x) { return haric.indexOf(x) < 0; });
    if (!t.length) return true;
    return harita.some(function (h) { return adParca(h.ad).indexOf(t[0]) >= 0; });
  }
  function liSatir(no, ad, ek) {
    var li = document.createElement('li');
    var b = document.createElement('b'); b.className = 't-no'; b.textContent = no; li.appendChild(b);
    var s1 = document.createElement('span'); s1.textContent = ad; li.appendChild(s1);
    if (ek) { var sm = document.createElement('small'); sm.textContent = ek; s1.appendChild(sm); }
    return li;
  }
  function sonucCiz(v) {
    var hk = $('t-hata');
    if (v && v.hataMesaj) {
      // Ölçüm yapılamadı ama sunucu nedenini söyledi: soru işaretli örnek ekran yerine bu açıklamayı gösteririz
      sonVeri = null;
      $('t-gercek').hidden = true; $('t-yedek').hidden = true;
      $('t-etiket').textContent = v.sinir ? 'Bugünlük sınır doldu' : 'Şu an ölçemedik';
      $('t-aciklama').textContent = v.sinir ? 'Hızlı testi kısa sürede çok kez denediniz.' : 'Ölçümü şu an tamamlayamadık.';
      if (hk) { hk.querySelector('p').textContent = v.hataMesaj; hk.hidden = false; }
      return;
    }
    if (hk) hk.hidden = true;
    sonVeri = v;
    $('t-gercek').hidden = !v; $('t-yedek').hidden = !!v;
    if (!v) {
      $('t-etiket').textContent = 'Örnek ekranınız';
      $('t-aciklama').textContent = 'Şu an ölçüm yapamadık. Ücretsiz hesap açarsanız bunu sizin için her hafta ölçer, sonucu panelinizde tek bir sayıyla gösteririz.';
      return;
    }
    if (ACIKLAMA_ILK === null) ACIKLAMA_ILK = $('t-aciklama').textContent;
    var zaman = aramaZamani(v);
    var haritaVar = !!(v.harita && v.harita.length);
    $('t-aciklama').textContent = !haritaVar ? 'Yapay zekâya bir müşteri gibi sorduk; Google Haritalar sırası bu sefer gösterilemedi.' + (zaman ? ' Sonuçlar ' + zaman + ' yapılan aramaya göre.' : '')
      : zaman ? 'Bu sonuçlar ' + zaman + ' yapılan aramaya göre. Google Haritalar\'a ve yapay zekâya bir müşteri gibi sorduk; listeler onların cevabından alındı.' : ACIKLAMA_ILK;
    var hl = $('t-harita'); hl.innerHTML = '';
    if (v.harita && v.harita.length) {
      $('t-harita-not').textContent = '"' + durum.is.toLocaleLowerCase('tr') + ' ' + durum.sehir.split(',')[0] + '" diye aratınca:';
      v.harita.slice(0, 5).forEach(function (x) { hl.appendChild(liSatir(x.sira + '.', x.ad, x.puan ? x.puan.toLocaleString('tr-TR') + ' ★ · ' + (x.yorum || 0) + ' yorum' : '')); });
    } else {
      $('t-harita-not').textContent = v.sehir === 'Türkiye geneli' ? 'Türkiye geneli çalışanlar için harita sırası ölçülmez.'
        : v.harita_yok === 'kapasite' ? 'Bu ay ücretsiz test için ayırdığımız harita aramaları doldu. Harita sırasını ay başında yeniden gösterebileceğiz; yapay zekâ sonuçları aşağıda.'
        : v.harita_yok === 'gunluk' ? 'Bugün ücretsiz test için ayırdığımız harita aramaları doldu. Harita sıranızı yarın görebilirsiniz; yapay zekâ sonuçları aşağıda.'
        : 'Haritalara şu an bakamadık, birazdan tekrar deneyin.';
    }
    var yl = $('t-yz'); yl.innerHTML = '';
    if (v.yz && v.yz.isletmeler) {
      $('t-yz-soru').textContent = 'Sorduğumuz soru: "' + v.soru + '". Gemini önerdikleri:';
      // Gemini internete bakmadan cevaplıyor ve bazen olmayan işletme adı uyduruyor: her adı aynı aramanın Haritalar listesinde ararız
      var haric = adParca(durum.is + ' ' + durum.sehir), suphe = 0;
      v.yz.isletmeler.forEach(function (x, i) {
        var yok = v.harita && v.harita.length && !haritadaVar(x.ad, v.harita, haric);
        if (yok) suphe++;
        yl.appendChild(liSatir((i + 1) + '.', x.ad, yok ? 'Haritalar\'ın ilk 20\'sinde yok' : ''));
      });
      if (!v.harita || !v.harita.length) yl.appendChild(el('li', 't-not', 'Gemini bu cevabı internete bakmadan, kendi bilgisinden verdi. Bu adları Haritalar listesiyle karşılaştıramadık; bazıları başka şehirde olabilir ya da gerçekte hiç olmayabilir.'));
      else if (suphe) yl.appendChild(el('li', 't-not', 'Gemini bu cevabı internete bakmadan, kendi bilgisinden verdi. "Haritalar\'ın ilk 20\'sinde yok" yazan adlar başka şehirde olabilir ya da gerçekte hiç olmayabilir.'));
    } else {
      $('t-yz-soru').textContent = 'Yapay zekâ şu an cevap vermedi, birazdan tekrar deneyin.';
    }
    // Diğer yapay zekâlar (Google Yapay Zekâ Modu, ChatGPT): geldiyse aynı kutuda ayrı liste
    var ek = $('t-yz-ek'); if (ek) ek.remove();
    ek = el('div', null); ek.id = 't-yz-ek';
    [['gyz', 'Google Yapay Zekâ Modu'], ['cg', 'ChatGPT']].forEach(function (m) {
      var d = v[m[0]];
      if (!d || !d.isletmeler || !d.isletmeler.length) return;
      ek.appendChild(el('h3', 't-yz-alt', m[1] + ' önerdikleri'));
      var ol = el('ol', 't-liste');
      d.isletmeler.forEach(function (x, i) { ol.appendChild(liSatir((i + 1) + '.', x.ad, '')); });
      ek.appendChild(ol);
    });
    if (v.harita_yok === 'kapasite') ek.appendChild(el('p', 't-not', 'Google Yapay Zekâ Modu sonucu da bu ayki arama kapasitemiz dolduğu için gösterilemedi.'));
    if (ek.childNodes.length) yl.parentNode.insertBefore(ek, yl.nextSibling);
  }
  function yzListeleri(v) { return ['yz', 'gyz', 'cg'].map(function (k) { return v && v[k] && v[k].isletmeler || []; }); }
  // ---- Rapor kartı: "Bu siz misiniz?" sonra 1. sıradakiyle karşılaştırma ve adımlar ----
  function el(t, sinif, metin) { var e = document.createElement(t); if (sinif) e.className = sinif; if (metin != null) e.textContent = metin; return e; }
  function aramaAdi() { return durum.is.toLocaleLowerCase('tr') + ' ' + durum.sehir.split(',')[0]; }
  function adayKart(x, sec) {
    var b = el('button', 't-aday'); b.type = 'button';
    b.appendChild(el('b', null, x.ad));
    var alt = [x.adres, x.puan ? x.puan.toLocaleString('tr-TR') + ' ★ · ' + (x.yorum || 0) + ' yorum' : 'Henüz puan yok'].filter(Boolean).join(' · ');
    b.appendChild(el('small', null, alt));
    b.addEventListener('click', function () { sec(x); });
    return b;
  }
  function adaySor(out, baslik, adaylar, siraVar) {
    out.innerHTML = '';
    out.appendChild(el('p', 't-soru-b', baslik));
    var l = el('div', 't-adaylar');
    adaylar.forEach(function (x) { l.appendChild(adayKart(x, function (v) { raporCiz(v, siraVar ? v.sira : null); })); });
    out.appendChild(l);
    var yok = el('button', 't-baglanti', siraVar ? 'Hiçbiri ben değilim, adımla arayın' : 'Hiçbiri değil, Google\'da kaydım yok'); yok.type = 'button';
    yok.addEventListener('click', function () { if (siraVar) adlaAra(out); else raporCiz(null, null); });
    out.appendChild(yok);
  }
  function adlaAra(out) {
    var ad = $('t-ad').value.trim();
    out.innerHTML = ''; out.appendChild(el('p', 't-not', '"' + ad + '" adıyla Google Haritalar\'da arıyoruz...'));
    if (!window.fetch || navigator.webdriver && !window.__hizliTestDene) { raporCiz(null, null); return; }
    fetch(OLCUM_ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ islem: 'bul', ad: ad, sehir: durum.sehir.split(',')[0].trim(), is: durum.is }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.adaylar && j.adaylar.length) adaySor(out, 'Google\'da bunları bulduk. Hangisi sizsiniz?', j.adaylar, false);
        else if (j && j.adaylar) raporCiz(null, null);
        else { out.innerHTML = ''; out.appendChild(el('p', 't-not', (j && j.mesaj) || 'Şu an arayamadık. Birazdan tekrar deneyin.')); }
      })
      .catch(function () { out.innerHTML = ''; out.appendChild(el('p', 't-not', 'Şu an arayamadık. Birazdan tekrar deneyin.')); });
  }
  function adimlarUret(siz, lider, yzVar) {
    var A = [];
    if (!siz) A.push({ g:'Müşterilerin sizi bulması için ilk adım', t: 'Google İşletme Profilinizi açın', n: 'Haritalarda hiç görünmüyorsunuz. Bu, müşterilerin sizi bulması için en önemli adım ve ücretsiz.', a: ['Telefonunuzda Google Haritalar\'ı açın, işletmenizin adını arayın. Çıkarsa "Bu işletmenin sahibi misiniz?" deyip sahiplenin.', 'Çıkmazsa business.google.com adresinden "İşletme ekle" deyin; adı tabelanızdaki gibi, kategoriyi "' + durum.is + '" olarak seçin.', 'Adres, telefon ve çalışma saatlerini girin, Google\'ın istediği doğrulamayı yapın.'] });
    if (siz && lider && (siz.yorum || 0) < Math.max(10, (lider.yorum || 0) * 0.6)) A.push({ g:'1. sıradakinin sizden çok daha fazla yaptığı bir şey', t: 'Müşterilerinizden Google yorumu isteyin', n: 'Sizde ' + (siz.yorum || 0) + ' yorum var, ' + lider.sira + '. sıradakinde ' + (lider.yorum || 0) + '. Google en çok yorumu olan ve düzenli yorum alan işletmeyi öne çıkarıyor.', a: ['Google İşletme Profilinizde "Yorum iste" bölümünden bağlantınızı kopyalayın.', 'Bu hafta işini yaptığınız 10 müşterinize WhatsApp\'tan kısa bir teşekkürle gönderin.', 'Gelen her yoruma 1-2 cümleyle cevap verin.'] });
    if (siz && !siz.web) A.push({ g:'Profilinizde müşterinin göremediği önemli bir bilgi', t: 'Profilinize web sitesi ya da Instagram bağlantısı ekleyin', n: 'Profilinizde bir bağlantı görünmüyor' + (lider && lider.web ? ', önünüzdekinde var.' : '.'), a: ['Google İşletme Profilinde "Profili düzenle" deyin.', '"Web sitesi" alanına sitenizi, yoksa Instagram adresinizi yazın.', 'Kaydedin; birkaç gün içinde görünür.'] });
    if (siz && !siz.saat) A.push({ g:'Google\'ın öne çıkardığı işletmelerde olup sizde olmayan bir şey', t: 'Çalışma saatlerinizi girin', n: 'Saatleriniz profilde görünmüyor. Google "şimdi açık" olanları öne çıkarır.', a: ['Profili düzenle bölümünde "Saatler"i açın.', 'Her günün açılış ve kapanış saatini girin.', 'Bayram ve tatil günleri için "özel saatler" ekleyin.'] });
    if (siz && !siz.tel) A.push({ g:'Müşterinin size ulaşmasını zorlaştıran bir eksik', t: 'Telefon numaranızı profile ekleyin', n: 'Profilinizde telefon görünmüyor; müşteri sizi tek dokunuşla arayamıyor.', a: ['Profili düzenle, "İletişim" bölümünü açın.', 'Müşterinin aradığı numarayı yazın.', 'Aynı numarayı sitenizde ve Instagram\'da da kullanın.'] });
    if (siz && lider && siz.puan && lider.puan && siz.puan < lider.puan - 0.2) A.push({ g:'Puanınızı yukarı taşıyacak bir alışkanlık', t: 'Düşük puanlı yorumlara nazikçe cevap verin', n: 'Puanınız ' + siz.puan.toLocaleString('tr-TR') + ', önünüzdekinin ' + lider.puan.toLocaleString('tr-TR') + '.', a: ['3 yıldız ve altındaki yorumları bulun.', 'Kısa bir özür ve çözüm teklifiyle cevap verin.', 'Sorunu çözdüğünüz müşteriden yorumunu güncellemesini rica edin.'] });
    if (!yzVar) A.push({ g:'Yapay zekânın sizi önermesi için yapılacak bir iş', t: 'Yapay zekânın baktığı sitelerde yer alın', n: 'Yapay zekâ sizi önermedi. Önerdiği işletmeler, sektör rehberlerinde ve haritalarda bilgisi eksiksiz olanlar.', a: ['Sektörünüzdeki rehber sitelerinde ücretsiz profil açın.', 'Her yerde adınızı, adresinizi, telefonunuzu aynı yazın.', 'Profilinize hizmetlerinizi tek tek ekleyin.'] });
    A.push({ g:'Öndeki işletmelerin düzenli yaptığı bir şey', t: 'Her hafta bir Google gönderisi paylaşın', n: 'Düzenli paylaşım yapan profiller daha canlı görünür.', a: ['Profilinizde "Güncelleme ekle" deyin.', 'Bir iş fotoğrafı ve 2-3 cümle yazın.', 'Her hafta tekrarlayın.'] });
    return A.slice(0, 3);
  }
  function kiyasSatir(tablo, ad, sizV, liderV, iyi) {
    var tr = el('tr'); tr.appendChild(el('th', null, ad));
    var a = el('td', iyi === false ? 'kotu' : iyi === true ? 'iyi' : '', sizV); tr.appendChild(a);
    tr.appendChild(el('td', null, liderV)); tablo.appendChild(tr);
  }
  function varYok(x) { return x ? 'Var' : 'Yok'; }
  function raporCiz(siz, sira) {
    var out = $('t-ben-sonuc'); out.innerHTML = '';
    document.querySelectorAll('.t-liste li').forEach(function (li) { li.classList.remove('t-siz'); });
    var h = (sonVeri && sonVeri.harita) || [];
    if (sira) document.querySelectorAll('#t-harita li').forEach(function (li, k) { if (h[k] && h[k].sira === sira) li.classList.add('t-siz'); });
    var lider = h.filter(function (x) { return !siz || x.ad !== siz.ad; })[0] || null;
    var yzVar = !!(siz && yzListeleri(sonVeri).some(function (l) { return l.some(function (x) { return eslesir(siz.ad, x.ad); }); }));
    var k = el('div', 't-rapor');
    k.appendChild(el('span', 'pil pil-a', 'Rapor kartınız'));
    var buyuk = el('p', 't-buyuk');
    if (sira) { buyuk.appendChild(document.createTextNode('"' + aramaAdi() + '" arayanlar sizi Google Haritalar\'da ')); buyuk.appendChild(el('b', sira <= 3 ? 'iyi' : 'kotu', sira + '. sırada')); buyuk.appendChild(document.createTextNode(' görüyor.')); }
    else if (siz) { buyuk.appendChild(document.createTextNode('"' + aramaAdi() + '" aramasında Haritalar\'ın ')); buyuk.appendChild(el('b', 'kotu', 'ilk 20\'sinde yoksunuz')); buyuk.appendChild(document.createTextNode('.')); }
    else { buyuk.appendChild(document.createTextNode('Google Haritalar\'da ')); buyuk.appendChild(el('b', 'kotu', 'görünmüyorsunuz')); buyuk.appendChild(document.createTextNode('. Sizi arayan müşteri rakiplerinizi buluyor.')); }
    k.appendChild(buyuk);
    if (siz && lider) {
      k.appendChild(el('p', 't-alt-b', 'Siz ve ' + lider.sira + '. sıradaki: ' + lider.ad));
      var t = el('table', 't-kiyas'); var bas = el('tr'); bas.appendChild(el('th')); bas.appendChild(el('th', null, 'Siz')); bas.appendChild(el('th', null, lider.sira + '. sıradaki')); t.appendChild(bas);
      kiyasSatir(t, 'Puan', siz.puan ? siz.puan.toLocaleString('tr-TR') + ' ★' : 'Yok', lider.puan ? lider.puan.toLocaleString('tr-TR') + ' ★' : 'Yok', siz.puan && lider.puan ? siz.puan >= lider.puan - 0.1 : false);
      kiyasSatir(t, 'Yorum sayısı', String(siz.yorum || 0), String(lider.yorum || 0), (siz.yorum || 0) >= (lider.yorum || 0) * 0.8);
      kiyasSatir(t, 'Profilde site bağlantısı', varYok(siz.web), varYok(lider.web), siz.web ? true : (lider.web ? false : null));
      kiyasSatir(t, 'Telefon', varYok(siz.tel), varYok(lider.tel), siz.tel ? true : false);
      kiyasSatir(t, 'Çalışma saatleri', varYok(siz.saat), varYok(lider.saat), siz.saat ? true : false);
      var liderYz = yzListeleri(sonVeri).some(function (l) { return l.some(function (x) { return eslesir(lider.ad, x.ad); }); });
      kiyasSatir(t, 'Yapay zekâ önerdi mi?', yzVar ? 'Evet' : 'Hayır', liderYz ? 'Evet' : 'Hayır', yzVar);
      k.appendChild(t);
    }
    var A = adimlarUret(siz, lider, yzVar);
    k.appendChild(el('p', 't-alt-b', 'Sizi yukarı taşıyacak ilk 3 adım'));
    A.forEach(function (x, i) {
      var d = el('div', 't-adim' + (i ? ' kilitli' : ''));
      var bas = el('div', 't-adim-bas'); bas.appendChild(el('b', 't-adim-no', String(i + 1))); bas.appendChild(el('b', null, i ? x.g : x.t));
      if (i) bas.appendChild(el('span', 't-kilit-ikon', '🔒'));
      d.appendChild(bas);
      var ic = el('div', 't-adim-ic');
      if (i) {
        // Gerçek adım metni sayfaya hiç yazılmaz; yerine anlamsız, bulanık yer tutucu
        ic.setAttribute('aria-hidden', 'true');
        ['Bu adımı hesabınızda adım adım anlatıyoruz, hazır metniyle birlikte.', 'Ne kadar süreceğini ve nereden yapılacağını da yazıyoruz.', 'Yaptıktan sonra etkisini bir sonraki ölçümde gösteriyoruz.'].forEach(function (t) { ic.appendChild(el('p', null, t)); });
      } else {
        ic.appendChild(el('p', null, x.n));
        var ol = el('ol'); x.a.forEach(function (s) { ol.appendChild(el('li', null, s)); }); ic.appendChild(ol);
      }
      d.appendChild(ic); k.appendChild(d);
    });
    if (!siz || !siz.web) {
      var tk = el('div', 't-teklif');
      // Haritalar yalnız profilde site bağlantısı olup olmadığını söyler; işletmenin sitesi olabilir
      tk.appendChild(el('b', null, 'Google profilinizde web sitesi görünmüyor.'));
      tk.appendChild(el('p', null, 'Siteniz varsa adresini Google profilinize ekleyin (5 dakika). Yoksa işinizi, semtinizi ve telefonunuzu Google\'ın anlayacağı şekilde anlatan, telefonda hızlı açılan bir siteyi biz yapalım.'));
      var wa = el('a', 'btn btn-wa', 'WhatsApp\'tan bilgi alın'); wa.target = '_blank'; wa.rel = 'noopener';
      wa.href = 'https://wa.me/905556984086?text=' + encodeURIComponent('Merhaba, ' + (siz ? siz.ad : 'işletmem') + ' için web sitesi yaptırmak istiyorum. (' + aramaAdi() + ')');
      tk.appendChild(wa); k.appendChild(tk);
    }
    var kilit = el('div', 't-kilit');
    kilit.appendChild(el('p', null, '2. ve 3. adımın nasıl yapılacağını ve her hafta sıranızı hesabınızda görün.'));
    var ac = el('a', 'btn btn-amber', 'Ücretsiz hesap aç, hepsini gör'); ac.href = 'giris.html#kayit'; kilit.appendChild(ac);
    k.appendChild(kilit);
    var zamanR = aramaZamani(sonVeri);
    k.appendChild(el('p', 't-not', (zamanR ? 'Bu sonuçlar ' + zamanR + ' yapılan aramaya göre.' : 'Sonuç bugün yapılan tek bir aramaya göre.') + ' Konuma ve güne göre sıra biraz değişebilir; Norevo bunu her hafta ölçer.'));
    out.appendChild(k);
    try { sessionStorage.setItem('norevo_test_rapor', JSON.stringify({ ad: siz && siz.ad, sira: sira })); } catch (e) {}
    k.scrollIntoView && k.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('t-ben-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var ad = $('t-ad').value.trim(), out = $('t-ben-sonuc');
    out.innerHTML = '';
    if (ad.length < 2 || !sonVeri) { out.appendChild(el('p', 't-not', 'İşletmenizin adını yazın.')); return; }
    var h = (sonVeri.harita || []).filter(function (x) { return eslesir(ad, x.ad); });
    if (h.length) adaySor(out, 'Bu siz misiniz?', h.slice(0, 3), true);
    else adlaAra(out);
  });

  function hazirla() {
    durum.sehir = sehirDuzelt(durum.sehir);
    var olcum = olc(), sonuc, olcumBitti = false, animBitti = false;
    olcum.then(function (v) { sonuc = v; olcumBitti = true; if (animBitti) bitir(); });
    document.querySelectorAll('.is-adi').forEach(function (e) { e.textContent = durum.is; });
    var satirlar = document.querySelectorAll('#adimlar > div'), i = 0;
    var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t = setInterval(function () {
      if (i === satirlar.length - 1 && !olcumBitti) return; // son adımda ölçümü bekle
      satirlar.forEach(function (s, k) { s.className = k < i ? 'tamam' : (k === i ? 'aktif' : ''); });
      i++;
      if (i > satirlar.length) {
        clearInterval(t);
        animBitti = true;
        if (olcumBitti) bitir();
      }
    }, azalt ? 60 : 700);
    function bitir() {
        setTimeout(function () {
          var yer = durum.sehir === 'Türkiye geneli' ? 'Türkiye’de' : (function (ad) { var k = ad.toLocaleLowerCase('tr'), u = k.match(/[aıoueiöü]/g) || ['e']; return ad + '’' + (/[çfhkpsşt]$/.test(k) ? 't' : 'd') + ('aıou'.indexOf(u[u.length - 1]) >= 0 ? 'a' : 'e'); })(durum.sehir.split(',')[0].trim());
          document.querySelector('#s5 .yer').textContent = yer;
          document.querySelector('#s5 .is-kucuk').textContent = durum.is.toLocaleLowerCase('tr');
          try { sessionStorage.setItem('norevo_test', JSON.stringify({ mod: durum.mod.slice(0, 3), sehir: durum.sehir, is: durum.is })); } catch (e) {}
          sonucCiz(sonuc);
          durum.adim = 5; guncelle(); odakla();
        }, azalt ? 0 : 500);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Norevo.formBagla($('test-form'), function () {
      return { calismaSekli: durum.mod.slice(0, 3), sehir: durum.sehir.slice(0, 120), isTuru: durum.is.slice(0, 120) };
    });
  });

  guncelle();
})();
