import { useState, useEffect, useRef, useCallback } from "react";

export interface DraftData {
  title: string;
  category: string;
  previousContent: string;
  newContent: string;
  savedAt?: string;
  persona?: "qa" | "developer";
}

const getStorageKey = (persona: "qa" | "developer") => `active_draft_change_analysis_${persona}_v2`;
const AUTO_SAVE_OWNER_KEY = "active_draft_auto_save_owner_persona";

function hasDraftContent(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return (
      Boolean(parsed.title?.trim()) ||
      Boolean(parsed.previousContent?.trim()) ||
      Boolean(parsed.newContent?.trim())
    );
  } catch {
    return false;
  }
}

export function getAutoSaveOwner(): "qa" | "developer" | null {
  try {
    const rawOwner = localStorage.getItem(AUTO_SAVE_OWNER_KEY);
    if (rawOwner === "qa" || rawOwner === "developer") {
      const rawDraft = localStorage.getItem(getStorageKey(rawOwner));
      if (hasDraftContent(rawDraft)) {
        return rawOwner;
      }
    }

    const qaHas = hasDraftContent(localStorage.getItem(getStorageKey("qa")));
    const devHas = hasDraftContent(localStorage.getItem(getStorageKey("developer")));

    if (qaHas && !devHas) {
      localStorage.setItem(AUTO_SAVE_OWNER_KEY, "qa");
      return "qa";
    }
    if (devHas && !qaHas) {
      localStorage.setItem(AUTO_SAVE_OWNER_KEY, "developer");
      return "developer";
    }
    if (qaHas && devHas) {
      // Çift taslak varsa yalnızca birini koru (QA öncelikli)
      localStorage.removeItem(getStorageKey("developer"));
      localStorage.setItem(AUTO_SAVE_OWNER_KEY, "qa");
      return "qa";
    }

    return null;
  } catch {
    return null;
  }
}

