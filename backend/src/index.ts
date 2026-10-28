import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import apiRoutes from "./routes/api";
import { errorHandler } from "./middlewares/errorHandler";
import { apiLimiter } from "./middlewares/rateLimiter";

const app = express();

// Güvenlik Başlıkları
app.use(helmet({
  contentSecurityPolicy: false, // Local dev ve API kullanımı için uyumlu
}));

// CORS Yapılandırması
app.use(cors({
  origin: config.corsOrigin === "*" ? true : config.corsOrigin,
  credentials: true,
}));

// Body Parser - Güvenli Boyut Sınırı (5MB)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Genel API İstek Sınırı (DDoS Koruması)
app.use("/api", apiLimiter);

// Kök ve Sağlık Kontrolleri
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (_req: Request, res: Response) => {
  res.send(`<h1>AI Change Analysis – Backend</h1><p>Evrensel Test Adımları ve Analiz Motoru Aktif. Port: ${config.port}</p>`);
});

// API Rotaları
app.use("/api", apiRoutes);

// Hata Yakalama Middleware'i
app.use(errorHandler);

// Sunucuyu Başlat
const server = app.listen(config.port, () => {
  console.log(`🚀 AI Test Adımları Motoru Aktif: http://localhost:${config.port}`);
});

// Graceful Shutdown (Temiz Kapanma)
process.on("SIGTERM", () => {
  console.log("SIGTERM sinyali alındı, sunucu kapatılıyor...");
  server.close(() => {
    console.log("Sunucu temiz bir şekilde durduruldu.");
    process.exit(0);
  });
});
