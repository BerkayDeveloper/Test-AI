import nodemailer from "nodemailer";
import { config } from "../config";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const DEV_INBOX_FILE = path.join(DATA_DIR, "dev_email_delivery.json");

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

function createMailTransporter(): { transporter: MailTransporter; isRealSmtp: boolean } {
  const smtpUser = (config.smtpUser || config.developerEmail || "").trim();
  const rawPass = (config.smtpPass || "").trim();
  const smtpPass = rawPass.replace(/\s+/g, ""); // Google 16 karakterli uygulama şifrelerindeki boşlukları temizle

  // 1. Gerçek SMTP yapılandırması (Kullanıcı ve şifre mevcutsa)
  if (smtpUser && smtpPass) {
    if (config.smtpHost === "smtp.gmail.com") {
      return {
        transporter: nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        }),
        isRealSmtp: true,
      };
    }

    return {
      transporter: nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      }),
      isRealSmtp: true,
    };
  }

  // 2. SMTP şifresi henüz girilmemişse güvenli JSON taşıyıcısı
  return {
    transporter: nodemailer.createTransport({ jsonTransport: true }),
    isRealSmtp: false,
  };
}

export const emailService = {
  /**
   * 8 haneli tek kullanımlık güvenlik kodunu yetkili e-posta adresine iletir.
   */
  async sendVerificationCodeEmail(
    toEmail: string,
    code: string
  ): Promise<{ sent: boolean; isRealSmtp: boolean; messageId?: string }> {
    const formattedCode = `${code.slice(0, 4)} ${code.slice(4)}`;
    const smtpUser = (config.smtpUser || config.developerEmail || "").trim();
    const fromAddress =
      config.smtpFrom && !config.smtpFrom.includes("devmode.local") && !config.smtpFrom.includes("yourdomain.com")
        ? config.smtpFrom
        : `"Developer Mode Security" <${smtpUser}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .shield { font-size: 40px; display: inline-block; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 800; color: #38bdf8; margin: 0; }
    .desc { font-size: 14px; color: #94a3b8; margin-top: 6px; line-height: 1.5; }
    .code-box { background: rgba(56, 189, 248, 0.08); border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; margin: 0; }
    .code-sub { font-size: 12px; color: #64748b; margin-top: 6px; }
    .rules { background: #0f172a; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
    .rules li { font-size: 13px; color: #cbd5e1; margin-bottom: 6px; line-height: 1.4; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="shield">🛡️</div>
      <h1 class="title">Developer Mode Kimlik Doğrulaması</h1>
      <p class="desc">Developer Mode erişimi için tek kullanımlık güvenlik kodunuz aşağıdadır.</p>
    </div>

    <div class="code-box">
      <div class="code">${formattedCode}</div>
      <div class="code-sub">8 Haneli Tek Kullanımlık Kod</div>
    </div>

    <div class="rules">
      <ul style="margin: 0; padding-left: 18px;">
        <li>⏳ Kodunuz <b>5 dakika</b> boyunca geçerlidir.</li>
        <li>🔒 Bu kod tek kullanımlıktır; yeni kod istendiğinde eski kod geçersiz kalır.</li>
        <li>⚠️ 5 başarısız denemeden sonra erişiminiz geçici olarak kilitlenir.</li>
        <li>❓ Bu talebi siz gerçekleştirmediyseniz lütfen bu bildirimi dikkate almayın.</li>
      </ul>
    </div>

    <div class="footer">
      AI Test & Change Analysis System • Güvenli Yetkilendirme Protokolü<br/>
      Gönderen: ${fromAddress}<br/>
      Alıcı: ${toEmail}
    </div>
  </div>
</body>
</html>
    `;

    const { transporter, isRealSmtp } = createMailTransporter();

    // 1. Gerçek SMTP Gönderimi
    if (isRealSmtp) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: "🛡️ Developer Mode Güvenlik Doğrulama Kodu",
          html: htmlContent,
          text: `Developer Mode Güvenlik Kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`,
        });

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(
          DEV_INBOX_FILE,
          JSON.stringify(
            {
              to: toEmail,
              from: fromAddress,
              sentAt: new Date().toISOString(),
              deliveredVia: "real_smtp",
              messageId: info.messageId,
            },
            null,
            2
          )
        );

        return { sent: true, isRealSmtp: true, messageId: info.messageId };
      } catch (err: any) {
        console.error("❌ SMTP E-posta Gönderim Hatası:", err.message);
        throw new Error(
          `E-posta gönderilemedi (${err.message}). Lütfen backend/.env dosyasında SMTP_PASS (Google Uygulama Şifresi) bilginizi kontrol edin.`
        );
      }
    }

    // 2. Yerel Geliştirici Modu (SMTP_PASS tanımlanmadığında)
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DEV_INBOX_FILE,
      JSON.stringify(
        {
          to: toEmail,
          from: fromAddress,
          code,
          formattedCode,
          sentAt: new Date().toISOString(),
          deliveredVia: "local_dev_store",
          notice: "Gerçek e-posta teslimatı için backend/.env dosyasında SMTP_PASS (Gmail Uygulama Şifresi) tanımlayın.",
        },
        null,
        2
      )
    );

    return { sent: true, isRealSmtp: false };
  },
};
