import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Stack,
  Box,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  LinearProgress,
} from "@mui/material";
import { api } from "../services/api";

interface DeveloperAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthStep = "request_code" | "verify_code" | "setup_password" | "enter_password" | "success";

export const DeveloperAuthModal: React.FC<DeveloperAuthModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<AuthStep>("request_code");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Doğrulama aşaması token'ı (Backend tarafından üretilir)
  const [verificationToken, setVerificationToken] = useState("");

  // Durumlar
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Zamanlayıcılar (5 dk kod süresi, 60 sn resend bekleme)
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Modal açıldığında state'i sıfırla
  useEffect(() => {
    if (open) {
      setStep("request_code");
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setResendCooldown(0);
      setCodeExpiresIn(300);
    }
  }, [open]);

  // Kod geçerlilik geri sayımı (5 dakika)
  useEffect(() => {
    if (step === "verify_code" && codeExpiresIn > 0) {
      const timer = setInterval(() => {
        setCodeExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, codeExpiresIn]);

  // Yeniden gönder bekleme süresi (60 saniye)
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Format mm:ss
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // 1. ADIM: Doğrulama Kodu İste (Backend Environment Variables adresine gönderir)
  const handleRequestCode = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.requestDeveloperCode();
      setSuccessMsg(res.message || "8 haneli doğrulama kodu yetkili e-posta adresine gönderildi.");
      if (res.devCode) {
        setCode(res.devCode);
      }
      setCodeExpiresIn(res.expiresInSeconds || 300);
      setResendCooldown(60);
      setStep("verify_code");
    } catch (err: any) {
      setErrorMsg(err.message || "Kod gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  // 2. ADIM: 8 Haneli Kodu Doğrula
  const handleVerifyCode = async () => {
    const cleanCode = code.replace(/\s+/g, "").trim();
    if (cleanCode.length !== 8) {
      setErrorMsg("Lütfen 8 haneli doğrulama kodunu eksiksiz girin.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.verifyDeveloperCode(cleanCode);
      setVerificationToken(res.verificationToken);

      if (res.isPasswordSet) {
        // Önceden şifre belirlenmiş -> Şifre giriş ekranı
        setStep("enter_password");
        setSuccessMsg("✓ Doğrulama kodu onaylandı. Lütfen Developer Mode şifrenizi girin.");
      } else {
        // İlk kurulum -> Şifre oluşturma ekranı
        setStep("setup_password");
        setSuccessMsg("✓ Doğrulama kodu onaylandı. Lütfen ilk kurulum için en az 12 karakterlik şifre belirleyin.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Kod doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  // 3. ADIM (İlk Kurulum): Şifre Oluşturma
  const handleSetupPassword = async () => {
    if (password.length < 12) {
      setErrorMsg("Şifre en az 12 karakter uzunluğunda olmalıdır.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      await api.setupDeveloperPassword(verificationToken, password);
      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || "Şifre oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  // 4. ADIM (Sonraki Girişler): Şifre ile Giriş
  const handleLoginWithPassword = async () => {
    if (!password) {
      setErrorMsg("Lütfen Developer Mode şifrenizi girin.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      await api.loginDeveloper(verificationToken, password);
      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || "Şifre doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "#0b1120",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)",
          borderRadius: 3.5,
          color: "#f8fafc",
          p: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.35))",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🛡️
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
                Developer Mode Authentication
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                Developer Mode erişimi için kimlik doğrulaması gereklidir.
              </Typography>
            </Box>
          </Stack>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{ color: "#64748b", "&:hover": { color: "#f1f5f9" } }}
        >
          ✕
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Hata Bildirimi */}
        {errorMsg && (
          <Alert
            severity="error"
            sx={{
              mb: 2.5,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#fca5a5",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            {errorMsg}
          </Alert>
        )}

        {/* Bilgi / Başarı Bildirimi */}
        {successMsg && step !== "success" && (
          <Alert
            severity="info"
            sx={{
              mb: 2.5,
              background: "rgba(56, 189, 248, 0.12)",
              color: "#bae6fd",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              fontSize: "0.83rem",
            }}
          >
            {successMsg}
          </Alert>
        )}

        {/* EKRAN 1: Doğrulama Kodu İsteme (Özel Yönetici Koruması) */}
        {step === "request_code" && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography variant="body2" sx={{ color: "#cbd5e1", lineHeight: 1.6, mb: 1.5 }}>
                Developer Mode erişimi özel güvenlik protokolüyle korunmaktadır.
                İşlemi başlattığınızda, sistem sunucusunda tanımlı <b>yetkili yönetici e-posta adresine</b> 8 haneli tek kullanımlık güvenlik kodu otomatik olarak gönderilecektir.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  label="🔒 Private Admin Yapılandırması"
                  size="small"
                  sx={{
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    fontWeight: 700,
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                  }}
                />
                <Chip
                  label="🛡️ 2 Faktörlü Kimlik Doğrulama (2FA)"
                  size="small"
                  sx={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    fontWeight: 700,
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                  }}
                />
              </Stack>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleRequestCode}
              disabled={loading}
              sx={{
                py: 1.4,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.98rem",
                borderRadius: 2,
                background: "linear-gradient(90deg, #0284c7, #6366f1)",
                boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)",
                "&:hover": {
                  background: "linear-gradient(90deg, #0369a1, #4f46e5)",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "🚀 E-posta Doğrulama Kodu Gönder"}
            </Button>
          </Stack>
        )}

        {/* EKRAN 2: 8 Haneli E-posta Doğrulama Kodu Girişi */}
        {step === "verify_code" && (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center", py: 1 }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Güvenlik kodunuz yetkili yönetici e-posta adresine gönderildi.
              </Typography>

              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 1.5 }}>
                <Chip
                  label={`⏱ Kod Geçerliliği: ${formatTimer(codeExpiresIn)}`}
                  size="small"
                  color={codeExpiresIn < 60 ? "error" : "primary"}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label="Maksimum 5 Deneme"
                  size="small"
                  sx={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1", fontSize: "0.75rem" }}
                />
              </Stack>
            </Box>

            <TextField
              fullWidth
              autoFocus
              label="8 Haneli Güvenlik Kodu"
              placeholder="Örn: 84920153"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                setCode(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === 8) handleVerifyCode();
              }}
              inputProps={{
                maxLength: 8,
                style: {
                  textAlign: "center",
                  fontSize: "1.6rem",
                  letterSpacing: "6px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: "#38bdf8",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "rgba(15, 23, 42, 0.95)",
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 8 || codeExpiresIn === 0}
              sx={{
                py: 1.3,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.95rem",
                borderRadius: 2,
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "✓ Kodu Doğrula ve Devam Et"}
            </Button>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                size="small"
                onClick={() => setStep("request_code")}
                sx={{ textTransform: "none", color: "#94a3b8" }}
              >
                ← Başa Dön
              </Button>

              <Button
                size="small"
                onClick={handleRequestCode}
                disabled={resendCooldown > 0 || loading}
                sx={{ textTransform: "none", color: resendCooldown > 0 ? "#64748b" : "#38bdf8", fontWeight: 700 }}
              >
                {resendCooldown > 0 ? `Yeniden Gönder (${resendCooldown}s)` : "🔄 Kodu Yeniden Gönder"}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* EKRAN 3: İlk Kurulum Şifre Oluşturma */}
        {step === "setup_password" && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#a5b4fc", mb: 0.5 }}>
                🔑 Developer Mode Şifresi Oluşturun (İlk Kurulum)
              </Typography>
              <Typography variant="caption" sx={{ color: "#cbd5e1", lineHeight: 1.5, display: "block" }}>
                Bu şifre sonraki girişlerinizde 2 faktörlü doğrulama (2FA) olarak kullanılacaktır.
                Şifreniz sunucuda <b>bcrypt</b> algoritmasıyla hash'lenerek saklanır ve asla düz metin olarak kaydedilmez.
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              type={showPassword ? "text" : "password"}
              label="Developer Mode Şifresi (En az 12 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={`${password.length}/12 Karakter ${password.length >= 12 ? "✓ Geçerli Uzunluk" : "⚠️ En az 12 karakter olmalıdır"}`}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: "#94a3b8" }}>
                      {showPassword ? "🙈" : "👁️"}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              size="small"
              type={showPassword ? "text" : "password"}
              label="Şifreyi Tekrar Girin"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              helperText={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? "❌ Şifreler uyuşmuyor"
                  : confirmPassword.length > 0 && password === confirmPassword
                  ? "✓ Şifreler eşleşti"
                  : ""
              }
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSetupPassword}
              disabled={loading || password.length < 12 || password !== confirmPassword}
              sx={{
                py: 1.3,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.95rem",
                borderRadius: 2,
                background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "💾 Şifreyi Kaydet ve Giriş Yap"}
            </Button>
          </Stack>
        )}

        {/* EKRAN 4: Sonraki Girişlerde Şifre Girişi */}
        {step === "enter_password" && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34d399", mb: 0.5 }}>
                ✓ E-posta Kodu Doğrulandı
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                Developer Mode erişimini tamamlamak için lütfen daha önce belirlediğiniz Developer Mode şifrenizi girin.
              </Typography>
            </Box>

            <TextField
              fullWidth
              autoFocus
              size="small"
              type={showPassword ? "text" : "password"}
              label="Developer Mode Şifresi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) handleLoginWithPassword();
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: "#94a3b8" }}>
                      {showPassword ? "🙈" : "👁️"}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleLoginWithPassword}
              disabled={loading || !password}
              sx={{
                py: 1.3,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.95rem",
                borderRadius: 2,
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "🔓 Giriş Yap ve Aktifleştir"}
            </Button>
          </Stack>
        )}

        {/* EKRAN 5: Başarılı Doğrulama */}
        {step === "success" && (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3))",
                border: "2px solid #34d399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                mx: "auto",
                mb: 2,
                boxShadow: "0 0 25px rgba(52, 211, 153, 0.5)",
              }}
            >
              ✅
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#34d399" }}>
              Developer Mode Aktif!
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
              Kimliğiniz başarıyla doğrulandı. Güvenli oturumunuz 4 saat geçerlidir.
            </Typography>
            <LinearProgress sx={{ mt: 3, borderRadius: 2, height: 6 }} color="success" />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
