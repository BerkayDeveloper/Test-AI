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
 * Metnin doğal dil promptu veya şartname/doküman olup olmadığını belirler
 */
function isDocumentOrPrompt(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const codeIndicators = [
    "class ", "function ", "def ", "public ", "private ", "protected ",
    "import ", "using ", "namespace ", "const ", "var ", "let ", "void ",
    "<w:t", "CREATE TABLE", "SELECT ", "interface ", "struct ", "package "
  ];
  let codeCount = 0;
  for (const ind of codeIndicators) {
    if (text.includes(ind)) codeCount++;
  }

  const naturalWords = [
    "ve ", "ile ", "için ", "olan ", "eklendi ", "kullanıcı ", "test ", "sistem ",
    "güncellendi ", "olarak ", "şifre ", "hesap ", "durum ", "talep ", "hata ",
    "kural ", "doğrulama ", "kontrol ", "servis ", "adım ", "senaryo ", "olmalı",
    "gerekmektedir", "yapıldığında", "should", "when", "then", "must", "verify"
  ];
  let naturalCount = 0;
  const lower = text.toLowerCase();
  for (const w of naturalWords) {
    if (lower.includes(w)) naturalCount++;
  }

  return naturalCount >= 2 || (codeCount === 0 && text.trim().length > 15);
}

/**
 * Metinden gerçek maddeleri, kuralları ve direktifleri derinlemesine filtreler
 */
function extractMeaningfulDirectives(docText: string): string[] {
  const rawLines = docText.split(/\r?\n/);
  const directives: string[] = [];

  for (const raw of rawLines) {
    let clean = raw.trim();
    clean = clean.replace(/^(\d+[\.\)]|\*|-|•|adım\s*\d*:?|madde\s*\d*:?|gereksinim\s*\d*:?)\s*/i, "").trim();

    if (
      clean.length > 8 &&
      !clean.startsWith("//") &&
      !clean.startsWith("/*") &&
      !clean.startsWith("*") &&
      !clean.startsWith("#") &&
      !clean.toLowerCase().startsWith("örnek:")
    ) {
      directives.push(clean);
    }
  }

  if (directives.length <= 1 && docText.length > 30) {
    const sentences = docText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    return sentences;
  }

  return directives;
}

// ============================================================================
// 1. DEVELOPER DÜŞÜNME SİSTEMİ (Birim, Mimari, Kod Sözleşmesi, Exception & State)
// ============================================================================

