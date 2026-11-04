import { ExtractedMediaTelemetry, SecondFrameAnalysis, VisualDomainSummary } from "./videoFrameAnalyzer";

export interface DynamicTestScopeOption {
  id: string;
  title: string;
  badge: string;
  reason: string;
  icon: string;
  selected: boolean;
  isCustom?: boolean;
}

interface MediaAnalysisInput {
  name: string;
  note?: string;
  telemetry?: ExtractedMediaTelemetry;
}

/**
 * Yüklenen video ve fotoğrafların her saniyesinin analiz sonuçlarına ve metadatalarına göre
 * içeriğe özel ekstra hata ve fonksiyonel test senaryolarını dinamik olarak belirler.
 * Kullanıcının eklediği özel kapsamları da korur.
 */
export function detectScopesFromMediaTelemetry(
  mediaItems: MediaAnalysisInput[],
  projectTitle: string = "",
  category: string = "",
  globalNotes: string = "",
  existingCustomScopes: DynamicTestScopeOption[] = []
): DynamicTestScopeOption[] {
  if (!mediaItems || mediaItems.length === 0) {
    return existingCustomScopes.filter((s) => s.isCustom);
  }

  const scopes: DynamicTestScopeOption[] = [];
  const addedIds = new Set<string>();

  const addScope = (scope: Omit<DynamicTestScopeOption, "selected">, defaultSelected: boolean = true) => {
    if (addedIds.has(scope.id)) return;
    addedIds.add(scope.id);
    scopes.push({
      ...scope,
      selected: defaultSelected,
    });
  };

  // 1. Telemetri özetlerini ve saniyelik zaman çizelgelerini topla
  const summaries: VisualDomainSummary[] = mediaItems
    .map((m) => m.telemetry?.visualDomainSummary)
    .filter(Boolean) as VisualDomainSummary[];

  const allEntries: SecondFrameAnalysis[] = mediaItems.flatMap(
    (m) => m.telemetry?.secondBySecondTimeline || []
  );

  // 2. Semantik metin ipuçlarını topla (kategori, özel notlar ve dosya adları)
  const allText = [
    projectTitle,
    category,
    globalNotes,
    ...mediaItems.map((m) => `${m.name} ${m.note || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  // 3. İçerik Alanı (Domain) Tespiti
  const isGame =
    category === "game" ||
    category === "gameplay" ||
    summaries.some((s) => s.isGame) ||
    /\b(game|oyun|gameplay|play|unity|unreal|level|fps|roblox|pubg|minecraft|character|karakter|hasar|damage|can\s*bar[ıi]|health|respawn|checkpoint|envanter|inventory|skor|score|çarpışma|collision|silah|weapon|joystick|wasd|arcade|steam|fifa|gta|valorant)\b/i.test(
      allText
    );

  const isAi =
    category === "ai" ||
    category === "ai_qa" ||
    category === "llm" ||
    summaries.some((s) => s.isAiChat) ||
    /\b(ai|yapay\s*zeka|llm|prompt|istem|üretim|generation|generate|model|chat|bot|streaming|token|görsel\s*üret|metin\s*üret|halüsinasyon|assistant|gpt|gemini|claude|deepseek|midjourney|copilot)\b/i.test(
      allText
    );

  const isEcommerce =
    category === "ecommerce" ||
    category === "ecom" ||
    category === "shop" ||
    summaries.some((s) => s.isEcommerce) ||
    /\b(sepet|cart|checkout|odeme|payment|shop|magaza|urun|product|siparis|order|katalog|fiyat|kupon|indirim)\b/i.test(
      allText
    );

  const isDashboard =
    category === "dashboard" ||
    category === "analytics" ||
    summaries.some((s) => s.isDashboardTable) ||
    /\b(dashboard|panel|tablo|table|grid|rapor|report|analiz|grafik|chart|kpi|istatistik)\b/i.test(
      allText
    );

  const isMediaPlayer =
    category === "media" ||
    category === "video" ||
    summaries.some((s) => s.isMediaPlayer) ||
    /\b(player|video|oynatici|stream|media|film|movie|youtube|netflix|muzik|audio|seekbar)\b/i.test(
      allText
    );

  const isForm =
    category === "auth" ||
    category === "form" ||
    summaries.some((s) => s.isForm) ||
    /\b(form|login|giris|register|kayit|signup|signin|hesap|account|profil|profile|settings|ayarlar|auth|validation)\b/i.test(
      allText
    );

  const isMobile =
    summaries.some((s) => s.isMobile) ||
    mediaItems.some(
      (m) =>
        (m.telemetry && m.telemetry.width < m.telemetry.height) ||
        m.telemetry?.aspectRatioLabel?.includes("9:16") ||
        m.telemetry?.aspectRatioLabel?.includes("Mobil")
    );

  // Anomali ve Dinamik Etkinlik Tespiti
  const modalEntry = allEntries.find((e) => e.eventType === "modal_open" || e.modalOverlayDetected);
  const hasModal = Boolean(modalEntry || summaries.some((s) => s.hasModal));

  const errorEntry = allEntries.find((e) => e.eventType === "error_visual" || e.redAlertScore > 1.2);
  const hasError = Boolean(errorEntry || summaries.some((s) => s.hasError));

  const transEntry = allEntries.find((e) => e.eventType === "screen_transition" || e.diffPercent > 30);
  const hasTransitions = Boolean(transEntry || summaries.some((s) => s.hasTransitions));

  const freezeEntry = allEntries.find(
    (e) =>
      e.eventType === "freeze_or_blank" ||
      e.eventType === "loading_or_wait" ||
      (e.blankState && e.blankState !== "none")
  );
  const hasFreeze = Boolean(freezeEntry || summaries.some((s) => s.hasFreeze));

  // ==========================================
  // 1. OYUN VE GAMEPLAY ALANI TESTLERİ
  // ==========================================
  if (isGame) {
    addScope({
      id: "scope_gameplay_collision",
      title: "Oyun İçi Çarpışma ve Harita Dışı Takılma Testi",
      badge: "Oyun Sahnesi ve Fizik Motoru Tespiti",
      reason: "Görsel karelerde oyun sahnesi ve karakter hareketi tespit edildi. Karakterin nesnelerin içine gömülmesi ve harita dışı boşluğa düşmesi test edilecektir.",
      icon: "🎮",
    });

    addScope({
      id: "scope_gameplay_damage",
      title: "Karakter Can Azalması, Hasar Tepkisi ve Yeniden Doğma Doğrulaması",
      badge: "Can Sistemi ve HUD Tespiti",
      reason: "Oyun içi can barı veya hasar alma anı tespit edildi. Hasar alındığında canın doğru orantılı düşmesi ve yeniden doğma döngüsü test edilecektir.",
      icon: "❤️",
    });

    addScope({
      id: "scope_gameplay_performance",
      title: "Yoğun Efekt Anında Kare Hızı ve Performans Takılması Kontrolü",
      badge: "Yüksek Görsel Efekt Tespiti",
      reason: "Sahnede yoğun görsel değişimler ve parçacık efektleri tespit edildi. Ani kare hızı düşüşü ve gecikme yaşanmaması kontrol edilecektir.",
      icon: "⚡",
    });

    addScope({
      id: "scope_gameplay_controls",
      title: "Oyun İçi Dokunmatik ve Klavye Kontrolleri Tepki Testi",
      badge: "Oyun Kontrol Alanı Tespiti",
      reason: "Karakter yönlendirme ve aksiyon tuşlarının gecikmesiz çalışması ve tuş çakışması olmaması test edilecektir.",
      icon: "🕹️",
    });
  }

  // ==========================================
  // 2. YAPAY ZEKA VE İÇERİK ÜRETİMİ TESTLERİ
  // ==========================================
  if (isAi) {
    addScope({
      id: "scope_ai_streaming",
      title: "Yapay Zeka Yanıt Akışı ve Ağ Kesintisi Dayanıklılığı",
      badge: "Model Yanıt Akışı Tespiti",
      reason: "Yapay zeka istem ve üretim akışı tespit edildi. Ağ dalgalanması anında yanıtın donmaması ve tek tıkla kurtarılması test edilecektir.",
      icon: "🤖",
    });

    addScope({
      id: "scope_ai_token_limit",
      title: "Aşırı Uzun İstem ve Token Sınırı Aşımı Kontrolü",
      badge: "İstem Giriş Alanı Tespiti",
      reason: "Modelin maksimum kabul sınırını aşan istemlerde arayüzün çökmeden açıklayıcı uyarı sunması test edilecektir.",
      icon: "📏",
    });

    addScope({
      id: "scope_ai_rate_limit",
      title: "Hızlı Ardışık İstem ve Model Kotası Sınırlama Yönetimi",
      badge: "Model Kotası ve İstek Tespiti",
      reason: "Hızlı ardışık üretim isteklerinde sistemin kilitlenmemesi ve iptal butonunun modeli durdurması test edilecektir.",
      icon: "🚦",
    });

    addScope({
      id: "scope_ai_chat_history",
      title: "Model Yanıt İptali ve Sohbet Belleği Tutarlılığı",
      badge: "Sohbet Geçmişi Düzeni Tespiti",
      reason: "Kullanıcı yeni istem girdiğinde önceki mesaj bağlamının kaybolmaması ve iptal işleminde kota israfı yapılmaması test edilecektir.",
      icon: "💬",
    });
  }

  // ==========================================
  // 3. E-TİCARET, SEPET VE ÖDEME TESTLERİ
  // ==========================================
  if (isEcommerce) {
    addScope({
      id: "scope_ecommerce_cart",
      title: "Sepet Tutarı, Ürün Miktarı ve Kupon İndirimi Doğrulaması",
      badge: "Sepet ve Ürün Düzeni Tespiti",
      reason: "E-ticaret sepeti veya ürün listesi tespit edildi. Adet değişiminde toplam tutarın ve indirim kuponlarının doğru hesaplanması test edilecektir.",
      icon: "🛒",
    });

    addScope({
      id: "scope_ecommerce_checkout",
      title: "Ödeme Formu Bilgileri ve Kart Maskeleme Güvenlik Testi",
      badge: "Ödeme Ekranı Tespiti",
      reason: "Ödeme veya sipariş tamamlama adımı tespit edildi. Kredi kartı ve CVV verilerinin güvenli maskelenmesi test edilecektir.",
      icon: "💳",
    });

    addScope({
      id: "scope_double_click",
      title: "Satın Al Butonuna Çift Tıklama ve Mükerrer Sipariş Engeli",
      badge: "Ödeme Butonu Tespiti",
      reason: "Ödeme butonuna art arda hızlıca tıklandığında bankaya ve sisteme çift sipariş isteği gönderilmemesi test edilecektir.",
      icon: "⚡",
    });
  }

  // ==========================================
  // 4. VERİ TABLOSU VE DASHBOARD TESTLERİ
  // ==========================================
  if (isDashboard) {
    addScope({
      id: "scope_dashboard_table",
      title: "Veri Tablosu Sıralama, Filtreleme ve Sayfalama Testi",
      badge: "Tablo ve Satır Düzeni Tespiti",
      reason: "Tablo veya veri listesi tespit edildi. Kolon sıralaması, arama filtreleri ve sayfalama geçişlerinin doğruluğu test edilecektir.",
      icon: "📊",
    });

    addScope({
      id: "scope_dashboard_metrics",
      title: "Grafik ve Metrik Kartları Veri Bütünlüğü Doğrulaması",
      badge: "Panel ve KPI Kartları Tespiti",
      reason: "Yönetim paneli metrikleri ve grafikler tespit edildi. İstatistiklerin ve özet kartların doğru hesaplanması test edilecektir.",
      icon: "📈",
    });

    addScope({
      id: "scope_dashboard_export",
      title: "Dışa Aktarma ve Toplu Veri İşlem Dayanıklılığı",
      badge: "Veri İşlem Alanı Tespiti",
      reason: "Büyük veri listelerinde dışa aktarma ve toplu seçim işlemlerinin sistemde donmaya yol açmaması test edilecektir.",
      icon: "📥",
    });
  }

  // ==========================================
  // 5. VİDEO VE MEDYA OYNATICI TESTLERİ
  // ==========================================
  if (isMediaPlayer) {
    addScope({
      id: "scope_media_player",
      title: "Video Oynatıcı Kontrolleri, Oynat Duraklat ve Tam Ekran Testi",
      badge: "Medya Oynatıcı Tespiti",
      reason: "Video veya ses oynatıcı arayüzü tespit edildi. Oynat, duraklat, tam ekran ve kontrollerin doğru tepki vermesi test edilecektir.",
      icon: "🎬",
    });

    addScope({
      id: "scope_media_seekbar",
      title: "İlerleme Çubuğu Atlama ve Arabelleğe Alma Doğrulaması",
      badge: "İlerleme Çubuğu Tespiti",
      reason: "Zaman çizelgesinde ileri veya geri sarıldığında videonun donmadan arabelleğe alınması test edilecektir.",
      icon: "⏩",
    });

    addScope({
      id: "scope_media_quality",
      title: "Ses Seviyesi ve Çözünürlük Değişimi Dayanıklılığı",
      badge: "Ses ve Kalite Kontrolü Tespiti",
      reason: "Ses seviyesi değiştirildiğinde veya video çözünürlüğü ayarlandığında ses ve görüntü senkronizasyonu test edilecektir.",
      icon: "🔊",
    });
  }

  // ==========================================
  // 6. FORM VE KULLANICI GİRİŞ TESTLERİ
  // ==========================================
  if (isForm && !isGame && !isAi && !isEcommerce && !isDashboard && !isMediaPlayer) {
    addScope({
      id: "scope_form_security",
      title: "Form Girdi Alanları Özel Karakter ve Güvenlik Sınır Testi",
      badge: "Form ve Girdi Alanları Tespiti",
      reason: "Veri giriş kutuları tespit edildi. Maksimum karakter sınırları, script etiketleri ve tek tırnak filtreleri test edilecektir.",
      icon: "🔒",
    });

    addScope({
      id: "scope_double_click",
      title: "İşlem Butonuna Çift Tıklama ve Mükerrer İstek Engeli",
      badge: "Form Onay Butonu Tespiti",
      reason: "Onay butonuna art arda iki kez basıldığında mükerrer kayıt oluşmaması test edilecektir.",
      icon: "⚡",
    });

    addScope({
      id: "scope_form_masking",
      title: "Parola ve Hassas Alan Maskeleme Doğrulaması",
      badge: "Hassas Veri Girişi Tespiti",
      reason: "Parola ve hassas veri alanlarında maskeleme göstergesinin ve görünür yap butonunun doğru çalışması kontrol edilecektir.",
      icon: "👁️",
    });
  }

  // ==========================================
  // 7. MOBİL PORTRE (9:16) TESTLERİ
  // ==========================================
  if (isMobile) {
    addScope({
      id: "scope_responsive_overflow",
      title: "Mobil Ekran Çözünürlüğü ve Dikey Düzen Taşma Kontrolü",
      badge: "Dikey Mobil Ekran Tespiti",
      reason: "Dikey mobil çözünürlük tespit edildi. Başlıkların, butonların ve form alanlarının ekran kenarından taşmaması test edilecektir.",
      icon: "📱",
    });

    addScope({
      id: "scope_mobile_touch",
      title: "Dokunmatik Alan Genişliği ve Tek El Kullanılabilirlik Testi",
      badge: "Mobil Dokunmatik Arayüz Tespiti",
      reason: "Mobil ekranda dokunulabilir alanların en az kırk dört piksel genişlikte olması ve butonların çakışmaması test edilecektir.",
      icon: "👆",
    });
  }

  // ==========================================
  // 8. GERÇEK ANOMALİ VE DURUM TESTLERİ (YALNIZCA KARELERDE VARSA)
  // ==========================================
  if (hasModal) {
    addScope({
      id: "scope_modal_trap",
      title: "Açılır Pencere Odak Hapsi ve Kapat Tuşu Kontrolü",
      badge: modalEntry ? `${modalEntry.timestamp} anında Açılır Pencere Tespiti` : "Açılır Modal Penceresi Tespiti",
      reason: "Medyada arka planı karartan açılır modal penceresi tespit edildi. Odak yönetimi ve klavyeden çıkış tuşu test edilecektir.",
      icon: "🪟",
    });
  }

  if (hasError) {
    addScope({
      id: "scope_error_handling",
      title: "Hata Bildirimi Kontrastı ve Arayüz Kurtarma Kontrolü",
      badge: errorEntry ? `${errorEntry.timestamp} anında Hata Sinyali Tespiti` : "Kırmızı Hata Sinyali Tespiti",
      reason: "Ekranda kırmızı renkli hata veya uyarı bildirimi tespit edildi. Hata mesajının okunabilirliği ve kullanıcıyı yönlendirmesi test edilecektir.",
      icon: "⚠️",
    });
  }

  if (hasTransitions) {
    addScope({
      id: "scope_history_nav",
      title: "Tarayıcı Geri Tuşu ile Mükerrer İşlem Koruması",
      badge: transEntry ? `${transEntry.timestamp} anında Ekran Geçişi Tespiti` : "Çoklu Ekran Geçişi Tespiti",
      reason: "Ekranlar arası sayfa geçişi tespit edildi. Tarayıcının geri butonuna basıldığında form durumunun ve verilerin korunması test edilecektir.",
      icon: "🔄",
    });
  }

  if (hasFreeze) {
    addScope({
      id: "scope_freeze_timeout",
      title: "Arayüz Donması ve Yükleniyor Göstergesi Doğrulaması",
      badge: freezeEntry ? `${freezeEntry.timestamp} anında Bekleme Tespiti` : "Arayüz Bekleme Durumu Tespiti",
      reason: "Ekranda bekleme veya donma anı tespit edildi. Kullanıcıya açık bir yükleniyor göstergesi sunulması test edilecektir.",
      icon: "⏳",
    });
  }

  // ==========================================
  // 9. GENEL ARAYÜZ (ÖZEL ALAN TESPİT EDİLMEDİYSE)
  // ==========================================
  const hasSpecificDomain = isGame || isAi || isEcommerce || isDashboard || isMediaPlayer || isForm;
  if (!hasSpecificDomain && scopes.length < 2) {
    addScope({
      id: "scope_ui_alignment",
      title: "Arayüz Bileşenleri Hizalama ve Görsel Bütünlük Doğrulaması",
      badge: "Görsel Tasarım Tespiti",
      reason: "Yüklenen ekran görüntüsündeki metin bloklarının, menülerin ve görsel bileşenlerin tasarım standartlarına uygunluğu test edilecektir.",
      icon: "📐",
    });

    addScope({
      id: "scope_responsive_overflow",
      title: "Farklı Ekran Çözünürlüklerinde Bileşen Taşma Kontrolü",
      badge: "Çoklu Çözünürlük Tespiti",
      reason: "Pencere boyutu veya tarayıcı yakınlaştırması değiştiğinde arayüz bileşenlerinin ekran dışına taşmaması kontrol edilecektir.",
      icon: "🔍",
    });

    addScope({
      id: "scope_keyboard_a11y",
      title: "Klavye ile Odak Yönetimi ve Arayüz Erişilebilirlik Testi",
      badge: "Erişilebilirlik Tespiti",
      reason: "Sekme tuşuyla arayüz bileşenleri arasında sırayla gezinilebilmesi ve odak çerçevesinin görünür olması test edilecektir.",
      icon: "⌨️",
    });

    addScope({
      id: "scope_network_resilience",
      title: "Ağ Kesintisi ve Sayfa Yenileme Dayanıklılık Testi",
      badge: "Sistem Kararlılığı Tespiti",
      reason: "Ağ bağlantısı zayıfladığında sistemin donmaması ve sayfa yenilendiğinde verilerin korunması test edilecektir.",
      icon: "🌐",
    });
  }

  // 10. Kullanıcının manuel olarak eklediği özel kapsamları koru
  if (Array.isArray(existingCustomScopes) && existingCustomScopes.length > 0) {
    for (const customScope of existingCustomScopes) {
      if (customScope.isCustom && !addedIds.has(customScope.id)) {
        addedIds.add(customScope.id);
        scopes.push(customScope);
      }
    }
  }

  return scopes;
}

/**
 * Prompt, doğrudan metin veya PDF/dosya içeriklerini tarayarak
 * ilgili test kapsamlarını dinamik olarak belirler.
 */
export function detectScopesFromTextContent(
  textContent: string,
  projectTitle: string = "",
  category: string = "",
  existingCustomScopes: DynamicTestScopeOption[] = []
): DynamicTestScopeOption[] {
  const combined = `${projectTitle} ${category} ${textContent}`.toLowerCase();
  const scopes: DynamicTestScopeOption[] = [];
  const addedIds = new Set<string>();

  const addScope = (scope: Omit<DynamicTestScopeOption, "selected">, defaultSelected: boolean = true) => {
    if (addedIds.has(scope.id)) return;
    addedIds.add(scope.id);
    scopes.push({
      ...scope,
      selected: defaultSelected,
    });
  };

  // E-Ticaret / Ödeme
  if (/(sepet|cart|odeme|checkout|siparis|kupon|fatura|tutar|fiyat|indirim|kart|kredi|pos)/i.test(combined)) {
    addScope({
      id: "scope_ecommerce_cart",
      title: "Sepet Tutarı, Ürün Miktarı ve Kupon İndirimi Doğrulaması",
      badge: "E-Ticaret ve Sepet Tespiti",
      reason: "Metin içeriğinde sepet, tutar ve sipariş süreçleri tespit edildi. Tutar hesaplama ve indirim doğruluk testleri yapılacaktır.",
      icon: "🛒",
    });
    addScope({
      id: "scope_ecommerce_checkout",
      title: "Ödeme Formu Bilgileri ve Kart Maskeleme Güvenlik Testi",
      badge: "Ödeme Güvenliği Tespiti",
      reason: "Ödeme ve işlem onay adımları için kart ve güvenlik verisi koruma testi.",
      icon: "💳",
    });
    addScope({
      id: "scope_double_click",
      title: "Satın Al Butonuna Çift Tıklama ve Mükerrer Sipariş Engeli",
      badge: "Mükerrer İstek Engeli",
      reason: "Onay butonuna art arda basıldığında çift işlem oluşmaması test edilecektir.",
      icon: "⚡",
    });
  }

  // Giriş / Kimlik Doğrulama / Yetkilendirme
  if (/(login|auth|giris|kayit|register|signup|sifre|password|token|jwt|session|oturum|otp|2fa)/i.test(combined)) {
    addScope({
      id: "scope_auth_security",
      title: "Kimlik Doğrulama, Oturum Güvenliği ve Şifreleme Testi",
      badge: "Oturum ve Yetki Tespiti",
      reason: "Giriş, kayıt ve şifreleme süreçleri tespit edildi. Yetkisiz erişim ve güvenli çıkış senaryoları test edilecektir.",
      icon: "🔐",
    });
    addScope({
      id: "scope_form_security",
      title: "Giriş Alanları Özel Karakter, SQL/XSS Enjeksiyon Filtreleme Testi",
      badge: "Girdi Güvenliği Tespiti",
      reason: "Kullanıcı girdi alanlarında zararlı karakter ve script enjeksiyon koruması test edilecektir.",
      icon: "🛡️",
    });
  }

  // Yapay Zeka / LLM
  if (/(ai|llm|chat|sohbet|prompt|model|gemini|gpt|token|stream|yanit)/i.test(combined)) {
    addScope({
      id: "scope_ai_streaming",
      title: "Yapay Zeka Yanıt Akışı, Boş Prompt ve Karakter Sınırı Kontrolü",
      badge: "AI Modeli Tespiti",
      reason: "Yapay zeka ve istem yönetimi tespit edildi. Akış kesintisi ve boş girdi senaryoları test edilecektir.",
      icon: "🤖",
    });
    addScope({
      id: "scope_ai_rate_limit",
      title: "Hızlı Ardışık İstem ve Model Kotası Sınırlama Yönetimi",
      badge: "Kota ve Rate Limit",
      reason: "Model istek sınırları ve kota aşım bildirimleri test edilecektir.",
      icon: "🚦",
    });
  }

  // Oyun / Gameplay
  if (/(oyun|game|karakter|character|can|health|hasar|damage|envanter|fizik|hud|skor)/i.test(combined)) {
    addScope({
      id: "scope_gameplay_collision",
      title: "Karakter Çarpışma, Harita Sınırları ve Nesneye Gömülme Testi",
      badge: "Oyun Fiziği Tespiti",
      reason: "Oyun mekaniği tespit edildi. Çarpışma ve sınır aşımı testleri yapılacaktır.",
      icon: "🎮",
    });
    addScope({
      id: "scope_gameplay_health",
      title: "Can Barı Azalması, Hasar Tepkisi ve Yeniden Doğma Doğrulaması",
      badge: "Can Mekaniği Tespiti",
      reason: "Karakter hasar alma ve can tükenmesi döngüsü test edilecektir.",
      icon: "❤️",
    });
  }

  // Veri Tablosu / Dashboard / Rapor
  if (/(tablo|table|dashboard|rapor|istatistik|kpi|grafik|filtre|listeleme|export)/i.test(combined)) {
    addScope({
      id: "scope_dashboard_table",
      title: "Veri Tablosu Sıralama, Filtreleme ve Sayfalama Testi",
      badge: "Tablo Düzeni Tespiti",
      reason: "Dinamik veri listeleme, kolon sıralama ve filtreleme testleri uygulanacaktır.",
      icon: "📊",
    });
  }

  // Genel Form ve Doğrulama
  if (/(form|input|alan|zorunlu|validasyon|dogrulama|kaydet|guncelle)/i.test(combined) || scopes.length === 0) {
    addScope({
      id: "scope_form_validation",
      title: "Zorunlu Alanlar, Hatalı Format ve Girdi Sınır Değer Testi",
      badge: "Form Doğrulama Tespiti",
      reason: "Arayüz formlarında boş bırakma, sınır değer ve hatalı format tepkileri test edilecektir.",
      icon: "📝",
    });
  }

  // Dayanıklılık ve Donma Koruması
  addScope({
    id: "scope_freeze_timeout",
    title: "İşlem Esnasında Arayüz Donması ve Yükleniyor Göstergesi Doğrulaması",
    badge: "Arayüz Kararlılık Tespiti",
    reason: "Uzun süren veya asenkron işlemlerde arayüzün kilitlenmemesi ve kullanıcıya net gösterge sunulması test edilecektir.",
    icon: "⏳",
  });

  addScope({
    id: "scope_network_resilience",
    title: "Ağ Kesintisi ve Sayfa Yenileme Dayanıklılık Testi",
    badge: "Veri Kalıcılığı Tespiti",
    reason: "Ağ kopması durumunda veri kaybı yaşanmaması ve net bağlantı uyarısı sunulması test edilecektir.",
    icon: "🌐",
  });

  // Kullanıcı tarafından eklenen özel kapsamları koru
  if (Array.isArray(existingCustomScopes) && existingCustomScopes.length > 0) {
    for (const customScope of existingCustomScopes) {
      if (customScope.isCustom && !addedIds.has(customScope.id)) {
        addedIds.add(customScope.id);
        scopes.push(customScope);
      }
    }
  }

  return scopes;
}
