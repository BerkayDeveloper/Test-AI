/**
 * Antigravity Test-AI: Frontend Test Başlığı ve Adımları Temizleme Motoru
 * Oluşturulmuş ve oluşturulacak test adımlarını ve başlıklarını gereksiz tanımlardan,
 * köşeli parantezli meta etiketlerden ("[QA Hata Senaryosu ve Kullanıcı Davranışı]", "[Video 1]", vb.),
 * parantez içi açıklamalardan (parantez içindeki anlam doğrudan cümleye yedirilir),
 * video sürelerinden (adminde rozetle gösterilebilir, normal kullanıcıda gizlenir),
 * robotik telemetri ifadelerinden ve tekrar eden adımlardan arındırır.
 * Açık, herkes tarafından anlaşılabilir ve profesyonel test dili sağlar.
 */

/**
 * Köşeli parantezleri ve içindeki gereksiz meta verileri tamamen temizler
 */
export function removeSquareBrackets(text: string = ""): string {
  if (!text) return "";
  let s = text;

  // Özel prefix dönüşümleri: [Video 1: dosya] veya [Görsel 1: dosya] -> Başlıklarda Video ve Fotoğraf kelimeleri istenmediği için tamamen temizlenir
  s = s.replace(/\[\s*Video\s*(\d+)[\s:]*([^\]]*)\]/gi, (_match, _vNum, rest) => {
    const cleanRest = rest ? rest.replace(/\.[^/.]+$/, "").trim() : "";
    return cleanRest ? `${cleanRest}: ` : "";
  });

  // [Görsel 1: dosya] -> temizle
  s = s.replace(/\[\s*Görsel\s*(\d+)[\s:]*([^\]]*)\]/gi, (_match, _gNum, rest) => {
    const cleanRest = rest ? rest.replace(/\.[^/.]+$/, "").trim() : "";
    return cleanRest ? `${cleanRest}: ` : "";
  });

  // [Fotoğraf 1: dosya] -> temizle
  s = s.replace(/\[\s*Fotoğraf\s*(\d+)[\s:]*([^\]]*)\]/gi, (_match, _fNum, rest) => {
    const cleanRest = rest ? rest.replace(/\.[^/.]+$/, "").trim() : "";
    return cleanRest ? `${cleanRest}: ` : "";
  });

  // [Çoklu Video: ...] -> Modüller Arası Akış:
  s = s.replace(/\[\s*Çoklu\s*Video[^\]]*\]/gi, "Modüller Arası Akış: ");

  // Kalan tüm köşeli parantezleri kaldır
  s = s.replace(/\[\s*[^\]]*\]/g, "");
  s = s.replace(/[\[\]]/g, "");

  return s;
}

/**
 * Parantez içindeki () açıklamaları parantezden kurtarır ve anlamını doğrudan cümleye entegre eder.
 * Kullanıcı kuralı: "() içerisinde yazan cümleler yerine direkt cümleyi parentez içerisinde ki anlam olucak cümleler seç"
 */
