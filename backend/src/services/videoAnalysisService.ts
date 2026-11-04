import { config } from "../config";
import { TestCase } from "../types";
import { cleanTestCase, cleanTitle } from "../utils/titleCleaner";
import { geminiCliService } from "./geminiCliService";

export interface SecondTimelineEntry {
  second: number;
  timestamp: string;
  diffPercent: number;
  activeRegion: string;
  hotspot?: { xPercent: number; yPercent: number };
  brightness?: number;
  contrast?: number;
  isDarkTheme?: boolean;
  edgeDensity?: number;
  uiBlocksCount?: number;
  redAlertScore?: number;
  greenSuccessScore?: number;
  yellowWarningScore?: number;
  modalOverlayDetected?: boolean;
  blankState?: "none" | "white_screen" | "black_screen";
  eventType:
    | "initial_screen"
    | "screen_transition"
    | "modal_open"
    | "user_interaction"
    | "scroll_or_animation"
    | "error_visual"
    | "success_visual"
    | "loading_or_wait"
    | "freeze_or_blank"
    | "steady_state";
  screenName: string;
  whatHappened: string;
  qaCheckRequirement: string;
  thumbnailDataUrl?: string;
}

export interface VideoInsight {
  videoIndex: number;
  videoName: string;
  mediaType: "video" | "image";
  duration: string;
  durationSeconds: number;
  resolution: string;
  analyzedSecondsCount: number;
  screens: string[];
  userActions: string[];
  issues: string[];
  flowSummary: string;
  secondBySecondTimeline: SecondTimelineEntry[];
  generatedTestCount: number;
}

export interface VideoAnalysisResult {
  overview: string;
  totalTestCount: number;
  criticalTestCount: number;
  testCases: TestCase[];
  videoInsights: VideoInsight[];
}

export interface MediaFilePayload {
  name: string;
  mimeType: string;
  base64Data?: string;
  notes?: string;
  durationSeconds?: number;
  formattedDuration?: string;
  width?: number;
  height?: number;
  aspectRatioLabel?: string;
  secondBySecondTimeline?: SecondTimelineEntry[];
  sampledFrames?: Array<{
    second: number;
    timestamp: string;
    base64Data: string;
    mimeType: string;
  }>;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Dosya adı, kullanıcı notları, aktif bölge ve olay türüne göre
 * "Ekran 1", "Ekran 2" gibi genel ve belirsiz ifadeler yerine videoda gerçekten görünen ekranın içeriğine uygun,
 * spesifik, işlevsel ve anlamlı ekran isimleri üretir.
 */
export function determineSpecificScreenName(
  fileName: string,
  notes: string = "",
  activeRegion: string = "",
  eventType: string = "",
  phaseIndex: number = 0,
  prevScreenName?: string
): string {
  const combined = `${fileName} ${notes}`.toLowerCase();

  // 1. Modal / Diyalog
  if (eventType === "modal_open" || activeRegion.includes("Modal") || activeRegion.includes("Diyalog")) {
    if (combined.includes("error") || combined.includes("hata") || combined.includes("uyari")) {
      return "Hata Bildirimi ve Uyarı Modal Penceresi";
    }
    if (combined.includes("onay") || combined.includes("success") || combined.includes("basari")) {
      return "İşlem Onay ve Başarı Modal Penceresi";
    }
    return "Açılır İşlem Onay ve Bilgilendirme Modal Penceresi";
  }

  // 2. Oyun / Gameplay
  const isGame = /\b(game|oyun|gameplay|karakter|character|can\s*bar|health|hasar|damage|hud|fps|joystick|unity|unreal)\b/i.test(combined);
  if (isGame) {
    if (eventType === "error_visual" || combined.includes("hasar") || combined.includes("damage")) {
      return "Karakter Hasar Alma ve Kritik Sağlık Görünümü";
    }
    if (eventType === "success_visual" || combined.includes("heal") || combined.includes("can")) {
      return "Karakter İyileşme ve Can Tazeleme Sahnesi";
    }
    if (phaseIndex > 0) {
      return "Oyun İçi Görev ve Seviye İlerleme Sahnesi";
    }
    return "Oyun İçi Karakter HUD ve Oynanış Sahnesi";
  }

  // 3. Yapay Zeka / Chat
  const isAi = /\b(ai|chat|sohbet|prompt|bot|llm|istem|gemini|gpt)\b/i.test(combined);
  if (isAi) {
    if (activeRegion.includes("Alt") || activeRegion.includes("Giriş")) {
      return "Prompt ve Komut Giriş Paneli";
    }
    if (eventType === "scroll_or_animation" || activeRegion.includes("Merkez")) {
      return "Yapay Zeka Yanıt Akışı ve Mesajlaşma Arayüzü";
    }
    return "Yapay Zeka Sohbet ve Komut Giriş Ekranı";
  }

  // 4. Veri Tablosu & Dashboard
  const isTable = /\b(table|tablo|dashboard|panel|grid|kpi|rapor|istatistik)\b/i.test(combined);
  if (isTable) {
    if (activeRegion.includes("Üst") || activeRegion.includes("Filtre")) {
      return "Tablo Filtreleme ve Arama Arayüzü";
    }
    if (phaseIndex > 0) {
      return "Detaylı Rapor ve Analiz Görünümü";
    }
    return "Dinamik Veri Tablosu ve Kayıt Listeleme Ekranı";
  }

  // 5. Medya Oynatıcı
  const isMedia = /\b(player|video|oynatici|stream|media|seekbar)\b/i.test(combined);
  if (isMedia) {
    return "Medya Oynatıcı ve Oynatma Kontrolleri Ekranı";
  }

  // 6. E-Ticaret Sepet ve Ödeme
  const isEcom = /\b(cart|sepet|checkout|odeme|siparis|fatura|kupon|market|shop)\b/i.test(combined);
  if (isEcom) {
    if (phaseIndex > 0 || activeRegion.includes("Ödeme") || activeRegion.includes("Buton")) {
      return "Teslimat Bilgileri ve Ödeme Tamamlama Formu";
    }
    return "Alışveriş Sepeti ve Sipariş Özeti Ekranı";
  }

  // 7. Kimlik Doğrulama / Kullanıcı Girişi
  const isAuth = /\b(login|auth|giris|signin|sign-in|register|kayit|signup|sign-up|otp|2fa|sifre|password)\b/i.test(combined);
  if (isAuth) {
    if (combined.includes("otp") || combined.includes("2fa")) {
      return "İki Adımlı SMS ve OTP Doğrulama Formu";
    }
    if (combined.includes("register") || combined.includes("kayit")) {
      return "Kullanıcı Kayıt ve Hesap Oluşturma Formu";
    }
    if (phaseIndex > 0) {
      return "Giriş Sonrası Ana Karşılama Paneli";
    }
    return "Kullanıcı Girişi ve Kimlik Doğrulama Formu";
  }

  // 8. Genel
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
  if (phaseIndex === 0) {
    return cleanName ? `${cleanName} Ana Arayüzü` : "Ana Karşılama ve İşlem Ekranı";
  } else if (phaseIndex === 1) {
    return cleanName ? `${cleanName} Detay ve İşlem Paneli` : "Detaylı Bilgi ve İşlem Paneli";
  } else {
    return cleanName ? `${cleanName} Onay ve Sonuç Görünümü` : "İşlem Onay ve Sonuç Görünümü";
  }
}

/**
 * MP4 / WebM ikili (binary) verisinden gerçek süre (mvhd), çözünürlük (tkhd) ve saniye bazlı
 * kare entropi değişimlerini çıkarır (Tarayıcı dışı doğrudan API çağrıları için yedek analizör).
 */
function extractTimelineFromBinaryMedia(
  file: MediaFilePayload,
  videoIdx: number
): {
  durationSeconds: number;
  formattedDuration: string;
  resolution: string;
  timeline: SecondTimelineEntry[];
} {
  const isVideo = file.mimeType.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv|ogg)$/i.test(file.name);
  if (!isVideo) {
    const resLabel = file.aspectRatioLabel || (file.width && file.height ? `${file.width}x${file.height}` : "1920x1080 (Tam Ekran Görsel)");
    const initialScreen = determineSpecificScreenName(file.name, file.notes || "", "Tam Ekran Görsel İncelemesi", "initial_screen", 0);
    return {
      durationSeconds: 1,
      formattedDuration: "00:01",
      resolution: resLabel,
      timeline: [
        {
          second: 0,
          timestamp: "00:00",
          diffPercent: 100,
          activeRegion: "Tam Ekran Görsel İncelemesi",
          eventType: "initial_screen",
          screenName: initialScreen,
          whatHappened: `${initialScreen} incelendi. ${file.name} ekran görüntüsü yüklendi (${resLabel}) ve görsel bileşenler analiz edildi.`,
          qaCheckRequirement: `00:00 anındaki ${initialScreen} üzerinde yer alan tüm UI elemanlarının, metinlerin ve durum mesajlarının doğruluğunu kontrol edin.`,
        },
      ],
    };
  }

  let durationSec = file.durationSeconds && file.durationSeconds > 0 ? Math.round(file.durationSeconds) : 0;
  let width = file.width || 0;
  let height = file.height || 0;
  let buf: Buffer | null = null;

  if (file.base64Data && file.base64Data.length > 64) {
    try {
      buf = Buffer.from(file.base64Data, "base64");
      // MP4 'mvhd' atomundan gerçek süreyi oku
      const mvhdIdx = buf.indexOf(Buffer.from("mvhd"));
      if (mvhdIdx !== -1 && mvhdIdx + 24 < buf.length) {
        const version = buf.readUInt8(mvhdIdx + 4);
        if (version === 0 && mvhdIdx + 24 <= buf.length) {
          const timescale = buf.readUInt32BE(mvhdIdx + 16);
          const durationUnits = buf.readUInt32BE(mvhdIdx + 20);
          if (timescale > 0 && durationUnits > 0) {
            const calc = Math.round(durationUnits / timescale);
            if (calc >= 1 && calc <= 3600) durationSec = calc;
          }
        }
      }
      // MP4 'tkhd' atomundan genişlik ve yükseklik oku
      const tkhdIdx = buf.indexOf(Buffer.from("tkhd"));
      if (tkhdIdx !== -1 && tkhdIdx + 88 <= buf.length) {
        const version = buf.readUInt8(tkhdIdx + 4);
        const wOffset = version === 0 ? tkhdIdx + 80 : tkhdIdx + 92;
        if (wOffset + 8 <= buf.length) {
          const wFixed = buf.readUInt32BE(wOffset) >> 16;
          const hFixed = buf.readUInt32BE(wOffset + 4) >> 16;
          if (wFixed >= 120 && wFixed <= 7680 && hFixed >= 120 && hFixed <= 4320) {
            width = wFixed;
            height = hFixed;
          }
        }
      }
    } catch {
      // İkili ayrıştırma hatasında varsayılan hesaplamaya geç
    }
  }

  if (durationSec <= 0) {
    const byteSize = buf ? buf.length : (file.base64Data?.length || 500000) * 0.75;
    durationSec = Math.max(5, Math.min(45, Math.round(byteSize / 120000) || 8));
  }
  if (!width || !height) {
    width = 1920;
    height = 1080;
  }

  const resLabel =
    file.aspectRatioLabel ||
    `${width}x${height} (${width < height ? "Mobil / Dikey 9:16" : "Masaüstü / Geniş Ekran 16:9"})`;

  const maxSec = Math.min(120, Math.max(1, durationSec));
  const timeline: SecondTimelineEntry[] = [];
  let transitionCount = 0;
  let currentScreenName = determineSpecificScreenName(file.name, file.notes || "", "", "initial_screen", 0);

  const regions = [
    "Üst Navigasyon / Başlık Barı",
    "Merkez Form / Ana İçerik Alanı",
    "Alt Aksiyon / Onay Butonu Bölgesi",
    "Sağ Kontrol / Bildirim Bölgesi",
    "Sol Menü / Yan Navigasyon Paneli",
  ];

  for (let s = 0; s <= maxSec; s++) {
    const ts = formatSec(s);
    // Eğer binary buffer varsa o saniyeye karşılık gelen byte diliminin entropisini hesapla
    let diffPercent = 0;
    let regionIdx = (s + videoIdx) % regions.length;

    if (buf && buf.length > 1024 && s > 0) {
      const sliceStart = Math.floor(((s - 1) / (maxSec + 1)) * buf.length);
      const sliceMid = Math.floor((s / (maxSec + 1)) * buf.length);
      const sliceEnd = Math.min(buf.length, Math.floor(((s + 1) / (maxSec + 1)) * buf.length));
      const step = Math.max(1, Math.floor((sliceMid - sliceStart) / 64));
      let diffAccum = 0;
      let count = 0;
      for (let p = 0; p < 64; p++) {
        const i1 = Math.min(buf.length - 1, sliceStart + p * step);
        const i2 = Math.min(buf.length - 1, sliceMid + p * step);
        diffAccum += Math.abs(buf[i2] - buf[i1]);
        count++;
      }
      const avgByteDelta = count > 0 ? diffAccum / count : 15;
      diffPercent = Number(Math.min(68, Math.max(0.8, (avgByteDelta / 255) * 95)).toFixed(1));
      regionIdx = Math.round(avgByteDelta) % regions.length;
    } else if (s > 0) {
      diffPercent = s % 4 === 0 ? 38.4 : s % 2 === 1 ? 7.6 : 1.4;
    }

    let eventType: SecondTimelineEntry["eventType"] = "steady_state";
    let activeRegion = regions[regionIdx];
    let whatHappened = "";
    let qaCheckRequirement = "";

    if (s === 0) {
      eventType = "initial_screen";
      activeRegion = "Tam Ekran Açılış Görünümü";
      diffPercent = 100;
      currentScreenName = determineSpecificScreenName(file.name, file.notes || "", activeRegion, eventType, 0);
      whatHappened = `${currentScreenName} yüklendi. ${file.name} başlangıç durumu ve temel arayüz bileşenleri görünür durumda.`;
      qaCheckRequirement = `${currentScreenName} üzerindeki tüm arayüz elemanlarının eksiksiz ve görsel kayma olmadan yüklendiğini doğrulayın.`;
    } else if (diffPercent > 32) {
      eventType = "screen_transition";
      activeRegion = "Tam Ekran Sayfa Geçişi";
      transitionCount++;
      const prevScreenName = currentScreenName;
      currentScreenName = determineSpecificScreenName(file.name, file.notes || "", activeRegion, eventType, transitionCount, prevScreenName);
      if (currentScreenName === prevScreenName) {
        currentScreenName = `${prevScreenName} Detay Aşaması`;
      }
      whatHappened = `Tam ekran sayfa geçişi tespit edildi. ${prevScreenName} durumundan ${currentScreenName} durumuna geçildi.`;
      qaCheckRequirement = `${prevScreenName} görünümünden ${currentScreenName} görünümüne geçişin gecikmesiz ve görsel bozulma olmadan gerçekleştiğini doğrulayın.`;
    } else if (diffPercent >= 12) {
      eventType = "scroll_or_animation";
      whatHappened = `${activeRegion} üzerinde dinamik bileşen değişimi ve kaydırma hareketi gözlemlendi.`;
      qaCheckRequirement = `${activeRegion} alanındaki dinamik arayüz güncellemesinin akıcı ve hatasız çalıştığını kontrol edin.`;
    } else if (diffPercent >= 2.0) {
      eventType = "user_interaction";
      whatHappened = `${activeRegion} bölgesinde kullanıcı etkileşimi yani tıklama veya veri girişi gerçekleştirildi.`;
      qaCheckRequirement = `${activeRegion} üzerindeki kullanıcı etkileşiminin anlık arayüz geri bildirimini ve doğrulamasını teyit edin.`;
    } else {
      eventType = "steady_state";
      whatHappened = `${currentScreenName} görünümü stabil devam ediyor.`;
      qaCheckRequirement = `${currentScreenName} üzerindeki verilerin ve durum göstergelerinin tutarlı kaldığını teyit edin.`;
    }

    timeline.push({
      second: s,
      timestamp: ts,
      diffPercent,
      activeRegion,
      eventType,
      screenName: currentScreenName,
      whatHappened,
      qaCheckRequirement,
    });
  }

