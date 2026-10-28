import { TestCase } from "../types";
import { parseCodeEntities, detectLanguage, computeDiffStats } from "./codeAnalyzerService";

export interface GeneratedPlan {
  overview: string;
  detectedLanguage: string;
  totalTestCount: number;
  criticalTestCount: number;
  testCases: TestCase[];
}

/**
 * Metnin doğal dil promptu veya doküman metni olup olmadığını tespit eder
 */
function isDocumentOrPrompt(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const codeIndicators = ["class ", "function ", "def ", "public ", "private ", "import ", "using ", "namespace ", "const ", "var ", "let ", "void ", "<w:t", "CREATE TABLE", "SELECT "];
  let codeCount = 0;
  for (const ind of codeIndicators) {
    if (text.includes(ind)) codeCount++;
  }
  // Eğer kod indikatörleri 2'den azsa ve Türkçe/doğal dil kelimeleri içeriyorsa
  const naturalWords = ["ve ", "ile ", "için ", "olan ", "eklendi ", "kullanıcı ", "test ", "sistem ", "güncellendi ", "olarak ", "şifre ", "hesap ", "durum ", "talep ", "hata ", "kural ", "doğrulama ", "kontrol ", "servis "];
  let naturalCount = 0;
  const lower = text.toLowerCase();
  for (const w of naturalWords) {
    if (lower.includes(w)) naturalCount++;
  }

  return naturalCount >= 2 || (codeCount === 0 && text.trim().length > 15);
}

/**
 * Prompt veya Dokümandan Akıllı Test Planı Üretir
 */
