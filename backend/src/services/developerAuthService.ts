import { config } from "../config";

export const developerAuthService = {
  getSystemStatus(_sessionId?: string) {
    return {
      isDeveloper: true,
      developerModeEnabled: config.developerModeEnabled,
      isPasswordSet: true,
      attemptsRemaining: 10,
      isLocked: false,
      lockRemainingSeconds: 0,
      cooldownRemainingSeconds: 0,
      emailAuthRequired: false,
    };
  },

  verifySession(_sessionId?: string) {
    return { valid: true, error: null };
  },

  logout(_sessionId?: string) {
    return { success: true };
  },
};
