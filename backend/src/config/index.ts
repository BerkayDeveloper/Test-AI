import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "5001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  aiApiKey: process.env.AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
  aiModel: process.env.DEFAULT_AI_MODEL ?? "gemini-3.8-flash",
  useCliAi: process.env.USE_CLI_AI !== "false",
  agyCliPath:
    process.env.AGY_CLI_PATH ??
    process.env.AGL_CLI_PATH ??
    "C:\\Users\\berkay.kurt\\.gemini\\bin\\agy.exe",

  // Private Developer Mode & Admin Yapılandırması (Yalnızca backend tarafından okunur)
  developerEmail: process.env.DEVELOPER_EMAIL ?? "berkaylivetest@gmail.com",
  developerModeEnabled: process.env.DEVELOPER_MODE_ENABLED !== "false",
  sessionSecret: process.env.SESSION_SECRET ?? process.env.DEV_AUTH_SECRET ?? "dev-auth-secret-salt-2026-secure",
  devAuthSecret: process.env.DEV_AUTH_SECRET ?? process.env.SESSION_SECRET ?? "dev-auth-secret-salt-2026-secure",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587", 10),
  smtpUser: process.env.SMTP_USER || process.env.DEVELOPER_EMAIL || "berkaylivetest@gmail.com",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom:
    process.env.SMTP_FROM && !process.env.SMTP_FROM.includes("devmode.local") && !process.env.SMTP_FROM.includes("yourdomain.com")
      ? process.env.SMTP_FROM
      : `"Developer Mode Security" <${process.env.DEVELOPER_EMAIL || "berkaylivetest@gmail.com"}>`,
  cookieSecure: process.env.NODE_ENV === "production",
};