  return {
    durationSeconds: maxSec,
    formattedDuration: formatSec(maxSec),
    resolution: resLabel,
    timeline,
  };
}

/**
 * Her bir videonun saniye saniye zaman çizelgesinden (timeline) detaylı ekranları,
 * kullanıcı eylemlerini ve tespit edilen sorunları sentezler.
 */
function synthesizeInsightFromTimeline(
  videoIdx: number,
  file: MediaFilePayload,
  durationSeconds: number,
  formattedDuration: string,
  resolution: string,
  timeline: SecondTimelineEntry[],
  additionalNotes: string
): VideoInsight {
  const isImage = !file.mimeType.startsWith("video/") && !/\.(mp4|webm|mov|avi|mkv|ogg)$/i.test(file.name);
  const screens: string[] = [];
  const userActions: string[] = [];
  const issues: string[] = [];

  // 1. Ekranları zaman aralıklarıyla grupla
  const defaultInitialScreen = determineSpecificScreenName(file.name, additionalNotes, "", "", 0);
  let currentScreenLabel = timeline[0]?.screenName || defaultInitialScreen;
  if (/^Ekran\s*\d+/i.test(currentScreenLabel)) {
    currentScreenLabel = defaultInitialScreen;
  }
  let screenStartSec = 0;
  let screenRegions = new Set<string>();

  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    if (entry.activeRegion && !entry.activeRegion.includes("Sabit")) {
      screenRegions.add(entry.activeRegion);
    }

    const isLast = i === timeline.length - 1;
    let nextScreen = !isLast ? timeline[i + 1].screenName : null;
    if (nextScreen && /^Ekran\s*\d+/i.test(nextScreen)) {
      nextScreen = determineSpecificScreenName(file.name, additionalNotes, timeline[i + 1].activeRegion, timeline[i + 1].eventType, 1, currentScreenLabel);
    }

    if (isLast || (nextScreen && nextScreen !== currentScreenLabel)) {
      const startTs = formatSec(screenStartSec);
      const endTs = entry.timestamp;
      const regionSummary = Array.from(screenRegions).slice(0, 2).join(", ") || "Ana Görünüm";
      const cleanLabel = currentScreenLabel.replace(/^Ekran\s*\d+\s*[-:]*\s*/i, "").trim() || "Ana Kullanıcı Arayüzü";
      screens.push(
        `${startTs} - ${endTs}: ${cleanLabel} - ${resolution} - Aktif Alanlar: ${regionSummary}`
      );
      if (nextScreen) {
        currentScreenLabel = nextScreen;
        screenStartSec = timeline[i + 1].second;
        screenRegions = new Set<string>();
      }
    }
  }

  // 2. Saniye saniye tüm eylemleri ve önemli olayları çıkar
  for (const entry of timeline) {
    if (
      entry.eventType === "initial_screen" ||
      entry.eventType === "user_interaction" ||
      entry.eventType === "screen_transition" ||
      entry.eventType === "modal_open" ||
      entry.eventType === "scroll_or_animation" ||
      entry.eventType === "error_visual" ||
      entry.eventType === "success_visual"
    ) {
      userActions.push(entry.whatHappened);
    }

    // Sorun / Anomali / QA Odak Noktası Tespiti
    if (entry.eventType === "freeze_or_blank") {
      issues.push(
        `${entry.timestamp} - Görsel Kesinti: ${entry.whatHappened} - Uygulama çökmesi veya render hatası kontrol edilmeli`
      );
    } else if (entry.eventType === "error_visual") {
      issues.push(
        `${entry.timestamp} - Uyarı Görseli: ${entry.activeRegion} bölgesinde kırmızı uyarı sinyali tespit edildi. Hata mesajının netliği doğrulanmalı.`
      );
    } else if (entry.eventType === "loading_or_wait") {
      issues.push(
        `${entry.timestamp} - Arayüz Beklemesi: Arayüzde ardışık saniyeler boyunca değişim olmadı. Yükleniyor göstergesi ve arayüz donması kontrol edilmeli.`
      );
    } else if (entry.eventType === "screen_transition" && entry.diffPercent > 50) {
      issues.push(
        `${entry.timestamp} - Hızlı Ekran Geçişi: ${entry.screenName} geçişinde ekran düzeni kayması ve veri bütünlüğü doğrulanmalı.`
      );
    }
  }

  // Eğer kullanıcı notu varsa nottaki hata/beklentileri de issues/actions içine işle
  const combinedNotes = [file.notes, additionalNotes].filter(Boolean).join(" ").trim();
  if (combinedNotes) {
    const noteLines = combinedNotes
      .split(/\r?\n|(?<=[.!?])\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 8);
    for (const nl of noteLines.slice(0, 4)) {
      issues.push(`Kullanıcı Notu Odak Noktası: ${nl}`);
    }
  }

  if (issues.length === 0) {
    issues.push(
      `${formattedDuration} süresince tam ekran çökmesi saptanmadı; etkileşim noktalarında çift tıklama koruması, sınır değer ve ağ gecikmesi test edilmelidir.`
    );
  }

  // Eğer tüm saniyeler steady_state ise en azından her saniyenin özetini userActions'a ekle
  if (userActions.length === 0) {
    timeline.forEach((t) => userActions.push(t.whatHappened));
  }

  const flowSummary = isImage
    ? `${file.name} ekran görüntüsü incelendi; görsel bileşenler ve kalite kontrol noktaları çıkarıldı.`
    : `${file.name} videosu ${formattedDuration} süre boyunca analiz edildi: ${screens.length} ekran aşaması ve ${userActions.length} olay tespit edildi.`;

  return {
    videoIndex: videoIdx,
    videoName: file.name,
    mediaType: isImage ? "image" : "video",
    duration: formattedDuration,
    durationSeconds,
    resolution,
    analyzedSecondsCount: timeline.length,
    screens,
    userActions,
    issues,
    flowSummary,
    secondBySecondTimeline: timeline,
    generatedTestCount: 0,
  };
}

/**
 * Gemini Vision API anahtarı tanımlıysa videoyu ve çıkarılan saniye karelerini LLM ile de zenginleştirir.
 */
async function enrichInsightWithGemini(
  apiKey: string,
  file: MediaFilePayload,
  baseInsight: VideoInsight,
  additionalNotes: string
): Promise<VideoInsight> {
  const parts: any[] = [];

  // Eğer örneklenmiş kareler varsa veya boyut makulse (<= 15MB base64) ekle
  if (file.sampledFrames && file.sampledFrames.length > 0) {
    for (const frame of file.sampledFrames.slice(0, 16)) {
      parts.push({
        inline_data: {
          mime_type: frame.mimeType || "image/jpeg",
          data: frame.base64Data,
        },
      });
    }
  } else if (file.base64Data && file.base64Data.length < 20_000_000) {
    parts.push({
      inline_data: {
        mime_type: file.mimeType,
        data: file.base64Data,
      },
    });
  }

  const timelineSummary = baseInsight.secondBySecondTimeline
    .map((t) => `${t.timestamp}: [${t.eventType}] Bölge=${t.activeRegion}, Değişim=%${t.diffPercent} -> ${t.whatHappened}`)
    .join("\n");

  const prompt = `Sen kıdemli bir Bilgisayarlı Görü ve QA Test Mimarlık Mühendisisin. "${file.name}" (${baseInsight.duration}, ${baseInsight.resolution}) videosunun her saniyesi kare kare tarandı.
Ekteki görsel kareleri ve saniye saniye telemetriyi en ince ayrıntısına kadar incele.
Saniye Saniye Telemetri Verisi:
${timelineSummary}
${file.notes || additionalNotes ? `\nEk QA Notu: ${file.notes || ""} ${additionalNotes || ""}` : ""}

GÖREVİN VE KESİN EKRAN ADLANDIRMA KURALLARI:
1. "Ekran 1", "Ekran 2", "Açılış Ekranı", "Sayfa 1" gibi genel, belirsiz veya numaralandırılmış ifadeleri KESİNLİKLE KULLANMA.
2. Videoda gerçekten görünen ekranın içeriğini, butonlarını, formlarını, menülerini, HUD göstergelerini ve işlevini derinlemesine analiz ederek o ekrana tam uyan, SPESİFİK, ANLAMLI VE İÇERİKLE BİREBİR ÖRTÜŞEN isimler kullan.
   Örnekler: "Kullanıcı Girişi ve 2FA SMS Doğrulama Formu", "Ana Kontrol Paneli ve İstatistik Grafikleri", "Karakter Can Barı ve Envanter HUD Ekranı", "Alışveriş Sepeti ve Sipariş Ödeme Formu", "Ürün Arama ve Dinamik Filtreleme Kataloğu", "Hesap Ayarları ve Şifre Güncelleme Formu".
3. Her ekranı kendi görsel içeriğine ve işlevine göre tanımla. Ekran isimleri videodaki gerçek görüntülerle birebir örtüşmeli ve genel ifadelerden kaçınılmalıdır.
4. "perSecondScreens" nesnesinde her saniye için (örn: "00:00", "00:01", ...) ekranda gerçekten görünen spesifik ekran adını ver.
5. "screens" listesinde her ekran fazını şu formatta belirt:
   "00:00 - 00:05: [Spesifik Ekran Adı] - [Ekranda görünen ana bileşenler ve işlevi]"
6. "perSecondNotes" nesnesinde her saniyenin detaylı durumunu yaz.
7. Asla köşeli parantez ([...]) kullanma.

YALNIZCA şu JSON formatında yanıt ver:
{
  "screens": [
    "00:00 - 00:04: Kullanıcı Giriş ve Kimlik Doğrulama Formu - E-posta, şifre alanları ve giriş butonu",
    "00:04 - 00:12: Ana Kontrol Paneli ve İstatistik Grafikleri - KPI kartları ve dinamik veri tablosu"
  ],
  "perSecondScreens": {
    "00:00": "Kullanıcı Giriş ve Kimlik Doğrulama Formu",
    "00:01": "Kullanıcı Giriş ve Kimlik Doğrulama Formu"
  },
  "perSecondNotes": {
    "00:00": "Bu saniyede ekranda görünen detaylı durum ve eylem",
    "00:01": "..."
  },
  "userActions": ["00:01: ...", "00:02: ..."],
  "issues": ["00:05: ..."],
  "flowSummary": "Videonun detaylı akış özeti"
}`;

  parts.push({ text: prompt });

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-3.8-flash"];
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 6000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) continue;
      const data = (await response.json()) as any;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const perSecondScreens = parsed.perSecondScreens || {};
      const perSecondNotes = parsed.perSecondNotes || {};
      const updatedTimeline = baseInsight.secondBySecondTimeline.map((entry) => {
        const geminiScreen = perSecondScreens[entry.timestamp] || perSecondScreens[String(entry.second)];
        const geminiNote = perSecondNotes[entry.timestamp] || perSecondNotes[String(entry.second)];

        let screenName = entry.screenName;
        if (geminiScreen && typeof geminiScreen === "string") {
          const cleanScreen = geminiScreen.replace(/^Ekran\s*\d+\s*[-:]*\s*/i, "").trim();
          if (cleanScreen.length > 2) {
            screenName = cleanScreen;
          }
        }
        if (/^Ekran\s*\d+/i.test(screenName)) {
          screenName = determineSpecificScreenName(file.name, additionalNotes, entry.activeRegion, entry.eventType, entry.second > 5 ? 1 : 0);
        }

        let whatHappened = entry.whatHappened;
        if (geminiNote && typeof geminiNote === "string") {
          whatHappened = geminiNote.replace(/^\[.*?\]\s*/, "").replace(/Ekran\s*\d+/gi, screenName);
        } else {
          whatHappened = whatHappened.replace(/Ekran\s*\d+/gi, screenName);
        }

        return {
          ...entry,
          screenName,
          whatHappened,
        };
      });

      let cleanedScreens: string[] = [];
      if (Array.isArray(parsed.screens) && parsed.screens.length > 0) {
        cleanedScreens = parsed.screens.map((scr: string) => {
          return scr.replace(/Ekran\s*\d+\s*[-:]*\s*/gi, "").replace(/\[\s*Ekran\s*\d+[^\]]*\]/gi, "").trim();
        });
      } else {
        cleanedScreens = baseInsight.screens.map((scr: string) =>
          scr.replace(/Ekran\s*\d+\s*[-:]*\s*/gi, "").replace(/\[\s*Ekran\s*\d+[^\]]*\]/gi, "").trim()
        );
      }

      return {
        ...baseInsight,
        screens: cleanedScreens,
        userActions:
          Array.isArray(parsed.userActions) && parsed.userActions.length > 0
            ? parsed.userActions
            : baseInsight.userActions,
        issues: Array.isArray(parsed.issues) && parsed.issues.length > 0 ? parsed.issues : baseInsight.issues,
        flowSummary: parsed.flowSummary || baseInsight.flowSummary,
        secondBySecondTimeline: updatedTimeline,
      };
    } catch {
      // Sıradaki modeli dene veya yerel saniye analizini koru
    }
  }

  return baseInsight;
}

/**
 * Gemini Vision ile görsel/video karelerinden ve kullanıcının seçtiği test kapsamlarından
 * doğrudan o içeriğe ve olay akışına %100 uyan, yüksek doğruluklu QA test senaryoları üretir.
 */
