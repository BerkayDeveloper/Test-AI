/**
 * Hassas Veri (Secrets & PII) Maskeleme ve Güvenlik Filtresi
 * Kod, prompt ve dokümanlar AI modellerine veya dış servislere gitmeden önce
 * gizli anahtarları, şifreleri ve kişisel verileri güvenli şekilde maskeler.
 */

export interface SanitizeResult {
  sanitizedText: string;
  maskedCount: number;
  detectedTypes: string[];
}

export function sanitizeSensitiveData(text: string): SanitizeResult {
  if (!text) {
    return { sanitizedText: "", maskedCount: 0, detectedTypes: [] };
  }

  let result = text;
  let maskedCount = 0;
  const detectedTypes = new Set<string>();

  // 1. OpenAI API Keys (sk-...)
  result = result.replace(/sk-[a-zA-Z0-9_-]{20,}/g, () => {
    maskedCount++;
    detectedTypes.add("OpenAI API Key");
    return "[REDACTED_OPENAI_KEY]";
  });

  // 2. Google Gemini / Cloud API Keys (AIzaSy...)
  result = result.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, () => {
    maskedCount++;
    detectedTypes.add("Google API Key");
    return "[REDACTED_GOOGLE_API_KEY]";
  });

  // 3. AWS Access Key ID (AKIA...)
  result = result.replace(/(?:AKIA|ASIA)[A-Z0-9]{16}/g, () => {
    maskedCount++;
    detectedTypes.add("AWS Access Key");
    return "[REDACTED_AWS_KEY]";
  });

  // 4. GitHub Personal Access Tokens (ghp_..., gho_...)
  result = result.replace(/gh[pousr]_[A-Za-z0-9_]{36,255}/g, () => {
    maskedCount++;
    detectedTypes.add("GitHub Token");
    return "[REDACTED_GITHUB_TOKEN]";
  });

  // 5. JWT Tokens (eyJhbGciOi...)
  result = result.replace(/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, () => {
    maskedCount++;
    detectedTypes.add("JWT Token");
    return "[REDACTED_JWT_TOKEN]";
  });

  // 6. Veritabanı Bağlantı Dizgeleri (postgres://user:pass@host:port/db)
  result = result.replace(/(postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/([^:]+):([^@]+)@([^/:]+)(?::(\d+))?\/([^ \n\r\t"'`]+)/gi, (_match, protocol, _user, _pass, host, port, db) => {
    maskedCount++;
    detectedTypes.add("Database Connection String");
    return `${protocol}://[REDACTED_USER]:[REDACTED_PASSWORD]@${host}${port ? `:${port}` : ""}/${db}`;
  });

  // 7. RSA / Private Key Blokları
  result = result.replace(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----/g, () => {
    maskedCount++;
    detectedTypes.add("Private Key Block");
    return "-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY]\n-----END PRIVATE KEY-----";
  });

  // 8. E-Posta Adresleri (İsteğe bağlı veya hassas iletişim)
  result = result.replace(/\b[A-Za-z0-9._%+-]+@(?!example\.com|test\.com)[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, () => {
    maskedCount++;
    detectedTypes.add("E-Mail Address");
    return "[REDACTED_EMAIL]";
  });

  return {
    sanitizedText: result,
    maskedCount,
    detectedTypes: Array.from(detectedTypes),
  };
}

