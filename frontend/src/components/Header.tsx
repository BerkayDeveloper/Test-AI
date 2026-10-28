import React from "react";
import { AppBar, Toolbar, Typography, Chip, Stack } from "@mui/material";

interface HeaderProps {
  backendStatus: "checking" | "connected" | "disconnected";
  dbStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ backendStatus, dbStatus }) => {
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
          {dbStatus && (
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
          )}

          <Chip
            label={
              backendStatus === "connected"
                ? "Motor: Aktif"
                : backendStatus === "checking"
                ? "Bağlanıyor..."
                : "Motor: Bağlantı Yok"
            }
            color={backendStatus === "connected" ? "success" : backendStatus === "checking" ? "warning" : "error"}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