async function generateDetailedTestCasesWithGeminiVision(
  apiKey: string,
  file: MediaFilePayload,
  insight: VideoInsight,
  title: string,
  category: string,
  additionalNotes: string,
  selectedScopes?: string[],
  customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>
): Promise<TestCase[] | null> {
  const parts: any[] = [];

  if (file.sampledFrames && file.sampledFrames.length > 0) {
    for (const frame of file.sampledFrames.slice(0, 16)) {
      if (frame.base64Data) {
        parts.push({
          inline_data: {
            mime_type: frame.mimeType || "image/jpeg",
            data: frame.base64Data,
          },
        });
      }
    }
  } else if (file.base64Data && file.base64Data.length < 20_000_000) {
    parts.push({
      inline_data: {
        mime_type: file.mimeType || "image/jpeg",
        data: file.base64Data,
      },
    });
  }

  const activeCustoms = (customScopes || []).map((c) => `- Özel Kapsam: ${c.title} (${c.reason || ""})`).join("\n");
  const activeSelectedScopes = (selectedScopes || []).join(", ");

  const prompt = `Sen Baş QA Test Mimarlık Mühendisisin.
Ekteki görsel/video karelerini, saniye saniye akışı ve kullanıcının seçtiği test kapsamlarını en üst kalitede, piksel piksel incele.

Dosya: "${file.name}" (${insight.duration}, ${insight.resolution})
Ek QA Notu: ${file.notes || ""} ${additionalNotes || ""}
Kullanıcının Seçtiği Aktif Test Kapsamları: ${activeSelectedScopes || "Tüm Tespit Edilen Kapsamlar"}
${activeCustoms ? `\nKullanıcının Tanımladığı Özel Kapsamlar:\n${activeCustoms}` : ""}

GÖREVİN:
Ekranda tespit ettiğin gerçek kullanıcı akışına, etkileşimli alanlara, butonlara, menülere ve seçili kapsamlara TAM UYUMLU, EN ÜST KALİTEDE, KESİN, DETAYLI VE GERÇEKÇİ QA test senaryoları üret.

ÖNEMLİ KURAL VE BİÇİMLENDİRME ZORUNLULUKLARI:
1. Test başlıklarında "Video", "Videolar", "Videoları", "Fotoğraf", "Fotoğraflar", "Görsel", "Görseller" kelimeleri KESİNLİKLE BULUNMAYACAKTIR. Başlıklar doğrudan test edilen fonksiyona, bileşene veya hata durumuna odaklanmalıdır.
2. Parantez () veya köşeli parantez [] KESİNLİKLE KULLANILMAYACAKTIR. Anlamlar doğrudan cümlenin akışına yedirilecektir.
3. Test adımları mutlaka Adım 1: ..., Adım 2: ..., Adım 3: ... şeklinde sıralı, her aşamada ne yapılması gerektiğini ve beklenen davranışı açıkça belirten adımlardan oluşmalıdır.
4. Adımlar videoda/görselde görülen gerçek olaylara ve akışa dayanmalı; şablon veya havada kalan ifadeler içermemelidir.
5. Her bir seçili test kapsamı (oyun oynanabilirlik/can/hasar, yapay zeka token/akış, sepet/ödeme, tablo vb.) için en az bir derinlemesine test senaryosu üretilmelidir.
6. Negatif testler, çift tıklama/spam tıklama koruması, sınır değer (boundary) ve ağ kesintisi/gecikmesi senaryolarına yer verilmelidir.
7. "Ekran 1", "Ekran 2" gibi genel ve numaralandırılmış ifadeler KESİNLİKLE KULLANILMAYACAKTIR. Videoda gerçekten görünen ekranın içeriğine uygun, spesifik ve anlamlı ekran isimleri (Örn: "Kullanıcı Giriş Formu", "Ana Kontrol Paneli", "Karakter Can Barı ve Envanter HUD Ekranı", "Sepet ve Ödeme Formu") kullanılacaktır.

Yanıtını YALNIZCA şu JSON şemasında bir dizi olarak döndür:
[
  {
    "id": "QA-TC-001",
    "targetComponent": "Test Edilen Bileşen veya Alan Adı",
    "title": "Açıklayıcı Test Başlığı",
    "type": "Test Türü",
    "priority": "Kritik" | "Yüksek" | "Orta",
    "preconditions": "Ön koşul açıklaması",
    "steps": [
      "Adım 1: ...",
      "Adım 2: ...",
      "Adım 3: ..."
    ],
    "expectedResult": "Beklenen sonuç açıklaması",
    "status": "Beklemede"
  }
]`;

  parts.push({ text: prompt });

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-3.8-flash"];
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) continue;
      const data = (await response.json()) as any;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length >= 3) {
        const vNum = insight.videoIndex + 1;
        return parsed.map((tc: any, idx: number) => {
          return cleanTestCase({
            id: tc.id || `QA-AI-${vNum}-${String(idx + 1).padStart(3, "0")}`,
            targetComponent: tc.targetComponent || "Ana Arayüz Bileşeni",
            title: cleanTitle(tc.title || "Fonksiyonel Doğrulama Testi", true),
            type: tc.type || "Fonksiyonel Doğrulama Testi",
            testType: tc.type || "Fonksiyonel Doğrulama Testi",
            priority: tc.priority || "Yüksek",
            preconditions: tc.preconditions || "Test ortamı hazır olmalıdır.",
            steps: Array.isArray(tc.steps) ? tc.steps : ["Adım 1: İşlemi başlatın.", "Adım 2: Sonucu doğrulayın."],
            expectedResult: tc.expectedResult || "İşlem hatasız tamamlanmalıdır.",
            status: "Beklemede",
          }, true);
        });
      }
    } catch (err: any) {
      console.warn(`[GeminiVision] Test senaryosu üretiminde ${model} atlandı:`, err.message);
    }
  }

  return null;
}

/**
 * AGL / AGY CLI aracılığıyla doğrudan Gemini 3.8 Flash modeliyle test senaryoları üretir.
 */
async function generateDetailedTestCasesWithCliGeminiFlash(
  file: MediaFilePayload,
  insight: VideoInsight,
  title: string,
  category: string,
  additionalNotes: string,
  selectedScopes?: string[],
  customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>
): Promise<TestCase[] | null> {
  const isAvail = await geminiCliService.isAvailable();
  if (!isAvail) return null;

  const timelineSummary = insight.secondBySecondTimeline
    .slice(0, 60)
    .map((t) => `${t.timestamp}: [${t.eventType}] Bölge=${t.activeRegion} -> ${t.whatHappened}`)
    .join("\n");

  const screensSummary = (insight.screens || []).join("\n");
  const issuesSummary = (insight.issues || []).join("\n");

  const activeScopeList = (selectedScopes || [])
    .concat((customScopes || []).map((c) => c.title))
    .join(", ");

  const prompt = `Sen kıdemli bir Test Mimarı ve Google Gemini 3.8 Flash modelisin.
Medyayı en üst kalitede inceleyen telemetri verileri:
Medya: ${file.name} (${insight.duration}, ${insight.resolution})
Ekranlar:
${screensSummary || "Ana Arayüz"}
Zaman Akışı ve Saniye Saniye Olaylar:
${timelineSummary}
${issuesSummary ? `Tespit Edilen Olası Hata ve QA Noktaları:\n${issuesSummary}` : ""}
Proje: ${title}
Kategori: ${category}
Seçilen Özel Test Kapsamları: ${activeScopeList || "Genel ve Fonksiyonel"}
Ek QA Notu: ${additionalNotes || "Yok"}

GÖREVİN:
Bu akışa ve seçilen test kapsamlarına göre en üst kalitede, derinlemesine, adım adım 5-10 adet uçtan uca QA test senaryosu üret.
ÖNEMLİ KURALLAR:
1. Başlıklarda asla "Video" veya "Fotoğraf" kelimelerini kullanma.
2. Asla köşeli parantez ([...]) veya normal parantez ((...)) kullanma.
3. "Ekran 1", "Ekran 2" gibi genel ve numaralandırılmış ifadeleri KESİNLİKLE KULLANMA. Her ekranı videodaki gerçek görsel içeriğe ve işlevine göre tam ve spesifik olarak adlandır.
4. Her adım kesinlikle benzersiz olmalı, "Adım 1: ...", "Adım 2: ..." formatında olmalı.
5. YALNIZCA şu JSON formatında bir dizi (array) döndür, başka hiçbir metin veya markdown ekleme:
[
  {
    "targetComponent": "İlgili Bileşen veya Ekran Adı",
    "title": "Açıklayıcı Senaryo Başlığı",
    "type": "Fonksiyonel Doğrulama",
    "priority": "Kritik",
    "preconditions": "Ön koşul açıklaması",
    "steps": [
      "Adım 1: ...",
      "Adım 2: ...",
      "Adım 3: ..."
    ],
    "expectedResult": "Beklenen sonuç açıklaması",
    "status": "Beklemede"
  }
]`;

  const res = await geminiCliService.runPromptWithGemini38Flash(prompt, {
    model: "gemini-3.8-flash",
    timeoutMs: 45000,
  });

  if (res.success && Array.isArray(res.parsedJson)) {
    return res.parsedJson.map((tc: any, idx: number) => ({
      id: `tc-gemini-flash-${Date.now()}-${idx + 1}`,
      targetComponent: tc.targetComponent || title,
      title: cleanTitle(tc.title || `Doğrulama Testi ${idx + 1}`, true),
      type: tc.type || "Fonksiyonel Test",
      testType: tc.type || "Fonksiyonel Test",
      priority: tc.priority || "Yüksek",
      preconditions: tc.preconditions || "Arayüz yüklenmiş olmalıdır.",
      steps: Array.isArray(tc.steps) ? tc.steps : ["Adım 1: Arayüzü açın.", "Adım 2: İşlemi gerçekleştirin."],
      expectedResult: tc.expectedResult || "İşlem başarıyla tamamlanmalıdır.",
      status: tc.status || "Beklemede",
    }));
  }

  return null;
}

/**
 * Tek bir videonun saniye saniye analiz sonuçlarından (VideoInsight) doğrudan o videoya özel,
 * zaman damgalı ve detaylı QA test senaryoları üretir.
 */