interface UseAutoSaveDraftOptions {
  persona?: "qa" | "developer";
  onManualSave?: (timestamp: string) => void;
  onAutoSave?: (timestamp: string) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useAutoSaveDraft(
  currentData: DraftData,
  options?: UseAutoSaveDraftOptions
) {
  const persona = options?.persona || "qa";
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [autoSaveOwner, setAutoSaveOwner] = useState<"qa" | "developer" | null>(() => getAutoSaveOwner());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Reference to always have latest data in event listeners
  const dataRef = useRef<DraftData>(currentData);
  dataRef.current = currentData;

  const currentPersonaRef = useRef<"qa" | "developer">(persona);
  currentPersonaRef.current = persona;

  // Başka bir modda Otomatik Veri Koruma çalışıyorsa aktif persona için kapalı olmalıdır
  const isAutoSaveActive = autoSaveOwner === null ? true : autoSaveOwner === persona;
  // Otomatik Veri Koruma alanı sadece sahibi olan modda veya henüz hiçbir mod koruma başlatmamışken görünmelidir
  const showAutoSaveArea = autoSaveOwner === null ? true : autoSaveOwner === persona;

  const isAutoSaveActiveRef = useRef(isAutoSaveActive);
  isAutoSaveActiveRef.current = isAutoSaveActive;

  // Persona değiştiğinde veya owner güncellendiğinde lastSaved ve draft durumunu senkronize et
  useEffect(() => {
    const owner = getAutoSaveOwner();
    setAutoSaveOwner(owner);

    if (owner === persona) {
      const raw = localStorage.getItem(getStorageKey(persona));
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.savedAt) {
            setLastSaved(parsed.savedAt);
            setDraftRestored(true);
            return;
          }
        } catch {}
      }
    }
    setLastSaved(null);
    setDraftRestored(false);
  }, [persona]);

  const saveToStorage = useCallback(
    (data: DraftData, isManual = false) => {
      const currentPersona = currentPersonaRef.current;
      const currentOwner = getAutoSaveOwner();

      // Başka bir modda Otomatik Veri Koruma çalışıyorsa diğer modlarda KESİNLİKLE çalışmamalı
      if (currentOwner !== null && currentOwner !== currentPersona) {
        return false;
      }

      const hasContent =
        Boolean(data.title?.trim()) ||
        Boolean(data.previousContent?.trim()) ||
        Boolean(data.newContent?.trim());

      if (!hasContent) {
        return false;
      }

      const timestamp = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const payload: DraftData = {
        title: data.title || "",
        category: data.category || "none",
        previousContent: data.previousContent || "",
        newContent: data.newContent || "",
        savedAt: timestamp,
        persona: currentPersona,
      };

      try {
        localStorage.setItem(AUTO_SAVE_OWNER_KEY, currentPersona);
        localStorage.setItem(getStorageKey(currentPersona), JSON.stringify(payload));
        setAutoSaveOwner(currentPersona);
        setLastSaved(timestamp);
        setDraftRestored(true);

        if (isManual) {
          options?.onManualSave?.(timestamp);
        } else {
          options?.onAutoSave?.(timestamp);
        }
        return true;
      } catch (err) {
        console.error("Taslak kaydedilirken hata oluştu:", err);
        return false;
      }
    },
    [options]
  );

  const clearDraft = useCallback((targetPersona?: "qa" | "developer") => {
    try {
      const p = targetPersona || currentPersonaRef.current;
      localStorage.removeItem(getStorageKey(p));

      const recordedOwner = localStorage.getItem(AUTO_SAVE_OWNER_KEY);
      if (recordedOwner === p) {
        localStorage.removeItem(AUTO_SAVE_OWNER_KEY);
      }

      const newOwner = getAutoSaveOwner();
      setAutoSaveOwner(newOwner);
      setLastSaved(null);
      setDraftRestored(false);
    } catch (err) {
      console.error("Taslak silinirken hata:", err);
    }
  }, []);

  // 1. Initial Load: Check for saved draft on mount
  const getInitialDraft = useCallback((targetPersona?: "qa" | "developer"): DraftData | null => {
    try {
      const p = targetPersona || currentPersonaRef.current;
      const owner = getAutoSaveOwner();

      // Eğer başka bir mod koruma sahibi ise bu mod taslak yüklememeli ve çalışmamalıdır
      if (owner !== null && owner !== p) {
        return null;
      }

      const raw = localStorage.getItem(getStorageKey(p));
      if (!raw) return null;
      const parsed: DraftData = JSON.parse(raw);
      const hasContent =
        Boolean(parsed.title?.trim()) ||
        Boolean(parsed.previousContent?.trim()) ||
        Boolean(parsed.newContent?.trim());

      if (hasContent) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Kullanıcı aktif modda veri girmeye başladığı an owner olarak bu modu belirle
  const hasCurrentContent =
    Boolean(currentData.title?.trim()) ||
    Boolean(currentData.previousContent?.trim()) ||
    Boolean(currentData.newContent?.trim());

  useEffect(() => {
    const currentOwner = getAutoSaveOwner();
    if (currentOwner === null && hasCurrentContent) {
      try {
        localStorage.setItem(AUTO_SAVE_OWNER_KEY, persona);
        setAutoSaveOwner(persona);
      } catch {}
    }
  }, [hasCurrentContent, persona]);

  // 2. Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        // Eğer bu modda Otomatik Veri Koruma aktif değilse işlem yapma
        if (!isAutoSaveActiveRef.current) return;
        e.preventDefault();
        saveToStorage(dataRef.current, true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveToStorage]);

  // 3. Tab close, refresh, visibility change protection
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isAutoSaveActiveRef.current) return;
      saveToStorage(dataRef.current, false);
    };

    const handleVisibilityChange = () => {
      if (!isAutoSaveActiveRef.current) return;
      if (document.visibilityState === "hidden") {
        saveToStorage(dataRef.current, false);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveToStorage]);

  // 4. Online / Offline network listeners
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      if (isAutoSaveActiveRef.current) {
        saveToStorage(dataRef.current, false);
        options?.onOffline?.();
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      if (isAutoSaveActiveRef.current) {
        options?.onOnline?.();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [saveToStorage, options]);

  // 5. Debounced auto-save when user types
  useEffect(() => {
    if (!isAutoSaveActive) return;

    const hasContent =
      Boolean(currentData.title.trim()) ||
      Boolean(currentData.previousContent.trim()) ||
      Boolean(currentData.newContent.trim());

    if (!hasContent) return;

    const timer = setTimeout(() => {
      saveToStorage(currentData, false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    currentData.title,
    currentData.category,
    currentData.previousContent,
    currentData.newContent,
    isAutoSaveActive,
    saveToStorage,
  ]);

  return {
    isOffline,
    lastSaved,
    draftRestored,
    setDraftRestored,
    saveDraft: () => saveToStorage(dataRef.current, true),
    clearDraft,
    getInitialDraft,
    autoSaveOwner,
    isAutoSaveActive,
    showAutoSaveArea,
  };
}
