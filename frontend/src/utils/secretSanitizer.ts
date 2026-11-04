/**
 * İstemci Tarafı Hassas Veri (Secrets & PII) Güvenlik Filtresi
 */

export interface ClientSanitizeResult {
  sanitizedText: string;
  maskedCount: number;
  detectedTypes: string[];
}

export function sanitizeClientSensitiveData(text: string): ClientSanitizeResult {
  if (!text) {
    return { sanitizedText: "", maskedCount: 0, detectedTypes: [] };
  }

  let result = text;
  let maskedCount = 0;
  const detectedTypes = new Set<string>();

  // OpenAI Keys
  result = result.replace(/sk-[a-zA-Z0-9_-]{20,}/g, () => {
    maskedCount++;
    detectedTypes.add("OpenAI Key");
    return "[REDACTED_OPENAI_KEY]";
  });

  // Google API Keys
  result = result.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, () => {
    maskedCount++;
    detectedTypes.add("Google API Key");
    return "[REDACTED_GOOGLE_KEY]";
  });

  // AWS Access Key
  result = result.replace(/(?:AKIA|ASIA)[A-Z0-9]{16}/g, () => {
    maskedCount++;
    detectedTypes.add("AWS Key");
    return "[REDACTED_AWS_KEY]";
  });

  // GitHub Tokens
  result = result.replace(/gh[pousr]_[A-Za-z0-9_]{36,255}/g, () => {
    maskedCount++;
    detectedTypes.add("GitHub Token");
    return "[REDACTED_GITHUB_TOKEN]";
  });

  // JWT Tokens
  result = result.replace(/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, () => {
    maskedCount++;
    detectedTypes.add("JWT Token");
    return "[REDACTED_JWT_TOKEN]";
  });

  // Connection Strings
  result = result.replace(/(postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/([^:]+):([^@]+)@([^/:]+)(?::(\d+))?\/([^ \n\r\t"'`]+)/gi, (_match, protocol, _user, _pass, host, port, db) => {
    maskedCount++;
    detectedTypes.add("DB Connection String");
    return `${protocol}://[REDACTED_USER]:[REDACTED_PASS]@${host}${port ? `:${port}` : ""}/${db}`;
  });

  // Private Keys
  result = result.replace(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----/g, () => {
    maskedCount++;
    detectedTypes.add("Private Key");
    return "-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY]\n-----END PRIVATE KEY-----";
  });

  return {
    sanitizedText: result,
    maskedCount,
    detectedTypes: Array.from(detectedTypes),
  };
}

