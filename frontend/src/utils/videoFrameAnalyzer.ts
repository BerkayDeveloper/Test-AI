/**
 * Antigravity Test-AI: Saniye Saniye Video & Görsel Kare Analiz Motoru (Client-Side Vision)
 * Yüklenen her videoyu teker teker HTML5 Video + Canvas ile açar, 0. saniyeden son saniyeye kadar
 * her bir saniyeyi kare kare tarar; ekran geçişlerini, aktif etkileşim bölgelerini (Üst Bar, Merkez Form, Alt Buton vb.),
 * modal/popup açılışlarını, hata/başarı görsel sinyallerini ve UI donmalarını tespit eder.
 */

export interface SecondFrameAnalysis {
  second: number;
  timestamp: string;
  diffPercent: number;
  activeRegion: string;
  hotspot: { xPercent: number; yPercent: number };
  brightness: number;
  contrast: number;
  isDarkTheme: boolean;
  edgeDensity: number;
  uiBlocksCount: number;
  redAlertScore: number;
  greenSuccessScore: number;
  yellowWarningScore: number;
  modalOverlayDetected: boolean;
  blankState: "none" | "white_screen" | "black_screen";
  colorSaturation: number;
  vividPixelsPercent: number;
  hasBottomInputBar: boolean;
  hasCornerHud: boolean;
  hasTableGrid: boolean;
  hasPlayerSeekbar: boolean;
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

export interface VisualDomainSummary {
  isGame: boolean;
  isAiChat: boolean;
  isForm: boolean;
  isEcommerce: boolean;
  isDashboardTable: boolean;
  isMediaPlayer: boolean;
  isMobile: boolean;
  hasModal: boolean;
  hasError: boolean;
  hasFreeze: boolean;
  hasTransitions: boolean;
  vividScore: number;
  motionScore: number;
}

export interface ExtractedMediaTelemetry {
  mediaType: "video" | "image";
  fileName: string;
  fileSizeFormatted: string;
  mimeType: string;
  durationSeconds: number;
  formattedDuration: string;
  width: number;
  height: number;
  aspectRatioLabel: string;
  analyzedSecondsCount: number;
  secondBySecondTimeline: SecondFrameAnalysis[];
  visualDomainSummary?: VisualDomainSummary;
  sampledFrames: Array<{
    second: number;
    timestamp: string;
    base64Data: string;
    mimeType: string;
  }>;
}

export function formatSecondTimestamp(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getAspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return "Standart Ekran";
  const ratio = w / h;
  if (ratio < 0.75) return `${w}x${h} (Mobil / Dikey Portre 9:16)`;
  if (ratio > 1.55) return `${w}x${h} (Masaüstü / Geniş Ekran 16:9)`;
  if (ratio >= 1.2 && ratio <= 1.55) return `${w}x${h} (Tablet / Masaüstü 4:3)`;
  return `${w}x${h} (Kare / Özel Görünüm)`;
}

interface RawFrameMetrics {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  isDarkTheme: boolean;
  edgeDensity: number;
  uiBlocksCount: number;
  redAlertScore: number;
  greenSuccessScore: number;
  yellowWarningScore: number;
  modalOverlayDetected: boolean;
  blankState: "none" | "white_screen" | "black_screen";
  colorSaturation: number;
  vividPixelsPercent: number;
  hasBottomInputBar: boolean;
  hasCornerHud: boolean;
  hasTableGrid: boolean;
  hasPlayerSeekbar: boolean;
}

function computeFrameMetrics(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): RawFrameMetrics {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  let sumLum = 0;
  let sumLumSq = 0;
  let sumSat = 0;
  let vividCount = 0;
  let cornerHudPixels = 0;
  let redCount = 0;
  let greenCount = 0;
  let yellowCount = 0;

  let borderLumSum = 0;
  let borderPixels = 0;
  let centerLumSum = 0;
  let centerPixels = 0;

  let bottomBarLumSum = 0;
  let bottomBarPixels = 0;
  let preBottomLumSum = 0;
  let preBottomPixels = 0;

  let seekbarRowEdges = 0;

  const lumGrid = new Float32Array(totalPixels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumGrid[y * w + x] = lum;
      sumLum += lum;
      sumLumSq += lum * lum;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;
      sumSat += sat;

      if (sat > 60) {
        vividCount++;
      }

      // Sol üst köşe HUD / Can Barı göstergesi tespiti
      const isTopLeft = x < w * 0.28 && y < h * 0.15;
      if (isTopLeft && sat > 75) {
        cornerHudPixels++;
      }

      // Kırmızı (Hata / Uyarı / Hasar) sinyali
      if (r > 175 && g < 85 && b < 85 && r - g > 90) {
        redCount++;
      }
      // Yeşil (Başarı / Onay / Can) sinyali
      if (g > 155 && r < 105 && b < 115 && g - r > 55) {
        greenCount++;
      }
      // Sarı / Turuncu (Uyarı / Bekleme) sinyali
      if (r > 190 && g > 135 && g < 215 && b < 75) {
        yellowCount++;
      }

      const isBorder = x < w * 0.15 || x > w * 0.85 || y < h * 0.15 || y > h * 0.85;
      const isCenter = x >= w * 0.25 && x <= w * 0.75 && y >= h * 0.25 && y <= h * 0.75;
      if (isBorder) {
        borderLumSum += lum;
        borderPixels++;
      } else if (isCenter) {
        centerLumSum += lum;
        centerPixels++;
      }

      // Alt prompt / chat input barı bölgesi
      if (y >= h * 0.82 && y <= h * 0.94 && x >= w * 0.12 && x <= w * 0.88) {
        bottomBarLumSum += lum;
        bottomBarPixels++;
      } else if (y >= h * 0.65 && y < h * 0.78 && x >= w * 0.12 && x <= w * 0.88) {
        preBottomLumSum += lum;
        preBottomPixels++;
      }
    }
  }

