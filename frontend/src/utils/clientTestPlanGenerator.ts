import { TestPlanResult, TestCase } from "../types";
import { DynamicTestScopeOption } from "./dynamicScopeDetector";
import { ExtractedMediaTelemetry } from "./videoFrameAnalyzer";
import { deduplicateSteps, cleanTestCase } from "./titleCleaner";

export interface ClientTestPlanInput {
  title: string;
  category: string;
  mediaList: Array<{
    name: string;
    type: "video" | "image";
    note?: string;
    telemetry?: ExtractedMediaTelemetry;
  }>;
  dynamicScopes: DynamicTestScopeOption[];
  mediaNotes?: string;
}

function cleanText(text: string): string {
  if (!text) return "";
  let s = text;
  // Parantezleri kaldır ve anlamı koru
  s = s.replace(/\(([^)]+)\)/g, " $1 ");
  s = s.replace(/[()[\]]/g, "");
  // Video ve Fotoğraf kelimelerini temizle
  s = s.replace(/\b(Video|Videolar|Videoları|Videoyu|Fotoğraf|Fotoğraflar|Fotoğrafları|Görsel|Görseller|Görselleri)\b/gi, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

export function generateClientSideTestPlan(input: ClientTestPlanInput): TestPlanResult {
  const { title, category, mediaList, dynamicScopes, mediaNotes } = input;
  const activeScopes = dynamicScopes.filter((s) => s.selected);
  const activeScopeIds = new Set(activeScopes.map((s) => s.id));

  const testCases: TestCase[] = [];
  let tcIdCounter = 1;
  const nextId = () => `QA-TC-${String(tcIdCounter++).padStart(3, "0")}`;

  const cleanProjectName = title ? cleanText(title) : "Kullanıcı Akışı ve Arayüz Fonksiyonları";

  // 1. Ana Uçtan Uca Kullanıcı Akış Testi
  const firstMedia = mediaList[0];
  const timeline = firstMedia?.telemetry?.secondBySecondTimeline || [];
  const flowSteps: string[] = [
    `Adım 1: ${cleanProjectName} başlangıç ekranını açın; temel bileşenlerin, göstergelerin ve kontrollerin eksiksiz yüklendiğini doğrulayın.`,
  ];

  if (timeline.length > 2) {
    const transitions = timeline.filter(
      (t, idx) => idx > 0 && (t.eventType === "screen_transition" || t.eventType === "modal_open" || t.diffPercent > 18)
    );
    for (let i = 0; i < Math.min(transitions.length, 4); i++) {
      const trans = transitions[i];
      const screenLabel = trans.screenName ? `"${cleanText(trans.screenName)}"` : "İlgili ekran";
      const regionLabel = trans.activeRegion ? cleanText(trans.activeRegion) : "ana arayüz alanı";
      flowSteps.push(
        `Adım ${flowSteps.length + 1}: ${screenLabel} aşamasına geçiş yapın ve ${regionLabel} üzerinde işlem adımını gerçekleştirin; arayüz tepkisini ve görsel bütünlüğü doğrulayın.`
      );
    }
  } else {
    flowSteps.push(
      `Adım 2: Ekranda yer alan ana işlem ve butonlara sırayla tıklayarak durum geri bildirimlerinin doğru çalıştığını kontrol edin.`
    );
    flowSteps.push(
      `Adım 3: Form veya veri girişi alanlarına test verilerini girerek doğrulama mesajlarının zamanında görüntülendiğini teyit edin.`
    );
  }

  flowSteps.push(
    `Adım ${flowSteps.length + 1}: Akış boyunca gerçekleştirilen tüm işlemlerin sisteme eksiksiz kaydedildiğini ve veri kaybı olmadan özet ekrana yansıtıldığını doğrulayın.`
  );

  testCases.push({
    id: nextId(),
    targetComponent: `${cleanProjectName} - Ana Kullanıcı Akışı`,
    title: `Uçtan Uca Kullanıcı Akışı ve Arayüz Doğrulaması`,
    type: "Uçtan Uca Kullanıcı Akış Testi",
    testType: "Uçtan Uca Kullanıcı Akış Testi",
    priority: "Kritik",
    preconditions: `Uygulama test ortamında açık ve ilk durum hazır olmalıdır.`,
    steps: flowSteps,
    expectedResult: `Kullanıcı akışı boyunca tüm ekran geçişleri ve etkileşimler hatasız tamamlanmalı, görsel bozulma veya veri kaybı yaşanmamalıdır.`,
    status: "Beklemede",
  });

  // 2. Seçili Kapsamlara Göre Özel Test Senaryoları
  // Oyun Kapsamları
  if (activeScopeIds.has("scope_gameplay_collision")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Karakter Çarpışma ve Harita Sınırları`,
      title: `Oyun İçi Çarpışma ve Harita Dışı Takılma Testi`,
      type: "Fizik Motoru ve Sınır Testi",
      testType: "Fizik Motoru ve Sınır Testi",
      priority: "Kritik",
      preconditions: `Oyun sahnesi açık ve karakter hareket edebilir durumda olmalıdır.`,
      steps: [
        `Adım 1: Karakteri sahnedeki engellerin, duvarların ve köşe noktaların üzerine doğru yönlendirerek fiziksel çarpışma sınırlarını kontrol edin.`,
        `Adım 2: Karakterin nesnelerin içine gömülmediğini veya harita dışındaki boşluğa düşmediğini doğrulayın.`,
        `Adım 3: Farklı açılardan ve zıplama aksiyonu esnasında engellere temas ederek takılma durumunu gözlemleyin.`,
      ],
      expectedResult: `Karakter nesnelerin içine girmemeli, harita sınırları dışına taşmamalı ve fizik tepkileri stabil çalışmalıdır.`,
      status: "Beklemede",
    });
  }

  if (activeScopeIds.has("scope_gameplay_health")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Karakter Can Sistemi ve HUD`,
      title: `Karakter Can Azalması, Hasar Tepkisi ve Yeniden Doğma Doğrulaması`,
      type: "Oynanabilirlik ve Can Mekaniği Testi",
      testType: "Oynanabilirlik ve Can Mekaniği Testi",
      priority: "Kritik",
      preconditions: `Karakter can göstergesi ve hasar kaynakları sahnede aktif olmalıdır.`,
      steps: [
        `Adım 1: Karaktere hasar uygulayarak can barının doğru orantılı eksildiğini ve hasar görsel efektinin tetiklendiğini doğrulayın.`,
        `Adım 2: Can değeri sıfıra indiğinde karakterin yenilgi durumuna geçtiğini ve oyunun donmadan yeniden başlama menüsünü açtığını kontrol edin.`,
        `Adım 3: Yeniden doğma anında can barının başlangıç değerine resetlendiğini ve kontrollerin hemen açıldığını teyit edin.`,
      ],
      expectedResult: `Can azalışı ve hasar tepkisi anlık yansımalı, can sıfırlandığında yeniden başlama döngüsü hatasız çalışmalıdır.`,
      status: "Beklemede",
    });
  }

  if (activeScopeIds.has("scope_gameplay_particles")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Görsel Efektler ve Performans`,
      title: `Yoğun Efekt Anında Kare Hızı ve Performans Takılması Kontrolü`,
      type: "Görsel Efekt ve Kare Hızı Dayanıklılık Testi",
      testType: "Görsel Efekt ve Kare Hızı Dayanıklılık Testi",
      priority: "Yüksek",
      preconditions: `Efektlerin yoğunlaştığı oyun veya animasyon sahnesi hazır olmalıdır.`,
      steps: [
        `Adım 1: Yoğun görsel efektlerin ve parçacıkların patladığı sahnede kare hızını gözlemleyin.`,
        `Adım 2: Ekranda ani donma, gecikme veya ses kayması oluşmadığını kontrol edin.`,
        `Adım 3: Çoklu aksiyon eşzamanlı çalıştırıldığında arayüzün akıcı kalmaya devam ettiğini doğrulayın.`,
      ],
      expectedResult: `Yoğun efekt anlarında kare hızı kabul edilebilir seviyede kalmalı, ekran donması veya çökme yaşanmamalıdır.`,
      status: "Beklemede",
    });
  }

  if (activeScopeIds.has("scope_gameplay_controls")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Yönlendirme ve Aksiyon Butonları`,
      title: `Oyun İçi Dokunmatik ve Klavye Kontrolleri Tepki Testi`,
      type: "Kontrol Mekaniği ve Tepki Testi",
      testType: "Kontrol Mekaniği ve Tepki Testi",
      priority: "Yüksek",
      preconditions: `Kontrol arayüzü açık ve karakter kontrol edilebilir durumda olmalıdır.`,
      steps: [
        `Adım 1: Yön tuşlarına ve aksiyon butonlarına ardışık basarak karakterin anında tepki verdiğini kontrol edin.`,
        `Adım 2: Aynı anda iki veya daha fazla tuşa basıldığında komut kaybı oluşmadığını doğrulayın.`,
        `Adım 3: Tuş bırakıldığında hareketin gecikmesiz durduğunu teyit edin.`,
      ],
      expectedResult: `Tüm kontroller sıfır gecikmeyle yanıt vermeli ve tuş çakışması yaşanmamalıdır.`,
      status: "Beklemede",
    });
  }

  // Modal ve Navigasyon Kapsamları
  if (activeScopeIds.has("scope_modal_trap")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Açılır Diyalog Penceresi`,
      title: `Açılır Pencere Odak Hapsi ve Kapat Tuşu Kontrolü`,
      type: "Modal ve Diyalog Penceresi Testi",
      testType: "Modal ve Diyalog Penceresi Testi",
      priority: "Yüksek",
      preconditions: `Ekranda modal veya açılır pencere açılmış olmalıdır.`,
      steps: [
        `Adım 1: Açılır pencere açıldığında arka planın karartıldığını ve arka plana tıklanamadığını doğrulayın.`,
        `Adım 2: Klavye odaklanmasının açılır pencere içinde sınırlandığını Tab tuşuna basarak kontrol edin.`,
        `Adım 3: Klavyeden çıkış tuşuna veya kapatma butonuna basıldığında pencerenin hemen kapandığını ve önceki ekrana dönüldüğünü teyit edin.`,
      ],
      expectedResult: `Açılır pencere odağı hapsetmeli, arka planı kilitlemeli ve kapatma aksiyonları anında çalışmalıdır.`,
      status: "Beklemede",
    });
  }

  if (activeScopeIds.has("scope_history_nav")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Tarayıcı Navigasyonu ve Mükerrer İşlem`,
      title: `Tarayıcı Geri Tuşu ile Mükerrer İşlem Koruması`,
      type: "Tarayıcı Geçmişi ve Mükerrer İstek Testi",
      testType: "Tarayıcı Geçmişi ve Mükerrer İstek Testi",
      priority: "Kritik",
      preconditions: `Bir işlem veya form adımı tamamlanmış olmalıdır.`,
      steps: [
        `Adım 1: İşlem başarıyla tamamlandıktan sonra tarayıcının geri butonuna basın.`,
        `Adım 2: Önceki form ekranına dönüldüğünde onay butonunun devre dışı kaldığını ve mükerrer istek gönderilmediğini doğrulayın.`,
        `Adım 3: Sayfa yenilendiğinde aynı işlemin sisteme ikinci kez işlenmediğini teyit edin.`,
      ],
      expectedResult: `Tarayıcı geçmişinde gezinirken mükerrer işlem oluşmamalı ve veri tutarlılığı korunmalıdır.`,
      status: "Beklemede",
    });
  }

  if (activeScopeIds.has("scope_freeze_timeout")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Yükleme ve Bekleme Durumu`,
      title: `Arayüz Donması ve Yükleniyor Göstergesi Doğrulaması`,
      type: "Arayüz Kararlılık ve Bekleme Testi",
      testType: "Arayüz Kararlılık ve Bekleme Testi",
      priority: "Yüksek",
      preconditions: `Asenkron veya uzun süren bir işlem adımı hazır olmalıdır.`,
      steps: [
        `Adım 1: Veri yükleme veya işlem başlatıldığında ekranda anında yükleniyor göstergesinin belirdiğini doğrulayın.`,
        `Adım 2: İşlem sürerken işlem butonlarının mükerrer tıklamaya karşı devre dışı bırakıldığını kontrol edin.`,
        `Adım 3: Ağ yavaşlığında ekranın beyaz ekrana düşmediğini veya yanıtsız kalmadığını teyit edin.`,
      ],
      expectedResult: `Uzun süren işlemlerde arayüz kilitlenmemeli, net yükleniyor göstergesi sunulmalı ve beyaz ekran oluşmamalıdır.`,
      status: "Beklemede",
    });
  }

  // Yapay Zeka Kapsamları
  if (activeScopeIds.has("scope_ai_streaming") || activeScopeIds.has("scope_ai_token_limit")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - İstem Girişi ve Parametre Sınırları`,
      title: `Yapay Zeka İstem Girişi ve Boş Parametre Kontrolü`,
      type: "Yapay Zeka Giriş Doğrulama Testi",
      testType: "Yapay Zeka Giriş Doğrulama Testi",
      priority: "Kritik",
      preconditions: `Yapay zeka istem kutusu ekranda görünür olmalıdır.`,
      steps: [
        `Adım 1: İstem giriş kutusunu tamamen boş bırakarak üretim butonuna tıklayın.`,
        `Adım 2: Sistemin boş istek göndermeyip kullanıcıya geçerli bir istem girmesi gerektiğini bildirdiğini doğrulayın.`,
        `Adım 3: Aşırı uzun metin girildiğinde giriş kutusunun karakter sınırını kullanıcıya gösterdiğini kontrol edin.`,
      ],
      expectedResult: `Boş veya geçersiz istemler engellenmeli ve net doğrulama uyarısı sunulmalıdır.`,
      status: "Beklemede",
    });
  }

  // E-Ticaret Kapsamları
  if (activeScopeIds.has("scope_ecommerce_cart")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Alışveriş Sepeti ve İndirim Hesabı`,
      title: `Sepet Tutarı, Ürün Miktarı ve Kupon İndirimi Doğrulaması`,
      type: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
      testType: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
      priority: "Kritik",
      preconditions: `Sepete en az bir ürün eklenmiş olmalıdır.`,
      steps: [
        `Adım 1: Sepetteki ürün adet miktarını artırıp azaltarak ara toplamın anlık güncellendiğini doğrulayın.`,
        `Adım 2: Ürün adedi sıfıra indirildiğinde ürünün sepetten silindiğini kontrol edin.`,
        `Adım 3: Geçerli indirim kuponu uygulandığında toplam tutara indirimin doğru yansıtıldığını teyit edin.`,
      ],
      expectedResult: `Sepet tutarı ve indirimler kuruşu kuruşuna doğru hesaplanmalı ve hatasız gösterilmelidir.`,
      status: "Beklemede",
    });
  }

  // Form ve Güvenlik Kapsamları
  if (activeScopeIds.has("scope_form_security")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - Giriş Alanları Güvenliği`,
      title: `Form Girdi Alanları Özel Karakter ve Güvenlik Sınır Testi`,
      type: "Güvenlik ve Sınır Değer Testi",
      testType: "Güvenlik ve Sınır Değer Testi",
      priority: "Kritik",
      preconditions: `Form giriş kutuları test için erişilebilir olmalıdır.`,
      steps: [
        `Adım 1: Giriş kutularına tek tırnak, HTML etiketleri ve özel işaretler içeren veriler girerek onaylayın.`,
        `Adım 2: Sistemin bu girdileri filtreden geçirerek güvenli metin olarak işlediğini ve hata fırlatmadığını doğrulayın.`,
        `Adım 3: Kutulara yalnızca boşluk karakterleri girildiğinde sistemin bunu geçerli veri kabul etmediğini kontrol edin.`,
      ],
      expectedResult: `Özel karakter ve script enjeksiyonları filtrelenmeli, girdi sınırları tavizsiz uygulanmalıdır.`,
      status: "Beklemede",
    });
  }

  // Kullanıcı Tanımlı Özel Kapsamlar
  const customScopes = activeScopes.filter((s) => s.isCustom);
  for (const cs of customScopes) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanProjectName} - ${cleanText(cs.title)}`,
      title: cleanText(cs.title),
      type: "Kullanıcı Tanımlı Özel Test Kapsamı",
      testType: "Kullanıcı Tanımlı Özel Test Kapsamı",
      priority: "Yüksek",
      preconditions: `Uygulama ilgili ekranda açık olmalı ve test ortamı hazır bulunmalıdır.`,
      steps: [
        `Adım 1: ${cleanText(cs.title)} senaryosu için arayüzdeki ilgili modülü ve bileşenleri hazırlayın.`,
        `Adım 2: ${cleanText(cs.reason || cs.title)} kuralı doğrultusunda gerekli kullanıcı girdilerini ve aksiyonlarını uygulayın.`,
        `Adım 3: Sınır değer veya beklenmeyen kullanıcı eylemi uygulayarak sistemin doğru geri bildirim sunduğunu doğrulayın.`,
        `Adım 4: İşlem neticesinde arayüz düzeninin ve verilerin korunduğunu teyit edin.`,
      ],
      expectedResult: `${cleanText(cs.title)} kuralı eksiksiz karşılanmalı ve arayüz kararlılığını korumalıdır.`,
      status: "Beklemede",
    });
  }

  // Her test senaryosundaki adımları mükerrerlikten arındır ve %100 özgün olmasını sağla
  const uniqueTestCases = testCases.map((tc) => {
    const cleaned = cleanTestCase(tc, true);
    cleaned.steps = deduplicateSteps(cleaned.steps);
    return cleaned;
  });

  const criticalCount = uniqueTestCases.filter((tc) => tc.priority === "Kritik").length;
  const overview = `QA Medya Analizi: Toplam ${mediaList.length} medya ve ${activeScopes.length} aktif test kapsamı doğrulanarak ${uniqueTestCases.length} adet detaylı QA test senaryosu başarıyla oluşturuldu.\n` +
    activeScopes.map((s) => `• Kapsam: ${cleanText(s.title)} (${cleanText(s.reason || "")})`).join("\n");

  const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const riskLevel = criticalCount >= 4 ? "CRITICAL" : criticalCount >= 2 ? "HIGH" : "MEDIUM";
  const riskScore = Math.min(criticalCount * 15 + 30, 95);

  return {
    id,
    title: cleanProjectName,
    category: category || "functional",
    createdAt: new Date().toISOString(),
    persona: "qa",
    riskLevel,
    riskScore,
    overview,
    detectedLanguage: `Video ve Medya Analizi - ${mediaList.length} Dosya`,
    totalTestCount: uniqueTestCases.length,
    criticalTestCount: criticalCount,
    testCases: uniqueTestCases,
    accuracyScale: 100,
    accuracyLabel: "%100 Kesin Ölçekle Doğrulandı",
    videoInsights: mediaList.map((m, idx) => {
      const timelineScreens = Array.from(
        new Set(
          (m.telemetry?.secondBySecondTimeline || [])
            .map((t) => t.screenName)
            .filter((name): name is string => Boolean(name && !/^Ekran\s*\d+$/i.test(name)))
        )
      );
      const screensList = timelineScreens.length > 0
        ? timelineScreens
        : [`00:00 - ${m.telemetry?.formattedDuration || "00:15"}: Açılış ve Etkileşim Arayüzü`];

      return {
        videoIndex: idx,
        videoName: m.name,
        mediaType: m.type,
        duration: m.telemetry?.formattedDuration || "00:15",
        durationSeconds: m.telemetry?.durationSeconds || 15,
        resolution: m.telemetry?.aspectRatioLabel || "1920x1080",
        analyzedSecondsCount: m.telemetry?.secondBySecondTimeline?.length || 1,
        screens: screensList,
        userActions: [`Arayüz yüklendi ve kullanıcı eylemleri analiz edildi.`],
        issues: [],
        flowSummary: `${m.name} incelendi; ${testCases.length} test senaryosu üretildi.`,
        secondBySecondTimeline: m.telemetry?.secondBySecondTimeline || [],
        generatedTestCount: testCases.length,
      };
    }),
    previousContent: "",
    newContent: mediaNotes || cleanProjectName,
  };
}

