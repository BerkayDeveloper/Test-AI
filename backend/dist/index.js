"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const api_1 = __importDefault(require("./routes/api"));
const errorHandler_1 = require("./middlewares/errorHandler");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const app = (0, express_1.default)();
// Güvenlik Başlıkları
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Local dev ve API kullanımı için uyumlu
}));
// CORS Yapılandırması
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin === "*" ? true : config_1.config.corsOrigin,
    credentials: true,
}));
// Body Parser - Güvenli Boyut Sınırı (5MB)
app.use(express_1.default.json({ limit: "5mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "5mb" }));
// Genel API İstek Sınırı (DDoS Koruması)
app.use("/api", rateLimiter_1.apiLimiter);
// Kök ve Sağlık Kontrolleri
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/", (_req, res) => {
    res.send(`<h1>AI Change Analysis – Backend</h1><p>Evrensel Test Adımları ve Analiz Motoru Aktif. Port: ${config_1.config.port}</p>`);
});
// API Rotaları
app.use("/api", api_1.default);
// Hata Yakalama Middleware'i
app.use(errorHandler_1.errorHandler);
// Sunucuyu Başlat
const server = app.listen(config_1.config.port, () => {
    console.log(`🚀 AI Test Adımları Motoru Aktif: http://localhost:${config_1.config.port}`);
});
// Graceful Shutdown (Temiz Kapanma)
process.on("SIGTERM", () => {
    console.log("SIGTERM sinyali alındı, sunucu kapatılıyor...");
    server.close(() => {
        console.log("Sunucu temiz bir şekilde durduruldu.");
        process.exit(0);
    });
});