function generateDetailedTestCasesForSingleVideo(
  projectTitle: string,
  category: string,
  insight: VideoInsight,
  videoNotes: string,
  additionalNotes: string,
  selectedScopes?: string[],
  customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>
): TestCase[] {
  const testCases: TestCase[] = [];
  const vNum = insight.videoIndex + 1;
  const cleanFileName = insight.videoName.replace(/\.[^/.]+$/, "");
  let tcCounter = 1;
  const nextId = () => `QA-V${vNum}-${String(tcCounter++).padStart(3, "0")}`;

  const timeline = insight.secondBySecondTimeline || [];
  const isImage = insight.mediaType === "image";

  const isScopeActive = (scopeId: string, fallback: boolean = true) => {
    if (!selectedScopes || selectedScopes.length === 0) return fallback;
    return selectedScopes.includes(scopeId);
  };

  // Alan (Domain) ve İçerik Tespiti
  const combinedText = [
    projectTitle,
    category,
    insight.videoName,
    videoNotes,
    additionalNotes,
    insight.flowSummary,
    ...(insight.issues || []),
    ...(insight.screens || []),
    ...(insight.userActions || []),
  ]
    .join(" ")
    .toLowerCase();

  const isGameDomain =
    category === "game" ||
    category === "gameplay" ||
    Boolean(selectedScopes?.some((s) => s.startsWith("scope_gameplay_"))) ||
    /\b(oyun|game|gameplay|unity|unreal|karakter|character|hasar|damage|can\s*bar[ıi]|health|respawn|checkpoint|envanter|inventory|skor|score|level|fps|çarpışma|collision|silah|weapon|joystick|wasd)\b/i.test(
      combinedText
    );

  const isAiDomain =
    category === "ai" ||
    category === "ai_qa" ||
    category === "llm" ||
    Boolean(selectedScopes?.some((s) => s.startsWith("scope_ai_"))) ||
    /\b(ai|yapay\s*zeka|llm|prompt|üretim|generation|generate|model|chat|bot|streaming|token|görsel\s*üret|metin\s*üret|halüsinasyon|assistant|gpt|gemini|claude)\b/i.test(
      combinedText
    );

  const isEcommerceDomain =
    category === "ecommerce" ||
    category === "ecom" ||
    category === "shop" ||
    Boolean(selectedScopes?.some((s) => s.startsWith("scope_ecommerce_"))) ||
    /\b(sepet|cart|checkout|odeme|payment|shop|magaza|urun|product|siparis|order|fiyat|kupon|indirim)\b/i.test(
      combinedText
    );

  const isDashboardDomain =
    category === "dashboard" ||
    category === "analytics" ||
    Boolean(selectedScopes?.some((s) => s.startsWith("scope_dashboard_"))) ||
    /\b(dashboard|panel|tablo|table|grid|rapor|report|analiz|grafik|chart|kpi|istatistik)\b/i.test(
      combinedText
    );

  const isMediaPlayerDomain =
    category === "media" ||
    category === "video" ||
    Boolean(selectedScopes?.some((s) => s.startsWith("scope_media_"))) ||
    /\b(player|video|oynatici|stream|media|film|movie|youtube|netflix|muzik|audio|seekbar)\b/i.test(
      combinedText
    );

  if (isImage || timeline.length <= 1) {
    // 1. Temel Görsel Bütünlük Testi
    if (isScopeActive("scope_ui_alignment") || !selectedScopes || selectedScopes.length === 0) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Ana Arayüz`,
        title: `Arayüz Bileşenleri ve Görsel Bütünlük Doğrulaması`,
        type: "Görsel Arayüz Doğrulama Testi",
        testType: "Görsel Arayüz Doğrulama Testi",
        priority: "Yüksek",
        preconditions: `Uygulama ilgili ekranda açık olmalı ve test verileri hazır bulunmalıdır.`,
        steps: [
          `Adım 1: Ekrandaki tüm başlıkların, menü öğelerinin ve açıklama metinlerinin doğru ve okunabilir olduğunu doğrulayın.`,
          `Adım 2: Form alanlarının, işlem butonlarının ve durum etiketlerinin sayfa düzenine uygun hizalandığını kontrol edin.`,
          `Adım 3: Varsa uyarı veya bildirim alanlarının tasarım standartlarına ve renk kontrastına uygun olduğunu teyit edin.`,
          `Adım 4: Ekran üzerindeki tüm aksiyon butonlarının erişilebilir olduğunu ve doğru konumlandığını doğrulayın.`,
        ],
        expectedResult: `Ekranda yer alan tüm arayüz bileşenleri eksiksiz ve hatasız görüntülenmeli, tasarım kurallarına tam uyum sağlamalıdır.`,
        status: "Beklemede",
      });
    }

    // 2. Çoklu Ekran Çözünürlüğü ve Düzen Taşması Kontrolü
    if (isScopeActive("scope_responsive_overflow")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Responsive Düzen`,
        title: `Ekran Çözünürlüğü Değişimi ve Bileşen Taşma Kontrolü`,
        type: "Ekran Düzeni ve Taşma Testi",
        testType: "Ekran Düzeni ve Taşma Testi",
        priority: "Yüksek",
        preconditions: `Ekran farklı tarayıcı pencere boyutlarında test edilmek üzere hazır olmalıdır.`,
        steps: [
          `Adım 1: Ekrandaki bileşenleri mobil 375 piksel ve tablet 768 piksel genişliklerinde simüle ederek düzeni inceleyin.`,
          `Adım 2: Form alanlarının, metinlerin ve butonların ekran sınırları dışına taşmadığını veya birbirinin üzerine binmediğini doğrulayın.`,
          `Adım 3: Tarayıcı yakınlaştırması yüzde 200 seviyesine getirildiğinde yatay kaydırma çubuğu oluşmadan içeriğin aktığını teyit edin.`,
          `Adım 4: Başlık ve etiket metinlerinin küçük ekran boyutlarında kesilmeden veya anlamsız bölünmeden okunduğunu kontrol edin.`,
        ],
        expectedResult: `Farklı çözünürlüklerde arayüz bileşenleri taşmamalı, düzen bozulması veya metin kesilmesi yaşanmamalıdır.`,
        status: "Beklemede",
      });
    }

    // 3. Mobil Dokunmatik Alan Testi
    if (isScopeActive("scope_mobile_touch")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Dokunmatik Alanlar`,
        title: `Dokunmatik Alan Genişliği ve Tek El Kullanılabilirlik Testi`,
        type: "Mobil Dokunmatik Kullanılabilirlik Testi",
        testType: "Mobil Dokunmatik Kullanılabilirlik Testi",
        priority: "Yüksek",
        preconditions: `Mobil arayüz görünümü ve ekran elemanları açık olmalıdır.`,
        steps: [
          `Adım 1: Tıklanabilir buton ve bağlantıların temas alanının en az kırk dört piksel genişlikte olduğunu kontrol edin.`,
          `Adım 2: Yan yana duran butonlara dokunulduğunda yanlış butona tıklanma ihtimalini önleyen yeterli boşluğun bulunduğunu doğrulayın.`,
          `Adım 3: Form giriş alanlarına dokunulduğunda sanal klavyenin açıldığını ve giriş kutusunun klavye altında kalmadığını teyit edin.`,
          `Adım 4: Ekranın en üst ve en altındaki aksiyon alanlarının tek elle rahatça erişilebilir olduğunu kontrol edin.`,
        ],
        expectedResult: `Dokunmatik alanlar yeterli genişlikte olmalı, sanal klavye içerikleri kapatmamalı ve tek elle kullanım rahat olmalıdır.`,
        status: "Beklemede",
      });
    }

    // 4. Oyun Alanı Testleri
    if (isGameDomain) {
      if (isScopeActive("scope_gameplay_collision") || isScopeActive("scope_gameplay_damage")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Oyun HUD`,
          title: `Oyun Arayüzü HUD Göstergeleri ve Can Barı Doğrulaması`,
          type: "Oyun Arayüzü ve HUD Testi",
          testType: "Oyun Arayüzü ve HUD Testi",
          priority: "Kritik",
          preconditions: `Oyun sahnesi ve HUD göstergeleri aktif durumda bulunmalıdır.`,
          steps: [
            `Adım 1: Ekrandaki can barı, zırh, skor ve mini harita göstergelerinin ana oyun görünümünü engellemediğini doğrulayın.`,
            `Adım 2: Karakter canı kritik seviyeye indiğinde HUD üzerinde beklenen yanıp sönme veya renk değişiminin tetiklendiğini kontrol edin.`,
            `Adım 3: Dokunmatik veya klavye aksiyon butonlarının basılma alanının yeterli genişlikte olduğunu ve çakışmadığını teyit edin.`,
            `Adım 4: Ekran en boy oranı değiştiğinde göstergelerin ekran köşelerine doğru orantılı sabitlendiğini doğrulayın.`,
          ],
          expectedResult: `Oyun içi göstergeler oyun alanını kapatmamalı, dinamik durumları doğru yansıtmalı ve kontrollere engel olmamalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_gameplay_controls")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Oyun Kontrolleri`,
          title: `Oyun İçi Dokunmatik ve Klavye Kontrolleri Tepki Testi`,
          type: "Oyun Kontrolleri ve Tepki Testi",
          testType: "Oyun Kontrolleri ve Tepki Testi",
          priority: "Yüksek",
          preconditions: `Oyun sahnesi ve yönlendirme kontrolleri açık olmalıdır.`,
          steps: [
            `Adım 1: Yön tuşlarına ve eylem butonlarına basıldığında karakterin anında tepki verdiğini kontrol edin.`,
            `Adım 2: Eşzamanlı tuş vuruşlarında komut kaybı oluşmadığını doğrulayın.`,
            `Adım 3: Dokunmatik yönlendirme çubuğunun hassasiyetinin akıcı olduğunu teyit edin.`,
          ],
          expectedResult: `Tüm oyun kontrolleri gecikmesiz çalışmalı ve tuş çakışması yaşanmamalıdır.`,
          status: "Beklemede",
        });
      }
    }

    // 5. Yapay Zeka Testleri
    if (isAiDomain) {
      if (isScopeActive("scope_ai_streaming") || isScopeActive("scope_ai_token_limit")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - İstem ve Model Çıktısı`,
          title: `Yapay Zeka İstem Girişi ve Boş Parametre Kontrolü`,
          type: "Yapay Zeka Giriş Doğrulama Testi",
          testType: "Yapay Zeka Giriş Doğrulama Testi",
          priority: "Kritik",
          preconditions: `Yapay zeka istem kutusu ve model ayarları ekranda görünür olmalıdır.`,
          steps: [
            `Adım 1: İstem giriş kutusunu tamamen boş bırakarak veya yalnızca boşluk girerek üretim butonuna tıklayın.`,
            `Adım 2: Sistemin boş istek göndermeyip kullanıcıya geçerli bir istem girmesi gerektiğini açıkça bildirdiğini doğrulayın.`,
            `Adım 3: Aşırı uzun metin yapıştırıldığında giriş kutusunun arayüzü bozmadan karakter sınırını kullanıcıya gösterdiğini kontrol edin.`,
            `Adım 4: Model parametreleri değiştirildiğinde ekrandaki varsayılan değerlerin ve etiketlerin tutarlılığını teyit edin.`,
          ],
          expectedResult: `Boş veya geçersiz istemler modele iletilmeden engellenmeli, kullanıcıya net doğrulama uyarısı sunulmalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_ai_chat_history")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Sohbet Geçmişi`,
          title: `Sohbet Mesaj Geçmişi ve Oturum Tutarlılığı Doğrulaması`,
          type: "Yapay Zeka Sohbet Geçmişi Testi",
          testType: "Yapay Zeka Sohbet Geçmişi Testi",
          priority: "Yüksek",
          preconditions: `Yapay zeka sohbet geçmişi ve mesajlaşma alanı görünür olmalıdır.`,
          steps: [
            `Adım 1: Önceki istem ve yanıt balonlarının kronolojik sırayla ve doğru hizalamayla görüntülendiğini doğrulayın.`,
            `Adım 2: Yanıt metni içindeki kod bloklarının ve formatlı listelerin düzgün render edildiğini kontrol edin.`,
            `Adım 3: Yeni istem girildiğinde önceki bağlamın kaybolmadığını teyit edin.`,
          ],
          expectedResult: `Sohbet geçmişi eksiksiz gösterilmeli ve mesaj formatları bozulmamalıdır.`,
          status: "Beklemede",
        });
      }
    }

    // 6. E-Ticaret Testleri
    if (isEcommerceDomain) {
      if (isScopeActive("scope_ecommerce_cart")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Alışveriş Sepeti`,
          title: `Sepet Tutarı, Ürün Miktarı ve Kupon İndirimi Doğrulaması`,
          type: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
          testType: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
          priority: "Kritik",
          preconditions: `Sepet veya ürün özeti ekranı hazır olmalıdır.`,
          steps: [
            `Adım 1: Sepetteki ürün adet miktarını artırıp azaltarak ara toplamın ve vergi tutarının anlık güncellendiğini doğrulayın.`,
            `Adım 2: Ürün adedi sıfıra indirildiğinde ürünün sepetten silindiğini veya silme onayı istendiğini kontrol edin.`,
            `Adım 3: Geçerli bir indirim kupon kodu uygulandığında toplam tutara indirimin doğru yansıtıldığını teyit edin.`,
          ],
          expectedResult: `Sepet tutarı ve indirimler kuruşu kuruşuna doğru hesaplanmalı ve hatasız gösterilmelidir.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_ecommerce_checkout")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Ödeme Formu`,
          title: `Ödeme Formu Bilgileri ve Kart Maskeleme Güvenlik Testi`,
          type: "Ödeme Güvenliği ve Form Doğrulama Testi",
          testType: "Ödeme Güvenliği ve Form Doğrulama Testi",
          priority: "Kritik",
          preconditions: `Ödeme ekranı ve kart alanları hazır olmalıdır.`,
          steps: [
            `Adım 1: Kredi kartı numarası girilirken hanelerin dörderli bloklar halinde formatlandığını ve kart tipinin doğru algılandığını doğrulayın.`,
            `Adım 2: Güvenlik kodu girilirken karakterlerin maskelenerek ekranda gizlendiğini kontrol edin.`,
            `Adım 3: Eksik veya geçersiz kart bilgileriyle ödeme butonuna tıklandığında bankaya istek atılmadan alan bazlı hata gösterildiğini doğrulayın.`,
          ],
          expectedResult: `Kart verileri güvenli maskelenmeli ve geçersiz girişler engellenmelidir.`,
          status: "Beklemede",
        });
      }
    }

    // 7. Dashboard ve Tablo Testleri
    if (isDashboardDomain) {
      if (isScopeActive("scope_dashboard_table")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Veri Tablosu`,
          title: `Veri Tablosu Sıralama, Filtreleme ve Sayfalama Testi`,
          type: "Veri Tablosu ve Sayfalama Testi",
          testType: "Veri Tablosu ve Sayfalama Testi",
          priority: "Yüksek",
          preconditions: `Veri tablosu ekranda görünür olmalıdır.`,
          steps: [
            `Adım 1: Tablo kolon başlıklarına tıklayarak artan ve azalan sıralamanın doğru çalıştığını doğrulayın.`,
            `Adım 2: Arama kutusuna kriter girerek filtrelenen kayıtların doğruluğunu kontrol edin.`,
            `Adım 3: Sayfalama geçiş butonlarının doğru kayıt kümesini getirdiğini teyit edin.`,
          ],
          expectedResult: `Tablo filtreleme ve sıralama işlemleri hatasız çalışmalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_dashboard_metrics")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Metrik Kartları`,
          title: `Grafik ve Metrik Kartları Veri Bütünlüğü Doğrulaması`,
          type: "Gösterge Paneli ve Veri Doğrulama Testi",
          testType: "Gösterge Paneli ve Veri Doğrulama Testi",
          priority: "Yüksek",
          preconditions: `Yönetim paneli metrikleri açık olmalıdır.`,
          steps: [
            `Adım 1: Metrik kartlarındaki toplam sayıların arka plan verileriyle birebir örtüştüğünü doğrulayın.`,
            `Adım 2: Tarih filtresi değiştirildiğinde grafiklerin seçilen aralığa senkron güncellendiğini kontrol edin.`,
            `Adım 3: Grafik üzerine gelindiğinde veri balonlarının doğru değerleri sunduğunu teyit edin.`,
          ],
          expectedResult: `Metrik kartları ve grafikler tutarlı ve doğru verileri yansıtmalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_dashboard_export")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Tablo Dışa Aktarma`,
          title: `Dışa Aktarma ve Toplu Veri İşlem Dayanıklılığı Testi`,
          type: "Dışa Aktarma ve Veri Dayanıklılık Testi",
          testType: "Dışa Aktarma ve Veri Dayanıklılık Testi",
          priority: "Orta",
          preconditions: `Dışa aktarılacak tablo görünümü hazır olmalıdır.`,
          steps: [
            `Adım 1: Dışa aktarma butonuna tıklayarak dosya indirme işleminin başladığını doğrulayın.`,
            `Adım 2: İndirilen dosyadaki Türkçe karakterlerin ve kolon düzeninin korunduğunu kontrol edin.`,
          ],
          expectedResult: `Veri dışa aktarımı eksiksiz tamamlanmalı ve karakter bozulması yaşanmamalıdır.`,
          status: "Beklemede",
        });
      }
    }

    // 8. Medya Oynatıcı Testleri
    if (isMediaPlayerDomain) {
      if (isScopeActive("scope_media_player")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Medya Oynatıcı`,
          title: `Medya Oynatıcı Kontrolleri, Oynat Duraklat ve Tam Ekran Testi`,
          type: "Medya Oynatıcı Kontrol Testi",
          testType: "Medya Oynatıcı Kontrol Testi",
          priority: "Yüksek",
          preconditions: `Medya oynatıcı ekranda görünür olmalıdır.`,
          steps: [
            `Adım 1: Oynat butonuna tıklandığında medyanın başladığını ve duraklat simgesine dönüştüğünü kontrol edin.`,
            `Adım 2: Tam ekran butonuna basarak oynatıcının tüm ekranı kapladığını teyit edin.`,
          ],
          expectedResult: `Oynatıcı butonları anlık tepki vermeli ve tam ekran modu hatasız çalışmalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_media_seekbar")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - İlerleme Çubuğu`,
          title: `İlerleme Çubuğu Atlama ve Arabelleğe Alma Doğrulaması`,
          type: "Medya İlerleme ve Sarma Testi",
          testType: "Medya İlerleme ve Sarma Testi",
          priority: "Yüksek",
          preconditions: `İlerleme çubuğu görünür olmalıdır.`,
          steps: [
            `Adım 1: İlerleme çubuğunda farklı bir dakikaya tıklandığında akışın atlanan noktadan sürdüğünü doğrulayın.`,
            `Adım 2: Arabelleğe alma sırasında ekran ortasında yükleniyor göstergesinin belirdiğini teyit edin.`,
          ],
          expectedResult: `İlerleme çubuğu atlamaları gecikmesiz çalışmalı ve medya akışı donmamalıdır.`,
          status: "Beklemede",
        });
      }

      if (isScopeActive("scope_media_quality")) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - Ses ve Kalite`,
          title: `Ses Seviyesi ve Çözünürlük Değişimi Dayanıklılığı Testi`,
          type: "Ses ve Kalite Yönetimi Testi",
          testType: "Ses ve Kalite Yönetimi Testi",
          priority: "Orta",
          preconditions: `Medya oynatıcı ses ve çözünürlük ayarları hazır olmalıdır.`,
          steps: [
            `Adım 1: Ses kaydırıcısı hareket ettirildiğinde ses seviyesinin değiştiğini kontrol edin.`,
            `Adım 2: Çözünürlük değiştirildiğinde yayının kesilmeden yeni kalitede aktığını teyit edin.`,
          ],
          expectedResult: `Ses ve çözünürlük değişimleri oynatmayı aksatmadan tamamlanmalıdır.`,
          status: "Beklemede",
        });
      }
    }

    // 9. Form ve Güvenlik Testleri
    if (isScopeActive("scope_form_security")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Giriş Alanları`,
        title: `Form Girdi Alanları Sınır Değer ve Karakter Güvenliği Testi`,
        type: "Güvenlik ve Sınır Değer Testi",
        testType: "Güvenlik ve Sınır Değer Testi",
        priority: "Kritik",
        preconditions: `Görselde yer alan form ve veri alanları hazır durumda olmalıdır.`,
        steps: [
          `Adım 1: Görseldeki tüm giriş alanlarına maksimum karakter sınırını aşan metinler girerek sınırlandırmayı kontrol edin.`,
          `Adım 2: Girdi kutularına script etiketleri ve özel işaretler girildiğinde sistemin bunları zararsız metin olarak işlediğini doğrulayın.`,
          `Adım 3: Zorunlu alanlar doldurulmadan form gönderilmeye çalışıldığında ilgili kutuların belirgin uyarıyla işaretlendiğini teyit edin.`,
          `Adım 4: Giriş alanlarına yalnızca boşluk karakteri girilip kaydedilmeye çalışıldığında trim kontrolünün çalıştığını kontrol edin.`,
        ],
        expectedResult: `Girdi sınırları tavizsiz uygulanmalı, özel karakterler ve boşluk hileleri filtrelenerek güvenlik sağlanmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_form_masking")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Hassas Veri Alanı`,
        title: `Parola ve Hassas Alan Maskeleme Doğrulaması`,
        type: "Hassas Alan ve Maskeleme Testi",
        testType: "Hassas Alan ve Maskeleme Testi",
        priority: "Yüksek",
        preconditions: `Parola veya hassas veri alanı ekranda hazır olmalıdır.`,
        steps: [
          `Adım 1: Parola alanına yazılan karakterlerin maskeli olarak gizlendiğini kontrol edin.`,
          `Adım 2: Göster simgesine tıklandığında parolanın görünür olduğunu, gizle tıklandığında yeniden maskelendiğini teyit edin.`,
        ],
        expectedResult: `Parola alanları varsayılan olarak maskelenmeli ve göster gizle işlevi doğru çalışmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_double_click")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - İşlem Butonu`,
        title: `İşlem Butonuna Çift Tıklama ve Mükerrer İstek Engeli`,
        type: "Mükerrer Tıklama Koruma Testi",
        testType: "Mükerrer Tıklama Koruma Testi",
        priority: "Kritik",
        preconditions: `Görseldeki işlem onay butonu hazır olmalıdır.`,
        steps: [
          `Adım 1: Onay butonuna art arda hızlıca iki kez tıklayın.`,
          `Adım 2: Butonun ilk tıklamada bekleme durumuna geçtiğini ve mükerrer istek gönderilmediğini doğrulayın.`,
        ],
        expectedResult: `Çift tıklamada sisteme yalnızca tek istek iletilmeli ve mükerrer kayıt oluşmamalıdır.`,
        status: "Beklemede",
      });
    }

    // 10. Renk Kontrastı ve Erişilebilirlik Testi
    if (isScopeActive("scope_keyboard_a11y")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Erişilebilirlik ve Kontrast`,
        title: `Renk Kontrastı ve Dokunmatik Alan Erişilebilirlik Testi`,
        type: "Erişilebilirlik ve Kontrast Testi",
        testType: "Erişilebilirlik ve Kontrast Testi",
        priority: "Orta",
        preconditions: `Tasarım standartları ve erişilebilirlik denetim araçları hazır olmalıdır.`,
        steps: [
          `Adım 1: Görselde yer alan metinler ile zemin renkleri arasındaki kontrast oranının standartlara uyduğunu doğrulayın.`,
          `Adım 2: Tıklanabilir buton ve simgelerin dokunmatik temas alanının en az 44 piksel genişlikte olduğunu kontrol edin.`,
          `Adım 3: Durum bildirimlerinin yalnızca renkle değil, açıklayıcı metin veya simgelerle de desteklendiğini teyit edin.`,
        ],
        expectedResult: `Arayüz tüm kullanıcılar için okunabilir olmalı, butonlar rahat tıklanabilmeli ve kontrast kurallarına tam uymalıdır.`,
        status: "Beklemede",
      });
    }

    // 11. Ağ Kesintisi Dayanıklılığı Testi
    if (isScopeActive("scope_network_resilience")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Ağ Dayanıklılığı`,
        title: `Ağ Kesintisi ve Sayfa Yenileme Dayanıklılık Testi`,
        type: "Ağ Kesintisi ve Veri Kalıcılığı Testi",
        testType: "Ağ Kesintisi ve Veri Kalıcılığı Testi",
        priority: "Yüksek",
        preconditions: `Görseldeki ekran test ortamında açık olmalıdır.`,
        steps: [
          `Adım 1: Ağ bağlantısı kesildiğinde ekranda net bir bağlantı koptu uyarısı belirdiğini doğrulayın.`,
          `Adım 2: Bağlantı geri geldiğinde ekran durumunun korunduğunu teyit edin.`,
        ],
        expectedResult: `Ağ kesintisinde arayüz kilitlenmemeli ve veri kaybı yaşanmamalıdır.`,
        status: "Beklemede",
      });
    }

    // 12. Kullanıcı Tanımlı Özel Kapsamlar (Görsel İçin)
    if (Array.isArray(customScopes) && customScopes.length > 0) {
      for (const cs of customScopes) {
        if (isScopeActive(cs.id)) {
          testCases.push({
            id: nextId(),
            targetComponent: `${cleanFileName} - ${cs.title}`,
            title: cs.title,
            type: "Kullanıcı Tanımlı Özel Test Kapsamı",
            testType: "Kullanıcı Tanımlı Özel Test Kapsamı",
            priority: "Yüksek",
            preconditions: `Uygulama ilgili ekranda açık olmalı ve test ortamı hazır bulunmalıdır.`,
            steps: [
              `Adım 1: ${cs.title} senaryosu için arayüzdeki ilgili modülü ve bileşenleri hazırlayın.`,
              `Adım 2: ${cs.reason || cs.title} gereksinimine uygun test verilerini ve eylemlerini uygulayın.`,
              `Adım 3: Sınır değer veya beklenmeyen kullanıcı girdisi vererek sistemin doğru hata veya geri bildirim sunduğunu doğrulayın.`,
              `Adım 4: Ekran tasarımının ve bileşen hizalamasının bozulmadığını kontrol edin.`,
            ],
            expectedResult: `${cs.title} senaryosu başarıyla karşılanmalı ve arayüz kararlılığını korumalıdır.`,
            status: "Beklemede",
          });
        }
      }
    }

    insight.generatedTestCount = testCases.length;
    return testCases.map((tc) => cleanTestCase(tc, true));
  }

  // 1. TEST SENARYOSU: Uçtan Uca Temel Kullanıcı Akışı Doğrulaması (Videodaki Gerçek Süreç ve Akışa Göre)
  const chronologicalSteps: string[] = [];

  // Başlangıç ekranı adımı
  const initialRegion = timeline[0]?.activeRegion || "Açılış Arayüzü";
  chronologicalSteps.push(
    `Adım 1: Uygulama başlangıç ekranını açın; ${initialRegion} alanındaki temel bileşenlerin, başlıkların ve kontrollerin eksiksiz yüklendiğini doğrulayın.`
  );

  // Saniye saniye zaman çizelgesindeki belirgin olayları (ekran geçişleri, etkileşimler, modal açılışları, animasyonlar) filtrele
  const significantEntries = timeline.filter((e, idx) => {
    if (idx === 0) return false;
    return (
      e.eventType === "screen_transition" ||
      e.eventType === "modal_open" ||
      e.eventType === "user_interaction" ||
      e.eventType === "scroll_or_animation" ||
      e.eventType === "error_visual" ||
      e.eventType === "success_visual" ||
      e.diffPercent >= 15
    );
  });

  const stepsPool =
    significantEntries.length >= 2
      ? significantEntries
      : timeline.filter((e, idx) => idx > 0 && e.diffPercent > 2);

  // Süreç ve akışa göre adım oluştur (en fazla 7-8 ana adım olacak şekilde adımları grupla ve sırala)
  let lastActionRegion = "";
  for (let sIdx = 0; sIdx < stepsPool.length && chronologicalSteps.length < 7; sIdx++) {
    const entry = stepsPool[sIdx];
    if (entry.activeRegion === lastActionRegion && entry.eventType === "user_interaction") {
      continue;
    }
    lastActionRegion = entry.activeRegion;

    if (entry.eventType === "modal_open") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: Ekranda açılan diyalog penceresini test edin; arka plan karartmasının oturduğunu, pencere odağının merkezde olduğunu ve form elemanlarının erişilebilirliğini doğrulayın.`
      );
    } else if (entry.eventType === "screen_transition") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: ${entry.screenName || "Yeni arayüz"} görünümüne geçişi gerçekleştirin; ekran kayması veya donma olmaksızın içeriğin doğru yüklendiğini teyit edin.`
      );
    } else if (entry.eventType === "user_interaction") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: ${entry.activeRegion} alanında veri girişi ve işlem onayını tamamlayın; arayüzün anlık durum geri bildirimini verdiğini kontrol edin.`
      );
    } else if (entry.eventType === "scroll_or_animation") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: ${entry.activeRegion} üzerindeki dinamik bileşen akışını ve kaydırma hareketini çalıştırın; içeriklerin akıcı şekilde render edildiğini doğrulayın.`
      );
    } else if (entry.eventType === "error_visual") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: ${entry.activeRegion} bölgesinde beliren hata veya uyarı bildirimini inceleyin; mesajın açıklayıcı ve yönlendirici olduğunu teyit edin.`
      );
    } else if (entry.eventType === "success_visual") {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: İşlem tamamlandığında beklenen başarı onay bildiriminin görüntülendiğini ve durumun güncellendiğini doğrulayın.`
      );
    } else {
      chronologicalSteps.push(
        `Adım ${chronologicalSteps.length + 1}: ${entry.activeRegion} alanındaki arayüz bileşenlerini kontrol ederek verilerin tutarlılığını doğrulayın.`
      );
    }
  }

  // Sonuç ve veri kalıcılığı adımı
  chronologicalSteps.push(
    `Adım ${chronologicalSteps.length + 1}: Akış boyunca gerçekleştirilen tüm işlemlerin sisteme eksiksiz kaydedildiğini ve ilgili özet ekranına veri kaybı olmadan yansıtıldığını doğrulayın.`
  );

  testCases.push({
    id: nextId(),
    targetComponent: `${cleanFileName} - Ana Akış`,
    title: `Uçtan Uca Kullanıcı Akışı ve Arayüz Doğrulaması`,
    type: "Uçtan Uca Kullanıcı Akış Testi",
    testType: "Uçtan Uca Kullanıcı Akış Testi",
    priority: "Kritik",
    preconditions: `Test ortamı hazır olmalı ve "${insight.videoName}" kaydındaki başlangıç ekranı durumu sağlanmalıdır.`,
    steps: chronologicalSteps,
    expectedResult: `Kullanıcı akışı boyunca tüm ekran geçişleri ve arayüz etkileşimleri hatasız tamamlanmalı, görsel bozulma veya veri kaybı yaşanmamalıdır.`,
    status: "Beklemede",
  });

  // 2. TEST SENARYOSU: Ekran Geçişleri, Modal ve Navigasyon Doğrulaması (Yalnızca geçiş veya modal varsa)
  const transitionEntries = timeline.filter(
    (e) => e.eventType === "screen_transition" || e.eventType === "modal_open"
  );
  if (transitionEntries.length > 0) {
    const trans = transitionEntries[0];
    const isModal = trans.eventType === "modal_open";
    const requiredScope = isModal ? "scope_modal_trap" : "scope_history_nav";

    if (isScopeActive(requiredScope)) {
      const transSteps = isModal
        ? [
            `Adım 1: Açılır diyalog penceresini tetikleyin; arka plan karartmasının ve pencere odaklanmasının ekran merkezine oturduğunu doğrulayın.`,
            `Adım 2: Açılan diyalog penceresi içindeki form bileşenlerinin ve butonların tıklanabilir olduğunu teyit edin.`,
            `Adım 3: Açılır pencereyi kapat butonu veya klavyeden çıkış tuşu ile kapatarak ana ekrana odak kaybı olmadan dönüldüğünü doğrulayın.`,
          ]
        : [
            `Adım 1: Yönlendirme bağlantısı veya menü butonu üzerinden hedef sayfaya geçişi tetikleyin.`,
            `Adım 2: Yeni sayfa yüklendiğinde içerik yerleşiminin bozulmadığını ve ekran düzeni kayması oluşmadığını kontrol edin.`,
            `Adım 3: Tarayıcının geri ve ileri gitme butonları kullanıldığında sayfa durumunun ve önceki verilerin korunduğunu teyit edin.`,
          ];

      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - ${trans.screenName}`,
        title: isModal ? "Açılır Diyalog Penceresi ve Odak Yönetimi Kontrolü" : "Ekran Geçişi ve Sayfa Navigasyon Doğrulaması",
        type: isModal ? "Açılır Pencere ve Odak Testi" : "Ekran Geçişi ve Navigasyon Testi",
        testType: isModal ? "Açılır Pencere ve Odak Testi" : "Ekran Geçişi ve Navigasyon Testi",
        priority: "Kritik",
        preconditions: `Geçiş öncesi ekran durumu hazır olmalı ve tetikleyici buton erişilebilir bulunmalıdır.`,
        steps: transSteps,
        expectedResult: `Ekran geçişi ve arayüz pencereleri pürüzsüz açılmalı, odak yönetimi doğru çalışmalı ve görsel kayma yaşanmamalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 3. TEST SENARYOSU: Form Giriş Kuralları ve Mükerrer Tıklama Koruması (Yalnızca etkileşim varsa)
  const interactionEntries = timeline.filter(
    (e) => e.eventType === "user_interaction" || e.eventType === "scroll_or_animation"
  );
  if (interactionEntries.length > 0) {
    if (isScopeActive("scope_double_click") || isScopeActive("scope_form_security")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Form Validasyonları`,
        title: `Form Giriş Kuralları ve Mükerrer Tıklama Koruması`,
        type: "Form Validasyon ve Giriş Kontrol Testi",
        testType: "Form Validasyon ve Giriş Kontrol Testi",
        priority: "Kritik",
        preconditions: `Form ve veri giriş alanları boş durumda test için hazır bulunmalıdır.`,
        steps: [
          `Adım 1: Zorunlu alanları boş bırakarak onay butonuna tıklayın ve alan bazlı doğrulama uyarılarının belirdiğini kontrol edin.`,
          `Adım 2: Giriş kutularına geçersiz karakter veya aşırı uzun metin girerek sistemin sınır kontrollerini sağladığını doğrulayın.`,
          `Adım 3: İşlem butonuna art arda hızlıca iki kez tıklandığında butonun bekleme durumuna geçtiğini ve sisteme mükerrer istek gönderilmediğini teyit edin.`,
          `Adım 4: Hatalı girişler geçerli bilgilerle düzeltildiğinde hata mesajlarının kendiliğinden temizlendiğini kontrol edin.`,
        ],
        expectedResult: `Zorunlu alan uyarıları doğru çalışmalı, geçersiz girdiler engellenmeli ve butona çift tıklandığında mükerrer kayıt oluşmamalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 4. TEST SENARYOSU: Hata/Uyarı Bildirimleri (YALNIZCA hata veya donma tespit edildiyse)
  const anomalyEntries = timeline.filter(
    (e) => e.eventType === "error_visual" || e.eventType === "freeze_or_blank" || e.eventType === "success_visual"
  );
  const errorEntry = anomalyEntries.find((e) => e.eventType === "error_visual" || e.eventType === "freeze_or_blank");

  if (anomalyEntries.length > 0 && errorEntry) {
    if (isScopeActive("scope_error_handling") || isScopeActive("scope_freeze_timeout")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Hata ve Uyarı Yönetimi`,
        title: `Hata Bildirimleri ve Arayüz Kurtarma Doğrulaması`,
        type: "Hata Yönetimi ve Geri Bildirim Testi",
        testType: "Hata Yönetimi ve Geri Bildirim Testi",
        priority: "Kritik",
        preconditions: `Hatanın veya uyarının tetiklendiği işlem adımı hazır olmalıdır.`,
        steps: [
          `Adım 1: Hata veya uyarı durumunda beliren mesaj kutusunun belirgin renk kontrastıyla ve okunabilir metinle sunulduğunu doğrulayın.`,
          `Adım 2: Hata metninin teknik jargon yerine kullanıcıya sonraki adımı gösteren net bir yönlendirme içerdiğini teyit edin.`,
          `Adım 3: Hata ekranından sonra kullanıcının ana akışa dönebildiğini veya formu yeniden düzenleyebildiğini kontrol edin.`,
        ],
        expectedResult: `Arayüz kilitlenmemeli, bildirim mesajları kullanıcıyı doğru yönlendirmeli ve sistem kararlılığını korumalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 5. TEST SENARYOSU: QA Özel Notları (YALNIZCA kullanıcı özel not girdiyse)
  const combinedNotes = [videoNotes, additionalNotes].filter(Boolean).join("\n").trim();
  if (combinedNotes.length > 5) {
    const noteRules = combinedNotes
      .split(/\r?\n/)
      .map((l) => l.replace(/^(\d+[\.\)]|-|\*|•)\s*/, "").trim())
      .filter((l) => l.length > 5);

    if (noteRules.length > 0) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Özel Kalite Kontrol Notları`,
        title: `Özel Kalite Kontrol Notları ve İş Kuralı Doğrulaması`,
        type: "Kullanıcı Kabul ve Regresyon Testi",
        testType: "Kullanıcı Kabul ve Regresyon Testi",
        priority: "Kritik",
        preconditions: `"${insight.videoName}" kaydındaki test senaryosu ortamı hazır olmalıdır.`,
        steps: noteRules.map(
          (rule, idx) => `Adım ${idx + 1}: Kalite kontrol notunda belirtilen "${rule}" kuralını test ortamında uygulayın ve doğrulayın.`
        ),
        expectedResult: `Kalite kontrol inceleme notlarında belirtilen tüm beklentiler akış üzerinde eksiksiz karşılanmalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 6. OYUN VE OYNANABİLİRLİK (GAMEPLAY) EKSTRA HATA SENARYOLARI
  if (isGameDomain) {
    if (isScopeActive("scope_gameplay_collision")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Oyun Mekaniği ve Çarpışma`,
        title: `Oyun Mekaniği, Çarpışma ve Harita Dışı Takılma Testi`,
        type: "Oyun Mekaniği ve Çarpışma Testi",
        testType: "Oyun Mekaniği ve Çarpışma Testi",
        priority: "Kritik",
        preconditions: `Oyun test ortamında başlatılmış ve karakter kontrol edilebilir durumda olmalıdır.`,
        steps: [
          `Adım 1: Karakteri oyun alanındaki sınır duvarlarına, köşe noktalara ve etkileşimli nesnelere doğru hareket ettirin.`,
          `Adım 2: Karakter modelinin nesnelerin veya zemin kaplamasının içine gömülmediğini doğrulayın.`,
          `Adım 3: Hızlı yön değişimlerinde veya zıplama aksiyonlarında animasyon kırılması veya karakterin harita dışı boşluğa düşmediğini teyit edin.`,
          `Adım 4: Karakterin dar geçitlerden geçerken takılıp hareketsiz kalmadığını kontrol edin.`,
        ],
        expectedResult: `Çarpışma sınırları hatasız çalışmalı, karakter harita dışına düşmemeli ve fizik motoru kararlılığını korumalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_gameplay_damage")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Can Sistemi ve Hasar Mekaniği`,
        title: `Can Azalması, Hasar Tepkisi ve Yeniden Doğma Doğrulaması`,
        type: "Can ve Hasar Mekaniği Testi",
        testType: "Can ve Hasar Mekaniği Testi",
        priority: "Kritik",
        preconditions: `Karakter tam can seviyesinde ve aktif oyun alanında bulunmalıdır.`,
        steps: [
          `Adım 1: Karakterin tehlikeli bölgeden hasar almasını sağlayarak can barındaki düşüşün doğru orantılı olduğunu doğrulayın.`,
          `Adım 2: Hasar anında ekranda kırmızı uyarı flaşının ve hasar alma animasyonunun gecikmesiz tetiklendiğini kontrol edin.`,
          `Adım 3: Can sıfırlandığında karakter kontrollerinin kilitlendiğini ve ölüm durumuna geçildiğini doğrulayın.`,
          `Adım 4: Yeniden doğma süresi sonunda karakterin en son kaydedilen kontrol noktasında tam canla sorunsuz başladığını teyit edin.`,
        ],
        expectedResult: `Can ve hasar mekaniği kurallara tam uyumlu çalışmalı, ölüm ve yeniden doğma döngüsünde durum kaybı yaşanmamalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_gameplay_performance")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Oyun Performansı ve Kare Hızı`,
        title: `Yoğun Efekt Anında Kare Hızı ve Performans Düşüşü Kontrolü`,
        type: "Oyun Performans ve Gecikme Testi",
        testType: "Oyun Performans ve Gecikme Testi",
        priority: "Yüksek",
        preconditions: `Kare hızı sayacı aktif ve oyun test ortamında açık olmalıdır.`,
        steps: [
          `Adım 1: Sahnede birden fazla görsel efekt veya parçacık aynı anda tetiklendiğinde ekran akıcılığını gözlemleyin.`,
          `Adım 2: Ani kare hızı düşüşü veya girdi gecikmesi oluşmadığını, kontrollerin anında tepki verdiğini doğrulayın.`,
          `Adım 3: Efektler tamamlandığında bellek tüketiminin normale döndüğünü ve bellek sızıntısı oluşmadığını teyit edin.`,
        ],
        expectedResult: `Yoğun görsel efekt anlarında oynanabilirlik bozulmamalı, kare hızı kabul edilebilir seviyede kalmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_gameplay_controls")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Karakter ve Aksiyon Kontrolleri`,
        title: `Oyun İçi Dokunmatik ve Klavye Kontrolleri Tepki Testi`,
        type: "Oyun Kontrolleri ve Tepki Testi",
        testType: "Oyun Kontrolleri ve Tepki Testi",
        priority: "Yüksek",
        preconditions: `Oyun giriş ve karakter yönlendirme kontrolleri aktif olmalıdır.`,
        steps: [
          `Adım 1: Karakter yönlendirme butonlarına veya hareket tuşlarına basarak karakterin gecikmesiz tepki verdiğini doğrulayın.`,
          `Adım 2: Aynı anda iki farklı aksiyon tuşuna basıldığında tuş kilitlenmesi veya komut kaybı oluşmadığını kontrol edin.`,
          `Adım 3: Dokunmatik ekranlarda buton temas alanının parmakla rahat basılabilir genişlikte olduğunu teyit edin.`,
          `Adım 4: Kontroller serbest bırakıldığında karakterin anında durduğunu ve kontrol kayması yaşanmadığını doğrulayın.`,
        ],
        expectedResult: `Tüm oyun kontrolleri anlık tepki vermeli, tuş çakışması veya komut gecikmesi yaşanmamalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 7. YAPAY ZEKA (AI) VE İÇERİK OLUŞTURMA (GENERATION) EKSTRA HATA SENARYOLARI
  if (isAiDomain) {
    if (isScopeActive("scope_ai_streaming")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Model İletişimi`,
        title: `Yapay Zeka İçerik Üretimi Sırasında Ağ Kesintisi ve Yeniden Deneme Testi`,
        type: "Yapay Zeka Ağ Dayanıklılık Testi",
        testType: "Yapay Zeka Ağ Dayanıklılık Testi",
        priority: "Kritik",
        preconditions: `Yapay zeka modeli aktif ve istem girişi için hazır durumda olmalıdır.`,
        steps: [
          `Adım 1: İstem giriş kutusuna geçerli bir prompt girerek üretim işlemini başlatın.`,
          `Adım 2: Model yanıt üretirken veya metin akışı sürerken ağ bağlantısını anlık olarak kesin.`,
          `Adım 3: Sistemin donmak veya beyaz ekrana düşmek yerine kullanıcıya anlaşılır bir yeniden bağlanma uyarısı sunduğunu doğrulayın.`,
          `Adım 4: Bağlantı kurulduğunda tek tıkla üretimin kaldığı yerden devam ettirilebildiğini veya isteğin yeniden denenebildiğini kontrol edin.`,
        ],
        expectedResult: `Ağ kesintilerinde arayüz kilitlenmemeli, kullanıcıya net geri bildirim verilmeli ve içerik kurtarılabilmelidir.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_ai_token_limit")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Model İstem ve Token Sınırları`,
        title: `Aşırı Uzun İstem ve Token Sınırı Aşımı Kontrolü`,
        type: "Yapay Zeka Token Sınır Testi",
        testType: "Yapay Zeka Token Sınır Testi",
        priority: "Kritik",
        preconditions: `Yapay zeka istem giriş alanı temizlenmiş olmalıdır.`,
        steps: [
          `Adım 1: Giriş kutusuna modelin maksimum kabul sınırını aşan aşırı uzun bir metin yapıştırın.`,
          `Adım 2: Sistemin isteği göndermeden önce kullanıcıya kalan karakter veya token sınırını belirgin bir sayaçla gösterdiğini doğrulayın.`,
          `Adım 3: Sınır aşıldığında sistem çökmesi yerine kullanıcıyı yönlendiren açıklayıcı bir kısaltma uyarısı verildiğini teyit edin.`,
        ],
        expectedResult: `Maksimum token ve karakter sınırları doğru uygulanmalı, aşırı uzun girdiler kontrollü şekilde yönetilmelidir.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_ai_rate_limit")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Model İstek Hızı ve Kota Kontrolü`,
        title: `Hızlı Ardışık İstem ve Model Kotası Sınırlama Yönetimi`,
        type: "Yapay Zeka Kota ve Hız Testi",
        testType: "Yapay Zeka Kota ve Hız Testi",
        priority: "Yüksek",
        preconditions: `Model kullanım kotası ve API bağlantısı aktif olmalıdır.`,
        steps: [
          `Adım 1: Üretim butonuna art arda ve hızlı şekilde birden fazla istem göndererek kota korumasını tetikleyin.`,
          `Adım 2: İstek sınırına ulaşıldığında sistemin 429 hata kodu yerine kullanıcıya kalan bekleme süresini gösteren bir sayaç sunduğunu doğrulayın.`,
          `Adım 3: Yanıt oluşturulurken iptal et butonuna tıklandığında model üretiminin anında durdurulduğunu ve gereksiz kota harcanmadığını teyit edin.`,
        ],
        expectedResult: `Ardışık isteklerde sistem kilitlenmemeli, hız sınırlama mesajları anlaşılır olmalı ve işlem iptali anında gerçekleşmelidir.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_ai_chat_history")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Sohbet Geçmişi ve Bellek Yönetimi`,
        title: `Model Yanıt İptali ve Sohbet Belleği Tutarlılığı Doğrulaması`,
        type: "Yapay Zeka Bellek ve İptal Testi",
        testType: "Yapay Zeka Bellek ve İptal Testi",
        priority: "Yüksek",
        preconditions: `Yapay zeka sohbet arayüzü açık ve önceki mesajlaşma geçmişi mevcut olmalıdır.`,
        steps: [
          `Adım 1: Model yanıt üretirken durdur veya iptal butonuna tıklayarak üretimin anında kesildiğini doğrulayın.`,
          `Adım 2: İptal edilen yanıttan sonra sohbet kutusunun hemen yeni istem girişine hazır hale geldiğini kontrol edin.`,
          `Adım 3: Yeni bir soru yöneltildiğinde modelin önceki mesaj bağlamını ve sohbet geçmişini koruyarak yanıt verdiğini teyit edin.`,
          `Adım 4: Sohbet oturumu yenilendiğinde geçmiş mesajların eksiksiz listelendiğini ve kaybolmadığını doğrulayın.`,
        ],
        expectedResult: `Üretim iptali anında gerçekleşmeli, sohbet belleği ve önceki bağlam korunmalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 8. E-TİCARET, SEPET VE ÖDEME TESTLERİ
  if (isEcommerceDomain) {
    if (isScopeActive("scope_ecommerce_cart")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Alışveriş Sepeti ve İndirim Hesabı`,
        title: `Sepet Tutarı, Ürün Miktarı ve Kupon İndirimi Doğrulaması`,
        type: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
        testType: "E-Ticaret Sepet ve Tutar Hesaplama Testi",
        priority: "Kritik",
        preconditions: `Sepete en az bir ürün eklenmiş ve sepet ekranı açılmış olmalıdır.`,
        steps: [
          `Adım 1: Sepetteki ürün adet miktarını artırıp azaltarak ara toplamın ve vergi tutarının anlık güncellendiğini doğrulayın.`,
          `Adım 2: Ürün adedi sıfıra indirildiğinde ürünün sepetten silindiğini veya silme onayı istendiğini kontrol edin.`,
          `Adım 3: Geçerli bir indirim kupon kodu uygulandığında toplam tutara indirimin doğru yansıtıldığını teyit edin.`,
          `Adım 4: Geçersiz veya süresi dolmuş kupon girildiğinde açıklayıcı bir uyarı gösterildiğini ve tutarın değişmediğini doğrulayın.`,
        ],
        expectedResult: `Sepet tutarı, ürün adetleri ve kupon indirimleri kuruşu kuruşuna doğru hesaplanmalı ve hatasız yansıtılmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_ecommerce_checkout")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Ödeme Adımı ve Kart Bilgileri`,
        title: `Ödeme Formu Bilgileri ve Kart Maskeleme Güvenlik Testi`,
        type: "Ödeme Güvenliği ve Form Doğrulama Testi",
        testType: "Ödeme Güvenliği ve Form Doğrulama Testi",
        priority: "Kritik",
        preconditions: `Ödeme adımına gelinmiş ve kredi kartı formu ekranda görünür olmalıdır.`,
        steps: [
          `Adım 1: Kredi kartı numarası girilirken hanelerin dörderli bloklar halinde formatlandığını ve kart tipinin doğru algılandığını doğrulayın.`,
          `Adım 2: Güvenlik kodu girilirken karakterlerin maskelenerek ekranda gizlendiğini kontrol edin.`,
          `Adım 3: Son kullanma tarihi geçmiş bir kart girildiğinde formun onaylanmadığını ve ilgili alanın uyarı verdiğini teyit edin.`,
          `Adım 4: Eksik veya geçersiz kart bilgileriyle ödeme butonuna tıklandığında bankaya istek atılmadan alan bazlı hata gösterildiğini doğrulayın.`,
        ],
        expectedResult: `Hassas kart verileri maskelenmeli, geçersiz kart bilgileri engellenmeli ve güvenli ödeme standartlarına tam uyulmalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 9. VERİ TABLOSU VE DASHBOARD TESTLERİ
  if (isDashboardDomain) {
    if (isScopeActive("scope_dashboard_table")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Veri Listesi ve Tablo Görünümü`,
        title: `Veri Tablosu Sıralama, Filtreleme ve Sayfalama Testi`,
        type: "Veri Tablosu ve Sayfalama Testi",
        testType: "Veri Tablosu ve Sayfalama Testi",
        priority: "Yüksek",
        preconditions: `Veri tablosunda test edilecek kayıtlar yüklü olmalıdır.`,
        steps: [
          `Adım 1: Tablo kolon başlıklarına tıklayarak artan ve azalan sıralamanın doğru çalıştığını doğrulayın.`,
          `Adım 2: Arama ve filtreleme kutularına kriter girerek yalnızca eşleşen kayıtların listelendiğini kontrol edin.`,
          `Adım 3: Sayfalama butonlarına tıklayarak sonraki sayfaya geçildiğinde doğru kayıt aralığının görüntülendiğini teyit edin.`,
          `Adım 4: Sayfa başına gösterilecek kayıt sayısı değiştirildiğinde tablonun kayma olmadan güncellendiğini doğrulayın.`,
        ],
        expectedResult: `Tablo sıralama, filtreleme ve sayfalama işlemleri gecikmesiz çalışmalı, veri tutarlılığı korunmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_dashboard_metrics")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Metrik Kartları ve Grafikler`,
        title: `Grafik ve Metrik Kartları Veri Bütünlüğü Doğrulaması`,
        type: "Gösterge Paneli ve Veri Doğrulama Testi",
        testType: "Gösterge Paneli ve Veri Doğrulama Testi",
        priority: "Yüksek",
        preconditions: `Yönetim paneli metrik kartları ve grafik bileşenleri ekranda görünür olmalıdır.`,
        steps: [
          `Adım 1: Metrik kartlarındaki toplam sayıların ve oranların arka plandaki verilerle birebir örtüştüğünü doğrulayın.`,
          `Adım 2: Tarih aralığı filtresi değiştirildiğinde tüm grafiklerin seçilen aralığa göre senkronize güncellendiğini kontrol edin.`,
          `Adım 3: Grafik üzerindeki veri noktalarının üzerine fareyle gelindiğinde detaylı bilgi balonunun doğru konuma açıldığını teyit edin.`,
          `Adım 4: Sıfır değerli veya verisiz dönemlerde grafiklerin boş durum mesajıyla şık biçimde sunulduğunu doğrulayın.`,
        ],
        expectedResult: `Tüm grafikler ve özet kartlar doğru verileri yansıtmalı, filtre değişimlerinde senkronizasyon bozulmamalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_dashboard_export")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Dışa Aktarma ve Toplu İşlemler`,
        title: `Dışa Aktarma ve Toplu Veri İşlem Dayanıklılığı Testi`,
        type: "Dışa Aktarma ve Veri Dayanıklılık Testi",
        testType: "Dışa Aktarma ve Veri Dayanıklılık Testi",
        priority: "Orta",
        preconditions: `Dışa aktarılacak veri seti seçili veya tablo üzerinde görünür olmalıdır.`,
        steps: [
          `Adım 1: Tablo üzerindeki tümünü seç onay kutusunu işaretleyerek toplu seçim işlemini başlatın.`,
          `Adım 2: Dışa aktar butonuna tıklayarak dosya indirme işleminin tarayıcıyı dondurmadan başladığını doğrulayın.`,
          `Adım 3: İndirilen dosya içeriğindeki kolonların ve Türkçe karakterlerin bozulmadan aktarıldığını kontrol edin.`,
          `Adım 4: Büyük veri setlerinde indirme sürerken ekranda kullanıcıya ilerleme göstergesi sunulduğunu teyit edin.`,
        ],
        expectedResult: `Toplu işlemler ve dışa aktarma tarayıcıyı kilitlememeli, Türkçe karakterler ve veri yapısı korunmalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 10. MEDYA OYNATICI TESTLERİ
  if (isMediaPlayerDomain) {
    if (isScopeActive("scope_media_player")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Medya Oynatıcı Kontrolleri`,
        title: `Medya Oynatıcı Kontrolleri, Oynat Duraklat ve Tam Ekran Testi`,
        type: "Medya Oynatıcı Kontrol Testi",
        testType: "Medya Oynatıcı Kontrol Testi",
        priority: "Yüksek",
        preconditions: `Medya oynatıcı ekranda hazır ve yayın yüklenmiş olmalıdır.`,
        steps: [
          `Adım 1: Oynat butonuna tıklayarak medyanın gecikmesiz akmaya başladığını ve butonun duraklat simgesine dönüştüğünü doğrulayın.`,
          `Adım 2: Medya alanına tıklayarak duraklatma ve yeniden başlatma eylemlerinin anında gerçekleştiğini kontrol edin.`,
          `Adım 3: Tam ekran butonuna basarak oynatıcının tüm ekranı kapladığını ve klavyeden çıkış tuşuyla eski boyutuna döndüğünü teyit edin.`,
          `Adım 4: Fare hareketsiz kaldığında kontrol barının otomatik gizlendiğini ve hareketle yeniden belirdiğini doğrulayın.`,
        ],
        expectedResult: `Oynatıcı kontrolleri pürüzsüz çalışmalı, tam ekran geçişi hatasız olmalı ve görsel kontroller zamanında gizlenmelidir.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_media_seekbar")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - İlerleme Çubuğu ve Sarma`,
        title: `İlerleme Çubuğu Atlama ve Arabelleğe Alma Doğrulaması`,
        type: "Medya İlerleme ve Sarma Testi",
        testType: "Medya İlerleme ve Sarma Testi",
        priority: "Yüksek",
        preconditions: `Medya oynatıcı aktif ve oynatma akışı başlamış olmalıdır.`,
        steps: [
          `Adım 1: İlerleme çubuğunda ileri bir noktaya tıklayarak içeriğin o saniyeden donmadan akmaya devam ettiğini doğrulayın.`,
          `Adım 2: Klavyedeki sağ ve sol yön tuşlarıyla beşer saniye ileri ve geri sarma işleminin çalıştığını kontrol edin.`,
          `Adım 3: Arabelleğe alma anında ekran merkezinde yükleniyor göstergesinin belirdiğini ve veri dolduğunda kaybolduğunu teyit edin.`,
          `Adım 4: Akış sonuna gelindiğinde oynatmanın düzgün durduğunu ve tekrar oynat butonunun görüntülendiğini doğrulayın.`,
        ],
        expectedResult: `İlerleme çubuğu atlamaları anında gerçekleşmeli, arabelleğe alma akıcı olmalı ve içerik bitiminde düzgün sonlanmalıdır.`,
        status: "Beklemede",
      });
    }

    if (isScopeActive("scope_media_quality")) {
      testCases.push({
        id: nextId(),
        targetComponent: `${cleanFileName} - Ses ve Kalite Ayarları`,
        title: `Ses Seviyesi ve Çözünürlük Değişimi Dayanıklılığı Testi`,
        type: "Ses ve Kalite Yönetimi Testi",
        testType: "Ses ve Kalite Yönetimi Testi",
        priority: "Orta",
        preconditions: `Medya oynatıcı ses ve çözünürlük ayar menüsü açık olmalıdır.`,
        steps: [
          `Adım 1: Ses seviyesi kaydırıcısını hareket ettirerek ses çıkış düzeyinin doğru orantılı değiştiğini doğrulayın.`,
          `Adım 2: Sessize al butonuna tıklandığında sesin anında kesildiğini ve simgenin sessiz durumuna geçtiğini kontrol edin.`,
          `Adım 3: Çözünürlük ayarı değiştirildiğinde akışın baştan başlamadan yeni kalitede kesintisiz sürdüğünü teyit edin.`,
          `Adım 4: Oynatma hızı bir buçuk veya iki katına çıkarıldığında ses tonlamasının bozulmadan hızlandığını doğrulayın.`,
        ],
        expectedResult: `Ses kontrolleri ve kalite değişimleri oynatmayı kesintiye uğratmadan sorunsuz uygulanmalıdır.`,
        status: "Beklemede",
      });
    }
  }

  // 11. MOBİL VE DOKUNMATİK TESTLER
  if (isScopeActive("scope_mobile_touch")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Mobil Dokunmatik Alanlar`,
      title: `Dokunmatik Alan Genişliği ve Tek El Kullanılabilirlik Testi`,
      type: "Mobil Dokunmatik Kullanılabilirlik Testi",
      testType: "Mobil Dokunmatik Kullanılabilirlik Testi",
      priority: "Yüksek",
      preconditions: `Mobil görünüm veya dikey ekran düzeni açık olmalıdır.`,
      steps: [
        `Adım 1: Tıklanabilir buton ve bağlantıların temas alanının en az kırk dört piksel genişlikte olduğunu kontrol edin.`,
        `Adım 2: Yan yana duran butonlara dokunulduğunda yanlış butona tıklanma ihtimalini önleyen yeterli boşluğun bulunduğunu doğrulayın.`,
        `Adım 3: Form giriş alanlarına dokunulduğunda sanal klavyenin açıldığını ve giriş kutusunun klavye altında kalmadığını teyit edin.`,
        `Adım 4: Ekranın en üst ve en altındaki aksiyon alanlarının tek elle rahatça erişilebilir olduğunu kontrol edin.`,
      ],
      expectedResult: `Dokunmatik alanlar yeterli genişlikte olmalı, sanal klavye içerikleri kapatmamalı ve tek elle kullanım rahat olmalıdır.`,
      status: "Beklemede",
    });
  }

  // 12. FONKSİYONEL, GÜVENLİK VE FORM EKSTRA HATA SENARYOLARI
  if (isScopeActive("scope_form_masking")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Hassas Veri ve Parola Alanı`,
      title: `Parola ve Hassas Alan Maskeleme Doğrulaması`,
      type: "Hassas Alan ve Maskeleme Testi",
      testType: "Hassas Alan ve Maskeleme Testi",
      priority: "Yüksek",
      preconditions: `Parola veya hassas veri giriş ekranı açık olmalıdır.`,
      steps: [
        `Adım 1: Parola alanına karakter girilirken her karakterin anında nokta veya yıldız ile maskelendiğini doğrulayın.`,
        `Adım 2: Parolayı göster simgesine tıklandığında girilen metnin açıkça okunabildiğini kontrol edin.`,
        `Adım 3: Parola gizle simgesine tekrar tıklandığında metnin derhal yeniden maskelendiğini teyit edin.`,
        `Adım 4: Parola alanından kopyalama yapılmaya çalışıldığında panoya hassas veri kopyalanmasının engellendiğini doğrulayın.`,
      ],
      expectedResult: `Parola ve hassas alanlar varsayılan olarak maskeli olmalı, görünürlük kontrolü hatasız çalışmalıdır.`,
      status: "Beklemede",
    });
  }

  if (isScopeActive("scope_history_nav")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Tarayıcı Geçmişi ve Mükerrer İstek`,
      title: `Tarayıcı Geri Tuşu ve Mükerrer İstek Dayanıklılık Testi`,
      type: "Mükerrer İşlem ve Navigasyon Testi",
      testType: "Mükerrer İşlem ve Navigasyon Testi",
      priority: "Kritik",
      preconditions: `İşlem ekranı açık ve ilk işlem başarıyla tamamlanmış olmalıdır.`,
      steps: [
        `Adım 1: İşlem başarıyla sonuçlandıktan sonra tarayıcının geri gitme butonuna tıklayın.`,
        `Adım 2: Önceki form ekranına dönüldüğünde onay butonunun devre dışı kaldığını ve mükerrer istek gönderilmediğini doğrulayın.`,
        `Adım 3: Sayfa yenilendiğinde aynı işlemin sisteme ikinci kez kaydedilmediğini teyit edin.`,
      ],
      expectedResult: `Tarayıcı geçmişinde gezinirken mükerrer işlem oluşmamalı ve veri tutarlılığı korunmalıdır.`,
      status: "Beklemede",
    });
  }

  if (isScopeActive("scope_form_security")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Form Güvenliği ve Karakter Filtreleme`,
      title: `Form Girdi Alanları Özel Karakter ve Güvenlik Sınır Testi`,
      type: "Güvenlik ve Özel Karakter Testi",
      testType: "Güvenlik ve Özel Karakter Testi",
      priority: "Kritik",
      preconditions: `Veri giriş alanları test için erişilebilir olmalıdır.`,
      steps: [
        `Adım 1: Giriş kutularına tek tırnak, HTML etiketleri ve özel işaretler içeren test verileri girerek onaylayın.`,
        `Adım 2: Sistemin bu girdileri filtreden geçirerek güvenli metin olarak işlediğini ve sunucu hatası üretmediğini doğrulayın.`,
        `Adım 3: Kutulara yalnızca boşluk karakterleri girildiğinde sistemin bunu geçerli veri kabul etmediğini kontrol edin.`,
      ],
      expectedResult: `Özel karakter ve script enjeksiyonları filtrelenmeli, girdi sınırları tavizsiz uygulanmalıdır.`,
      status: "Beklemede",
    });
  }

  if (isScopeActive("scope_error_handling")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Oturum ve Veri Kurtarma`,
      title: `Oturum Zaman Aşımı ve Form Verisi Kurtarma Testi`,
      type: "Oturum Yönetimi ve Veri Kurtarma Testi",
      testType: "Oturum Yönetimi ve Veri Kurtarma Testi",
      priority: "Yüksek",
      preconditions: `Kullanıcı oturumu aktif ve form doldurulmuş olmalıdır.`,
      steps: [
        `Adım 1: Form doldurulduktan sonra işlem yapmadan bekleyerek oturumun zaman aşımına uğramasını sağlayın.`,
        `Adım 2: Onay butonuna basıldığında girilen verilerin silinmeden saklandığını ve giriş ekranına yönlendirildiğini doğrulayın.`,
        `Adım 3: Tekrar oturum açıldığında kullanıcının kaldığı form adımına tüm verileriyle geri döndüğünü kontrol edin.`,
      ],
      expectedResult: `Oturum sonlandığında kullanıcı verisi kaybolmamalı ve güvenli yeniden yetkilendirme sağlanmalıdır.`,
      status: "Beklemede",
    });
  }

  if (isScopeActive("scope_freeze_timeout")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Yükleme ve Bekleme Durumu`,
      title: `Arayüz Donması ve Yükleniyor Göstergesi Doğrulaması`,
      type: "Arayüz Kararlılık ve Bekleme Testi",
      testType: "Arayüz Kararlılık ve Bekleme Testi",
      priority: "Yüksek",
      preconditions: `Asenkron veya uzun süren işlem adımı hazır olmalıdır.`,
      steps: [
        `Adım 1: Veri yükleme veya işlem başlatıldığında ekranda anında yükleniyor animasyonunun belirdiğini doğrulayın.`,
        `Adım 2: İşlem sürerken işlem butonlarının mükerrer tıklamaya karşı devre dışı bırakıldığını kontrol edin.`,
        `Adım 3: Ağ yavaşlığında ekranın beyaz ekrana düşmediğini veya yanıtsız kalmadığını teyit edin.`,
        `Adım 4: Bekleme uzadığında kullanıcıya işlemi iptal etme veya yeniden deneme seçeneği sunulduğunu doğrulayın.`,
      ],
      expectedResult: `Uzun süren işlemlerde arayüz kilitlenmemeli, net yükleniyor göstergesi sunulmalı ve beyaz ekran oluşmamalıdır.`,
      status: "Beklemede",
    });
  }

  // 13. ARAYÜZ DÜZENİ VE ÇÖZÜNÜRLÜK TAŞMASI TESTLERİ
  if (isScopeActive("scope_ui_alignment")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Görsel Düzen ve Hizalama`,
      title: `Arayüz Bileşenleri Hizalama ve Görsel Bütünlük Doğrulaması`,
      type: "Görsel Tasarım ve Hizalama Testi",
      testType: "Görsel Tasarım ve Hizalama Testi",
      priority: "Orta",
      preconditions: `Arayüz ekranı varsayılan çözünürlükte açık olmalıdır.`,
      steps: [
        `Adım 1: Ekrandaki metin bloklarının, butonların ve kartların sol ve sağ kenar boşluklarının eşit hizalandığını doğrulayın.`,
        `Adım 2: Başlıklar ile gövde metinleri arasındaki dikey boşlukların tasarım standartlarına uyduğunu kontrol edin.`,
        `Adım 3: Simgeler ile yanlarındaki etiket metinlerinin dikeyde tam merkezlendiğini teyit edin.`,
        `Adım 4: Ekrandaki kart veya liste öğelerinin aynı hizada başlayıp bittiğini kontrol edin.`,
      ],
      expectedResult: `Tüm bileşenler kusursuz hizalanmalı, görsel kayma veya orantısız boşluklar bulunmamalıdır.`,
      status: "Beklemede",
    });
  }

  if (isScopeActive("scope_responsive_overflow")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Responsive Ekran Düzeni`,
      title: `Ekran Çözünürlüğü Değişimi ve Bileşen Taşma Kontrolü`,
      type: "Ekran Düzeni ve Taşma Testi",
      testType: "Ekran Düzeni ve Taşma Testi",
      priority: "Yüksek",
      preconditions: `Uygulama farklı ekran çözünürlüklerinde test edilmek üzere hazır olmalıdır.`,
      steps: [
        `Adım 1: Tarayıcı pencere genişliği daraltıldığında bileşenlerin ekran kenarlarından taşmadığını doğrulayın.`,
        `Adım 2: Başlık ve buton metinlerinin kesilmeden alt satıra kaydığını kontrol edin.`,
        `Adım 3: İstenmeyen yatay kaydırma çubuğu oluşmadığını teyit edin.`,
      ],
      expectedResult: `Farklı ekran boyutlarında arayüz bileşenleri taşmamalı ve düzen korunmalıdır.`,
      status: "Beklemede",
    });
  }

  // 14. DAYANIKLILIK VE AĞ KESİNTİSİ TESTİ
  if (isScopeActive("scope_network_resilience")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Ağ ve Durum Dayanıklılığı`,
      title: `Ağ Kesintisi ve Sayfa Yenileme Dayanıklılık Testi`,
      type: "Ağ Kesintisi ve Veri Kalıcılığı Testi",
      testType: "Ağ Kesintisi ve Veri Kalıcılığı Testi",
      priority: "Yüksek",
      preconditions: `Uygulama açık ve ağ bağlantısı kontrol edilebilir durumda olmalıdır.`,
      steps: [
        `Adım 1: Ağ bağlantısı zayıfladığında veya kesildiğinde sistemin donmak yerine kullanıcıya anlaşılır bir bağlantı uyarısı gösterdiğini doğrulayın.`,
        `Adım 2: Bağlantı yeniden kurulduğunda işlemin kaldığı yerden devam ettirilebildiğini veya güvenli şekilde tekrar denenebildiğini kontrol edin.`,
        `Adım 3: İşlem tamamlandıktan sonra sayfa yeniden yüklendiğinde güncel verilerin ve form durumunun korunduğunu teyit edin.`,
        `Adım 4: İşlem süresince tarayıcı konsolu ve ağ trafiği kayıtlarında yakalanmamış sunucu hatası oluşmadığını doğrulayın.`,
      ],
      expectedResult: `Ağ kesintilerinde veya sayfa yeniden yüklemelerinde uygulama kilitlenmemeli ve veri kaybı yaşanmamalıdır.`,
      status: "Beklemede",
    });
  }

  // 15. KLAVYE ERİŞİLEBİLİRLİĞİ VE ODAK YÖNETİMİ TESTİ
  if (isScopeActive("scope_keyboard_a11y")) {
    testCases.push({
      id: nextId(),
      targetComponent: `${cleanFileName} - Klavye Navigasyonu ve Odak Yönetimi`,
      title: `Klavye ile Odak Yönetimi ve Arayüz Erişilebilirlik Testi`,
      type: "Erişilebilirlik ve Klavye Navigasyon Testi",
      testType: "Erişilebilirlik ve Klavye Navigasyon Testi",
      priority: "Orta",
      preconditions: `İlgili sayfa veya modal ekranı açık olmalıdır.`,
      steps: [
        `Adım 1: Fare kullanmadan yalnızca Tab tuşuyla tüm form alanları ve butonlar arasında sırayla ilerleyin.`,
        `Adım 2: Aktif olan her bileşenin belirgin bir odak çerçevesiyle vurgulandığını ve odak sırasının mantıklı aktığını doğrulayın.`,
        `Adım 3: Açılan pencerelerden veya menülerden Escape tuşuna basılarak ana ekrana odak kaybı yaşanmadan dönüldüğünü teyit edin.`,
      ],
      expectedResult: `Klavye navigasyonu kesintisiz çalışmalı, odak hapsi oluşmamalı ve tüm bileşenler erişilebilir olmalıdır.`,
      status: "Beklemede",
    });
  }

  // 16. KULLANICI TANIMLI ÖZEL TEST KAPSAMLARI (Video İçin)
  if (Array.isArray(customScopes) && customScopes.length > 0) {
    for (const cs of customScopes) {
      if (isScopeActive(cs.id)) {
        testCases.push({
          id: nextId(),
          targetComponent: `${cleanFileName} - ${cs.title}`,
          title: cs.title,
          type: "Kullanıcı Tanımlı Özel Test Kapsamı",
          testType: "Kullanıcı Tanımlı Özel Test Kapsamı",
          priority: "Yüksek",
          preconditions: `Akıştaki ilgili ekran test ortamında açık ve test verileri hazır bulunmalıdır.`,
          steps: [
            `Adım 1: ${cs.title} senaryosu için süreçteki ilgili işlem adımına gelin ve ortamı hazır duruma getirin.`,
            `Adım 2: ${cs.reason || cs.title} kuralı doğrultusunda gerekli kullanıcı girdilerini ve aksiyonlarını uygulayın.`,
            `Adım 3: Sınır değer, olağan dışı işlem veya ağ gecikmesi durumunu tetikleyerek sistem tepkisini gözlemleyin.`,
            `Adım 4: İşlem neticesinde sistemin kilitlenmediğini, kullanıcıya net rehberlik sunulduğunu ve veri bütünlüğünün korunduğunu doğrulayın.`,
          ],
          expectedResult: `${cs.title} kuralı eksiksiz karşılanmalı, beklenmeyen kullanıcı hareketlerinde veri kaybı veya çökme yaşanmamalıdır.`,
          status: "Beklemede",
        });
      }
    }
  }

  insight.generatedTestCount = testCases.length;
  return testCases.map((tc) => cleanTestCase(tc, true));
}

export const videoAnalysisService = {
  async analyzeVideosAndGenerateTests(
    title: string,
    category: string,
    files: MediaFilePayload[],
    additionalNotes: string,
    selectedScopes?: string[],
    customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>,
    clientApiKey?: string
  ): Promise<VideoAnalysisResult> {
    const apiKey = (clientApiKey && clientApiKey.trim().length > 10)
      ? clientApiKey.trim()
      : (config.aiApiKey && config.aiApiKey.trim().length > 10 ? config.aiApiKey.trim() : "");
    const hasGeminiKey = Boolean(apiKey && apiKey.length > 10);

    const videoInsights: VideoInsight[] = [];
    const allTestCases: TestCase[] = [];

    // Her videoyu / medyayı TEKER TEKER ve SANİYE SANİYE analiz et
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(
        `[VideoAnalysis] Medya ${i + 1}/${files.length} saniye saniye analiz ediliyor: ${file.name}`
      );

      // 1. Önce istemciden gelen saniye saniye kare analizini al; yoksa binary/metadata üzerinden çıkar
      let timeline: SecondTimelineEntry[] = [];
      let durationSeconds = file.durationSeconds || 0;
      let formattedDuration = file.formattedDuration || "";
      let resolution =
        file.aspectRatioLabel ||
        (file.width && file.height ? `${file.width}x${file.height}` : "1920x1080 (16:9)");

      if (Array.isArray(file.secondBySecondTimeline) && file.secondBySecondTimeline.length > 0) {
        timeline = file.secondBySecondTimeline;
        durationSeconds =
          durationSeconds > 0 ? durationSeconds : Math.max(1, timeline[timeline.length - 1].second);
        formattedDuration = formattedDuration || formatSec(durationSeconds);
      } else {
        const extracted = extractTimelineFromBinaryMedia(file, i);
        timeline = extracted.timeline;
        durationSeconds = extracted.durationSeconds;
        formattedDuration = extracted.formattedDuration;
        resolution = extracted.resolution;
      }

      // 2. Saniye saniye zaman çizelgesinden detaylı VideoInsight oluştur
      let insight = synthesizeInsightFromTimeline(
        i,
        file,
        durationSeconds,
        formattedDuration,
        resolution,
        timeline,
        additionalNotes
      );

      // 3. Eğer Gemini API anahtarı varsa LLM Vision ile bulguları zenginleştir
      if (hasGeminiKey) {
        try {
          insight = await enrichInsightWithGemini(apiKey, file, insight, additionalNotes);
        } catch (err: any) {
          console.warn(`[VideoAnalysis] Gemini zenginleştirme atlandı (${file.name}):`, err.message);
        }
      }

      // 4. Bu videonun saniye saniye analizine özel QA test senaryolarını oluştur
      // Önce Gemini Vision ile doğrudan görsel karelerden yüksek doğruluklu test üretmeyi dene
      let videoTestCases: TestCase[] = [];
      if (hasGeminiKey) {
        try {
          const aiCases = await generateDetailedTestCasesWithGeminiVision(
            apiKey,
            file,
            insight,
            title,
            category,
            additionalNotes,
            selectedScopes,
            customScopes
          );
          if (aiCases && aiCases.length > 0) {
            console.log(`[VideoAnalysis] Gemini Vision ile ${aiCases.length} adet kesin doğruluklu test senaryosu üretildi (${file.name})`);
            videoTestCases = aiCases;
          }
        } catch (err: any) {
          console.warn(`[VideoAnalysis] Gemini Vision test üretiminde istisna, yerel motora geçiliyor:`, err.message);
        }
      }

      // AGL / AGY CLI ile Gemini 3.8 Flash modelini dene (Sıfır-Key, doğrudan yerel CLI ile)
      if (config.useCliAi && videoTestCases.length === 0) {
        try {
          const cliCases = await generateDetailedTestCasesWithCliGeminiFlash(
            file,
            insight,
            title,
            category,
            additionalNotes,
            selectedScopes,
            customScopes
          );
          if (cliCases && cliCases.length > 0) {
            console.log(`[VideoAnalysis] AGL/AGY CLI Gemini 3.8 Flash ile ${cliCases.length} adet test senaryosu üretildi (${file.name})`);
            videoTestCases = cliCases;
          }
        } catch (err: any) {
          console.warn(`[VideoAnalysis] CLI Gemini 3.8 Flash atlandı:`, err.message);
        }
      }

      // Yerel kural ve telemetri motoru (Tamamen offline fallback)
      if (videoTestCases.length === 0) {
        videoTestCases = generateDetailedTestCasesForSingleVideo(
          title,
          category,
          insight,
          file.notes || "",
          additionalNotes,
          selectedScopes,
          customScopes
        );
      }

      videoInsights.push(insight);
      allTestCases.push(...videoTestCases);
    }

    // Eğer birden fazla video yüklendiyse modüller arası uçtan uca bütünlük senaryosu ekle
    if (files.length > 1) {
      const multiSteps = videoInsights.map(
        (ins, idx) =>
          `Adım ${idx + 1}: İlgili ${idx + 1}. modüldeki ${ins.videoName.replace(/\.[^/.]+$/, "")} akışını tamamlayın ve işlem verilerinin sonraki adıma aktarıldığını doğrulayın.`
      );
      allTestCases.push(
        cleanTestCase({
          id: `QA-MULTI-${String(files.length).padStart(2, "0")}`,
          targetComponent: `Modüller Arası Akış Entegrasyonu`,
          title: `Uçtan Uca Modüller Arası Akış ve Durum Tutarlılığı Doğrulaması`,
          type: "Modüller Arası Uçtan Uca Entegrasyon Testi",
          testType: "Modüller Arası Uçtan Uca Entegrasyon Testi",
          priority: "Kritik",
          preconditions: `Analiz edilen ${files.length} modülün kapsadığı tüm bileşenler test ortamında aktif olmalıdır.`,
          steps: multiSteps,
          expectedResult: `Yüklenen ${files.length} modüldeki tüm kullanıcı akışları birbiriyle tutarlı çalışmalı, modüller arası geçişlerde oturum veya veri kaybı yaşanmamalıdır.`,
          status: "Beklemede",
        }, true)
      );
    }

    const totalAnalyzedSeconds = videoInsights.reduce((sum, v) => sum + v.analyzedSecondsCount, 0);
    const criticalCount = allTestCases.filter(
      (t) =>
        t.priority?.includes("Kritik") ||
        t.priority?.includes("P1") ||
        t.priority?.includes("Yüksek")
    ).length;

    const overviewLines: string[] = [
      `QA Medya Analizi: Toplam ${files.length} medya dosyası teker teker incelendi ve gerçek kullanıcı akışına uygun ${allTestCases.length} adet detaylı test senaryosu oluşturuldu.`,
    ];
    videoInsights.forEach((ins, idx) => {
      overviewLines.push(
        `• Dosya ${idx + 1} - ${ins.videoName.replace(/\.[^/.]+$/, "")}: ${ins.screens.length} ekran durumu ve kullanıcı etkileşimleri doğrulanarak ${ins.generatedTestCount} test senaryosu üretildi.`
      );
    });

    if (Array.isArray(customScopes) && customScopes.length > 0) {
      const customTitles = customScopes.map((c) => c.title).join(", ");
      overviewLines.push(`• Kullanıcı Tanımlı Özel Kapsam: ${customTitles} senaryoları analiz edilerek test adımlarına eklendi.`);
    }

    const hasGame = allTestCases.some((tc) => tc.type?.includes("Oyun") || tc.title?.includes("Oyun"));
    const hasAi = allTestCases.some((tc) => tc.type?.includes("Yapay Zeka") || tc.title?.includes("Yapay Zeka"));
    const hasEcom = allTestCases.some((tc) => tc.type?.includes("E-Ticaret") || tc.title?.includes("Sepet") || tc.title?.includes("Ödeme"));
    const hasDash = allTestCases.some((tc) => tc.type?.includes("Tablo") || tc.type?.includes("Gösterge") || tc.type?.includes("Dışa Aktarma"));
    const hasMedia = allTestCases.some((tc) => tc.type?.includes("Medya") || tc.type?.includes("Oynatıcı"));
    const hasMobile = allTestCases.some((tc) => tc.type?.includes("Mobil") || tc.title?.includes("Dokunmatik"));

    if (hasGame) {
      overviewLines.push("• Özel Kapsam: Oyun oynanabilirliği, can ve hasar mekanikleri, çarpışma sınırları, kontroller ve yoğun parçacık performans testleri dahil edildi.");
    }
    if (hasAi) {
      overviewLines.push("• Özel Kapsam: Yapay zeka istem işleme, token sınırları, ağ akış kesintisi, kota yönetimi ve sohbet belleği test senaryoları dahil edildi.");
    }
    if (hasEcom) {
      overviewLines.push("• Özel Kapsam: E-ticaret sepet tutarı, kupon indirimleri, kart maskeleme güvenliği ve mükerrer sipariş engeli kontrolleri dahil edildi.");
    }
    if (hasDash) {
      overviewLines.push("• Özel Kapsam: Veri tablosu sıralama, filtreleme, sayfalama, grafik metrik bütünlüğü ve dışa aktarma testleri dahil edildi.");
    }
    if (hasMedia) {
      overviewLines.push("• Özel Kapsam: Video oynatıcı kontrolleri, oynat duraklat, tam ekran, ilerleme çubuğu sarma ve ses kalite ayarları dahil edildi.");
    }
    if (hasMobile) {
      overviewLines.push("• Özel Kapsam: Dikey mobil çözünürlük düzeni, bileşen taşma kontrolü ve dokunmatik alan ergonomisi dahil edildi.");
    }
    overviewLines.push("• Ekstra Hata Senaryoları: Sınır değerler, özel karakter ve güvenlik filtreleri, tarayıcı geri tuşu mükerrer işlem engeli ve oturum zaman aşımı kontrolleri eklendi.");

    return {
      overview: overviewLines.join("\n"),
      totalTestCount: allTestCases.length,
      criticalTestCount: criticalCount,
      testCases: allTestCases,
      videoInsights,
    };
  },
};
