import rateLimit from "express-rate-limit";

// Genel API istek sınırlayıcısı (1 dakikada max 120 istek)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Çok fazla istek gönderildi. Lütfen bir dakika bekledikten sonra tekrar deneyin.",
  },
});

// AI & Analiz istek sınırlayıcısı (1 dakikada max 40 istek)
export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Analiz istek limiti aşıldı. Lütfen biraz bekleyin.",
  },
});
