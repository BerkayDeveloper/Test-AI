import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Chip,
  Stack,
  IconButton,
  Popover,
  Box,
  Divider,
  Button,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";

export type PersonaMode = "qa" | "developer";

interface HeaderProps {
  backendStatus: "checking" | "connected" | "disconnected";
  dbStatus?: string;
  onRetry?: () => void;
  activePersona?: PersonaMode;
  onPersonaChange?: (persona: PersonaMode) => void;
  isAdmin?: boolean;
  onToggleAdmin?: (status: boolean) => void;
  adminDialogOpen?: boolean;
  setAdminDialogOpen?: (open: boolean) => void;
  isDeveloperAuth?: boolean;
  onDeveloperLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendStatus,
  dbStatus,
  onRetry,
  activePersona = "qa",
  onPersonaChange,
  isAdmin = false,
  onToggleAdmin,
  adminDialogOpen = false,
  setAdminDialogOpen,
  isDeveloperAuth = false,
  onDeveloperLogout,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Admin Modal Şifre ve Hata Durumu
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleOpenAdminModal = () => {
    setAdminPassword("");
    setAdminError(null);
    setAdminDialogOpen?.(true);
  };

  const handleCloseAdminModal = () => {
    setAdminDialogOpen?.(false);
    setAdminPassword("");
    setAdminError(null);
  };

  const handleAdminLogin = () => {
    const trimmed = adminPassword.trim();
    // Desteklenen varsayılan şifreler: admin, admin123, 1234 veya boş geçiş
    if (!trimmed || trimmed === "admin" || trimmed === "admin123" || trimmed === "1234") {
      onToggleAdmin?.(true);
      handleCloseAdminModal();
    } else {
      setAdminError("Geçersiz şifre! (Varsayılan şifre: admin)");
    }
  };

  const handleAdminLogout = () => {
    onToggleAdmin?.(false);
    handleCloseAdminModal();
  };

  // Genel sistem sağlık durumu belirleme
  let statusColor = "#10b981"; // varsayılan yeşil
  let statusBg = "rgba(16, 185, 129, 0.15)";
  let statusBorder = "rgba(16, 185, 129, 0.4)";

  const isEngineDown = backendStatus === "disconnected";
  const isEngineChecking = backendStatus === "checking";
  const isDbConnected = dbStatus === "connected";
  const isDbDiskFallback =
    dbStatus === "in-memory-fallback" ||
    dbStatus === "disk-fallback" ||
    dbStatus === "disk-storage";

  if (isEngineDown) {
    statusColor = "#ef4444";
    statusBg = "rgba(239, 68, 68, 0.15)";
    statusBorder = "rgba(239, 68, 68, 0.4)";
  } else if (isEngineChecking) {
    statusColor = "#f59e0b";
    statusBg = "rgba(245, 158, 11, 0.15)";
    statusBorder = "rgba(245, 158, 11, 0.4)";
  } else if (isDbDiskFallback || isDbConnected) {
    // Hem PostgreSQL hem Kalıcı Disk Deposu güvenli ve aktiftir
    statusColor = "#10b981";
    statusBg = "rgba(16, 185, 129, 0.15)";
    statusBorder = "rgba(16, 185, 129, 0.4)";
  }

  // Tıklama ile aç / tekrar tıklama ile kapat (toggle)
  const handleToggleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const isQa = activePersona === "qa";

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: isQa
          ? "rgba(8, 20, 36, 0.88)"
          : "rgba(10, 24, 20, 0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: isQa
          ? "1px solid rgba(6, 182, 212, 0.2)"
          : "1px solid rgba(16, 185, 129, 0.2)",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.5px",
            background: isQa
              ? "linear-gradient(90deg, #38bdf8, #818cf8)"
              : "linear-gradient(90deg, #34d399, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span>🧪</span> AI Test Adımları & Değişiklik Analiz Motoru
          <Chip
            size="small"
            label="QA Modu"
            sx={{
              ml: 1,
              fontWeight: 700,
              fontSize: "0.7rem",
              background: "rgba(6, 182, 212, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(6, 182, 212, 0.3)",
            }}
          />
        </Typography>

