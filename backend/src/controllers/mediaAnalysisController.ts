import { Request, Response } from "express";
import { videoAnalysisService, MediaFilePayload } from "../services/videoAnalysisService";
import { cleanTestCase } from "../utils/titleCleaner";

/**
 * POST /api/analyze-media
 * QA modunda yüklenen video ve fotoğrafları teker teker, her saniyesini inceleyerek
 * analiz eder ve videodaki gerçek akışa göre detaylı QA test senaryoları üretir.
 */
export const mediaAnalysisController = {
  async analyzeMedia(req: Request, res: Response) {
    try {
      const { title, category, files, additionalNotes, selectedScopes, customScopes } = req.body as {
        title: string;
        category: string;
        additionalNotes?: string;
        files: MediaFilePayload[];
        selectedScopes?: string[];
        customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>;
      };

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "En az bir video veya fotoğraf yüklemeniz gerekiyor." });
      }

      if (files.length > 15) {
        return res.status(400).json({ error: "Tek seferde en fazla 15 medya dosyası analiz edilebilir." });
      }

      for (const f of files) {
        if (!f.name || !f.mimeType) {
          return res.status(400).json({
            error: `Geçersiz dosya formatı: ${f.name || "bilinmiyor"}. Dosya bilgisi eksik.`,
          });
        }
        const hasTimeline = Array.isArray(f.secondBySecondTimeline) && f.secondBySecondTimeline.length > 0;
        const hasBase64 = typeof f.base64Data === "string" && f.base64Data.length > 0;
        const hasFrames = Array.isArray(f.sampledFrames) && f.sampledFrames.length > 0;
        if (!hasTimeline && !hasBase64 && !hasFrames) {
          return res.status(400).json({
            error: `${f.name} dosyası için analiz verisi veya video karesi bulunamadı.`,
          });
        }
      }

      const safeTitle =
        title && typeof title === "string" && title.trim().length > 0
          ? title.trim()
          : `${files[0].name.replace(/\.[^/.]+$/, "")} QA Video Test Analizi`;
      const safeCategory = typeof category === "string" && category.trim() ? category : "functional";
      const safeNotes = typeof additionalNotes === "string" ? additionalNotes : "";

      console.log(
        `[MediaAnalysis] "${safeTitle}" için ${files.length} medya dosyası teker teker ve saniye saniye analiz ediliyor...`
      );

      const result = await videoAnalysisService.analyzeVideosAndGenerateTests(
        safeTitle,
        safeCategory,
        files,
        safeNotes,
        selectedScopes,
        customScopes
      );

      result.testCases = result.testCases.map((tc) => cleanTestCase(tc, true));

      const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const riskLevel =
        result.criticalTestCount >= 4 ? "CRITICAL" : result.criticalTestCount >= 2 ? "HIGH" : "MEDIUM";
      const riskScore = Math.min(result.criticalTestCount * 15 + 30, 95);

      console.log(
        `[MediaAnalysis] Tamamlandı: ${files.length} medya analiz edildi, ${result.totalTestCount} senaryo üretildi (${result.criticalTestCount} kritik)`
      );

      return res.json({
        id,
        title: safeTitle,
        category: safeCategory,
        createdAt: new Date().toISOString(),
        persona: "qa" as const,
        riskLevel,
        riskScore,
        overview: result.overview,
        detectedLanguage: `Video ve Medya Analizi - ${files.length} Dosya`,
        totalTestCount: result.totalTestCount,
        criticalTestCount: result.criticalTestCount,
        testCases: result.testCases,
        videoInsights: result.videoInsights,
        previousContent: "",
        newContent: result.videoInsights
          .map(
            (vi, i) =>
              `Video ${i + 1}: ${vi.videoName}\n` +
              vi.secondBySecondTimeline.map((t) => `  ${t.whatHappened.replace(/\[\d{2}:\d{2}\]\s*/, "")}`).join("\n")
          )
          .join("\n\n"),
      });
    } catch (error: any) {
      console.error("[MediaAnalysis] Hata:", error);
      return res.status(500).json({
        error: "Video/fotoğraf analizi sırasında hata oluştu: " + (error.message || "Bilinmeyen hata"),
      });
    }
  },
};
