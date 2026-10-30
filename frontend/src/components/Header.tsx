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
} from "@mui/material";

export type PersonaMode = "qa" | "developer";

interface HeaderProps {
  backendStatus: "checking" | "connected" | "disconnected";
  dbStatus?: string;
  onRetry?: () => void;
  activePersona?: PersonaMode;
  onPersonaChange?: (persona: PersonaMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendStatus,
  dbStatus,
  onRetry,
  activePersona = "qa",
  onPersonaChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Genel sistem sağlık durumu belirleme
  let statusColor = "#10b981"; // varsayılan yeşil
  let statusBg = "rgba(16, 185, 129, 0.15)";
  let statusBorder = "rgba(16, 185, 129, 0.4)";

  const isEngineDown = backendStatus === "disconnected";
  const isEngineChecking = backendStatus === "checking";
  const isDbFallbackOrDown = dbStatus === "in-memory-fallback" || !dbStatus;

  if (isEngineDown || (backendStatus === "connected" && isDbFallbackOrDown)) {
    statusColor = "#ef4444";
    statusBg = "rgba(239, 68, 68, 0.15)";
    statusBorder = "rgba(239, 68, 68, 0.4)";
  } else if (isEngineChecking) {
    statusColor = "#f59e0b";
    statusBg = "rgba(245, 158, 11, 0.15)";
    statusBorder = "rgba(245, 158, 11, 0.4)";
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
          <span>{isQa ? "🧪" : "💻"}</span> AI Test Adımları & Değişiklik Analiz Motoru
          <Chip
            size="small"
            label={isQa ? "QA Modu" : "Developer Modu"}
            sx={{
              ml: 1,
              fontWeight: 700,
              fontSize: "0.7rem",
              background: isQa ? "rgba(6, 182, 212, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isQa ? "#38bdf8" : "#34d399",
              border: isQa ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
            }}
          />
        </Typography>

        {/* Sağ Üst Alan: QA / Developer Seçicisi ve Info İkonu */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Persona / Rol Seçim Butonları (QA & Developer) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 0.4,
              borderRadius: 2.5,
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.4)",
            }}
          >
            <Tooltip title="QA (Kalite Güvence) Bakış Açısı: Kullanıcı deneyimi, sınır değerler, güvenlik ve negatif test odaklı analiz">
              <Button
                size="small"
                onClick={() => onPersonaChange?.("qa")}
                sx={{
                  px: 1.6,
                  py: 0.45,
                  minWidth: "auto",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  transition: "all 0.2s ease-in-out",
                  ...(activePersona === "qa"
                    ? {
                        background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                        color: "#ffffff",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.45)",
                      }
                    : {
                        color: "#94a3b8",
                        "&:hover": {
                          color: "#f1f5f9",
                          background: "rgba(255, 255, 255, 0.05)",
                        },
                      }),
                }}
              >
                🧪 QA
              </Button>
            </Tooltip>

            <Tooltip title="Developer (Geliştirici) Bakış Açısı: Kod mimarisi, exception'lar, unit testler ve refactor odaklı analiz">
              <Button
                size="small"
                onClick={() => onPersonaChange?.("developer")}
                sx={{
                  px: 1.6,
                  py: 0.45,
                  minWidth: "auto",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  transition: "all 0.2s ease-in-out",
                  ...(activePersona === "developer"
                    ? {
                        background: "linear-gradient(90deg, #10b981, #06b6d4)",
                        color: "#ffffff",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.45)",
                      }
                    : {
                        color: "#94a3b8",
                        "&:hover": {
                          color: "#f1f5f9",
                          background: "rgba(255, 255, 255, 0.05)",
                        },
                      }),
                }}
              >
                💻 Developer
              </Button>
            </Tooltip>
          </Box>

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
                  {backendStatus === "connected" && dbStatus ? (
                    <Chip
                      label={dbStatus === "connected" ? "DB: PostgreSQL" : "DB: In-Memory Fallback"}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: dbStatus === "connected" ? "#10b981" : "#ef4444",
                        color: dbStatus === "connected" ? "#34d399" : "#f87171",
                        backgroundColor: dbStatus === "connected" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />
                  ) : (
                    <Chip
                      label={backendStatus === "checking" ? "DB: Bağlanıyor..." : "DB: Bağlantı Yok"}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: backendStatus === "checking" ? "#f59e0b" : "#ef4444",
                        color: backendStatus === "checking" ? "#fbbf24" : "#f87171",
                        backgroundColor: backendStatus === "checking" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
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
                        ? "Motor: Aktif"
                        : backendStatus === "checking"
                        ? "Motor Başlatılıyor..."
                        : "Motor: Bağlantı Yok"
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
                          : "#ef4444",
                      color:
                        backendStatus === "connected"
                          ? "#34d399"
                          : backendStatus === "checking"
                          ? "#fbbf24"
                          : "#f87171",
                      backgroundColor:
                        backendStatus === "connected"
                          ? "rgba(16, 185, 129, 0.1)"
                          : backendStatus === "checking"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                    }}
                  />
                </Box>

                {/* Yeniden Dene Butonu (Sorun varsa) */}
                {backendStatus !== "connected" && onRetry && (
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      onRetry();
                    }}
                    sx={{
                      mt: 1,
                      textTransform: "none",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      borderColor: "rgba(56, 189, 248, 0.3)",
                      "&:hover": {
                        borderColor: "#38bdf8",
                        background: "rgba(56, 189, 248, 0.08)",
                      },
                    }}
                  >
                    🔄 Yeniden Bağlanmayı Dene
                  </Button>
                )}
              </Stack>
            </Popover>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