        {/* Sağ Üst Alan: Admin Butonu ve Info İkonu */}
        <Stack direction="row" spacing={1.5} alignItems="center">

          {/* Yönetici (Admin) Modu Butonu */}
          <Tooltip title={isAdmin ? "👑 Yönetici (Admin) Yetkisi Aktif. Tıklayarak yönetici modundan çıkabilirsiniz." : "🛡️ Yönetici (Admin) Girişi: Saniye saniye video analiz ve sistem dökümlerine erişim sağlar."}>
            <Button
              size="small"
              onClick={handleOpenAdminModal}
              sx={{
                px: 1.4,
                py: 0.5,
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                border: isAdmin ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(255, 255, 255, 0.15)",
                ...(isAdmin
                  ? {
                      background: "linear-gradient(90deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))",
                      color: "#fbbf24",
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(90deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.45))",
                      },
                    }
                  : {
                      background: "rgba(15, 23, 42, 0.7)",
                      color: "#94a3b8",
                      "&:hover": {
                        color: "#f1f5f9",
                        background: "rgba(255, 255, 255, 0.08)",
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                    }),
              }}
            >
              {isAdmin ? "👑 Admin" : "🛡️ Admin Girişi"}
            </Button>
          </Tooltip>

          {/* Sağ Üst Info İkonu */}
          <Box>
            <IconButton
              onClick={handleToggleClick}
              aria-label="Sistem Durumu Bilgisi"
              sx={{
                color: statusColor,
                backgroundColor: statusBg,
                border: `1px solid ${statusBorder}`,
                p: 1,
                transition: "all 0.25s ease-in-out",
                "&:hover": {
                  backgroundColor: statusBg,
                  borderColor: statusColor,
                  transform: "scale(1.05)",
                  boxShadow: `0 0 12px ${statusColor}44`,
                },
              }}
            >
              {isEngineChecking ? (
                <CircularProgress size={20} sx={{ color: statusColor }} />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
            </IconButton>

            {/* Info İkonuna Tıklandığında Açılan Panel */}
            <Popover
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  p: 2,
                  minWidth: 260,
                  background: "rgba(15, 23, 42, 0.96)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 2.5,
                  boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.6)",
                },
              }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                    ⚙️ Sistem Durumu
                  </Typography>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor: statusColor,
                      boxShadow: `0 0 8px ${statusColor}`,
                    }}
                  />
                </Box>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                {/* DB Durumu */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                    Veritabanı:
                  </Typography>
                  {backendStatus === "connected" ? (
                    <Chip
                      label={
                        dbStatus === "connected"
                          ? "DB: PostgreSQL"
                          : "DB: Kalıcı Disk Deposu"
                      }
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: dbStatus === "connected" ? "#10b981" : "#38bdf8",
                        color: dbStatus === "connected" ? "#34d399" : "#38bdf8",
                        backgroundColor: dbStatus === "connected" ? "rgba(16, 185, 129, 0.1)" : "rgba(56, 189, 248, 0.1)",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />
                  ) : backendStatus === "checking" ? (
                    <Chip
                      label="DB: Bağlanıyor..."
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "#f59e0b",
                        color: "#fbbf24",
                        backgroundColor: "rgba(245, 158, 11, 0.1)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    />
                  ) : (
                    <Chip
                      label="DB: Yerel Depo (Aktif)"
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "#38bdf8",
                        color: "#38bdf8",
                        backgroundColor: "rgba(56, 189, 248, 0.1)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    />
                  )}
                </Box>

                {/* Motor Durumu */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                    Analiz Motoru:
                  </Typography>
                  <Chip
                    icon={
                      backendStatus === "checking" ? (
                        <CircularProgress size={12} color="inherit" sx={{ ml: 0.5 }} />
                      ) : undefined
                    }
                    label={
                      backendStatus === "connected"
                        ? "Motor: Aktif (AI)"
                        : backendStatus === "checking"
                        ? "Motor Başlatılıyor..."
                        : "Motor: Yerel Motor (Aktif)"
                    }
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderColor:
                        backendStatus === "connected"
                          ? "#10b981"
                          : backendStatus === "checking"
                          ? "#f59e0b"
                          : "#06b6d4",
                      color:
                        backendStatus === "connected"
                          ? "#34d399"
                          : backendStatus === "checking"
                          ? "#fbbf24"
                          : "#22d3ee",
                      backgroundColor:
                        backendStatus === "connected"
                          ? "rgba(16, 185, 129, 0.1)"
                          : backendStatus === "checking"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(6, 182, 212, 0.1)",
                    }}
                  />
                </Box>

                {/* Yeniden Dene / Sistemleri Bağla Butonu */}
                {onRetry && (
                  <Button
                    size="small"
                    variant={backendStatus === "connected" && dbStatus === "connected" ? "text" : "contained"}
                    fullWidth
                    onClick={() => {
                      onRetry();
                    }}
                    sx={{
                      mt: 1,
                      textTransform: "none",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      ...(backendStatus === "connected" && dbStatus === "connected"
                        ? {
                            color: "#94a3b8",
                            "&:hover": { color: "#38bdf8", background: "rgba(56, 189, 248, 0.08)" },
                          }
                        : {
                            background: "linear-gradient(90deg, #06b6d4, #6366f1)",
                            color: "#ffffff",
                            boxShadow: "0 2px 10px rgba(6, 182, 212, 0.3)",
                            "&:hover": { background: "linear-gradient(90deg, #0891b2, #4f46e5)" },
                          }),
                    }}
                  >
                    🔄 Sistemleri Yeniden Bağla & Onar
                  </Button>
                )}
              </Stack>
            </Popover>
          </Box>
        </Stack>
      </Toolbar>

      {/* Yönetici (Admin) Giriş & Yönetim Modalı */}
      <Dialog
        open={adminDialogOpen}
        onClose={handleCloseAdminModal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: "#0f172a",
            border: isAdmin ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: isAdmin ? "#fbbf24" : "#f8fafc", display: "flex", alignItems: "center", gap: 1 }}>
          <span>👑</span> {isAdmin ? "Yönetici (Admin) Modu Aktif" : "Yönetici (Admin) Girişi"}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {isAdmin ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info" sx={{ background: "rgba(245, 158, 11, 0.12)", color: "#fef3c7", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                Şu anda <b>Yönetici (Admin)</b> yetkisiyle işlem yapmaktasınız. Test planlarında yer alan <b>Saniye Saniye Video & Medya Analiz Bulguları</b> alanı size açıktır.
              </Alert>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Standart kullanıcı deneyimini test etmek veya yönetici yetkisini kaldırmak için aşağıdaki butonu kullanabilirsiniz.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                Test planlarındaki <b>Saniye Saniye Video & Medya Analiz Bulguları</b> dökümü ve gelişmiş inceleme verileri yalnızca yöneticilere açıktır.
              </Typography>
              {adminError && <Alert severity="error">{adminError}</Alert>}
              <TextField
                fullWidth
                size="small"
                type="password"
                label="Admin Şifresi"
                placeholder="Varsayılan: admin"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdminLogin();
                }}
                helperText="İpucu: Varsayılan şifre 'admin' veya doğrudan Giriş Yap butonuna basabilirsiniz."
                autoFocus
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={handleCloseAdminModal} sx={{ color: "#94a3b8", textTransform: "none" }}>
            Kapat
          </Button>
          {isAdmin ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleAdminLogout}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Standart Kullanıcıya Dön (Çıkış)
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleAdminLogin}
              sx={{
                background: "linear-gradient(90deg, #f59e0b, #d97706)",
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { background: "linear-gradient(90deg, #d97706, #b45309)" },
              }}
            >
              Admin Olarak Giriş Yap
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};
