import React, { useMemo } from "react";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldCode, newCode }) => {
  const { lines, addedCount, removedCount } = useMemo(() => {
    const oldLines = oldCode.split(/\r?\n/);
    const newLines = newCode.split(/\r?\n/);

    const diffLines: DiffLine[] = [];
    let added = 0;
    let removed = 0;

    // Basit ve güvenilir LCS/Line comparison
    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diffLines.push({
          type: "unchanged",
          text: oldLines[i],
          oldLineNumber: i + 1,
          newLineNumber: j + 1,
        });
        i++;
        j++;
      } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
        diffLines.push({
          type: "added",
          text: newLines[j],
          newLineNumber: j + 1,
        });
        added++;
        j++;
      } else if (i < oldLines.length) {
        diffLines.push({
          type: "removed",
          text: oldLines[i],
          oldLineNumber: i + 1,
        });
        removed++;
        i++;
      }
    }

    return { lines: diffLines, addedCount: added, removedCount: removed };
  }, [oldCode, newCode]);

  if (!oldCode.trim() && !newCode.trim()) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#94a3b8", display: "flex", alignItems: "center", gap: 1 }}>
          🔍 KOD DEĞİŞİKLİK FARKI (SEMANTIC DIFF VIEWER):
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            label={`+${addedCount} Eklendi`}
            sx={{ backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontWeight: 700 }}
          />
          <Chip
            size="small"
            label={`-${removedCount} Silindi`}
            sx={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontWeight: 700 }}
          />
        </Stack>
      </Stack>

      <Paper
        sx={{
          maxHeight: 280,
          overflowY: "auto",
          background: "#050811",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 2,
          p: 1,
          fontFamily: "monospace",
          fontSize: "0.80rem",
        }}
      >
        {lines.map((l, index) => {
          let bg = "transparent";
          let color = "#cbd5e1";
          let prefix = " ";

          if (l.type === "added") {
            bg = "rgba(16, 185, 129, 0.15)";
            color = "#a7f3d0";
            prefix = "+";
          } else if (l.type === "removed") {
            bg = "rgba(239, 68, 68, 0.15)";
            color = "#fca5a5";
            prefix = "-";
          }

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                gap: 1.5,
                background: bg,
                px: 1,
                py: 0.2,
                borderRadius: 0.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <Typography
                component="span"
                sx={{
                  color: "#64748b",
                  width: 32,
                  textAlign: "right",
                  userSelect: "none",
                  fontSize: "0.74rem",
                }}
              >
                {l.newLineNumber ?? l.oldLineNumber ?? ""}
              </Typography>
              <Typography
                component="span"
                sx={{
                  color: l.type === "added" ? "#10b981" : l.type === "removed" ? "#ef4444" : "#64748b",
                  fontWeight: 800,
                  width: 14,
                  userSelect: "none",
                }}
              >
                {prefix}
              </Typography>
              <Typography component="span" sx={{ color, fontFamily: "inherit", fontSize: "inherit", flex: 1 }}>
                {l.text || " "}
              </Typography>
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};