function generateDeveloperDocumentPlan(
  title: string,
  category: string,
  docText: string,
  oldText: string
): GeneratedPlan {
  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `DEV-${String(counter++).padStart(3, "0")}`;

  const directives = extractMeaningfulDirectives(docText);
  const lowerAll = (docText + " " + title).toLowerCase();

  const primarySummary = directives[0] || title;
  testCases.push({
    id: nextId(),
    targetComponent: title,
    title: `[Core Sözleşme] ${primarySummary.slice(0, 65)}${primarySummary.length > 65 ? "..." : ""}`,
    type: "İş Mantığı ve Entegrasyon Testi (Developer Core)",
    priority: "P1 (Kritik)",
    preconditions: `Modül ve bağımlılıkları test ortamında ayağa kaldırılmalı. Veri girdisi: "${primarySummary.slice(0, 45)}"`,
    steps: [
      `Adım 1: Giriş verisi olarak tanımlanan şartı hazırlayın: "${primarySummary.slice(0, 80)}"`,
      `Adım 2: İlgili iş mantığını tetikleyin ve dönen nesnenin/yanıtın şema yapısını, dönüş tiplerini doğrulayın.`,
      `Adım 3: Süreç sonunda ilgili veritabanı/hafıza durumunun (state mutation) kurala tam uygun değiştiğini teyit edin.`,
    ],
    expectedResult: `Verilen spesifikasyondaki "${primarySummary.slice(0, 50)}" kuralı tam doğrulukla icra edilir ve hiçbir yan etki hatası oluşmaz.`,
  });

  if (directives.length > 1) {
    directives.slice(1, 6).forEach((directive, idx) => {
      const numbers = directive.match(/\d+[\w\s%/]*/g) || [];
      const hasLimit = directive.toLowerCase().includes("limit") || directive.toLowerCase().includes("dakika") || directive.toLowerCase().includes("süre") || numbers.length > 0;

      testCases.push({
        id: nextId(),
        targetComponent: `Gereksinim Kuralı #${idx + 2}`,
        title: `[Kural Doğrulama] "${directive.slice(0, 60)}${directive.length > 60 ? "..." : ""}"`,
        type: hasLimit ? "Sınır Değer / Kısıtlama Testi (Boundary)" : "Teknik Kural Testi (Logic Specification)",
        priority: idx === 0 || hasLimit ? "P1 (Kritik)" : "P2 (Yüksek)",
        preconditions: `Test harness hazır olmalı. Odak kural: "${directive.slice(0, 50)}"`,
        steps: [
          `Adım 1: Belirtilen direktifi test etmek üzere girdiyi izole edin: "${directive}"`,
          hasLimit && numbers.length > 0
            ? `Adım 2: Metinde geçen kritik eşik değerlerini (${numbers.join(", ")}) sınırda, sınırın 1 altı ve 1 üstünde test edin.`
            : `Adım 2: Kuralın gerektirdiği koşulu sağlayarak metodu çağırın ve durum bayraklarını kontrol edin.`,
          `Adım 3: Kural ihlali durumunda sistemin çökmeden kontrollü ve anlamlı hata/exception fırlattığını teyit edin.`,
          `Adım 4: İşlem başarıyla sonlandığında loglarda ve veri tabanında beklenen durum kaydının oluştuğunu doğrulayın.`,
        ],
        expectedResult: `Metinde belirtilen "${directive.slice(0, 60)}" şartı tavizsiz karşılanmalı, hiçbir koşulda tanımsız davranışa izin verilmemelidir.`,
      });
    });
  }

  if (
    lowerAll.includes("token") ||
    lowerAll.includes("auth") ||
    lowerAll.includes("şifre") ||
    lowerAll.includes("otp") ||
    lowerAll.includes("sms") ||
    lowerAll.includes("2fa") ||
    lowerAll.includes("jwt") ||
    category === "security"
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "Yetkilendirme ve Token Koruma Katmanı",
      title: "[Developer Güvenlik] Geçersiz Token, Süre Aşımı (Expiry) ve Brute-Force Koruması",
      type: "Güvenlik & Exception Testi (Security Unit)",
      priority: "P1 (Kritik)",
      preconditions: "Kimlik doğrulama filtreleri (middleware) ve şifreleme anahtarları aktif olmalı.",
      steps: [
        "Adım 1: Dökümanda belirtilen güvenlik kuralı için geçersiz veya süresi dolmuş kimlik verisiyle istek oluşturun.",
        "Adım 2: HTTP 401 Unauthorized / 403 Forbidden kodunun döndüğünü ve hassas iç hata detaylarının (stack trace) sızdırılmadığını doğrulayın.",
        "Adım 3: Ardışık hatalı denemelerde (örneğin rate limit veya hesap kilidi tetikleyerek) güvenlik eşiklerinin tam zamanında devreye girdiğini test edin.",
      ],
      expectedResult: "Yetkisiz veya süresi dolmuş hiçbir istek iş mantığına ulaşamaz; güvenlik sınırları ihlal edilemez.",
    });
  }

  if (
    lowerAll.includes("ödeme") ||
    lowerAll.includes("sepet") ||
    lowerAll.includes("kupon") ||
    lowerAll.includes("tutar") ||
    lowerAll.includes("fiyat") ||
    lowerAll.includes("indirim") ||
    lowerAll.includes("bakiye")
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "İşlem Bütünlüğü ve Matematiksel Hesaplama",
      title: "[Finans & Veri Bütünlüğü] Hassas Tutar Hesaplaması, İndirim Limitleri ve Çift İstek İdempotency Testi",
      type: "Bütünlük & Idempotency Testi (Data Integrity)",
      priority: "P1 (Kritik)",
      preconditions: "Ödeme veya sepet servisi izole test veritabanında başlatılmalı.",
      steps: [
        "Adım 1: Dökümandaki kurallar uyarınca hesaplama formülünü uç değerler (0 TL, küsuratlı float değerler, minimum sepet) ile çalıştırın.",
        "Adım 2: Aynı işlem için eşzamanlı (concurrency) iki istek göndererek çift harcama veya mükerrer indirim uygulanmadığını doğrulayın.",
        "Adım 3: İşlem hata aldığında veya iptal edildiğinde (rollback) bakiyenin/envanterin önceki haline eksiksiz döndüğünü teyit edin.",
      ],
      expectedResult: "Hesaplamalar kuruş hassasiyetinde tutarlı olmalı; eşzamanlı istekler işlemi mükerrer tetiklememelidir.",
    });
  }

  testCases.push({
    id: nextId(),
    targetComponent: "Hata Toleransı & Exception Handler",
    title: `[Robustness] "${title}" İçin Null, Tip Uyuşmazlığı ve İstisna (Exception) Testi`,
    type: "İstisna & Dayanıklılık Testi (Robustness)",
    priority: "P2 (Yüksek)",
    preconditions: "Modül loglama seviyesi DEBUG moduna alınmış olmalı.",
    steps: [
      `Adım 1: '${title}' için tanımlanan girdilere null, undefined, boş string veya beklenmedik tipte veri gönderin.`,
      "Adım 2: Sistemin yakalanmamış istisna (unhandled rejection / null pointer) ile çökmediğini, kontrollü hata ürettiğini doğrulayın.",
      "Adım 3: Sistem loglarında açıklayıcı ve izlenebilir (correlation ID içeren) hata kaydının oluştuğunu teyit edin.",
    ],
    expectedResult: "Bileşen sınır koşullarında çökmeye dirençlidir ve tutarlı hata nesneleri üretir.",
  });

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `[Developer Perspektifi] Girilen doküman ve prompt analiz edildi (${directives.length} kural maddesi tespit edildi). "${title}" kapsamındaki tüm iş kuralları, durum değişimleri, sınır değerler ve exception akışları doğrudan girdiğiniz verileri tarif edecek şekilde ${testCases.length} adet test senaryosu ile modellendi.`;

  return {
    overview,
    detectedLanguage: "Gereksinim / Doküman Spesifikasyonu (Developer Mode)",
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}