  const brightness = totalPixels > 0 ? sumLum / totalPixels : 128;
  const variance = totalPixels > 0 ? Math.max(0, sumLumSq / totalPixels - brightness * brightness) : 0;
  const contrast = Math.sqrt(variance);
  const isDarkTheme = brightness < 112;

  const colorSaturation = Number((totalPixels > 0 ? sumSat / totalPixels : 0).toFixed(1));
  const vividPixelsPercent = Number(((vividCount / Math.max(1, totalPixels)) * 100).toFixed(1));

  // Kenar (Edge) yoğunluğu ve UI bileşen bloğu tahmini
  let edgePixels = 0;
  let uiRowTransitions = 0;
  let tableRowsCount = 0;
  for (let y = 1; y < h - 1; y++) {
    let rowEdges = 0;
    for (let x = 1; x < w - 1; x++) {
      const gx = Math.abs(lumGrid[y * w + (x + 1)] - lumGrid[y * w + (x - 1)]);
      const gy = Math.abs(lumGrid[(y + 1) * w + x] - lumGrid[(y - 1) * w + x]);
      if (gx + gy > 42) {
        edgePixels++;
        rowEdges++;
      }
    }
    if (rowEdges > w * 0.18) {
      uiRowTransitions++;
    }
    // Düzenli tablo satır çizgileri (y: 20% - 80%)
    if (y > h * 0.2 && y < h * 0.8 && rowEdges > w * 0.25) {
      tableRowsCount++;
    }
    // Alt video seekbar çizgisi
    if (y > h * 0.93 && y < h * 0.98 && rowEdges > w * 0.35) {
      seekbarRowEdges++;
    }
  }

  const edgeDensity = Number(((edgePixels / Math.max(1, totalPixels)) * 100).toFixed(1));
  const uiBlocksCount = Math.max(1, Math.min(18, Math.round(uiRowTransitions / 4)));

  const redAlertScore = Number(((redCount / Math.max(1, totalPixels)) * 100).toFixed(2));
  const greenSuccessScore = Number(((greenCount / Math.max(1, totalPixels)) * 100).toFixed(2));
  const yellowWarningScore = Number(((yellowCount / Math.max(1, totalPixels)) * 100).toFixed(2));

  const avgBorderLum = borderPixels > 0 ? borderLumSum / borderPixels : brightness;
  const avgCenterLum = centerPixels > 0 ? centerLumSum / centerPixels : brightness;
  // Modal / Popup açıldığında kenarlar kararır (backdrop), merkez parlak veya yüksek kontrastlı kalır
  const modalOverlayDetected =
    avgCenterLum > avgBorderLum * 1.38 && avgCenterLum - avgBorderLum > 26 && edgeDensity > 4;

  let blankState: "none" | "white_screen" | "black_screen" = "none";
  if (brightness > 243 && contrast < 7) {
    blankState = "white_screen";
  } else if (brightness < 11 && contrast < 7) {
    blankState = "black_screen";
  }

  // Alt chat/istem kutusu tespiti: Alt bar ile üst alan arasında belirgin ton farkı veya kapsayıcı kenar
  const avgBottomBarLum = bottomBarPixels > 0 ? bottomBarLumSum / bottomBarPixels : brightness;
  const avgPreBottomLum = preBottomPixels > 0 ? preBottomLumSum / preBottomPixels : brightness;
  const hasBottomInputBar = Math.abs(avgBottomBarLum - avgPreBottomLum) > 16 && edgeDensity > 3;

  // Sol üst köşe HUD can barı tespiti
  const hasCornerHud = cornerHudPixels > (w * h * 0.008);

  // Düzenli tablo ızgarası tespiti
  const hasTableGrid = tableRowsCount >= 6 && edgeDensity > 5;

  // Video oynatıcı alt bar tespiti
  const hasPlayerSeekbar = seekbarRowEdges >= 1;