function generatePromptDocumentPlan(
  title: string,
  category: string,
  docText: string,
  oldText: string
): GeneratedPlan {
  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `TC-${String(counter++).padStart(3, "0")}`;

  const lower = (docText + " " + title).toLowerCase();
  const lines = docText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && !l.startsWith("//") && !l.startsWith("#"));

  // 1. Temel İş Mantığı ve Kabul Senaryosu (Positive / Acceptance)
  testCases.push({
    id: nextId(),
    targetComponent: title || "Temel Gereksinim Akışı",
    title: `[${title}] Standart Pozitif Akış ve Fonksiyonel Kabul Testi`,
    type: "Fonksiyonel Kabul Testi (Happy Path)",
    priority: "P1 (Kritik)",
    preconditions: "Sistem ve ilgili servisler çalışır durumda, test kullanıcısı/verisi hazır olmalı.",
    steps: [
      `Adım 1: '${title}' kapsamında tanımlanan yeni özelliği standart ve geçerli parametrelerle tetikleyin.`,
      "Adım 2: Başarılı istek sonrası sistemin beklenen başarı yanıtını (200 OK / Başarılı durum) döndürdüğünü doğrulayın.",
      "Adım 3: İlgili durumun (veritabanı kaydı, bakiye, kullanıcı durumu vb.) beklenen şekilde güncellendiğini teyit edin.",
    ],
    expectedResult: "Tüm geçerli girdilerle işlem hatasız tamamlanmalı, yan etkiler doğru yansıtılmalıdır.",
  });

  // 2. Kimlik Doğrulama / Yetkilendirme / Güvenlik Kontrolleri
  if (
    lower.includes("auth") ||
    lower.includes("şifre") ||
    lower.includes("token") ||
    lower.includes("jwt") ||
    lower.includes("otp") ||
    lower.includes("sms") ||
    lower.includes("2fa") ||
    lower.includes("güvenlik") ||
    lower.includes("rol") ||
    category === "security"
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "Güvenlik & Yetkilendirme Katmanı",
      title: "Geçersiz Kimlik Bilgileri, Token Manipülasyonu ve Yetkisiz Erişim Testi",
      type: "Güvenlik ve Yetkilendirme Testi (Security)",
      priority: "P1 (Kritik)",
      preconditions: "Güvenlik middleware ve doğrulama mekanizması devrede olmalı.",
      steps: [
        "Adım 1: Eksik, manipüle edilmiş veya süresi dolmuş token/kod ile korunan kaynağa istek yapın.",
        "Adım 2: Sistemin isteği reddederek 401 Unauthorized veya 403 Forbidden durumu ürettiğini teyit edin.",
        "Adım 3: Arka arkaya hatalı denemeler (örneğin 3 kez hatalı OTP/şifre) göndererek koruma mekanizmasının (hesap kilidi, rate-limiting) tetiklendiğini doğrulayın.",
      ],
      expectedResult: "Yetkisiz talepler tamamen engellenmeli ve güvenlik kuralları ihlal edilmemelidir.",
    });
  }

  // 3. Sınır Değerler, Limitler ve Kısıtlamalar (Boundary & Limit Check)
  if (
    lower.includes("limit") ||
    lower.includes("sınır") ||
    lower.includes("süre") ||
    lower.includes("dakika") ||
    lower.includes("adet") ||
    lower.includes("sayı") ||
    lower.includes("kapasite") ||
    /\d+/.test(docText)
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "İş Kuralı ve Sınır Kontrolü (Boundary)",
      title: "Sınır Değerler, Maksimum/Minimum Limitler ve Zaman Aşımı Testi",
      type: "Sınır Değer Testi (Boundary Limits)",
      priority: "P2 (Yüksek)",
      preconditions: "Limit değerleri (tutar, adet, süre, deneme hakkı) tanımlanmış olmalı.",
      steps: [
        "Adım 1: Belirtilen limitin tam sınırındaki değerle (örn: max limit veya son geçerli dakika) işlemi deneyin ve kabul edildiğini teyit edin.",
        "Adım 2: Sınırın 1 birim üzerindeki aşım değeriyle (örn: limit + 1 veya süresi 1 saniye geçmiş) işlemi deneyin ve reddedildiğini doğrulayın.",
        "Adım 3: Negatif veya sıfır değerler girildiğinde sistemin çökmeden doğrulama hatası verdiğini test edin.",
      ],
      expectedResult: "Sınır değerler tam hassasiyetle kontrol edilmeli, aşım durumlarında işlem engellenmelidir.",
    });
  }

  // 4. Oyun veya Durum Değişikliği Mekaniği
  if (
    lower.includes("oyun") ||
    lower.includes("can") ||
    lower.includes("hasar") ||
    lower.includes("envanter") ||
    lower.includes("büyü") ||
    lower.includes("mana") ||
    category === "game"
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "Oyun Mekaniği ve Durum Yönetimi",
      title: "Karakter/Oyun İçi Durum Güncellemeleri ve Kural Doğrulaması",
      type: "Oynanış Mantığı Testi (Gameplay/Logic)",
      priority: "P1 (Kritik)",
      preconditions: "Oyun sahnesi ve ilgili bileşenler başlatılmış olmalı.",
      steps: [
        "Adım 1: İlgili mekanizmayı (can değişimi, eşya alma, yetenek kullanımı) tetikleyin ve değer değişimini gözlemleyin.",
        "Adım 2: Yetersiz kaynak (örn: yetersiz mana, dolu envanter, ölü karakter) durumunda aksiyonun engellendiğini doğrulayın.",
        "Adım 3: Değerlerin min/max sınırlarını (0 altı veya tavan üstü) aşamadığını teyit edin.",
      ],
      expectedResult: "Oyun içi kaynaklar ve durumlar kurallara uygun güncellenmeli, tutarsızlık yaşanmamalıdır.",
    });
  }

  // 5. Sepet, Ödeme ve Finansal İşlemler
  if (
    lower.includes("ödeme") ||
    lower.includes("sepet") ||
    lower.includes("fiyat") ||
    lower.includes("tutar") ||
    lower.includes("kupon") ||
    lower.includes("bakiye") ||
    lower.includes("kart")
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "Finans & Ödeme İşlemleri",
      title: "Fiyat Hesaplama, İndirim Uygulaması ve Mükerrer Ödeme Engeli Testi",
      type: "İş Mantığı & Bütünlük Testi",
      priority: "P1 (Kritik)",
      preconditions: "Ödeme altyapısı ve test sepeti hazır olmalı.",
      steps: [
        "Adım 1: Sepet kalemlerini ve toplam tutarı hesaplatarak matematiksel doğruluğu kontrol edin.",
        "Adım 2: Aynı sipariş veya ödeme için çift tıklama veya eşzamanlı istek göndererek idempotency (mükerrer ödeme engeli) mekanizmasını test edin.",
        "Adım 3: İptal veya başarısız ödeme durumunda bakiye veya stok iadesinin eksiksiz yapıldığını doğrulayın.",
      ],
      expectedResult: "Finansal işlemler atomik olarak işlenmeli, çifte harcama ve hesaplama hatası önlenmelidir.",
    });
  }

  // 6. Belgedeki/Prompttaki Maddeleri Ayrıştırıp Özel Test Vakaları Oluştur
  const bulletLines = lines.filter((l) => /^(\d+\.|\*|-|•|adım|madde)/i.test(l));
  if (bulletLines.length > 0) {
    for (const bLine of bulletLines.slice(0, 4)) {
      const cleanLine = bLine.replace(/^(\d+\.|\*|-|•|adım\s*\d*:?|madde\s*\d*:?)\s*/i, "").trim();
      if (cleanLine.length > 8) {
        testCases.push({
          id: nextId(),
          targetComponent: "Belirtilen Gereksinim Maddesi",
          title: `Gereksinim Doğrulaması: "${cleanLine.slice(0, 50)}${cleanLine.length > 50 ? "..." : ""}"`,
          type: "Gereksinim Uygunluk Testi (Specification)",
          priority: "P2 (Yüksek)",
          preconditions: "Dokümanda belirtilen ön koşullar ve bileşenler devrede olmalı.",
          steps: [
            `Adım 1: Belirtilen '${cleanLine}' kuralı için girdi hazırlayın ve işlemi başlatın.`,
            "Adım 2: Çıktının dokümanda tanımlanan şartları eksiksiz karşıladığını doğrulayın.",
            "Adım 3: Kural ihlali durumunda uygun geri bildirim mesajının gösterildiğini kontrol edin.",
          ],
          expectedResult: `Belirtilen kural (${cleanLine.slice(0, 40)}...) sistem tarafından tavizsiz uygulanmalıdır.`,
        });
      }
    }
  }

  // 7. Negatif Girdi ve Hata Toleransı Testi
  testCases.push({
    id: nextId(),
    targetComponent: "Hata Toleransı ve İstisna Yönetimi",
    title: "Eksik/Hatalı Girdiler, Boş Parametreler ve Sistem Dayanıklılık Testi",
    type: "Negatif ve İstisna Testi (Negative Flow)",
    priority: "P2 (Yüksek)",
    preconditions: "Sistem aktif çalışıyor olmalı.",
    steps: [
      "Adım 1: Zorunlu alanları boş bırakarak veya null/boşluk karakteri göndererek isteği tetikleyin.",
      "Adım 2: Sistemin 500 çökme hatası yerine 400 Bad Request veya anlamlı bir hata mesajı döndürdüğünü doğrulayın.",
      "Adım 3: Beklenmeyen tipte (sayı yerine metin, çok uzun karakter dizisi vb.) veri girildiğinde sistemin bütünlüğünü koruduğunu teyit edin.",
    ],
    expectedResult: "Sistem beklenmeyen girdiler karşısında kararlı kalmalı ve kullanıcıyı yönlendirici hata mesajı vermelidir.",
  });

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `Tespit Edilen Biçim: Prompt / Doküman Metni (${docText.length} karakter, ${lines.length} satır/paragraf). Başlık: "${title}". Dokümanda yer alan kurallar, güvenlik şartları, limitler ve iş mantığı analiz edildi; toplam ${testCases.length} adet çalıştırılabilir Test Senaryosu üretildi.`;

  return {
    overview,
    detectedLanguage: "Prompt / Şartname Dokümanı (Doğal Dil)",
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}