function generateDeveloperCodePlan(
  title: string,
  category: string,
  code: string,
  oldText: string
): GeneratedPlan {
  const { language: detectedLanguage } = detectLanguage(code);
  const entities = parseCodeEntities(code);
  const diffStats = computeDiffStats(oldText, code);

  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `DEV-${String(counter++).padStart(3, "0")}`;

  const classes = entities.filter((e) => e.kind === "class");
  const methods = entities.filter((e) => e.kind === "method" || e.kind === "function");

  if (classes.length > 0) {
    for (const cls of classes) {
      const snippet = cls.logicSnippet || "";
      const fields = snippet.match(/(?:private|public|protected)?\s+(?:readonly\s+)?([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*(=|;)/g) || [];
      const cleanFields = fields.map((f) => f.trim()).slice(0, 3);

      testCases.push({
        id: nextId(),
        targetComponent: cls.name,
        title: `[${cls.name}] Yaşam Döngüsü, State Başlatma ve Constructor Doğrulama Testi`,
        type: "Birim Testi (Unit Lifecycle)",
        priority: "P1 (Kritik)",
        preconditions: `${cls.name} sınıfı için mock bağımlılıklar ve test ortamı izole edilmeli.`,
        steps: [
          `Adım 1: '${cls.name}' sınıfından yeni bir örnek (instance) türetin.`,
          cleanFields.length > 0
            ? `Adım 2: Tanımlı özelliklerin (${cleanFields.map((cf) => cf.replace(/;/g, "")).join(", ")}) başlangıç değerlerini ve varsayılan durumlarını assert edin.`
            : `Adım 2: Nesnenin belleğe null olmadan ve beklenen varsayılan değerlerle yüklendiğini teyit edin.`,
          `Adım 3: Sınıfın dispose veya teardown döngüsünde kaynak sızıntısı (memory leak) bırakmadığını doğrulayın.`,
        ],
        expectedResult: `${cls.name} nesnesi hatasız initialize edilir, iç durum değişkenleri tutarlı başlar.`,
      });
    }
  }

  if (methods.length > 0) {
    for (const m of methods.slice(0, 6)) {
      const sig = m.signature || m.name;
      testCases.push({
        id: nextId(),
        targetComponent: m.name,
        title: `[${m.name}] '${sig}' Girdi-Çıktı Kontratı ve Sınır Değer Doğrulaması`,
        type: "Metot Mantık Testi (Contract & Logic)",
        priority: "P1 (Kritik)",
        preconditions: `'${m.name}' metodunun çağrılabilmesi için nesne/modül başlatılmış olmalı.`,
        steps: [
          `Adım 1: '${sig}' metodunu geçerli ve beklenen tipik parametrelerle çağırıp dönen değerin tip ve içeriğini assert edin.`,
          `Adım 2: Sınır değerler (boundary values: minimum, maksimum, 0, boş veya negatif) vererek metodun taşma veya beklenmeyen yanıt üretmediğini teyit edin.`,
          `Adım 3: Geçersiz girdilerle (null, undefined, malformed data) çağırarak uygun ArgumentException veya validation hatası ürettiğini doğrulayın.`,
          `Adım 4: Metodun yan etkilerini (state mutation, harici çağrı veya database yazımı) kontrol edin.`,
        ],
        expectedResult: `'${m.name}' metodu sözleşmesine sadık kalır; sınır değerlerde ve geçersiz parametrelerde kontrollü davranır.`,
      });
    }
  }

  if (testCases.length === 0) {
    testCases.push(
      {
        id: nextId(),
        targetComponent: title,
        title: `[Fonksiyonel Kod İncelemesi] "${title}" Mantıksal Yürütme Testi`,
        type: "Kod Yürütme Testi (Execution)",
        priority: "P1 (Kritik)",
        preconditions: "Yazılan kod parçacığı derlenmiş ve test yürütücüsüne yüklenmiş olmalı.",
        steps: [
          "Adım 1: Kodun giriş noktasını belirlenen standart parametrelerle çalıştırın.",
          "Adım 2: Çıktının ve yan etkilerin beklenen veri yapısıyla uyuştuğunu doğrulayın.",
          "Adım 3: Çalışma anında loglarda hiçbir unhandled exception oluşmadığını teyit edin.",
        ],
        expectedResult: "Kod mantığı başarıyla yürütülür ve beklenen teknik çıktıyı üretir.",
      },
      {
        id: nextId(),
        targetComponent: "Hata Toleransı",
        title: `[Hata Toleransı] "${title}" İçin Negatif Parametre ve Güvenlik Sınır Testi`,
        type: "Negatif & Sınır Testi (Boundary)",
        priority: "P2 (Yüksek)",
        preconditions: "Test ortamı devrede olmalı.",
        steps: [
          "Adım 1: Koda sınır değerler ve beklenmedik veri türleri enjekte edin.",
          "Adım 2: Sistemin çökmek yerine kontrollü hata veya varsayılan durum ürettiğini doğrulayın.",
        ],
        expectedResult: "Uygulama çökmeye karşı dayanıklıdır ve güvenli şekilde sonlanır.",
      }
    );
  }

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `[Developer Perspektifi] Dil: ${detectedLanguage} • ${diffStats.addedLinesCount} satır eklendi, ${diffStats.removedLinesCount} satır çıkarıldı. İncelenen bileşenler (${
    classes.length > 0 ? classes.map((c) => c.name).join(", ") : "İşlevsel Kod Blokları"
  }) analiz edildi; doğrudan kodun metodlarına, parametrelerine ve istisna yollarına özel ${testCases.length} adet test senaryosu üretildi.`;

  return {
    overview,
    detectedLanguage: `${detectedLanguage} (Developer Mode)`,
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}

// ============================================================================
// 2. QA DÜŞÜNME SİSTEMİ (Tester Perspektifi: E2E, Kullanıcı Akışları,
//    UI/UX Geri Bildirimleri, Negatif Sınırlar, Regresyon ve Kabul Kriterleri)
// ============================================================================

/**
 * QA TESTER DÜŞÜNME MOTORU (Şartname / Doküman / Prompt Analizi):
 * Bir QA Test Mühendisi gibi düşünür:
 * - Developer gibi koda veya sınıflara değil; kullanıcı akışına (User Journey),
 * - Ekranda/arayüzde görünen uyarılara (Toast, error message, modal),
 * - Pozitif Happy-Path senaryosuna,
 * - Tester'ın sınır değerleri ve uç durumları (Equivalence Partitioning & BVA) zorlamasına,
 * - Yanlış kullanıcı davranışlarına (Negative Testing),
 * - Yetki, oturum veya bağlantı kopması gibi gerçek saha koşullarına odaklanır.
 */
function generateQADocumentPlan(
  title: string,
  category: string,
  docText: string,
  oldText: string
): GeneratedPlan {
  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `QA-${String(counter++).padStart(3, "0")}`;

  const directives = extractMeaningfulDirectives(docText);
  const lowerAll = (docText + " " + title).toLowerCase();

  // 1. QA POZİTİF UÇTAN UCA KULLANICI KABUL TESTİ (Happy Path User Journey)
  const mainRule = directives[0] || title;
  testCases.push({
    id: nextId(),
    targetComponent: "Uçtan Uca Kullanıcı Akışı (End-to-End User Flow)",
    title: `[Happy Path] "${mainRule.slice(0, 60)}" Standard Kullanım ve Başarı Akışı`,
    type: "Kullanıcı Kabul Testi (UAT / Positive Functional)",
    priority: "P1 (Kritik / Blocker)",
    preconditions: `Uygulama test ortamında açık, geçerli test kullanıcısı/oturum açık ve gerekli ön veriler hazır olmalı.`,
    steps: [
      `Adım 1: Kullanıcı arayüzüne veya ilgili işlem ekranına giriş yapın.`,
      `Adım 2: Dokümanda tanımlanan "${mainRule.slice(0, 70)}" senaryosu için geçerli ve standart tüm form alanlarını eksiksiz doldurun.`,
      `Adım 3: İşlemi tetikleyen onay butonuna tıklayın (Submit/Onayla).`,
      `Adım 4: Ekranda beklenen başarı bildiriminin (Success toast, onay mesajı veya yönlendirme) net olarak görüntülendiğini doğrulayın.`,
      `Adım 5: Sayfayı yenileyerek veya listeleme ekranını kontrol ederek oluşturulan işlemin kalıcı şekilde kaydedildiğini teyit edin.`,
    ],
    expectedResult: `Kullanıcı işlemi pürüzsüzce tamamlar; arayüz net bir başarı geri bildirimi verir ve veri tutarlı şekilde ekrana yansır.`,
  });

  // 2. BELİRTİLEN HER BİR KURAL İÇİN TESTER TEST SENARYOLARI (Sınır Değer & Kural Denetimi)
  directives.forEach((directive, idx) => {
    const numbers = directive.match(/\d+[\w\s%/]*/g) || [];
    const hasNumbers = numbers.length > 0;

    // Sınır Değer Analizi (Boundary Value Analysis)
    if (hasNumbers || directive.toLowerCase().includes("limit") || directive.toLowerCase().includes("süre") || directive.toLowerCase().includes("en az") || directive.toLowerCase().includes("en fazla")) {
      testCases.push({
        id: nextId(),
        targetComponent: "Girdi Validasyonu & Sınır Kontrolü",
        title: `[Sınır Değer Analizi] "${directive.slice(0, 55)}${directive.length > 55 ? "..." : ""}"`,
        type: "Sınır Değer Testi (Boundary Value Analysis)",
        priority: "P1 (Kritik)",
        preconditions: `İlgili işlem ekranı açık olmalı. Test edilecek kural: "${directive.slice(0, 50)}"`,
        steps: [
          `Adım 1: Metinde geçen tam sınır değerleri (${numbers.join(", ") || "tanımlı limit"}) girerek işlemin geçerli kabul edildiğini doğrulayın (Tam Eşik Değeri).`,
          `Adım 2: Sınırın tam 1 birim altındaki değeri girin ve sistemin kurala göre beklenen tepkiyi verdiğini gözlemleyin.`,
          `Adım 3: Sınırın tam 1 birim üstündeki aşım değerini girin ve sistemin işlemi engelleyip kullanıcıya anlaşılır hata uyarısı gösterdiğini doğrulayın (Aşım Kontrolü).`,
          `Adım 4: Negatif, 0 veya boş (whitespace) değerler girildiğinde butonun disable olduğunu veya form validasyonunun tetiklendiğini kontrol edin.`,
        ],
        expectedResult: `Sınır değerlerde sistem matematiksel ve mantıksal olarak tam beklenen tepkiyi verir; aşım durumlarında kullanıcıyı engelleyip net uyarı sunar.`,
      });
    } else {
      // Fonksiyonel İş Kuralı Uygunluğu
      testCases.push({
        id: nextId(),
        targetComponent: "İş Kuralı Doğrulaması",
        title: `[Fonksiyonel Doğrulama] "${directive.slice(0, 55)}${directive.length > 55 ? "..." : ""}"`,
        type: "İş Kuralı Kabul Testi (Functional Specification)",
        priority: "P2 (Yüksek)",
        preconditions: `Test ortamında "${directive.slice(0, 45)}" kuralını tetikleyecek kullanıcı profili hazır olmalı.`,
        steps: [
          `Adım 1: Tanımlanan "${directive}" senaryosundaki adımları kullanıcı arayüzü üzerinden birebir uygulayın.`,
          `Adım 2: Sistemin kurula uygun işlem yapıp yapmadığını buton durumları, form alanları ve ekrandaki sonuç verisi üzerinden doğrulayın.`,
          `Adım 3: İşlem sırasında herhangi bir UI donması, sonsuz yükleme animasyonu (infinite loader) veya konsolda 500 hatası olmadığını gözlemleyin.`,
        ],
        expectedResult: `Verilen şartname maddesi kullanıcı gözüyle hatasız çalışır ve ekrandaki veriler kurala tam uygun şekilde güncellenir.`,
      });
    }
  });

  // 3. QA GÜVENLİK, OTURUM VE YETKİLENDİRME TESTLERİ
  if (
    lowerAll.includes("token") ||
    lowerAll.includes("auth") ||
    lowerAll.includes("şifre") ||
    lowerAll.includes("otp") ||
    lowerAll.includes("sms") ||
    lowerAll.includes("2fa") ||
    lowerAll.includes("yetki") ||
    category === "security"
  ) {
    testCases.push({
      id: nextId(),
      targetComponent: "Kullanıcı Güvenlik & Doğrulama Arayüzü",
      title: "[QA Güvenlik] Hatalı Giriş Denemeleri, Maskeleme ve Kilitlenme (Lockout) Arayüzü Testi",
      type: "Güvenlik & Arayüz Dayanıklılık Testi",
      priority: "P1 (Kritik)",
      preconditions: "Giriş/doğrulama formu açık, SMS/OTP servisi test simülasyon modunda olmalı.",
      steps: [
        "Adım 1: Şifre ve OTP/kod alanına yanlış, eksik haneli veya alfanumerik geçersiz karakterler yazmayı deneyin.",
        "Adım 2: Şifre alanlarının arayüzde doğru maskelendiğini (••••••) ve göze tıklayarak göster/gizle butonunun çalıştığını teyit edin.",
        "Adım 3: Arka arkaya limitin üzerinde hatalı deneme yapın; sistemin kullanıcıyı geçici süre bloke ettiğini ve kalan süreyi geri sayım olarak ekranda gösterdiğini doğrulayın.",
        "Adım 4: Tarayıcı geri (Back) butonuna basıldığında oturumun yetkisiz şekilde devam etmediğini teyit edin.",
      ],
      expectedResult: "Kullanıcı güvenliği tam sağlanır; brute-force denemeleri ekranda net kilitlenme mesajıyla durdurulur.",
    });
  }

  // 4. QA KULLANICI DENEYİMİ, İPTAL VE ÇİFT TIKLAMA (Double Click) TESTİ
  testCases.push({
    id: nextId(),
    targetComponent: "Kullanıcı Deneyimi & Çift Tıklama Engeli (UX/Debounce)",
    title: `[QA UX & Dayanıklılık] "${title}" Butonuna Çift Tıklama (Double-Click) ve İşlem İptal Testi`,
    type: "Kullanıcı Deneyimi & Eşzamanlılık Testi (UX & Concurrency)",
    priority: "P2 (Yüksek)",
    preconditions: "İlgili form doldurulmuş ve gönderme aşamasında olmalı.",
    steps: [
      `Adım 1: '${title}' işlemini tetikleyen onay butonuna çok hızlı şekilde arka arkaya 2-3 kez tıklayın (Double-click abuse).`,
      "Adım 2: İlk tıklamadan hemen sonra butonun disable/loading durumuna geçtiğini ve mükerrer istek gönderilmediğini doğrulayın.",
      "Adım 3: İşlem devam ederken veya modal açıkken 'Vazgeç/İptal' butonuna tıklayarak akışın temiz şekilde sonlandığını ve verilerin bozulmadığını kontrol edin.",
      "Adım 4: İşlem tamamlandıktan sonra formun sıfırlandığını ve tekrar aynı verilerin yanlışlıkla gönderilemeyeceğini test edin.",
    ],
    expectedResult: "Çift tıklamada mükerrer işlem oluşmaz; iptal senaryoları sorunsuz çalışır ve kullanıcı deneyimi kesintiye uğramaz.",
  });

  // 5. QA REGRESYON VE SAHA KOŞULLARI TESTİ (Ağ kesintisi & Yenileme)
  testCases.push({
    id: nextId(),
    targetComponent: "Ağ Toleransı & Sayfa Yenileme (Regression)",
    title: `[QA Regresyon] Ağ Bağlantı Kopması ve F5 Yenileme Durumunda Veri Bütünlüğü Testi`,
    type: "Regresyon ve Hata Kurtarma Testi (Resilience)",
    priority: "P2 (Yüksek)",
    preconditions: "Tarayıcı Geliştirici Araçları (Network tab) açık olmalı.",
    steps: [
      `Adım 1: '${title}' işlemi sırasında tarayıcıyı Offline (Çevrimdışı) moduna alın ve işlem yapmayı deneyin.`,
      "Adım 2: Ekranda anlaşılır bir 'İnternet bağlantınızı kontrol edin' uyarısı çıktığını ve uygulamanın beyaz ekrana (Crash) düşmediğini doğrulayın.",
      "Adım 3: Ağ bağlantısını tekrar aktif edip işlemi tamamlayın.",
      "Adım 4: İşlem tamamlandıktan sonra F5 (Sayfa Yenileme) yapın; verilerin kalıcı kaldığını ve arayüzün doğru başlangıç durumunda açıldığını teyit edin.",
    ],
    expectedResult: "Ağ kesintilerinde kullanıcıya dostça hata verilir; sayfa yenilendiğinde hiçbir veri kaybı veya UI bozulması yaşanmaz.",
  });

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `[QA Tester Perspektifi] Girilen döküman ve gereksinimler bir Test Mühendisi gözüyle analiz edildi (${directives.length} kural ve kullanıcı senaryosu tespit edildi). Doğrudan girilen verinin kullanıcı kabul kriterleri, sınır değerleri (BVA), UI/UX geri bildirimleri, çift tıklama koruması ve negatif hata yolları test edilecek şekilde ${testCases.length} adet detaylı test senaryosu oluşturuldu.`;

  return {
    overview,
    detectedLanguage: "Kullanıcı Şartnamesi / Kabul Kriterleri (QA Tester Mode)",
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}

/**
 * QA TESTER DÜŞÜNME MOTORU (Kaynak Kod Analizi):
 * Bir QA Test Mühendisi kodu incelerken kodun mimarisine değil;
 * o kodun son kullanıcıya, arayüze ve sistem işleyişine yansıyan davranışlarına odaklanır:
 * - Public API ve kullanıcı etkileşimleri
 * - Can, hasar, bakiye, sepet, envanter gibi işlevsel durumların kullanıcıya yansıması
 * - Negatif girdi toleransları ve kullanıcıya gösterilen hata mesajları
 */
function generateQACodePlan(
  title: string,
  category: string,
  code: string,
  oldText: string
): GeneratedPlan {
  const { language: detectedLanguage } = detectLanguage(code);
  const entities = parseCodeEntities(code);
  const diffStats = computeDiffStats(oldText, code);

  const testCases: TestCase[] = [];
  let counter = 1;
  const nextId = () => `QA-${String(counter++).padStart(3, "0")}`;

  const classes = entities.filter((e) => e.kind === "class");
  const methods = entities.filter((e) => e.kind === "method" || e.kind === "function");

  // 1. SINIFLARIN KULLANICI ETKİLEŞİMİ VE DURUM DEĞİŞİMİ TESTİ (Tester Gözüyle)
  if (classes.length > 0) {
    for (const cls of classes) {
      testCases.push({
        id: nextId(),
        targetComponent: cls.name,
        title: `[QA Kabul Testi] '${cls.name}' Bileşeninin Fonksiyonel Davranışı ve Durum Doğrulaması`,
        type: "Fonksiyonel Kullanıcı Testi (Functional QA)",
        priority: "P1 (Kritik)",
        preconditions: `${cls.name} bileşeni test ortamında veya sahnede aktif ve erişilebilir olmalı.`,
        steps: [
          `Adım 1: '${cls.name}' bileşenini varsayılan başlangıç durumunda inceleyin ve tüm göstergelerin doğru başladığını doğrulayın.`,
          `Adım 2: Bileşene ait temel aksiyonları kullanıcı adımlarıyla tetikleyin ve ekrandaki/durumdaki anlık değişimleri teyit edin.`,
          `Adım 3: İşlem sırasında görsel bir takılma, tutarsız durum geçişi veya kullanıcıyı kilitleyen bir bug olmadığını doğrulayın.`,
        ],
        expectedResult: `${cls.name} bileşeni son kullanıcı deneyimi açısından beklendiği gibi tepki verir ve durumu doğru korur.`,
      });
    }
  }

  // 2. METOTLAR İÇİN TESTER KULLANICI GİRDİ DOĞRULAMASI
  if (methods.length > 0) {
    for (const m of methods.slice(0, 5)) {
      testCases.push({
        id: nextId(),
        targetComponent: m.name,
        title: `[QA Girdi-Çıktı Testi] '${m.name}' İşlevinde Pozitif Kullanım ve Sınır Değer Doğrulaması`,
        type: "Girdi & Validasyon Testi (Black-Box Testing)",
        priority: "P2 (Yüksek)",
        preconditions: `'${m.name}' işlevinin tetiklenebileceği ekran veya arayüz hazır olmalı.`,
        steps: [
          `Adım 1: '${m.name}' işlevine standart ve beklenen kullanıcı girdisi sağlayarak tetikleyin ve çıktının doğruluğunu gözlemleyin.`,
          `Adım 2: Alanı boş bırakarak, maksimum karakteri aşarak veya geçersiz format girerek kullanıcıya gösterilen hata uyarısını test edin.`,
          `Adım 3: Hatalı girdi sonrası doğru veri girildiğinde hata mesajının kendiliğinden kaybolduğunu ve işlemin devam edebildiğini teyit edin.`,
        ],
        expectedResult: `'${m.name}' işlevi kullanıcı hatalarını zarafetle yakalar; anlaşılır geri bildirim sunar ve çökmeye yol açmaz.`,
      });
    }
  }

  // 3. EĞER HİÇBİR ENTITY BULUNAMADIYSA GENEL TESTER KABUL TESTLERİ
  if (testCases.length === 0) {
    testCases.push(
      {
        id: nextId(),
        targetComponent: title,
        title: `[QA Kabul] "${title}" Pozitif İş Akışı ve Kullanıcı Deneyimi Testi`,
        type: "Uçtan Uca Kabul Testi (End-to-End Acceptance)",
        priority: "P1 (Kritik)",
        preconditions: "Yeni kod değişiklikleri test ortamına kurulmuş olmalı.",
        steps: [
          "Adım 1: Değişikliğin yapıldığı ekrana gidin ve işlemi normal kullanıcı senaryosuyla baştan sona tamamlayın.",
          "Adım 2: Sonucun iş gereksinimlerine eksiksiz uyduğunu ve kullanıcıya doğru başarı mesajının iletildiğini doğrulayın.",
        ],
        expectedResult: "Kullanıcı akışı kesintisiz tamamlanır, arayüzde hiçbir hata veya tutarsızlık gözlenmez.",
      },
      {
        id: nextId(),
        targetComponent: "Negatif & Hata Yönetimi",
        title: `[QA Negatif Test] "${title}" Beklenmeyen Kullanıcı Davranışları ve Dayanıklılık Testi`,
        type: "Negatif & Sınır Testi (Negative / Exploratory)",
        priority: "P2 (Yüksek)",
        preconditions: "Sistem aktif çalışıyor olmalı.",
        steps: [
          "Adım 1: Kullanıcı olarak ardışık tıklamalar, geçersiz form doldurma veya geri/ileri butonlarıyla sistemi zorlayın.",
          "Adım 2: Sistemin beyaz ekrana düşmeden kullanıcıyı yönlendirici uyarılarla karşıladığını doğrulayın.",
        ],
        expectedResult: "Sistem beklenmeyen kullanıcı hareketlerinde kararlılığını korur ve açıklayıcı hata mesajı gösterir.",
      }
    );
  }

  const criticalCount = testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length;
  const overview = `[QA Tester Perspektifi] Kod değişiklikleri bir Test Mühendisi (Black-Box & Functional Testing) bakış açısıyla incelendi (${diffStats.addedLinesCount} satır eklendi, ${diffStats.removedLinesCount} satır çıkarıldı). Kodun son kullanıcıya, ekran durumlarına, validasyon mesajlarına ve uç durumlara yansıması ${testCases.length} adet test senaryosu ile modellendi.`;

  return {
    overview,
    detectedLanguage: `${detectedLanguage} (QA Tester Mode)`,
    totalTestCount: testCases.length,
    criticalTestCount: criticalCount,
    testCases,
  };
}

// ============================================================================
// ANA TEST PLANI ÜRETİCİSİ (Persona Karar Mekanizması)
// ============================================================================

export function generateUniversalTestPlan(
  title: string,
  category: string,
  oldText: string,
  newText: string,
  persona: "qa" | "developer" = "qa"
): GeneratedPlan {
  const codeToAnalyze = newText && newText.trim().length > 0 ? newText : oldText;
  const isDoc = isDocumentOrPrompt(codeToAnalyze);

  // 1. QA PERSPEKTİFİ SEÇİLDİYSE:
  if (persona === "qa") {
    if (isDoc) {
      return generateQADocumentPlan(title, category, codeToAnalyze, oldText);
    }
    return generateQACodePlan(title, category, codeToAnalyze, oldText);
  }

  // 2. DEVELOPER PERSPEKTİFİ SEÇİLDİYSE:
  if (isDoc) {
    return generateDeveloperDocumentPlan(title, category, codeToAnalyze, oldText);
  }
  return generateDeveloperCodePlan(title, category, codeToAnalyze, oldText);
}