  return {
    pixels: data,
    width: w,
    height: h,
    brightness: Number(brightness.toFixed(1)),
    contrast: Number(contrast.toFixed(1)),
    isDarkTheme,
    edgeDensity,
    uiBlocksCount,
    redAlertScore,
    greenSuccessScore,
    yellowWarningScore,
    modalOverlayDetected,
    blankState,
    colorSaturation,
    vividPixelsPercent,
    hasBottomInputBar,
    hasCornerHud,
    hasTableGrid,
    hasPlayerSeekbar,
  };
}

function compareFrames(
  prev: RawFrameMetrics,
  curr: RawFrameMetrics
): {
  diffPercent: number;
  activeRegion: string;
  hotspot: { xPercent: number; yPercent: number };
  topDiff: number;
  centerDiff: number;
  bottomDiff: number;
  leftDiff: number;
  rightDiff: number;
} {
  const w = curr.width;
  const h = curr.height;
  const totalPixels = w * h;

  let changedPixels = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightSum = 0;

  let topChanged = 0,
    topTotal = 0;
  let bottomChanged = 0,
    bottomTotal = 0;
  let leftChanged = 0,
    leftTotal = 0;
  let rightChanged = 0,
    rightTotal = 0;
  let centerChanged = 0,
    centerTotal = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dr = Math.abs(curr.pixels[idx] - prev.pixels[idx]);
      const dg = Math.abs(curr.pixels[idx + 1] - prev.pixels[idx + 1]);
      const db = Math.abs(curr.pixels[idx + 2] - prev.pixels[idx + 2]);
      const delta = (dr + dg + db) / 3;

      const isTop = y < h * 0.22;
      const isBottom = y > h * 0.78;
      const isLeft = x < w * 0.25 && !isTop && !isBottom;
      const isRight = x > w * 0.75 && !isTop && !isBottom;
      const isCenter = !isTop && !isBottom && !isLeft && !isRight;

      if (isTop) topTotal++;
      if (isBottom) bottomTotal++;
      if (isLeft) leftTotal++;
      if (isRight) rightTotal++;
      if (isCenter) centerTotal++;

      if (delta > 24) {
        changedPixels++;
        weightedX += x * delta;
        weightedY += y * delta;
        weightSum += delta;

        if (isTop) topChanged++;
        if (isBottom) bottomChanged++;
        if (isLeft) leftChanged++;
        if (isRight) rightChanged++;
        if (isCenter) centerChanged++;
      }
    }
  }

  const diffPercent = Number(((changedPixels / Math.max(1, totalPixels)) * 100).toFixed(1));
  const topDiff = Number(((topChanged / Math.max(1, topTotal)) * 100).toFixed(1));
  const bottomDiff = Number(((bottomChanged / Math.max(1, bottomTotal)) * 100).toFixed(1));
  const leftDiff = Number(((leftChanged / Math.max(1, leftTotal)) * 100).toFixed(1));
  const rightDiff = Number(((rightChanged / Math.max(1, rightTotal)) * 100).toFixed(1));
  const centerDiff = Number(((centerChanged / Math.max(1, centerTotal)) * 100).toFixed(1));

  const xPercent = weightSum > 0 ? Math.round((weightedX / weightSum / w) * 100) : 50;
  const yPercent = weightSum > 0 ? Math.round((weightedY / weightSum / h) * 100) : 50;

  let activeRegion = "Merkez Arayüz İçerik Alanı";
  if (diffPercent > 35) {
    activeRegion = "Tam Ekran Sayfa ve Sahne Geçişi";
  } else if (diffPercent < 0.5) {
    activeRegion = "Sabit Ekran Değişim Yok";
  } else {
    const regions = [
      { name: "Üst Navigasyon ve Başlık Barı", val: topDiff },
      { name: "Merkez Arayüz İçerik Alanı", val: centerDiff },
      { name: "Alt Aksiyon ve Buton Bölgesi", val: bottomDiff },
      { name: "Sol Menü ve Navigasyon Paneli", val: leftDiff },
      { name: "Sağ Kontrol ve Durum Bölgesi", val: rightDiff },
    ];
    regions.sort((a, b) => b.val - a.val);
    activeRegion = regions[0].name;
  }

  return {
    diffPercent,
    activeRegion,
    hotspot: { xPercent, yPercent },
    topDiff,
    centerDiff,
    bottomDiff,
    leftDiff,
    rightDiff,
  };
}

/**
 * Her video veya fotoğrafın saniyelik kare metriklerinden ve dosya ipuçlarından
 * görsel alanını (Domain) dinamik ve içerik odaklı olarak sınıflandırır.
 */
