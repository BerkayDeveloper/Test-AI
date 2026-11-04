import { Request, Response, NextFunction } from "express";

export interface AuthenticatedDeveloperRequest extends Request {
  isDeveloperAuthenticated?: boolean;
}

export function requireDeveloperAuth(
  req: AuthenticatedDeveloperRequest,
  _res: Response,
  next: NextFunction
) {
  req.isDeveloperAuthenticated = true;
  next();
}
