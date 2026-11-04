import { Request, Response } from "express";
import { developerAuthService } from "../services/developerAuthService";
import { config } from "../config";

const COOKIE_NAME = "dev_session";
const COOKIE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 saat

function extractSessionId(req: Request): string | undefined {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const header = req.headers["x-developer-session"];
  if (typeof header === "string" && header.trim()) {
    return header.trim();
  }
  return undefined;
}

export const developerAuthController = {
  /**
   * GET /api/developer/status
   * İstemcinin Developer Mode durumunu ve oturum geçerliliğini kontrol eder.
   * E-posta adresi veya gizli yöneticinin kimliği API yanıtında asla yer almaz.
   */
  async getStatus(req: Request, res: Response) {
    const sessionId = extractSessionId(req);
    const status = developerAuthService.getSystemStatus(sessionId);
    return res.json(status);
  },

  /**
   * POST /api/developer/request-code
   * 8 haneli tek kullanımlık doğrulama kodu ister.
   * E-posta adresi backend ortam değişkenlerinden (DEVELOPER_EMAIL) otomatik olarak okunur.
   */
  async requestCode(req: Request, res: Response) {
    try {
      const { email } = req.body || {};
      const result = await developerAuthService.requestCode(email);
      return res.json(result);
    } catch (err: any) {
      const msg = err.message || "Kod gönderilirken bir hata oluştu.";
      const isRateOrLock = msg.includes("engellendi") || msg.includes("bekleyin") || msg.includes("limitine");
      const isForbidden = msg.includes("yetkilendirilmemiştir") || msg.includes("reddedildi") || msg.includes("devre dışı");

      const statusCode = isForbidden ? 403 : isRateOrLock ? 429 : 400;
      return res.status(statusCode).json({ error: msg });
    }
  },

  /**
   * POST /api/developer/verify-code
   * Girilen 8 haneli kodu doğrular ve geçici aşama token'ı döner.
   */
  async verifyCode(req: Request, res: Response) {
    try {
      const { code, email } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: "Lütfen 8 haneli doğrulama kodunu girin." });
      }

      const result = await developerAuthService.verifyCode(String(code), email);
      return res.json(result);
    } catch (err: any) {
      const msg = err.message || "Kod doğrulanamadı.";
      const isForbidden = msg.includes("engellendi") || msg.includes("Yetkisiz");
      const statusCode = isForbidden ? 403 : 400;
      return res.status(statusCode).json({ error: msg });
    }
  },

  /**
   * POST /api/developer/setup-password
   * İlk kurulumda en az 12 karakterlik şifre belirler ve oturumu başlatır.
   */
  async setupPassword(req: Request, res: Response) {
    try {
      const { verificationToken, password } = req.body || {};
      if (!verificationToken || !password) {
        return res.status(400).json({ error: "Doğrulama token'ı ve şifre zorunludur." });
      }

      const result = await developerAuthService.setupPassword(verificationToken, password);

      // HttpOnly, Secure, SameSite korumalı çerez
      res.cookie(COOKIE_NAME, result.sessionId, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });

      return res.json({
        success: true,
        sessionId: result.sessionId,
        message: "Developer Mode şifresi başarıyla oluşturuldu ve oturum açıldı.",
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Şifre oluşturulamadı." });
    }
  },

  /**
   * POST /api/developer/login
   * Sonraki girişlerde e-posta kodu + şifre doğrulama.
   */
  async loginWithPassword(req: Request, res: Response) {
    try {
      const { verificationToken, password } = req.body || {};
      if (!verificationToken || !password) {
        return res.status(400).json({ error: "Doğrulama token'ı ve şifre zorunludur." });
      }

      const result = await developerAuthService.loginWithPassword(verificationToken, password);

      // HttpOnly, Secure, SameSite korumalı çerez
      res.cookie(COOKIE_NAME, result.sessionId, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });

      return res.json({
        success: true,
        sessionId: result.sessionId,
        message: "Developer Mode başarıyla aktifleştirildi.",
      });
    } catch (err: any) {
      const msg = err.message || "Giriş başarısız.";
      const isForbidden = msg.includes("engellendi");
      return res.status(isForbidden ? 403 : 401).json({ error: msg });
    }
  },

  /**
   * POST /api/developer/logout
   * Developer Mode oturumunu sonlandırır ve çerezi temizler.
   */
  async logout(req: Request, res: Response) {
    const sessionId = extractSessionId(req);
    developerAuthService.logout(sessionId);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
      path: "/",
    });

    return res.json({
      success: true,
      message: "Developer Mode oturumu başarıyla sonlandırıldı.",
    });
  },
};