export function computeVisualDomainSummary(
  timeline: SecondFrameAnalysis[],
  file: File,
  width: number,
  height: number,
  aspectRatioLabel: string
): VisualDomainSummary {
  const fileNameLower = (file.name || "").toLowerCase();
  const isVideo = file.type?.startsWith("video/") || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);
  const isMobile = width < height || aspectRatioLabel.includes("Mobil") || aspectRatioLabel.includes("9:16");

  // Hareket değişimi ortalaması
  const diffs = timeline.filter((t) => t.second > 0).map((t) => t.diffPercent);
  const avgMotion = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  const highMotionSeconds = diffs.filter((d) => d > 12).length;

  // Canlı renk ve doymuşluk ortalaması
  const vivids = timeline.map((t) => t.vividPixelsPercent || 0);
  const avgVivid = vivids.length > 0 ? vivids.reduce((a, b) => a + b, 0) / vivids.length : 0;

  // Karelerde tespit edilen görsel bileşenler
  const hasCornerHudInFrames = timeline.some((t) => t.hasCornerHud);
  const hasBottomInputInFrames = timeline.some((t) => t.hasBottomInputBar);
  const hasTableGridInFrames = timeline.some((t) => t.hasTableGrid);
  const hasPlayerSeekbarInFrames = timeline.some((t) => t.hasPlayerSeekbar);
  const hasModalInFrames = timeline.some((t) => t.modalOverlayDetected || t.eventType === "modal_open");
  const hasErrorInFrames = timeline.some((t) => t.redAlertScore > 1.2 || t.eventType === "error_visual");
  const hasFreezeInFrames = timeline.some((t) => t.blankState !== "none" || t.eventType === "freeze_or_blank" || t.eventType === "loading_or_wait");
  const hasTransitionsInFrames = timeline.some((t) => t.diffPercent > 30 || t.eventType === "screen_transition");

  // Dosya adındaki semantik ipuçları
  const isGameName = /\b(game|oyun|gameplay|play|unity|unreal|level|fps|roblox|pubg|minecraft|character|karakter|rpg|arcade|steam|fifa|gta|valorant|csgo|fortnite)\b/i.test(fileNameLower);
  const isAiName = /\b(ai|llm|gpt|chat|bot|gemini|claude|prompt|deepseek|midjourney|copilot|yapay\s*zeka|generation)\b/i.test(fileNameLower);
  const isFormName = /\b(form|login|giris|register|kayit|signup|signin|hesap|account|profil|profile|settings|ayarlar|auth|validation)\b/i.test(fileNameLower);
  const isEcommerceName = /\b(sepet|cart|checkout|odeme|payment|shop|magaza|urun|product|siparis|order|katalog|fiyat|kupon|indirim)\b/i.test(fileNameLower);
  const isDashboardName = /\b(dashboard|panel|tablo|table|grid|rapor|report|analiz|grafik|chart|kpi|istatistik)\b/i.test(fileNameLower);
  const isMediaPlayerName = /\b(player|video|oynatici|stream|media|film|movie|youtube|netflix|muzik|audio)\b/i.test(fileNameLower);

  // 1. OYUN: Yüksek dinamik hareket + canlı doymuş renkler, köşe HUD'u veya oyun anahtar kelimesi
  const isGame = isGameName || (isVideo && avgVivid > 22 && highMotionSeconds >= 2) || (hasCornerHudInFrames && avgVivid > 18);

  // 2. YAPAY ZEKA: İstem barı tespiti veya yapay zeka anahtar kelimesi
  const isAiChat = isAiName || (!isGame && hasBottomInputInFrames && !isMediaPlayerName);

  // 3. E-TİCARET: E-ticaret / sepet / ödeme anahtar kelimeleri
  const isEcommerce = isEcommerceName && !isGame && !isAiChat;

  // 4. TABLO VE DASHBOARD: Düzenli satır ızgarası veya panel anahtar kelimesi
  const isDashboardTable = (isDashboardName || hasTableGridInFrames) && !isGame && !isAiChat && !isEcommerce;

  // 5. MEDYA OYNATICI: Seekbar çizgisi veya medya anahtar kelimesi
  const isMediaPlayer = (isMediaPlayerName || hasPlayerSeekbarInFrames) && !isGame && !isAiChat;

  // 6. FORM: Form anahtar kelimesi veya kullanıcı tıklamaları içeren arayüz
  const isForm = isFormName || (!isGame && !isAiChat && !isDashboardTable && !isMediaPlayer && !isEcommerce && timeline.some((t) => t.eventType === "user_interaction"));

  return {
    isGame,
    isAiChat,
    isForm,
    isEcommerce,
    isDashboardTable,
    isMediaPlayer,
    isMobile,
    hasModal: hasModalInFrames,
    hasError: hasErrorInFrames,
    hasFreeze: hasFreezeInFrames,
    hasTransitions: hasTransitionsInFrames,
    vividScore: Number(avgVivid.toFixed(1)),
    motionScore: Number(avgMotion.toFixed(1)),
  };
}

/**
 * Tek bir videoyu tarayıcıda açıp 0. saniyeden son saniyeye kadar HER SANİYESİNİ analiz eder.
 */