export function unwrapAndCleanParentheses(text: string = ""): string {
  if (!text) return "";
  let s = text;

  // 1. Bilinen teknik kavram ve kısaltmaları parantezsiz, doğrudan cümle anlamına dönüştür
  s = s.replace(/\(\s*modal\s*[\/,-]?\s*diyalog\s*\)/gi, "modal diyalog penceresi");
  s = s.replace(/\(\s*modal\s*\)/gi, "modal pencere");
  s = s.replace(/\(\s*diyalog\s*\)/gi, "diyalog penceresi");
  s = s.replace(/\(\s*popup\s*\)/gi, "açılır pencere");
  s = s.replace(/\(\s*Double[- ]?Click\s*\)/gi, "art arda iki kez tıklama");
  s = s.replace(/\(\s*double[- ]?click\s*\)/gi, "art arda iki kez tıklama");
  s = s.replace(/\(\s*çift\s*tıklama\s*\)/gi, "art arda iki kez tıklama");
  s = s.replace(/\(\s*ESC\s*(?:veya|ya da|\/)\s*Kapat\s*\)/gi, "kapat butonu veya çıkış tuşu");
  s = s.replace(/\(\s*ESC\s*\)/gi, "klavyeden çıkış tuşu");
  s = s.replace(/\(\s*F5\s*\)/gi, "sayfayı yeniden yükleme");
  s = s.replace(/\(\s*DevTools\s*Console\s*[\/,-]?\s*Network\s*\)/gi, "geliştirici araçları ve ağ kayıtları");
  s = s.replace(/\(\s*DevTools\s*(?:Performance\s*(?:ve\s*)?)?Network\s*\)/gi, "geliştirici araçları ve ağ sekmesi");
  s = s.replace(/\(\s*DevTools\s*\)/gi, "geliştirici araçları");
  s = s.replace(/\(\s*Console\s*[\/,-]?\s*Network\s*\)/gi, "tarayıcı konsolu ve ağ trafiği");
  s = s.replace(/\(\s*Network\s*\)/gi, "ağ trafiği");
  s = s.replace(/\(\s*Console\s*\)/gi, "tarayıcı konsolu");
  s = s.replace(/\(\s*500\s*[\/,-]?\s*Exception\s*\)/gi, "sunucu hatası veya sistem istisnası");
  s = s.replace(/\(\s*Exception\s*\)/gi, "sistem hatası");
  s = s.replace(/\(\s*E2E\s*(?:Replay)?\s*\)/gi, "uçtan uca akış");
  s = s.replace(/\(\s*Resilience\s*\)/gi, "kesinti dayanıklılığı");
  s = s.replace(/\(\s*QA\s*Notes\s*\)/gi, "özel kalite kontrol notları");
  s = s.replace(/\(\s*CLS\s*\)/gi, "ekran düzeni kayması");
  s = s.replace(/\(\s*Debounce\s*\)/gi, "mükerrer tıklama koruması");
  s = s.replace(/\(\s*Pre-?conditions?\s*\)/gi, "");
  s = s.replace(/\(\s*Expected\s*Results?\s*\)/gi, "");
  s = s.replace(/\(\s*Test\s*Steps?\s*\)/gi, "");
  s = s.replace(/\(\s*Target\s*Component\s*\)/gi, "");
  s = s.replace(/\(\s*16:9\s*\)/gi, "");
  s = s.replace(/\(\s*9:16\s*\)/gi, "");
  s = s.replace(/\(\s*(?:Odak Noktası|Konum|Nokta|Bölge):[^\)]*\)/gi, "");
  s = s.replace(/\(\s*X:%\d+,\s*Y:%\d+\s*\)/gi, "");
  s = s.replace(/\(\s*Tam Ekran\s*\)/gi, "tam ekran");
  s = s.replace(/\(\s*Açılış Ekranı\s*\)/gi, "açılış ekranı");
  s = s.replace(/\(\s*Sabit Ekran Görüntüsü\s*\)/gi, "sabit ekran görüntüsü");
  s = s.replace(/\(\s*Değişim Yok\s*\)/gi, "");
  s = s.replace(/\(\s*Başlangıç\s*\)/gi, "başlangıç aşaması");
  s = s.replace(/\(\s*Sonuç\s*\)/gi, "sonuç aşaması");

  // 2. Parantezli video süre ve zaman damgalarını ayıkla: (00:00 - 00:15) veya (00:00)
  s = s.replace(/\(\s*\d{1,2}:\d{2}\s*(?:[-–]|ile)\s*\d{1,2}:\d{2}(?:\s*arasındaki)?\s*\)/gi, "");
  s = s.replace(/\(\s*\d{1,2}:\d{2}(?:\s*saniyesinde|\s*anında)?\s*\)/gi, "");

  // 3. Kalan genel parantezlerin içindeki metni doğrudan cümleye akıcı biçimde entegre et
  s = s.replace(/\(([^)]+)\)/g, (_match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed || /^[-:•*.]+$/.test(trimmed)) return "";
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) return "";
    return ` ${trimmed} `;
  });

  // 4. Kalan tek parantez karakterlerini temizle
  s = s.replace(/[()]/g, "");

  // 5. Noktalama işaretleri öncesindeki ve gereksiz çift boşlukları düzelt
  s = s.replace(/\s+([,.:;!?])/g, "$1");
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

/**
 * Metin içindeki video sürelerini ve zaman damgalarını (00:00, 00:00 - 00:15 vb.) temizler
 */
