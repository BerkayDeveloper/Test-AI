import { Router } from "express";
import { analysisController } from "../controllers/analysisController";
import { mediaAnalysisController } from "../controllers/mediaAnalysisController";
import { templateController } from "../controllers/templateController";
import { analyzeLimiter } from "../middlewares/rateLimiter";
import { dbService } from "../services/dbService";

const router = Router();

// Analiz Uç Noktaları
router.post("/analyze", analyzeLimiter, analysisController.analyzeChange);
router.get("/analyses", analysisController.getAnalyses);
router.post("/analyses", analysisController.saveAnalysis);
router.get("/analyses/:id", analysisController.getAnalysisById);
router.put("/analyses/:id", analysisController.updateAnalysis);
router.delete("/analyses/:id", analysisController.deleteAnalysis);

// Video / Fotoğraf Medya Analizi (QA Modu - Gemini Vision)
router.post("/analyze-media", mediaAnalysisController.analyzeMedia);

// AI & Şablon Üretici
router.post("/generate-template", analyzeLimiter, templateController.generateTemplate);

// Detaylı Sistem Sağlık Kontrolü
router.get("/health", async (_req, res) => {
  const isDbOk = await dbService.isHealthy();
  res.json({
    status: "ok",
    database: isDbOk ? "connected" : "in-memory-fallback",
    timestamp: new Date().toISOString(),
  });
});

export default router;
