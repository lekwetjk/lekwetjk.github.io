"use client";

import { useEffect } from "react";

const ACTIVITY_INTERVAL_MS = 5 * 60 * 1000;

export default function MemberActivityTracker() {
  useEffect(() => {
    let lastSentAt = 0;
    let pending = false;
    let unauthorized = false;

    const sendActivity = async (final = false) => {
      if (pending || unauthorized || (!final && document.visibilityState !== "visible")) return;
      const now = Date.now();
      if (!final && now - lastSentAt < ACTIVITY_INTERVAL_MS) return;
      pending = true;
      try {
        const response = await fetch("/api/member/activity", { method: "POST", keepalive: true });
        if (response.status === 401) {
          unauthorized = true;
          return;
        }
        if (!response.ok) throw new Error(`Zapis aktywności: HTTP ${response.status}`);
        lastSentAt = now;
      } catch (error) {
        console.error("Nie udało się zapisać aktywności sesji.", error);
      } finally {
        pending = false;
      }
    };
    const onActivity = () => { void sendActivity(); };
    const onVisibilityChange = () => { void sendActivity(document.visibilityState === "hidden"); };
    const onPageHide = () => { void sendActivity(true); };

    onActivity();
    const interval = window.setInterval(onActivity, ACTIVITY_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onActivity);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
