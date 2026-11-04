import rateLimit from "express-rate-limit";

// Genel API istek sınırlayıcısı (1 dakikada max 300 istek; sağlık kontrolleri ve yeniden bağlanma muaftır)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/system/reconnect",
  message: {
    error: "Çok fazla istek gönderildi. Lütfen bir dakika bekledikten sonra tekrar deneyin.",
  },
});

// AI & Analiz istek sınırlayıcısı (1 dakikada max 60 istek)
export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Analiz istek limiti aşıldı. Lütfen biraz bekleyin.",
  },
});
