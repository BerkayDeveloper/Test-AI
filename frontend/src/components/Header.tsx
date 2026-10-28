import React from "react";
import { AppBar, Toolbar, Typography, Chip, Stack, CircularProgress } from "@mui/material";

interface HeaderProps {
  backendStatus: "checking" | "connected" | "disconnected";
  dbStatus?: string;
  onRetry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ backendStatus, dbStatus, onRetry }) => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.5px",
            background: "linear-gradient(90deg, #818cf8, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span>🎯</span> AI Test Adımları & Değişiklik Analiz Motoru
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Veritabanı Durumu Rozeti */}
          {backendStatus === "connected" && dbStatus ? (
            <Chip
              label={dbStatus === "connected" ? "DB: PostgreSQL" : "DB: In-Memory Fallback"}
              size="small"
              variant="outlined"
              sx={{
                borderColor: dbStatus === "connected" ? "#10b981" : "#f59e0b",
                color: dbStatus === "connected" ? "#34d399" : "#fbbf24",
                fontWeight: 600,
              }}
            />
          ) : backendStatus === "checking" ? (
            <Chip
              label="DB: Bağlanıyor..."
              size="small"
              variant="outlined"
              sx={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#94a3b8",
                fontSize: "0.74rem",
              }}
            />
          ) : null}

          {/* Motor / API Durumu Rozeti */}
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
                : "Motor: Bağlantı Bekleniyor"
            }
            color={
              backendStatus === "connected"
                ? "success"
                : backendStatus === "checking"
                ? "warning"
                : "error"
            }
            size="small"
            variant="outlined"
            onClick={backendStatus !== "connected" ? onRetry : undefined}
            sx={{
              fontWeight: 700,
              cursor: backendStatus !== "connected" ? "pointer" : "default",
            }}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