export function stripVideoTimestamps(text: string = ""): string {
  if (!text) return "";
  let s = text;

  // (00:00 - 00:15) veya 00:00 - 00:15 aralıkları
  s = s.replace(/\b\d{1,2}:\d{2}\s*(?:[-–]|ile)\s*\d{1,2}:\d{2}\s*(?:arasındaki)?\b/gi, "");

  // 00:05 saniyesinde / saniyesindeki / saniyelerinde
  s = s.replace(/\b\d{1,2}:\d{2}\s*saniyesindeki\b/gi, "ekrandaki");
  s = s.replace(/\b\d{1,2}:\d{2}\s*saniyesinde\b/gi, "ilgili adımda");
  s = s.replace(/\b\d{1,2}:\d{2}\s*saniyelerinde\b/gi, "akış boyunca");
  s = s.replace(/\b\d{1,2}:\d{2}\s*saniyesine\b/gi, "son ana");
  s = s.replace(/\b\d{1,2}:\d{2}\s*anında\b/gi, "ilgili adımda");
  s = s.replace(/\b\d+\s*saniyelik\b/gi, "");

  // Bağımsız zaman damgaları: 00:00, 01:23
  s = s.replace(/\b\d{1,2}:\d{2}\b/g, "");

  // Süre rozetleri ve etiketleri: ⏱ Süre: 00:15
  s = s.replace(/⏱\s*Süre:\s*[\d:]+/gi, "");
  s = s.replace(/Süre:\s*[\d:]+/gi, "");

  // Boş kalmış noktalama veya ayraçları temizle
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

/**
 * Bir test senaryosundaki tekrarlanan veya gereksiz alt adımları ayıklar
 * ve sıralı numaralandırma (Adım 1, Adım 2...) uygulayarak her adımın %100 özgün olmasını sağlar.
 */
export function deduplicateSteps(steps: string[] = []): string[] {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  const seen = new Set<string>();
  const seenWordSets: Set<string>[] = [];
  const uniqueSteps: string[] = [];

  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== "string") continue;
    const trimmed = rawStep.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    // Gereksiz durağan/sabit durum veya telemetri adımlarını tamamen atla
    if (
      lower.includes("görünümü stabil devam ediyor") ||
      lower.includes("mikro değişim") ||
      lower.includes("sabit ekran") ||
      lower.includes("hareketsizliği / bekleme") ||
      lower.includes("değişim yok") ||
      lower.includes("değişiklik tespit edilmedi")
    ) {
      continue;
    }

    // Karşılaştırma için normalizasyon (numara, damga, parantez ve noktalama işaretlerini soy)
    const normalized = lower
      .replace(/^adım\s*\d+[\s:.-]*/i, "")
      .replace(/^\d+[\s:.-]*/, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\b\d{1,2}:\d{2}\b/g, "")
      .replace(/[^a-z0-9çğıöşü\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.length < 5) continue;

    // Kelime kümesi benzerliği ve alt cümle kontrolü
    const words = new Set(
      normalized
        .split(" ")
        .filter((w) => w.length > 2 && !["için", "olan", "veya", "gibi", "kadar", "sonra", "önce", "üzere", "doğrulayın", "kontrol", "edin"].includes(w))
    );

    let isDuplicate = false;

    // 1. Birebir aynı normalizasyon
    if (seen.has(normalized)) {
      isDuplicate = true;
    } else {
      // 2. Bir önceki adımın neredeyse aynısı veya alt cümlesi mi?
      for (const prev of seen) {
        if (prev.includes(normalized) || normalized.includes(prev)) {
          isDuplicate = true;
          break;
        }
      }

      // 3. Kelime benzerliği kontrolü (Örtüşme eşiği %55)
      if (!isDuplicate && words.size > 0) {
        for (const prevWords of seenWordSets) {
          let intersection = 0;
          words.forEach((w) => {
            if (prevWords.has(w)) intersection++;
          });
          const minLen = Math.min(words.size, prevWords.size);
          const union = new Set([...words, ...prevWords]).size;
          if (minLen > 0 && (intersection / minLen > 0.6 || intersection / union > 0.55)) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      if (words.size > 0) seenWordSets.push(words);
      uniqueSteps.push(trimmed);
    }
  }

  // Eğer tüm adımlar filtrelendiyse en azından ilk adımı koru
  if (uniqueSteps.length === 0 && steps.length > 0) {
    uniqueSteps.push(steps[0]);
  }

  // Adımları temizleyip Adım 1, Adım 2... olarak yeniden numaralandır
  return uniqueSteps.map((step, idx) => {
    let clean = cleanStepText(step, true);
    clean = clean.replace(/^adım\s*\d+[\s:.-]*/i, "").replace(/^\d+[\s:.-]*/, "").trim();
    return `Adım ${idx + 1}: ${clean}`;
  });
}

/**
 * Robotik sensor / telemetri jargonu temizler, herkesin anlayabileceği doğal QA diline dönüştürür
 */
function humanizeStepLanguage(text: string): string {
  let s = text;

  // Telemetri ve analiz jargonu temizliği
  s = s.replace(/->\s*QA\s*Kontrolü:?\s*/gi, " - ");
  s = s.replace(/QA\s*Kontrolü:?\s*/gi, "");
  s = s.replace(/%\s*[\d.]+\s*(?:görsel\s*)?değişim[a-z0-9]*/gi, "");
  s = s.replace(/\b\d{3,4}x\d{3,4}\s*(?:\([^)]*\))?/gi, ""); // 1920x1080 (16:9)
  s = s.replace(/\bCLS\b/g, "ekran düzeni kayması");
  s = s.replace(/DİKKAT:\s*/gi, "");
  s = s.replace(/Saniye Saniye\s*/gi, "");

  // "Ekran 1", "Ekran 2" gibi genel ve numaralı ekran kalıplarını temizle veya spesifikleştir
  s = s.replace(/\bEkran\s*\d+\s*[-:–—]+\s*/gi, "");
  s = s.replace(/\bScreen\s*\d+\s*[-:–—]+\s*/gi, "");
  s = s.replace(/\bEkran\s*1\b/gi, "Açılış ve Ana Etkileşim Arayüzü");
  s = s.replace(/\bEkran\s*2\b/gi, "İşlem ve Detay Arayüzü");
  s = s.replace(/\bEkran\s*3\b/gi, "Form ve Doğrulama Arayüzü");
  s = s.replace(/\bEkran\s*4\b/gi, "Sonuç ve Onay Arayüzü");
  s = s.replace(/\bEkran\s*\d+\b/gi, "İlgili Arayüz Alanı");

  // Arayüz bölgelerini doğal Türkçe ifadelere dönüştür
  s = s.replace(/Merkez Form\s*\/\s*Ana İçerik Alanı/gi, "Ana form ve içerik alanı");
  s = s.replace(/Alt Aksiyon\s*\/\s*Onay Butonu Bölgesi/gi, "İşlem ve onay butonu");
  s = s.replace(/Üst Navigasyon\s*\/\s*Başlık & Bildirim Barı/gi, "Üst menü ve başlık çubuğu");
  s = s.replace(/Üst Navigasyon\s*\/\s*Başlık Barı/gi, "Üst menü çubuğu");
  s = s.replace(/Sol Menü\s*\/\s*Yan Navigasyon Paneli/gi, "Yan menü ve navigasyon paneli");
  s = s.replace(/Sağ Kontrol\s*\/\s*Durum & Aksiyon Bölgesi/gi, "Durum ve işlem paneli");

  return s;
}

/**
 * Test adım metnini temizler.
 * Köşeli ve normal parantezleri temizleyip içindeki anlamı cümleye doğrudan bağlar.
 * isAdmin = false ise video sürelerini ve zaman damgalarını tamamen gizler.
 */
export function cleanStepText(text: string = "", isAdmin: boolean = false): string {
  if (!text) return "";
  let s = text.trim();

  // 1. Köşeli parantezleri kaldır
  s = removeSquareBrackets(s);

  // 2. Parantez içi açıklamaların anlamını doğrudan cümleye entegre et (parantezsiz)
  s = unwrapAndCleanParentheses(s);

  // 3. Telemetri ve robotik ifadeleri doğal QA diline çevir
  s = humanizeStepLanguage(s);

  // 4. Normal kullanıcılar için video sürelerini ve zaman damgalarını gizle
  if (!isAdmin) {
    s = stripVideoTimestamps(s);
  }

  // 5. Noktalama ve boşluk düzenlemeleri
  s = s.replace(/["'“”]\s*senaryosu/gi, " senaryosu");
  s = s.replace(/^[•\s-:–—]+/, "");
  s = s.replace(/[-:–—\s]+$/, "");
  s = s.replace(/\s{2,}/g, " ");

  return s.trim();
}

/**
 * Test adımını frontend'de göstermek için ayrıştırır
 */
export function formatStepForDisplay(
  step: string = "",
  isAdmin: boolean = false
): { timestamp?: string; text: string } {
  let timestamp: string | undefined = undefined;
  const match = step.match(/\[?(\d{1,2}:\d{2})\]?/);
  if (match) {
    timestamp = match[1];
  }

  const cleanText = cleanStepText(step, isAdmin);
  return {
    timestamp: isAdmin ? timestamp : undefined,
    text: cleanText,
  };
}

export function cleanSubject(subject: string = ""): string {
  if (!subject) return "";
  let s = cleanStepText(subject, false);
  s = s.replace(/^P\d+\s*[-:–]\s*/i, "");
  s = s.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return s;
}

export function formatDirectiveTitle(raw: string = ""): string {
  if (!raw) return "İş Mantığı ve Kural Doğrulaması";
  let text = cleanStepText(raw, false);

  text = text.replace(/^(\d+[\.\)]|\*|-|•|adım\s*\d*:?|madde\s*\d*:?|gereksinim\s*\d*:?)\s*/i, "").trim();
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();

  if (!text || text.length < 3) {
    return "Kullanıcı Davranışı ve İş Kuralı Doğrulaması";
  }

  const exMatch = text.match(/([A-Z][a-zA-Z0-9]*(?:Exception|Error|Fault))/);
  if (exMatch) {
    return `${exMatch[1]} Hata Durumu Kontrolü`;
  }

  const lower = text.replace(/[Iİ]/g, "i").replace(/ı/g, "i").toLowerCase();

  if (lower.includes("x-idempotency-key")) return "X-Idempotency-Key İstek Doğrulaması";
  if (lower.includes("redis") && (lower.includes("race") || lower.includes("kilit") || lower.includes("lock"))) {
    return "Redis Dağıtık Kilit ve Race Condition Koruması";
  }
  if (lower.includes("3d-secure") || lower.includes("180 saniye")) return "3D-Secure Zaman Aşımı Kontrolü";
  if (lower.includes("pos komisyon")) return "POS Komisyon Oranı ve Tutar Hesaplaması";
  if (lower.includes("deadlock") || lower.includes("harici gateway")) return "Deadlock ve Harici Gateway Hata Yönetimi";
  if (lower.includes("kısmi iade") || lower.includes("partial refund")) return "Kısmi İade Tutarı Sınır Kontrolü";
  if (lower.includes("audit log") || (lower.includes("denetim") && lower.includes("kayıt"))) {
    return "İşlem Denetim Kaydı Doğrulaması";
  }
  if (lower.includes("15 dakika") && lower.includes("kupon")) return "Kupon Süre Aşımı Kontrolü";
  if (lower.includes("couponinvalid") || (lower.includes("kupon") && lower.includes("geçersiz"))) {
    return "Geçersiz Kupon Hata Durumu Kontrolü";
  }
  if (lower.includes("150 tl") || (lower.includes("150") && lower.includes("sepet"))) return "150 TL Minimum Sepet Tutarı Kontrolü";
  if (lower.includes("%20") && lower.includes("indirim")) return "%20 Azami İndirim Sınırı Kontrolü";
  if (lower.includes("18 yaş") || (lower.includes("18") && lower.includes("yaş"))) return "18 Yaş Sınırı Kayıt Kısıtlaması Kontrolü";
  if (lower.includes("e-posta") && (lower.includes("sifre") || lower.includes("şifre"))) return "E-Posta ve Şifre ile Giriş Doğrulaması";
  if (lower.includes("kilitlen") || lower.includes("hesap kilidi")) return "Hesap Kilitleme ve Süre Kontrolü";
  if (lower.includes("çift tıkla") || lower.includes("mükerrer istek") || lower.includes("cift tikla")) {
    return "Butona Çift Tıklama Engeli ve Mükerrer İstek Koruması";
  }
  if (lower.includes("donma") || lower.includes("yanıt vermez") || lower.includes("spinner")) {
    return "Arayüz Donması ve Yükleniyor Gösterim Kontrolü";
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Rate Limit ve Hata Mesajı Gösterim Kontrolü";
  }

  if (lower.startsWith("export class ") || lower.startsWith("class ")) {
    const clsName = text.replace(/^(export\s+)?class\s+([A-Za-z0-9_]+).*/, "$2");
    return `${clsName} Sınıf Yapısı Kontrolü`;
  }
  if (lower.includes("constructor(")) return "Constructor Parametre ve Başlatma Kontrolü";
  if (lower.includes("throw new error") || lower.includes("throw new exception")) return "Hata ve İstisna Yönetimi Kontrolü";

  let cleaned = text
    .replace(/["'“”]/g, "")
    .replace(/\s+(olmalıdır|sağlayabilmelidir|tamamlanmalıdır|edilmelidir|yapılmalıdır|fırlatılmalıdır|engellenmelidir|gerekmektedir|sağlanmalıdır|içermelidir|tanımlanmalıdır|çıkmalıdır|gösterilmelidir)\.?$/i, "")
    .replace(/\s+(olmalıdır|sağlayabilmelidir|tamamlanmalıdır|edilmelidir|yapılmalıdır|fırlatılmalıdır|engellenmelidir|gerekmektedir|sağlanmalıdır|içermelidir|tanımlanmalıdır|çıkmalıdır|gösterilmelidir)\b/gi, "")
    .replace(/^(Kullanıcı|Sistem|İşlem|Modül)\s+/i, "")
    .trim();

  if (!/(kontrolü|doğrulaması|testi|analizi|koruması)$/i.test(cleaned)) {
    cleaned += " Kontrolü";
  }

  return cleaned;
}

/**
 * Test başlığını temizler.
 * Köşeli parantezleri ve normal parantez içi etiketleri kaldırıp anlamı korur.
 * isAdmin = false ise video sürelerini ve zaman damgalarını gizler.
 */
export function cleanTitle(title: string = "", isAdmin: boolean = false): string {
  if (!title) return "";
  let t = title.trim();

  // 1. Köşeli parantezleri kaldır
  t = removeSquareBrackets(t);

  // 2. Parantez içindeki açıklamaları doğrudan başlığa entegre et
  t = unwrapAndCleanParentheses(t);

  // 3. P1/P2/P3 öneklerini temizle
  t = t.replace(/^P\d+\s*[-:–]\s*/i, "").trim();

  // 4. Normal kullanıcılar için video sürelerini gizle
  if (!isAdmin) {
    t = stripVideoTimestamps(t);
  }

  // 5. "Saniye Saniye" gibi robotik ifadeleri temizle
  t = t.replace(/Saniye Saniye\s*/gi, "");

  // 6. Dış tırnakları ve gereksiz ayraçları temizle
  t = t.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  t = t.replace(/\bEkran\s*\d+\s*[-:–—]+\s*/gi, "");
  t = t.replace(/\bScreen\s*\d+\s*[-:–—]+\s*/gi, "");
  t = t.replace(/^[-:–—\s]+/, "");
  t = t.replace(/[-:–—\s]+$/, "");
  t = t.replace(/\s{2,}/g, " ");

  if (!t || t.length < 3) {
    return "Kullanıcı Davranışı ve Fonksiyonel Doğrulama";
  }

  // 7. Kullanıcı Kuralı: "Test adımların başlıklarında Video ve Fotoğraf kelimesi bulunmasın"
  // Video, Fotoğraf veya Görsel öneklerini ve kelimelerini başlıktan tamamen arındır
  t = t.replace(/^(?:Video|Fotoğraf|Görsel)\s*\d*[\s:-]*/i, "").trim();
  t = t.replace(/\bVideo\s*Oynatıcı\b/gi, "Medya Oynatıcı");
  t = t.replace(/\b(Video|Videolar|Videoları|Videoyu|Fotoğraf|Fotoğraflar|Fotoğrafları|Fotoğrafı|Görsel|Görseller|Görselleri|Görseli)\b/gi, "");

  // Dış tırnakları, iki nokta üst üste ve gereksiz ayraçları tekrar temizle
  t = t.replace(/^[-:–—\s]+/, "");
  t = t.replace(/[-:–—\s]+$/, "");
  t = t.replace(/\s{2,}/g, " ").trim();

  if (!t || t.length < 3) {
    return "Uçtan Uca Kullanıcı Akışı ve Arayüz Doğrulaması";
  }

  return t;
}

/**
 * Genel analiz özetini (overview) temizler
 */
export function cleanOverview(overview: string = "", isAdmin: boolean = false): string {
  if (!overview) return "";
  let o = removeSquareBrackets(overview);
  o = unwrapAndCleanParentheses(o);

  if (!isAdmin) {
    o = stripVideoTimestamps(o);
    o = o.replace(/\(\s*\d+\s*ayrı saniye karesi\s*\)/gi, "");
    o = o.replace(/\|\s*[\d:]+\s*\|\s*\d+\s*sn analiz/gi, "");
    o = o.replace(/\b\d+\s*ayrı saniye karesi\b/gi, "");
    o = o.replace(/\b\d+\s*sn analiz\b/gi, "");
    o = o.replace(/Saniye Saniye\s*/gi, "");
  }

  o = o.replace(/\s{2,}/g, " ").trim();
  return o;
}

/**
 * Bir test senaryosunun başlık, adımlar (tekrar edenleri ayıklayarak),
 * ön koşul ve beklenen sonucunu tamamen temizler
 */
export function cleanTestCase(tc: any, isAdmin: boolean = false): any {
  if (!tc) return tc;

  const rawSteps = Array.isArray(tc.steps) ? tc.steps : [];
  const cleanedSteps = rawSteps.map((s: string) => cleanStepText(s, isAdmin));
  const deduplicated = deduplicateSteps(cleanedSteps);

  const cleanedType = tc.type ? cleanTitle(tc.type, isAdmin) : undefined;
  let cleanedTarget = tc.targetComponent ? cleanStepText(tc.targetComponent, isAdmin) : undefined;
  if (cleanedTarget) {
    cleanedTarget = cleanedTarget.replace(/^(?:Video|Fotoğraf|Görsel)\s*\d*[\s:-]*/i, "").trim();
    cleanedTarget = cleanedTarget.replace(/\bEkran\s*\d+\s*[-:–—]+\s*/gi, "").trim();
    cleanedTarget = cleanedTarget.replace(/\bEkran\s*\d+\b/gi, "Arayüz Bileşeni").trim();
    cleanedTarget = cleanedTarget.replace(/^[-:–—\s]+/, "").trim();
    if (!cleanedTarget) cleanedTarget = "Ana Arayüz Bileşenleri";
  }

  return {
    ...tc,
    title: cleanTitle(tc.title || "", isAdmin),
    type: cleanedType || tc.type,
    testType: cleanedType || tc.testType,
    targetComponent: cleanedTarget,
    preconditions: cleanStepText(tc.preconditions || "", isAdmin),
    steps: deduplicated,
    expectedResult: cleanStepText(tc.expectedResult || "", isAdmin),
  };
}

/**
 * Karşılaştırma için metinleri temizleyip normalize eder
 */
function normalizeCaseString(str: string = ""): string {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/^\[[^\]]*\]/g, "")
    .replace(/^dev[-:\s_]*tc[-:\s_]*\d*[\s:.-]*/i, "")
    .replace(/^qa[-:\s_]*tc[-:\s_]*\d*[\s:.-]*/i, "")
    .replace(/^p\d+[\s:.-]*/i, "")
    .replace(/[^a-z0-9çğıöşü\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Başlık ve açıklamalardaki anlamlı anahtar kelimeleri çıkarır (bağlaçları eler)
 */
function getSignificantWords(text: string = ""): Set<string> {
  const stopWords = new Set([
    "ve", "veya", "ile", "için", "olan", "gibi", "kadar", "sonra", "önce", "üzere",
    "testi", "test", "doğrulaması", "doğrulama", "kontrolü", "kontrol", "adımı", "adımları",
    "senaryosu", "senaryo", "birim", "yürütme", "fonksiyonel", "analizi", "analiz"
  ]);
  const words = normalizeCaseString(text).split(" ");
  return new Set(words.filter((w) => w.length > 2 && !stopWords.has(w)));
}

/**
 * Test senaryosunun teknik odak konusunu (intent) tespit eder
 */
function detectTestIntent(tc: any): string | null {
  const combined = ((tc.title || "") + " " + (tc.type || "") + " " + (tc.targetComponent || "")).toLowerCase();

  if (combined.includes("sql") || combined.includes("injection")) return "sql_injection";
  if (combined.includes("eval") || combined.includes("exec") || combined.includes("dinamik kod") || combined.includes("komut yürütme")) return "command_injection";
  if (combined.includes("token") || combined.includes("jwt") || combined.includes("otp") || combined.includes("2fa") || combined.includes("yetki") || combined.includes("idor") || combined.includes("kimlik")) return "auth_token";
  if (combined.includes("race") || combined.includes("yarış") || combined.includes("concurrency") || combined.includes("eşzaman") || combined.includes("asenkron akış") || combined.includes("timeout")) return "race_condition";
  if (combined.includes("n+1") || combined.includes("döngü içi i/o") || combined.includes("algoritmik karmaşıklık") || combined.includes("ölçeklenme")) return "perf_scalability";
  if (combined.includes("hata tolerans") || combined.includes("exception") || combined.includes("istisna") || combined.includes("unhandled") || combined.includes("hata yayılım")) return "error_handling";
  if (combined.includes("constructor") || combined.includes("yaşam döngüsü") || combined.includes("lifecycle") || combined.includes("ilk durum")) return "constructor_lifecycle";
  if (combined.includes("idempotenc") || combined.includes("çift istek") || combined.includes("çift harcama") || combined.includes("mükerrer")) return "idempotency";
  if (combined.includes("breaking") || combined.includes("geriye dönük") || combined.includes("regresyon")) return "backward_compat";
  if (combined.includes("alternatif") || combined.includes("mimari karar")) return "arch_decision";
  if (combined.includes("sürdürülebilirlik") || combined.includes("teknik borç") || combined.includes("gözlemlenebilirlik")) return "sustainability";
  if (combined.includes("sınır değer") || combined.includes("boundary") || combined.includes("kısıtlama")) return "boundary_limit";

  return null;
}

/**
 * İki metni mükerrer cümle olmadan akıllıca birleştirir
 */
function mergeTextWithoutDuplicate(textA: string = "", textB: string = ""): string {
  const trimmedA = (textA || "").trim();
  const trimmedB = (textB || "").trim();
  if (!trimmedA) return trimmedB;
  if (!trimmedB) return trimmedA;
  if (trimmedA.toLowerCase().includes(trimmedB.toLowerCase())) return trimmedA;
  if (trimmedB.toLowerCase().includes(trimmedA.toLowerCase())) return trimmedB;
  return `${trimmedA} Ayrıca: ${trimmedB}`;
}

/**
 * İki test senaryosunun birbirinin tekrarı olup olmadığını kontrol eder
 */
function areTestCasesDuplicates(a: any, b: any): boolean {
  if (!a || !b) return false;

  const normTitleA = normalizeCaseString(a.title);
  const normTitleB = normalizeCaseString(b.title);

  // 1. Birebir veya neredeyse aynı başlık
  if (normTitleA && normTitleB) {
    if (normTitleA === normTitleB) return true;
    if (normTitleA.includes(normTitleB) && normTitleB.length >= 10 && normTitleB.length / normTitleA.length > 0.6) return true;
    if (normTitleB.includes(normTitleA) && normTitleA.length >= 10 && normTitleA.length / normTitleB.length > 0.6) return true;

    // Kelime kümesi benzerliği
    const wordsA = getSignificantWords(normTitleA);
    const wordsB = getSignificantWords(normTitleB);
    if (wordsA.size >= 2 && wordsB.size >= 2) {
      let common = 0;
      wordsA.forEach((w) => {
        if (wordsB.has(w)) common++;
      });
      const minSize = Math.min(wordsA.size, wordsB.size);
      const unionSize = new Set([...wordsA, ...wordsB]).size;
      if (common / minSize >= 0.7 || common / unionSize >= 0.55) {
        return true;
      }
    }
  }

  // 2. Aynı bileşen ve aynı teknik intent
  const targetA = normalizeCaseString(a.targetComponent);
  const targetB = normalizeCaseString(b.targetComponent);
  const sameTarget = targetA && targetB && (targetA === targetB || targetA.includes(targetB) || targetB.includes(targetA));

  const intentA = detectTestIntent(a);
  const intentB = detectTestIntent(b);

  if (sameTarget && intentA && intentB && intentA === intentB) {
    return true;
  }

  // 3. Spesifik global güvenlik veya mimari kontroller (tek bir planda mükerrer olmamalı)
  if (intentA && intentB && intentA === intentB) {
    const uniqueGlobalIntents = new Set([
      "sql_injection",
      "command_injection",
      "race_condition",
      "idempotency",
      "perf_scalability",
      "arch_decision",
      "sustainability",
      "backward_compat",
    ]);
    if (uniqueGlobalIntents.has(intentA)) {
      return true;
    }
  }

  return false;
}

/**
 * TEKRAR EDEN TEST ADIMLARINI BİRLEŞTİRME & ÖZGÜNLEŞTİRME MOTORU
 * Kural 1: Her test adımı ve uygulama adımı özgün olmalı, tekrar etmemeli.
 * Kural 2: Tekrar eden test senaryoları birleştirilerek tek bir senaryo yapılır;
 *          tekrar etmeyen tüm uygulama adımları toplanarak o senaryoya tanımlanır.
 */
export function deduplicateAndMergeTestCases(
  rawCases: any[] = [],
  isAdmin: boolean = false,
  defaultPrefix?: string
): any[] {
  if (!Array.isArray(rawCases) || rawCases.length === 0) return [];

  // 1. Her senaryoyu temizle
  const cleaned = rawCases
    .map((c) => cleanTestCase(c, isAdmin))
    .filter((c) => c && c.title && c.title.trim().length > 0);

  const merged: any[] = [];

  for (const candidate of cleaned) {
    const matchIndex = merged.findIndex((existing) => areTestCasesDuplicates(existing, candidate));

    if (matchIndex === -1) {
      merged.push({
        ...candidate,
        steps: Array.isArray(candidate.steps) ? [...candidate.steps] : [],
      });
    } else {
      // KURAL 2: Tekrar eden senaryoları birleştir, uygulama adımlarını topla
      const existing = merged[matchIndex];

      const combinedRawSteps = [
        ...(Array.isArray(existing.steps) ? existing.steps : []),
        ...(Array.isArray(candidate.steps) ? candidate.steps : []),
      ];
      existing.steps = deduplicateSteps(combinedRawSteps);

      existing.preconditions = mergeTextWithoutDuplicate(existing.preconditions, candidate.preconditions);
      existing.expectedResult = mergeTextWithoutDuplicate(existing.expectedResult, candidate.expectedResult);

      const isCritical =
        existing.priority?.includes("Kritik") ||
        candidate.priority?.includes("Kritik") ||
        existing.priority?.includes("P1") ||
        candidate.priority?.includes("P1");
      const isHigh =
        existing.priority?.includes("Yüksek") ||
        candidate.priority?.includes("Yüksek") ||
        existing.priority?.includes("P2") ||
        candidate.priority?.includes("P2");
      existing.priority = isCritical ? "Kritik" : isHigh ? "Yüksek" : existing.priority || "Orta";

      if (
        candidate.title &&
        candidate.title.length > (existing.title || "").length &&
        !candidate.title.includes("Doğrulama Testi")
      ) {
        existing.title = candidate.title;
      }
      if (
        candidate.targetComponent &&
        !candidate.targetComponent.includes("Arayüz") &&
        existing.targetComponent?.includes("Arayüz")
      ) {
        existing.targetComponent = candidate.targetComponent;
      }
    }
  }

  // KURAL 1: Farklı test senaryoları arasında birebir kopya kalan adımları özgünleştir
  const seenStepSignatures = new Map<string, number>();

  for (const tc of merged) {
    if (!Array.isArray(tc.steps)) continue;
    tc.steps = tc.steps.map((step: string) => {
      const norm = normalizeCaseString(step);
      const count = seenStepSignatures.get(norm) || 0;
      seenStepSignatures.set(norm, count + 1);

      if (count > 0) {
        const target = tc.targetComponent || tc.title || "ilgili bileşen";
        const cleaned = step.replace(/^adım\s*\d+[\s:.-]*/i, "").trim();
        return `'${target}' kapsamında: ${cleaned}`;
      }
      return step;
    });

    tc.steps = deduplicateSteps(tc.steps);
  }

  // Sıralı ve profesyonel ID numaralandırma
  let prefix = defaultPrefix;
  if (!prefix && merged.length > 0) {
    const firstId = merged[0].id || "";
    if (firstId.startsWith("DEV-TC") || firstId.startsWith("DEV-")) prefix = "DEV-TC";
    else if (firstId.startsWith("QA-TC") || firstId.startsWith("QA-")) prefix = "QA-TC";
    else prefix = "TC";
  }
  if (!prefix) prefix = "TC";

  return merged.map((tc, idx) => ({
    ...tc,
    id: `${prefix}-${String(idx + 1).padStart(3, "0")}`,
  }));
}
