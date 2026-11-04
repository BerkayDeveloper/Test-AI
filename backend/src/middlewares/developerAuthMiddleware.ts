import { Request, Response, NextFunction } from "express";
import { developerAuthService } from "../services/developerAuthService";
import { config } from "../config";

export interface AuthenticatedDeveloperRequest extends Request {
  isDeveloperAuthenticated?: boolean;
}

export function requireDeveloperAuth(req: AuthenticatedDeveloperRequest, res: Response, next: NextFunction) {
  const cookieSession = req.cookies && req.cookies["dev_session"];
  const headerSession = req.headers["x-developer-session"];

  const sessionId = cookieSession || (typeof headerSession === "string" ? headerSession.trim() : undefined);

  const verification = developerAuthService.verifySession(sessionId);

  if (!verification.isValid) {
    return res.status(401).json({
      error: "Developer Mode yetkisi gereklidir. Oturum geçersiz veya süresi dolmuş.",
      requiresAuth: true,
    });
  }

  req.isDeveloperAuthenticated = true;
  return next();
}

