import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config";
import apiRoutes from "./routes/api";
import { errorHandler } from "./middlewares/errorHandler";
import { apiLimiter } from "./middlewares/rateLimiter";

const app = express();

// Güvenlik Başlıkları
app.use(helmet({
  contentSecurityPolicy: false, // Local dev ve API kullanımı için uyumlu
}));

// CORS Yapılandırması (HttpOnly çerezler ve preflight OPTIONS istekleri için)
const corsOptions = {
  origin: config.corsOrigin === "*" ? true : config.corsOrigin,
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Cookie Parser (HttpOnly Developer Mode Oturumları için)
app.use(cookieParser());

// Body Parser - Video analizi için 200MB limit (çoklu video ve saniye kareleri için yeterli)
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

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

// Sunucuyu Başlat (0.0.0.0 ile hem 127.0.0.1 hem localhost bağlantılarını kabul eder)
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`🚀 AI Test Adımları Motoru Aktif: http://127.0.0.1:${config.port} & http://localhost:${config.port}`);
});

// Graceful Shutdown (Temiz Kapanma)
process.on("SIGTERM", () => {
  console.log("SIGTERM sinyali alındı, sunucu kapatılıyor...");
  server.close(() => {
    console.log("Sunucu temiz bir şekilde durduruldu.");
    process.exit(0);
  });
});
