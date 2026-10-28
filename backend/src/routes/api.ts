import { Router } from "express";
import { analysisController } from "../controllers/analysisController";
import { templateController } from "../controllers/templateController";
import { analyzeLimiter } from "../middlewares/rateLimiter";
import { dbService } from "../services/dbService";

const router = Router();

// Analiz Uç Noktaları
router.post("/analyze", analyzeLimiter, analysisController.analyzeChange);
router.get("/analyses", analysisController.getAnalyses);
router.get("/analyses/:id", analysisController.getAnalysisById);
router.delete("/analyses/:id", analysisController.deleteAnalysis);

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