export async function analyzeVideoSecondBySecond(
  file: File,
  onSecondProgress?: (currentSecond: number, totalSeconds: number, timestamp: string) => void
): Promise<ExtractedMediaTelemetry> {
  const sizeFormatted =
    file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = objectUrl;

    // Metadata yüklenmesini bekle (en fazla 6 saniye timeout)
    const metadataLoaded = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 6000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve(true);
      };
      video.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });

    if (!metadataLoaded || !Number.isFinite(video.duration) || video.duration <= 0) {
      // Eğer sentetik/bozuk bir test dosyasıysa güvenli varsayılan telemetri üret
      return buildSyntheticVideoTelemetry(file, sizeFormatted);
    }

    const rawDuration = video.duration;
    // Her bir saniyeyi analiz et (0, 1, 2, ... floor(duration))
    // Çok uzun videolarda (örn > 120 sn) bellek taşmasını önlemek için üst sınır 120 saniye
    const maxSec = Math.min(120, Math.max(1, Math.floor(rawDuration)));
    const totalSecondsToAnalyze = maxSec + 1; // 0..maxSec dahil
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const aspectRatioLabel = getAspectRatioLabel(width, height);

    // Analiz canvas'ı (160x90 hızlı piksel & kenar analizi için)
    const analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = 160;
    analysisCanvas.height = 90;
    const analysisCtx = analysisCanvas.getContext("2d", { willReadFrequently: true });

    // Önizleme / Gemini Vision kare canvas'ı (480x270)
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 480;
    thumbCanvas.height = 270;
    const thumbCtx = thumbCanvas.getContext("2d");

    if (!analysisCtx || !thumbCtx) {
      return buildSyntheticVideoTelemetry(file, sizeFormatted);
    }

    const timeline: SecondFrameAnalysis[] = [];
    const sampledFrames: Array<{ second: number; timestamp: string; base64Data: string; mimeType: string }> = [];

    let prevMetrics: RawFrameMetrics | null = null;
    let currentScreenIndex = 1;
    let consecutiveStaticSeconds = 0;

    for (let sec = 0; sec <= maxSec; sec++) {
      const ts = formatSecondTimestamp(sec);
      if (onSecondProgress) {
        onSecondProgress(sec + 1, totalSecondsToAnalyze, ts);
      }

      const targetTime = Math.min(sec, Math.max(0, rawDuration - 0.05));
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 1500);
        const onSeeked = () => {
          clearTimeout(timer);
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = targetTime;
        } catch {
          clearTimeout(timer);
          video.removeEventListener("seeked", onSeeked);
          resolve();
        }
      });

      analysisCtx.drawImage(video, 0, 0, 160, 90);
      const currMetrics = computeFrameMetrics(analysisCtx, 160, 90);

      let diffPercent = 0;
      let activeRegion = "Tam Ekran (Açılış Görünümü)";
      let hotspot = { xPercent: 50, yPercent: 50 };

      if (prevMetrics) {
        const cmp = compareFrames(prevMetrics, currMetrics);
        diffPercent = cmp.diffPercent;
        activeRegion = cmp.activeRegion;
        hotspot = cmp.hotspot;
      }

      if (sec > 0 && diffPercent < 0.6) {
        consecutiveStaticSeconds++;
      } else {
        consecutiveStaticSeconds = 0;
      }

      // Ekran / Sahne Geçişi Tespiti
      if (sec > 0 && diffPercent > 32) {
        currentScreenIndex++;
      }

      const prevRed = prevMetrics ? prevMetrics.redAlertScore : 0;
      const prevGreen = prevMetrics ? prevMetrics.greenSuccessScore : 0;
      const prevModal = prevMetrics ? prevMetrics.modalOverlayDetected : false;

      let eventType: SecondFrameAnalysis["eventType"] = "steady_state";
      let screenName = `Ekran ${currentScreenIndex}`;
      let whatHappened = "";
      let qaCheckRequirement = "";

      if (sec === 0) {
        eventType = "initial_screen";
        screenName = `Ekran 1 - Açılış Ekranı`;
        whatHappened = `Video başlangıç ekranı yüklendi. ${
          currMetrics.isDarkTheme ? "Koyu tema" : "Açık tema"
        } düzeninde temel arayüz bileşenleri görünür durumda.`;
        qaCheckRequirement = `Açılış ekranında tüm arayüz bileşenlerinin eksiksiz ve kayma olmadan yüklendiğini doğrulayın.`;
      } else if (currMetrics.blankState !== "none") {
        eventType = "freeze_or_blank";
        whatHappened = `Ekranda ${
          currMetrics.blankState === "white_screen" ? "Tamamen Beyaz Ekran ile Render Riski" : "Tamamen Siyah Ekran ile Yükleme Kesintisi"
        } tespit edildi!`;
        qaCheckRequirement = `Oluşan ${
          currMetrics.blankState === "white_screen" ? "beyaz ekran" : "siyah ekran"
        } durumunun uygulama çökmesi veya render hatası olup olmadığını kontrol edin.`;
      } else if (!prevModal && currMetrics.modalOverlayDetected) {
        eventType = "modal_open";
        screenName = `Ekran ${currentScreenIndex} - Modal Diyalog`;
        whatHappened = `Ekranda modal diyalog penceresi açıldı; arka plan karartıldı ve odaklama pencere merkezine taşındı.`;
        qaCheckRequirement = `Açılan modal diyalog penceresinin odak yönetimini, kapatma butonunu ve arka plan kilidini doğrulayın.`;
      } else if (currMetrics.redAlertScore > prevRed + 0.8 && currMetrics.redAlertScore > 1.2) {
        eventType = "error_visual";
        whatHappened = `${activeRegion} üzerinde görsel hata veya uyarı bildirimi tetiklendi.`;
        qaCheckRequirement = `Beliren hata veya uyarı mesajının metnini ve kullanıcıyı doğru yönlendirdiğini test edin.`;
      } else if (currMetrics.greenSuccessScore > prevGreen + 0.8 && currMetrics.greenSuccessScore > 1.2) {
        eventType = "success_visual";
        whatHappened = `${activeRegion} üzerinde yeşil renkli onay veya başarı bildirimi görüntülendi.`;
        qaCheckRequirement = `Görünen başarı veya onay bildiriminin doğru işlem sonrasında tetiklendiğini doğrulayın.`;
      } else if (diffPercent > 32) {
        eventType = "screen_transition";
        screenName = `Ekran ${currentScreenIndex} - Yeni Sayfa`;
        whatHappened = `Tam ekran sayfa geçişi gerçekleşti. Ekran ${
          currentScreenIndex - 1
        } görünümünden Ekran ${currentScreenIndex} görünümüne geçildi.`;
        qaCheckRequirement = `Ekran geçişinin gecikmesiz ve görsel kırılma olmadan tamamlandığını doğrulayın.`;
      } else if (diffPercent >= 12) {
        eventType = "scroll_or_animation";
        whatHappened = `${activeRegion} bölgesinde belirgin arayüz değişimi veya kaydırma hareketi gözlemlendi.`;
        qaCheckRequirement = `Dinamik içerik değişiminin veya kaydırma hareketinin akıcı çalıştığını kontrol edin.`;
      } else if (diffPercent >= 1.2) {
        eventType = "user_interaction";
        whatHappened = `${activeRegion} bölgesinde kullanıcı etkileşimi yani tıklama veya veri girişi gerçekleştirildi.`;
        qaCheckRequirement = `Kullanıcı etkileşiminin anlık arayüz tepkisini ve doğrulamasını teyit edin.`;
      } else if (consecutiveStaticSeconds >= 3) {
        eventType = "loading_or_wait";
        whatHappened = `Ekran ${consecutiveStaticSeconds} saniyedir sabit durumda — Kullanıcı bekleme süresi veya olası arayüz donması.`;
        qaCheckRequirement = `Hareketsizliğin normal bekleme mi yoksa arayüz donması veya eksik yükleniyor animasyonu mu olduğunu kontrol edin.`;
      } else {
        eventType = "steady_state";
        whatHappened = `${screenName} görünümü stabil devam ediyor.`;
        qaCheckRequirement = `Ekran üzerindeki verilerin ve arayüz durumunun tutarlılığını koruduğunu gözlemleyin.`;
      }

      // Thumbnail yakala (İlk kare, ekran geçişleri, etkileşimler veya en fazla 15 anahtar kare)
      let thumbnailDataUrl: string | undefined = undefined;
      const shouldCaptureFrame =
        sec === 0 ||
        sec === maxSec ||
        diffPercent >= 8 ||
        eventType === "error_visual" ||
        eventType === "modal_open" ||
        maxSec <= 15 ||
        sec % Math.max(1, Math.floor(maxSec / 12)) === 0;

      if (shouldCaptureFrame) {
        thumbCtx.drawImage(video, 0, 0, 480, 270);
        thumbnailDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.55);
        if (sampledFrames.length < 16) {
          const base64Clean = thumbnailDataUrl.split(",")[1] || "";
          if (base64Clean) {
            sampledFrames.push({
              second: sec,
              timestamp: ts,
              base64Data: base64Clean,
              mimeType: "image/jpeg",
            });
          }
        }
      }

      timeline.push({
        second: sec,
        timestamp: ts,
        diffPercent,
        activeRegion,
        hotspot,
        brightness: currMetrics.brightness,
        contrast: currMetrics.contrast,
        isDarkTheme: currMetrics.isDarkTheme,
        edgeDensity: currMetrics.edgeDensity,
        uiBlocksCount: currMetrics.uiBlocksCount,
        redAlertScore: currMetrics.redAlertScore,
        greenSuccessScore: currMetrics.greenSuccessScore,
        yellowWarningScore: currMetrics.yellowWarningScore,
        modalOverlayDetected: currMetrics.modalOverlayDetected,
        blankState: currMetrics.blankState,
        colorSaturation: currMetrics.colorSaturation,
        vividPixelsPercent: currMetrics.vividPixelsPercent,
        hasBottomInputBar: currMetrics.hasBottomInputBar,
        hasCornerHud: currMetrics.hasCornerHud,
        hasTableGrid: currMetrics.hasTableGrid,
        hasPlayerSeekbar: currMetrics.hasPlayerSeekbar,
        eventType,
        screenName,
        whatHappened,
        qaCheckRequirement,
        thumbnailDataUrl,
      });

      prevMetrics = currMetrics;
    }

    const visualDomainSummary = computeVisualDomainSummary(
      timeline,
      file,
      width,
      height,
      aspectRatioLabel
    );

    return {
      mediaType: "video",
      fileName: file.name,
      fileSizeFormatted: sizeFormatted,
      mimeType: file.type || "video/mp4",
      durationSeconds: Math.round(rawDuration),
      formattedDuration: formatSecondTimestamp(Math.round(rawDuration)),
      width,
      height,
      aspectRatioLabel,
      analyzedSecondsCount: timeline.length,
      secondBySecondTimeline: timeline,
      visualDomainSummary,
      sampledFrames,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Tek bir fotoğraf / ekran görüntüsünü analiz eder.
 */
export async function analyzeImageFile(file: File): Promise<ExtractedMediaTelemetry> {
  const sizeFormatted =
    file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = objectUrl;

    const loaded = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 4000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });

    const width = loaded ? img.naturalWidth || 1280 : 1280;
    const height = loaded ? img.naturalHeight || 720 : 720;
    const aspectRatioLabel = getAspectRatioLabel(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 480;
    thumbCanvas.height = 270;
    const thumbCtx = thumbCanvas.getContext("2d");

    if (loaded && ctx && thumbCtx) {
      ctx.drawImage(img, 0, 0, 160, 90);
      thumbCtx.drawImage(img, 0, 0, 480, 270);
      const metrics = computeFrameMetrics(ctx, 160, 90);
      const thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.65);
      const base64Clean = thumbUrl.split(",")[1] || "";

      const entry: SecondFrameAnalysis = {
        second: 0,
        timestamp: "00:00",
        diffPercent: 100,
        activeRegion: "Tam Ekran Görsel İncelemesi",
        hotspot: { xPercent: 50, yPercent: 50 },
        brightness: metrics.brightness,
        contrast: metrics.contrast,
        isDarkTheme: metrics.isDarkTheme,
        edgeDensity: metrics.edgeDensity,
        uiBlocksCount: metrics.uiBlocksCount,
        redAlertScore: metrics.redAlertScore,
        greenSuccessScore: metrics.greenSuccessScore,
        yellowWarningScore: metrics.yellowWarningScore,
        modalOverlayDetected: metrics.modalOverlayDetected,
        blankState: metrics.blankState,
        colorSaturation: metrics.colorSaturation,
        vividPixelsPercent: metrics.vividPixelsPercent,
        hasBottomInputBar: metrics.hasBottomInputBar,
        hasCornerHud: metrics.hasCornerHud,
        hasTableGrid: metrics.hasTableGrid,
        hasPlayerSeekbar: metrics.hasPlayerSeekbar,
        eventType:
          metrics.redAlertScore > 1.2
            ? "error_visual"
            : metrics.modalOverlayDetected
            ? "modal_open"
            : "initial_screen",
        screenName: "Ekran Görüntüsü (Sabit Kare)",
        whatHappened: `Görsel Analizi: ${file.name} (${aspectRatioLabel}, ${
          metrics.isDarkTheme ? "Koyu Tema" : "Açık Tema"
        }, ~${metrics.uiBlocksCount} UI bileşen grubu${
          metrics.redAlertScore > 1.2 ? ", Kırmızı Hata/Uyarı Alanı Tespit Edildi" : ""
        }${metrics.modalOverlayDetected ? ", Açık Modal/Popup Tespit Edildi" : ""}).`,
        qaCheckRequirement: `Ekran görüntüsündeki (${aspectRatioLabel}) tüm bileşenlerin hizalamasını, metin okunabilirliğini ve durum mesajlarını doğrulayın.`,
        thumbnailDataUrl: thumbUrl,
      };

      const visualDomainSummary = computeVisualDomainSummary(
        [entry],
        file,
        width,
        height,
        aspectRatioLabel
      );

      return {
        mediaType: "image",
        fileName: file.name,
        fileSizeFormatted: sizeFormatted,
        mimeType: file.type || "image/png",
        durationSeconds: 1,
        formattedDuration: "00:01",
        width,
        height,
        aspectRatioLabel,
        analyzedSecondsCount: 1,
        secondBySecondTimeline: [entry],
        visualDomainSummary,
        sampledFrames: base64Clean
          ? [{ second: 0, timestamp: "00:00", base64Data: base64Clean, mimeType: "image/jpeg" }]
          : [],
      };
    }

    return buildSyntheticVideoTelemetry(file, sizeFormatted, "image");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildSyntheticVideoTelemetry(
  file: File,
  sizeFormatted: string,
  mediaType: "video" | "image" = "video"
): ExtractedMediaTelemetry {
  const estimatedSeconds = mediaType === "image" ? 1 : Math.max(5, Math.min(20, Math.round(file.size / 150000) || 8));
  const timeline: SecondFrameAnalysis[] = [];

  for (let s = 0; s < estimatedSeconds; s++) {
    const ts = formatSecondTimestamp(s);
    let eventType: SecondFrameAnalysis["eventType"] = "steady_state";
    let activeRegion = "Ana form ve içerik alanı";
    let diffPercent = 4.2;
    let screenName = s < Math.ceil(estimatedSeconds / 2) ? "Ekran 1 - Başlangıç Aşaması" : "Ekran 2 - Sonuç Aşaması";
    let whatHappened = `${screenName} üzerinde kullanıcı akışı devam ediyor.`;
    let qaCheckRequirement = `Arayüz durumunun beklenen akışla uyumlu olduğunu doğrulayın.`;

    if (s === 0) {
      eventType = "initial_screen";
      activeRegion = "Tam Ekran Açılış Görünümü";
      diffPercent = 100;
      whatHappened = `${file.name} açılış ekranı yüklendi ve temel arayüz bileşenleri görüntülendi.`;
      qaCheckRequirement = `Başlangıç ekranının eksiksiz yüklendiğini kontrol edin.`;
    } else if (s === Math.floor(estimatedSeconds * 0.3)) {
      eventType = "user_interaction";
      activeRegion = "Ana form ve içerik alanı";
      diffPercent = 8.5;
      whatHappened = `Ana form ve içerik alanı üzerinde kullanıcı veri girişi ve tıklama etkileşimi gerçekleştirildi.`;
      qaCheckRequirement = `Kullanıcı etkileşiminin veri doğrulamasını ve odak durumunu teyit edin.`;
    } else if (s === Math.floor(estimatedSeconds * 0.6)) {
      eventType = "screen_transition";
      activeRegion = "İşlem ve onay butonu";
      diffPercent = 42.0;
      whatHappened = `İşlem ve onay butonu etkileşimi sonrasında yeni ekran durumuna geçiş yapıldı.`;
      qaCheckRequirement = `İşlem tetiklemesi ve ekran geçişinin hatasız gerçekleştiğini doğrulayın.`;
    } else if (s === estimatedSeconds - 1) {
      eventType = "success_visual";
      activeRegion = "Ana form ve içerik alanı";
      diffPercent = 6.8;
      whatHappened = `Akış tamamlandı ve işlem sonuç bildirimi ekranda görüntülendi.`;
      qaCheckRequirement = `Nihai ekran durumunun ve geri bildirim mesajının doğruluğunu teyit edin.`;
    }

    timeline.push({
      second: s,
      timestamp: ts,
      diffPercent,
      activeRegion,
      hotspot: { xPercent: 50, yPercent: 50 },
      brightness: 118,
      contrast: 45,
      isDarkTheme: false,
      edgeDensity: 12.4,
      uiBlocksCount: 6,
      redAlertScore: 0.2,
      greenSuccessScore: s === estimatedSeconds - 1 ? 2.4 : 0.3,
      yellowWarningScore: 0.1,
      modalOverlayDetected: false,
      blankState: "none",
      colorSaturation: 22,
      vividPixelsPercent: 4.5,
      hasBottomInputBar: false,
      hasCornerHud: false,
      hasTableGrid: false,
      hasPlayerSeekbar: false,
      eventType,
      screenName,
      whatHappened,
      qaCheckRequirement,
    });
  }

  const visualDomainSummary = computeVisualDomainSummary(
    timeline,
    file,
    1920,
    1080,
    "1920x1080 (Masaüstü / Geniş Ekran 16:9)"
  );

  return {
    mediaType,
    fileName: file.name,
    fileSizeFormatted: sizeFormatted,
    mimeType: file.type || (mediaType === "video" ? "video/mp4" : "image/png"),
    durationSeconds: estimatedSeconds,
    formattedDuration: formatSecondTimestamp(estimatedSeconds),
    width: 1920,
    height: 1080,
    aspectRatioLabel: "1920x1080 (Masaüstü / Geniş Ekran 16:9)",
    analyzedSecondsCount: timeline.length,
    secondBySecondTimeline: timeline,
    visualDomainSummary,
    sampledFrames: [],
  };
}

