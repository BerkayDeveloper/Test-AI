import { Request, Response } from "express";
import { developerAuthService } from "../services/developerAuthService";

export const developerAuthController = {
  /**
   * GET /api/developer/status
   * Developer Mode durumunu döner. Mod her zaman doğrudan açıktır.
   */
  async getStatus(_req: Request, res: Response) {
    const status = developerAuthService.getSystemStatus();
    return res.json(status);
  },

  /**
   * POST /api/developer/request-code
   * Mail sistemi kaldırıldığı için kod gerektirmez.
   */
  async requestCode(_req: Request, res: Response) {
    return res.json({
      success: true,
      message: "Developer modu doğrudan açıktır, e-posta kodu gerekmez.",
      expiresInSeconds: 0,
    });
  },

  /**
   * POST /api/developer/verify-code
   */
  async verifyCode(_req: Request, res: Response) {
    return res.json({
      success: true,
      verificationToken: "dev-open-token",
      isPasswordSet: true,
    });
  },

  /**
   * POST /api/developer/setup-password
   */
  async setupPassword(_req: Request, res: Response) {
    return res.json({
      success: true,
      sessionId: "dev-open-session",
      message: "Developer modu aktifleştirildi.",
    });
  },

  /**
   * POST /api/developer/login
   */
  async loginWithPassword(_req: Request, res: Response) {
    return res.json({
      success: true,
      sessionId: "dev-open-session",
      message: "Developer modu aktif.",
    });
  },

  /**
   * POST /api/developer/logout
   */
  async logout(_req: Request, res: Response) {
    return res.json({
      success: true,
      message: "Çıkış yapıldı.",
    });
  },
};
