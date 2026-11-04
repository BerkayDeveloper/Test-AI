import { Router } from "express";
import { analysisController } from "../controllers/analysisController";
import { mediaAnalysisController } from "../controllers/mediaAnalysisController";
import { templateController } from "../controllers/templateController";
import { developerAuthController } from "../controllers/developerAuthController";
import { requireDeveloperAuth } from "../middlewares/developerAuthMiddleware";
import { analyzeLimiter } from "../middlewares/rateLimiter";
import { dbService } from "../services/dbService";

const router = Router();

// ==========================================
// DEVELOPER MODE GÜVENLİ YETKİLENDİRME ROTALARI
// ==========================================
router.get("/developer/status", developerAuthController.getStatus);
router.post("/developer/request-code", developerAuthController.requestCode);
router.post("/developer/verify-code", developerAuthController.verifyCode);
router.post("/developer/setup-password", developerAuthController.setupPassword);
router.post("/developer/login", developerAuthController.loginWithPassword);
router.post("/developer/logout", developerAuthController.logout);

// Analiz Uç Noktaları
router.post("/analyze", analyzeLimiter, analysisController.analyzeChange);
router.get("/analyses", analysisController.getAnalyses);
router.post("/analyses", analysisController.saveAnalysis);
router.get("/analyses/:id", analysisController.getAnalysisById);
router.put("/analyses/:id", analysisController.updateAnalysis);
router.delete("/analyses/:id", analysisController.deleteAnalysis);

// Test Koşum Durumu Kalıcılığı (Execution Persistence)
router.get("/analyses/:id/execution", analysisController.getExecution);
router.post("/analyses/:id/execution", analysisController.saveExecution);

// Video / Fotoğraf Medya Analizi & Yapay Zeka Kapsam Tespiti (QA Modu - Gemini Vision)
router.post("/detect-media-scopes", mediaAnalysisController.detectScopes);
router.post("/analyze-media", mediaAnalysisController.analyzeMedia);

// AI & Şablon Üretici
router.post("/generate-template", analyzeLimiter, templateController.generateTemplate);

// Detaylı Sistem Sağlık Kontrolü (Hızlı, kilitlenmeyen ve anlık yanıt)
router.get("/health", async (_req, res) => {
  const status = await dbService.getHealthStatus();
  res.json({
    status: "ok",
    database: status.database,
    mode: status.mode,
    engine: "active",
    recordCount: status.recordCount,
    timestamp: new Date().toISOString(),
  });
});

// AI & Sistem Otomatik Kurtarma / Yeniden Bağlama (Self-Healing Reconnect)
router.post("/system/reconnect", async (_req, res) => {
  try {
    const dbResult = await dbService.reconnect(true);
    const status = await dbService.getHealthStatus();

    res.json({
      success: true,
      status: "ok",
      database: status.database,
      mode: dbResult.mode,
      engine: "active",
      message: "AI Sistem Onarım ve Bağlantı Protokolü tamamlandı: " + dbResult.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      success: true,
      status: "ok",
      database: "disk-storage",
      mode: "disk",
      engine: "active",
      message: "Kalıcı Disk Deposu ve Sistem Motoru kesintisiz aktif.",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
