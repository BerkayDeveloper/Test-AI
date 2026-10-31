/**
 * Antigravity Test-AI: Test Başlığı Temizleme ve Formatlama Motoru
 * Oluşturulmuş ve oluşturulacak test adım isimlerini gereksiz tanımlardan,
 * imzalardan, parantezli kodlardan, tırnak işaretlerinden ve dolgu kelimelerden arındırır.
 */

export function cleanSubject(subject: string = ""): string {
  if (!subject) return "";
  let s = subject.trim();
  s = s.replace(/^\[[^\]]+\]\s*/, "").replace(/^P\d+\s*[-:–]\s*/i, "");
  s = s.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  if (s.length > 40) {
    s = s.slice(0, 38).trim() + "...";
  }
  return s;
}

export function formatDirectiveTitle(raw: string = ""): string {
  if (!raw) return "İş Mantığı ve Kural Doğrulaması";
  let text = raw.trim();

  // Madde / Adım / Sayı numaralandırmalarını temizle
  text = text.replace(/^(\d+[\.\)]|\*|-|•|adım\s*\d*:?|madde\s*\d*:?|gereksinim\s*\d*:?)\s*/i, "").trim();

  // Dış tırnakları temizle
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();

  // Kod veya kural içindeki Exception adını yakala (örn: AgeRestrictionException, CouponInvalidException, ValueError)
  const exMatch = text.match(/([A-Z][a-zA-Z0-9]*(?:Exception|Error|Fault))/);
  if (exMatch) {
    return `${exMatch[1]} Hata Durumu Kontrolü`;
  }

  // Karşılaştırma için ASCII 'i' normalizasyonu
  const lower = text.replace(/[Iİ]/g, "i").replace(/ı/g, "i").toLowerCase();

  // Belirgin teknik bileşenler ve limit kuralları
  if (lower.includes("x-idempotency-key")) return "X-Idempotency-Key İstek Doğrulaması";
  if (lower.includes("redis") && (lower.includes("race") || lower.includes("kilit") || lower.includes("lock"))) {
    return "Redis Dağıtık Kilit ve Race Condition Koruması";
  }
  if (lower.includes("3d-secure") || lower.includes("180 saniye")) return "3D-Secure 180 Saniye Zaman Aşımı Kontrolü";
  if (lower.includes("pos komisyon")) return "POS Komisyon Oranı ve Tutar Hesaplaması";
  if (lower.includes("deadlock") || lower.includes("harici gateway")) return "Deadlock ve Harici Gateway Hata Yönetimi";
  if (lower.includes("kısmi iade") || lower.includes("partial refund")) return "Kısmi İade Tutarı Sınır Kontrolü";
  if (lower.includes("audit log") || (lower.includes("denetim") && lower.includes("kayıt"))) {
    return "İşlem Denetim Kaydı (Audit Log) Doğrulaması";
  }
  if (lower.includes("15 dakika") && lower.includes("kupon")) return "15 Dakika Kupon Süre Aşımı (TTL) Kontrolü";
  if (lower.includes("couponinvalid") || (lower.includes("kupon") && lower.includes("geçersiz"))) {
    return "CouponInvalidException Hata Durumu Kontrolü";
  }
  if (lower.includes("150 tl") || (lower.includes("150") && lower.includes("sepet"))) return "150 TL Minimum Sepet Tutarı Kontrolü";
  if (lower.includes("%20") && lower.includes("indirim")) return "%20 Azami İndirim Sınırı Kontrolü";
  if (lower.includes("18 yaş") || (lower.includes("18") && lower.includes("yaş"))) return "18 Yaş Sınırı Kayıt Kısıtlaması Kontrolü";
  if (lower.includes("e-posta") && (lower.includes("sifre") || lower.includes("şifre"))) return "E-Posta ve Şifre ile Giriş Doğrulaması";
  if (lower.includes("kilitlen") || lower.includes("hesap kilidi")) return "Hesap Kilitleme ve Süre Kontrolü";

  // Kod parçacıklarından türeyen direktifler
  if (lower.startsWith("export class ") || lower.startsWith("class ")) {
    const clsName = text.replace(/^(export\s+)?class\s+([A-Za-z0-9_]+).*/, "$2");
    return `${clsName} Sınıf Yapısı Kontrolü`;
  }
  if (lower.includes("constructor(")) return "Constructor Parametre ve Başlatma Kontrolü";
  if (lower.includes("throw new error") || lower.includes("throw new exception")) return "Hata ve İstisna Yönetimi Kontrolü";
  if (lower.includes("secretkey") && (lower.includes("16") || lower.includes("uzunluk"))) return "16 Karakter SecretKey Validasyon Kontrolü";
  if (lower.includes("activesessions")) return "ActiveSessions Oturum Havuzu Kontrolü";
  if (lower.includes("secretkey")) return "SecretKey Güvenlik Kontrolü";

  // Uygulama / Oyun özel anahtar kelimeleri
  if (lower.includes("interstitial") && lower.includes("level 20")) return "Level 20 ve İki Bölümde Bir Reklam Kontrolü";
  if (lower.includes("rewarded")) return "Rewarded Reklam Gösterim Kontrolü";
  if (lower.includes("banner")) return "Banner Reklam Durum Kontrolü";
  if (lower.includes("applovin") || (lower.includes("max") && lower.includes("adapter"))) return "AppLovin MAX Reklam Entegrasyon Kontrolü";
  if (lower.includes("appsflyer") || lower.includes("roi360")) return "AppsFlyer ve ROI360 Satın Alma Takip Kontrolü";
  if (lower.includes("att") || lower.includes("facebook bootstrap")) return "Eski ATT ve Facebook Köprüsü Temizlik Kontrolü";
  if (lower.includes("tracking design") || (lower.includes("amplitude") && lower.includes("firebase"))) return "Amplitude ve Firebase Olay Takip Doğrulaması";
  if (lower.includes("loading ekranı") || (lower.includes("loading") && lower.includes("sdk"))) return "Loading Ekranı ve SDK Başlatma Kontrolü";
  if (lower.includes("sdk anahtarları") || lower.includes("ayar dosyasında")) return "SDK Anahtarları Yapılandırma Dosyası Kontrolü";
  if (lower.includes("konveyör") && lower.includes("mesh")) return "Konveyör Bandı Mesh Optimizasyon Kontrolü";
  if (lower.includes("mesh optimizer")) return "Mesh Optimizer 3D Model Araç Kontrolü";
  if (lower === "performans" || text.toLowerCase() === "performans") return "Performans ve Optimizasyon Kontrolü";

  // Gereksiz Türkçe dolgu fiillerini ve ifadelerini temizle
  let cleaned = text
    .replace(/["'“”]/g, "")
    .replace(/\s+(olmalıdır|sağlayabilmelidir|tamamlanmalıdır|edilmelidir|yapılmalıdır|fırlatılmalıdır|engellenmelidir|gerekmektedir|sağlanmalıdır|içermelidir|tanımlanmalıdır|çıkmalıdır|gösterilmelidir)\.?$/i, "")
    .replace(/\s+(olmalıdır|sağlayabilmelidir|tamamlanmalıdır|edilmelidir|yapılmalıdır|fırlatılmalıdır|engellenmelidir|gerekmektedir|sağlanmalıdır|içermelidir|tanımlanmalıdır|çıkmalıdır|gösterilmelidir)\b/gi, "")
    .replace(/^(Kullanıcı|Sistem|İşlem|Modül)\s+/i, "")
    .trim();

  // Sayısal sınır veya süreler
  const numMatch = cleaned.match(/(\d+(?:[.,]\d+)?\s*(?:tl|ms|saniye|dakika|%|adet|karakter|grup|kat))/i);
  if (numMatch && cleaned.length > 45) {
    cleaned = `${numMatch[1].toUpperCase()} Kural ve Sınır Kontrolü`;
  } else if (cleaned.length > 50) {
    cleaned = cleaned.slice(0, 48).trim() + "...";
  }

  // Anlamlı son ek kontrolü
  if (!/(kontrolü|doğrulaması|testi|analizi|koruması)$/i.test(cleaned)) {
    if (cleaned.length <= 40) {
      cleaned += " Kontrolü";
    }
  }

  return cleaned;
}

export function cleanTitle(title: string = ""): string {
  if (!title) return "";
  let t = title.trim();

  // Köşeli parantez içinde bileşen adı yakalama: [PlayerCombat], [calculate_discount]
  const tagMatch = t.match(/^\[([^\]]+)\]\s*(.*)$/);
  let prefixTag = "";
  if (tagMatch) {
    prefixTag = tagMatch[1].trim();
    t = tagMatch[2].trim();
  }

  // P1/P2/P3 ve öncelik öneklerini temizle
  t = t.replace(/^P\d+\s*[-:–]\s*/i, "").trim();

  // Dış tırnakları temizle
  t = t.replace(/^["'“”]+|["'“”]+$/g, "").trim();

  const lower = t.replace(/[Iİ]/g, "i").replace(/ı/g, "i").toLowerCase();
  const lowerTag = prefixTag.replace(/[Iİ]/g, "i").replace(/ı/g, "i").toLowerCase();

  const isGenericTag = /^(p\d+|dev|qa|unit|happy path|fonksiyonel|sınır değer|kural doğrulama|core sözleşme|developer güvenlik|robustness|finans)/i.test(lowerTag);
  const componentFromTag = !isGenericTag && /^[a-zA-Z0-9_]+$/.test(prefixTag) ? prefixTag : "";

  // 1. Metot test başlıkları (İmza ve gereksiz sözleşme kelimeleri arındırılır)
  // Örn: "calculate_discount - 'def calculate_discount(...)' Girdi-Çıktı Kontratı ve Sınır Değer Doğrulaması"
  const methodMatch = t.match(/^([a-zA-Z0-9_]+)\s*-\s*['"][^'"]+['"]\s*(.*)$/);
  if (methodMatch) {
    const methodName = methodMatch[1];
    const tail = methodMatch[2] || "";
    let statusSuffix = "";
    if (tail.includes("Yeni Eklenen") || tail.includes("Yeni Metot")) statusSuffix = " (Yeni Metot)";
    else if (tail.includes("Değiştirilen") || tail.includes("Güncellenen")) statusSuffix = " (Güncellenen Metot)";
    return `${methodName} Parametre ve Sınır Değer Doğrulaması${statusSuffix}`;
  }

  // Tırnak içinde doğrudan metot imzası:
  // Örn: "'void TakeDamage(int damage)' Girdi-Çıktı Kontratı..." veya "'def calculate_discount(...)'"
  const sigMatch = t.match(/^['"]?(?:public|private|protected|async|def|void|function)?\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^'"]+)?['"]?\s*(?:Girdi-Çıktı Kontratı|Sözleşme|Parametre).*$/i);
  if (sigMatch) {
    const fnName = componentFromTag || sigMatch[1];
    let statusSuffix = "";
    if (t.includes("Yeni Eklenen") || t.includes("Yeni Metot")) statusSuffix = " (Yeni Metot)";
    else if (t.includes("Değiştirilen") || t.includes("Güncellenen")) statusSuffix = " (Güncellenen Metot)";
    return `${fnName} Parametre ve Sınır Değer Doğrulaması${statusSuffix}`;
  }

  const methodMatch2 = t.match(/^([a-zA-Z0-9_]+)\s*-\s*(?:Girdi-Çıktı Kontratı|Metot Mantık|Sözleşme).*(Yeni Eklenen|Değiştirilen|Güncellenen)?.*$/i);
  if (methodMatch2) {
    const methodName = methodMatch2[1];
    let statusSuffix = "";
    if (t.includes("Yeni Eklenen") || t.includes("Yeni Metot")) statusSuffix = " (Yeni Metot)";
    else if (t.includes("Değiştirilen") || t.includes("Güncellenen")) statusSuffix = " (Güncellenen Metot)";
    return `${methodName} Parametre ve Sınır Değer Doğrulaması${statusSuffix}`;
  }

  // 2. Sınıf constructor ve ilk durum testleri
  // Örn: "OrderService - Yaşam Döngüsü, State Başlatma ve Constructor Doğrulama Testi"
  if (lower.includes("constructor") && (lower.includes("yaşam döngüsü") || lower.includes("state başlatma") || lower.includes("doğrulama testi"))) {
    const match = t.match(/^([a-zA-Z0-9_]+)/);
    const clsName = componentFromTag || (match ? match[1] : "Sınıf");
    return `${clsName} Constructor ve İlk Durum Doğrulaması`;
  }

  const classMatch = t.match(/^([a-zA-Z0-9_]+)\s*-\s*(?:Yaşam Döngüsü|State Başlatma|Constructor Doğrulama).*$/i);
  if (classMatch) {
    return `${classMatch[1]} Constructor ve İlk Durum Doğrulaması`;
  }

  // QA Sınıf testi: "'PlayerCombat' Bileşeninin Fonksiyonel Davranışı ve Durum Doğrulaması"
  const qaClassMatch = t.match(/^['"]?([a-zA-Z0-9_]+)['"]?\s*Bileşeninin Fonksiyonel Davranışı.*$/i);
  if (qaClassMatch) {
    return `${qaClassMatch[1]} Fonksiyonel Davranış ve Durum Doğrulaması`;
  }

  // QA Metot testi: "'TakeDamage' İşlevinde Pozitif Kullanım ve Sınır Değer Doğrulaması"
  const qaMethodMatch = t.match(/^['"]?([a-zA-Z0-9_]+)['"]?\s*İşlevinde Pozitif Kullanım.*$/i);
  if (qaMethodMatch) {
    return `${qaMethodMatch[1]} Pozitif Kullanım ve Sınır Değer Kontrolü`;
  }

  // 3. Robustness / Exception testleri
  // Örn: '"Kayıt Yaş Doğrulaması" İçin Null, Tip Uyuşmazlığı ve İstisna (Exception) Testi'
  if (lower.includes("null, tip uyuşmazlığı") || lower.includes("null ve tip uyuşmazlığı") || (lower.includes("null") && lower.includes("istisna"))) {
    return "Null ve Uyumsuz Veri Tipleri Hata Toleransı";
  }

  // 4. Güvenlik filtre testleri
  // Örn: '"Kayıt Yaş Doğrulaması" İhlal ve Güvenlik Filtresi Doğrulaması'
  if (lower.includes("ihlal ve güvenlik filtresi") || (lower.includes("güvenlik filtresi") && lower.includes("doğrulaması"))) {
    return "Güvenlik Filtresi ve Yetkisiz Erişim Kontrolü";
  }

  // 5. Token / Kimlik doğrulama testleri
  if (lower.includes("geçersiz token") || (lower.includes("token") && lower.includes("brute-force")) || lower.includes("hatalı giriş denemeleri, maskeleme")) {
    return "Token Geçerliliği, Süre Aşımı ve Brute-Force Koruması";
  }

  // 6. Finans & Idempotency testleri
  if (lower.includes("tutar") && (lower.includes("idempotency") || lower.includes("cift istek") || lower.includes("çift istek"))) {
    return "Tutar Doğrulaması ve Çift İstek (Idempotency) Koruması";
  }

  // 7. QA Uçtan Uca / Başarılı Akış testleri
  if (lower.includes("standard kullanım") || lower.includes("standart kullanım") || lower.includes("happy path")) {
    return "Temel Kullanıcı Akışı ve Başarılı İşlem Doğrulaması";
  }

  // 8. QA Eşzamanlılık ve Çift Tıklama testleri
  if (lower.includes("çift tıklama") || lower.includes("double-click")) {
    return "Çift Tıklama Engeli ve İşlem İptali Doğrulaması";
  }

  // 9. QA Ağ Toleransı testleri
  if (lower.includes("ağ bağlantı kopması") || (lower.includes("f5") && lower.includes("yenileme"))) {
    return "Ağ Kesintisi ve Sayfa Yenilemede Veri Korunumu";
  }

  // 10. Şartname direktifleri ("... Kural Doğrulaması")
  const ruleMatch = t.match(/^(?:["'“”])?(.*?)(?:["'“”])?\s*(?:Kural Doğrulaması|Fonksiyonel İş Kuralı Doğrulaması|Sınır Değer ve Validasyon Analizi|Standart Kullanım ve Başarı Akışı)$/i);
  if (ruleMatch && ruleMatch[1].length > 5) {
    return formatDirectiveTitle(ruleMatch[1]);
  }

  // Cümle veya direktif ise
  if (t.length > 20 || /^(export|class|private|public|def|function)\b/.test(t) || t.includes(" ")) {
    return formatDirectiveTitle(t);
  }

  return t.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}