export function generateUniversalTestPlan(
  title: string,
  category: string,
  oldText: string,
  newText: string
): GeneratedPlan {
  const codeToAnalyze = newText && newText.trim().length > 0 ? newText : oldText;

  // Prompt veya Doküman Metni mi kontrol et
  if (isDocumentOrPrompt(codeToAnalyze)) {
    return generatePromptDocumentPlan(title, category, codeToAnalyze, oldText);
  }

  // Standart Kod Analizi
  const { language: detectedLanguage } = detectLanguage(codeToAnalyze);
  const entities = parseCodeEntities(codeToAnalyze);
  const diffStats = computeDiffStats(oldText, newText);

  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `TC-${String(counter++).padStart(3, "0")}`;

  const classes = entities.filter((e) => e.kind === "class");
  const methods = entities.filter((e) => e.kind === "method" || e.kind === "function");

  // Sınıflara göre akıllı test üretimi
  if (classes.length > 0) {
    for (const cls of classes) {
      const snippet = cls.logicSnippet || "";
      const lowerCls = cls.name.toLowerCase();

      // 1. Can / Sağlık / Hasar Sistemi (Health, Damage, Heal)
      if (lowerCls.includes("health") || snippet.includes("CurrentHealth") || snippet.includes("TakeDamage") || snippet.includes("Heal")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Can Değerleri, Hasar Alma (Damage) ve İyileşme (Heal) Mantığı Testi`,
          type: "Birim / Oyun Mantığı Testi (Unit/Gameplay)",
          priority: "P1 (Kritik)",
          preconditions: `${cls.name} nesnesi sahneye veya test ortamına yüklenmeli (Başlangıç Canı: maxHealth).`,
          steps: [
            `Adım 1: ${cls.name} Awake/Start anında 'CurrentHealth' değerinin 'maxHealth' değerine eşit başladığını doğrulayın.`,
            `Adım 2: Pozitif hasar ile 'TakeDamage(amount)' çağırın ve canın tam olarak hasar miktarı kadar azaldığını teyit edin.`,
            `Adım 3: 'TakeDamage(maxHealth + 100)' çağırarak canın 0'ın altına düşemeyeceğini (Mathf.Max(0, ...)) ve 'IsDead' durumunun 'true' olduğunu kontrol edin.`,
            `Adım 4: Karakter öldükten (IsDead = true) sonra 'TakeDamage' ve 'Heal' çağrıldığında canın değişmediğini (ölü karakterin hasar almadığını veya canlanmadığını) test edin.`,
            `Adım 5: Canı eksilmiş karakterde 'Heal(amount)' çağırarak canın arttığını, ancak asla 'maxHealth' tavanını aşamadığını doğrulayın.`,
          ],
          expectedResult: "Can asla negatif değer alamaz ve maxHealth değerini geçemez; karakter öldüğünde ek hasar veya iyileşme etkisiz kalır.",
        });
      }

      // 2. Envanter / Liste / Kapasite Sistemi (Inventory, Items, Add/Remove)
      else if (lowerCls.includes("inventory") || snippet.includes("capacity") || snippet.includes("AddItem") || snippet.includes("items")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Envanter Kapasite Sınırı, Eşya Ekleme/Silme ve Doğrulama Testi`,
          type: "İş Mantığı / Sınır Değer Testi (Boundary)",
          priority: "P2 (Yüksek)",
          preconditions: `${cls.name} bileşeni başlatılmış olmalı (Kapasite: capacity).`,
          steps: [
            `Adım 1: Geçersiz girdi ile 'AddItem(null)' veya 'AddItem("")' çağırarak fonksiyonun 'false' döndüğünü ve envantere boş eşya eklenmediğini teyit edin.`,
            `Adım 2: Geçerli bir eşya ekleyin ('AddItem("Sword")') ve fonksiyonun 'true' döndüğünü, 'ItemCount' değerinin 1 arttığını kontrol edin.`,
            `Adım 3: Kapasite sınırına ulaşana kadar eşya ekleyin. Kapasite dolduktan sonra yeni bir 'AddItem' çağrıldığında eklemenin reddedildiğini (false) doğrulayın.`,
            `Adım 4: Var olan bir eşya için 'RemoveItem("Sword")' çağırarak silindiğini (true), listede olmayan bir eşya için silmenin 'false' döndüğünü kontrol edin.`,
          ],
          expectedResult: "Boş/geçersiz veriler envantere eklenemez; envanter kapasitesi aşılamaz ve eşya silme işlemleri doğru durum kodlarını üretir.",
        });
      }

      // 3. Duraklatma / Zaman Ölçeği (PauseManager, Time.timeScale)
      else if (lowerCls.includes("pause") || snippet.includes("Time.timeScale") || snippet.includes("SetPaused")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Oyun Duraklatma (Pause), Zaman Ölçeği (TimeScale) ve Menü Kontrol Testi`,
          type: "Sistem ve Girdi Testi (Input & State)",
          priority: "P2 (Yüksek)",
          preconditions: "Oyun sahnede normal hızda (Time.timeScale = 1) çalışıyor olmalı.",
          steps: [
            `Adım 1: Escape tuşuna basarak veya 'SetPaused(true)' çağırarak oyunun duraklatılmasını tetikleyin.`,
            `Adım 2: 'Time.timeScale' değerinin tam olarak '0f' olduğunu ve duraklatma menüsü GameObject'inin aktifleştiğini (SetActive(true)) doğrulayın.`,
            `Adım 3: Tekrar tetikleyerek 'SetPaused(false)' durumuna getirin; 'Time.timeScale' değerinin '1f' olduğunu ve menünün kapandığını kontrol edin.`,
            `Adım 4: Sahne değiştiğinde veya bileşen yok edildiğinde (OnDestroy) 'Time.timeScale' değerinin 1f'e geri getirildiğini ve oyunun donuk kalmadığını test edin.`,
          ],
          expectedResult: "Duraklatıldığında oyun içi fizik ve zaman tamamen durur; menü açılır; devam edildiğinde ve sahne kapandığında zaman ölçeği normale döner.",
        });
      }

      // 4. Cüzdan, Para ve Toplanabilir Nesneler (Wallet, Coins, Collect)
      else if (lowerCls.includes("wallet") || lowerCls.includes("coin") || snippet.includes("AddCoins") || snippet.includes("Collect")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Para/Altın Toplama Mantığı, Çift Toplama Engeli ve Bakiye Testi`,
          type: "Birim / Oynanış Testi (Gameplay Unit)",
          priority: "P2 (Yüksek)",
          preconditions: "PlayerWallet bileşeni ve sahnede aktif CoinPickup nesnesi hazır olmalı.",
          steps: [
            `Adım 1: PlayerWallet başlangıç bakiyesinin (Balance) 0 veya tanımlı değerde olduğunu kontrol edin.`,
            `Adım 2: 'AddCoins(-50)' veya sıfır miktar gönderildiğinde bakiyenin negatif yönde değişmediğini doğrulayın.`,
            `Adım 3: Coin nesnesi üzerinden 'Collect(wallet)' çağırın. Cüzdan bakiyesinin 'coinValue' kadar arttığını ve coin nesnesinin gizlendiğini (SetActive(false)) kontrol edin.`,
            `Adım 4: Zaten toplanmış (collected = true) olan bir coin nesnesi üzerinden tekrar 'Collect' çağrıldığında 'false' döndüğünü ve mükerrer para eklenmediğini test edin.`,
          ],
          expectedResult: "Bir altın nesnesi yalnızca bir kez toplanabilir; cüzdana yalnızca pozitif miktarlar eklenir.",
        });
      }

      // 5. Checkpoint ve Yeniden Doğma (Respawn)
      else if (lowerCls.includes("checkpoint") || snippet.includes("Respawn") || snippet.includes("spawnPoint")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Kayıt Noktası (Checkpoint) Kaydetme ve Yeniden Doğma (Respawn) Testi`,
          type: "Konum ve Durum Doğrulama Testi",
          priority: "P3 (Orta)",
          preconditions: "Player nesnesi ve farklı koordinatlarda Checkpoint nesneleri sahnede konumlandırılmalı.",
          steps: [
            `Adım 1: Başlangıçta spawnPoint noktasının otomatik olarak checkpoint olarak kaydedildiğini kontrol edin.`,
            `Adım 2: 'SaveCheckpoint(point)' metoduna 'null' parametre verildiğinde oyunun çökmediğini teyit edin.`,
            `Adım 3: Karakteri yeni bir koordinata götürüp yeni bir checkpoint tetikleyin.`,
            `Adım 4: 'Respawn()' metodunu çağırın ve oyuncunun tam olarak kaydedilen Vector3 pozisyonuna ve rotasyonuna ışınlandığını doğrulayın.`,
          ],
          expectedResult: "Karakter öldüğünde veya respawn çağrıldığında en son ulaşılan checkpoint koordinatlarında doğru rotasyonla doğmalıdır.",
        });
      }

      // 6. Sepet / Ödeme / Cart
      else if (lowerCls.includes("cart") || lowerCls.includes("payment") || lowerCls.includes("order") || snippet.includes("coupon") || snippet.includes("discount")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Sepet Toplam Tutarı, İndirim Kuponu ve Minimum Tutar Validasyonu`,
          type: "İş Mantığı / Finans Testi (Business Logic)",
          priority: "P1 (Kritik)",
          preconditions: `${cls.name} servisi aktif ve boş bir sepet oluşturulmuş olmalı.`,
          steps: [
            "Adım 1: Negatif fiyatlı veya 0 adetli ürün eklemeyi deneyin, sistemin hata fırlattığını doğrulayın.",
            "Adım 2: Geçerli ürünler ekleyerek sepet toplamının doğru hesaplandığını teyit edin.",
            "Adım 3: Minimum sepet tutarı karşılanmadığında kupon kodunun reddedildiğini kontrol edin.",
            "Adım 4: Geçerli kupon uygulandığında indirimin doğru oranda (%20 vb.) düşüldüğünü ve toplamın asla 0'ın altına inemeyeceğini doğrulayın.",
          ],
          expectedResult: "Fiyat ve adet kontrolleri hatasız çalışır, kupon indirimleri kural ihlali olmadan uygulanır.",
        });
      }

      // 7. Kimlik Doğrulama / Auth / Token
      else if (lowerCls.includes("auth") || lowerCls.includes("login") || lowerCls.includes("token") || snippet.includes("jwt") || snippet.includes("password")) {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Kimlik Doğrulama, Şifre Güvenliği ve Token Kontrol Testi`,
          type: "Güvenlik Testi (Security/Auth)",
          priority: "P1 (Kritik)",
          preconditions: "Yetkilendirme servisi ve test kullanıcı verisi hazır olmalı.",
          steps: [
            "Adım 1: Standartlara uymayan zayıf şifre ile kayıt/giriş deneyin, doğrulama hatası aldığınızı teyit edin.",
            "Adım 2: Hatalı şifre ile ardışık giriş denemeleri yapın ve maksimum limit aşıldığında hesabın geçici kilitlendiğini doğrulayın.",
            "Adım 3: Süresi dolmuş veya manipüle edilmiş JWT token ile korumalı kaynağa istek atın; 401 Unauthorized dönmesini test edin.",
            "Adım 4: Geçerli kimlik bilgileriyle başarılı token üretildiğini ve oturumun açıldığını doğrulayın.",
          ],
          expectedResult: "Güvenlik politikaları tam olarak uygulanır, geçersiz kimlik doğrulama talepleri engellenir.",
        });
      }

      // Genel Tanımlı Sınıflar İçin Akıllı Test
      else {
        testCases.push({
          id: nextId(),
          targetComponent: cls.name,
          title: `[${cls.name}] Sınıfı İlk Başlatma, Durum ve Metot Doğrulama Testi`,
          type: "Birim Testi (Unit)",
          priority: "P2 (Yüksek)",
          preconditions: `${cls.name} sınıfı test ortamında oluşturulmalı.`,
          steps: [
            `Adım 1: ${cls.name} sınıfından bir örnek (instance) oluşturun.`,
            `Adım 2: Sınıfın varsayılan alan ve özelliklerinin geçerli başlangıç değerlerinde olduğunu doğrulayın.`,
            `Adım 3: Temel metotlarını standart parametrelerle çağırıp dönen değerleri kontrol edin.`,
          ],
          expectedResult: `${cls.name} sınıfı belleğe hatasız yüklenmeli ve temel fonksiyonlarını yerine getirmelidir.`,
        });
      }
    }
  }

  // Metotlar / Fonksiyonlar için özel test adımları
  if (methods.length > 0) {
    for (const m of methods.slice(0, 5)) {
      testCases.push({
        id: nextId(),
        targetComponent: m.name,
        title: `[${m.name}] Metodu İş Mantığı ve Girdi Doğrulama Testi`,
        type: "Birim / Fonksiyonel Test",
        priority: "P2 (Yüksek)",
        preconditions: `${m.name} fonksiyonu erişilebilir olmalı.`,
        steps: [
          `Adım 1: '${m.signature || m.name}' fonksiyonunu geçerli standart girdilerle çağırın ve beklenen çıktıyı doğrulayın.`,
          `Adım 2: Sınır değerler (null, boş string, negatif sayı veya taşma değerleri) ile çağırarak hata yönetimini doğrulayın.`,
          `Adım 3: Fonksiyonun idempotent veya yan etkisiz davranışlarını kontrol edin.`,
        ],
        expectedResult: `${m.name} fonksiyonu doğru sonuçları üretmeli ve sınır koşullarında çökmeye yol açmamalıdır.`,
      });
    }
  }

  // Eğer hiçbir şey yakalanamadıysa genel akıllı test adımları
  if (testCases.length === 0) {
    testCases.push(
      {
        id: nextId(),
        title: "Pozitif Akış ve Temel İşlevsellik Kabul Testi",
        type: "Fonksiyonel Test",
        priority: "P1 (Kritik)",
        preconditions: "Değiştirilen kod derlenmiş ve test ortamına kurulmuş olmalı.",
        steps: [
          "Adım 1: Yeni eklenen/güncellenen işlevi standart parametrelerle tetikleyin.",
          "Adım 2: Sistemin beklenen yanıtı ürettiğini ve loglarda hata oluşmadığını doğrulayın.",
        ],
        expectedResult: "İşlem başarıyla tamamlanmalı ve beklenen çıktı eksiksiz dönmelidir.",
      },
      {
        id: nextId(),
        title: "Sınır Değer ve Hata Toleransı Testi",
        type: "Sınır Değer Testi (Boundary)",
        priority: "P2 (Yüksek)",
        preconditions: "Sistem aktif olmalı.",
        steps: [
          "Adım 1: İşleve beklenmeyen, sınır dışı veya boş veri gönderin.",
          "Adım 2: Sistemin çökmeden kontrollü hata ürettiğini doğrulayın.",
        ],
        expectedResult: "Uygulama çökmeye uğramaz, kullanıcıya anlaşılır hata bildirir.",
      }
    );
  }

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `Tespit Edilen Dil/Platform: ${detectedLanguage} • ${diffStats.addedLinesCount} satır eklendi, ${diffStats.removedLinesCount} satır çıkarıldı. İncelenen bileşenler (${
    classes.length > 0 ? classes.map((c) => c.name).join(", ") : "Genel Fonksiyonlar"
  }) analiz edildi; bu mantığa özel toplam ${testCases.length} adet detaylı test adımı oluşturuldu.`;

  return {
    overview,
    detectedLanguage,
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}
