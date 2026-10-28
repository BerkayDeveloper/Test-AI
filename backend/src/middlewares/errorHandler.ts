import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("Beklenmeyen Hata:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Sunucu tarafında beklenmeyen bir hata oluştu.";

  return res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
  });
}
