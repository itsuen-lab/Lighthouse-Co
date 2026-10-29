/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase.ts";
import { SiteContent, INITIAL_CONTENT, DEFAULT_NAV_ITEMS } from "../data/content.ts";

export const CONTENT_DOC_PATH = "site_content/main";

export function normalizeContent(raw: any): SiteContent {
  if (!raw || typeof raw !== "object") {
    return INITIAL_CONTENT;
  }

  const base: SiteContent = { ...INITIAL_CONTENT, ...raw };

  // Guarantee non-empty films list
  if (!Array.isArray(base.films) || base.films.length === 0) {
    base.films = INITIAL_CONTENT.films;
  } else {
    base.films = base.films.map((f) => {
      if (f.id === "celine" && (!f.posterImage || f.posterImage.includes("images.unsplash.com/photo-1485846234645"))) {
        return { ...f, posterImage: "/assets/aistudio/___________________________________________2_5ecc6cfd.jpg" };
      }
      return f;
    });
  }

  // Guarantee non-empty featured list
  if (!Array.isArray(base.featured) || base.featured.length === 0) {
    base.featured = INITIAL_CONTENT.featured;
  }

  // Guarantee promos
  if (!Array.isArray(base.promos) || base.promos.length === 0) {
    if (raw && raw.promo) {
      base.promos = [
        {
          id: "promo-1",
          badgeTopLeft: "LIGHTHOUSE / FEATURED PROJECT",
          badgeTopRight: "01 — SPECIAL PROJECT",
          kicker: "EXPLORE BEYOND THE SCREEN",
          titleLines: raw.promo.titleLines || ["Objects &", "Moving Images."],
          subtitle: raw.promo.subtitle || "영화 밖에서 이어지는 새로운 경험",
          ctaText: "STORE / EXPLORE",
          url: raw.promo.url || "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
          image: raw.promo.image || "/images/promo-example.jpg",
          visible: true,
        },
      ];
    } else {
      base.promos = INITIAL_CONTENT.promos;
    }
  } else {
    base.promos = base.promos.map((p) => ({
      ...p,
      visible: p.visible !== false,
    }));
  }

  // Guarantee navItems
  if (!Array.isArray(base.navItems) || base.navItems.length === 0) {
    base.navItems = DEFAULT_NAV_ITEMS;
  }

  if (base.promosVisible === undefined) {
    base.promosVisible = true;
  }

  if (!base.contact) {
    base.contact = INITIAL_CONTENT.contact;
  } else {
    base.contact = { ...INITIAL_CONTENT.contact, ...base.contact };
  }

  if (!base.director) {
    base.director = INITIAL_CONTENT.director;
  }

  return base;
}

export function getStoredLocalContent(): SiteContent | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("lighthouse_content");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.films) && parsed.films.length > 0) {
          return normalizeContent(parsed);
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function subscribeToSiteContent(
  onUpdate: (content: SiteContent, isCloud: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  // 1. Immediately and synchronously emit default or cached data (0.01s instant paint)
  const immediateFallback = getStoredLocalContent() || INITIAL_CONTENT;
  onUpdate(immediateFallback, false);

  let unsubscribe: (() => void) | null = null;
  let isMounted = true;

  // Defer Firestore connection slightly so the browser finishes initial paint & DOMContentLoaded instantly
  const timerId = setTimeout(() => {
    if (!isMounted) return;

    try {
      const docRef = doc(db, "site_content", "main");

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (!isMounted) return;
          try {
            if (snapshot.exists()) {
              const cloudData = snapshot.data();
              if (cloudData && typeof cloudData === "object") {
                const normalized = normalizeContent(cloudData);

                // Sync local storage cache for instant paint across reloads
                try {
                  if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.setItem("lighthouse_content", JSON.stringify(normalized));
                    window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: normalized }));
                  }
                } catch {
                  // ignore
                }
                onUpdate(normalized, true);
              }
            } else {
              // Document doesn't exist yet - keep showing local fallback data cleanly without auto-writing
              const fallback = getStoredLocalContent() || INITIAL_CONTENT;
              onUpdate(fallback, false);
            }
          } catch (procErr: any) {
            console.warn("Firestore snapshot notice:", procErr);
            onUpdate(getStoredLocalContent() || INITIAL_CONTENT, false);
          }
        },
        (error) => {
          console.warn("Firestore subscription notice (using local data):", error?.message || error);
          const fallback = getStoredLocalContent() || INITIAL_CONTENT;
          onUpdate(fallback, false);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      console.warn("Firestore setup notice:", err?.message || err);
      const fallback = getStoredLocalContent() || INITIAL_CONTENT;
      onUpdate(fallback, false);
    }
  }, 50);

  return () => {
    isMounted = false;
    clearTimeout(timerId);
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

export async function saveSiteContentToCloud(content: SiteContent): Promise<SiteContent> {
  const docRef = doc(db, "site_content", "main");
  const normalized = normalizeContent(content);

  // Clean undefined properties safely
  const cleanPayload = JSON.parse(JSON.stringify(normalized));

  const payload = {
    ...cleanPayload,
    featured: cleanPayload.featured || INITIAL_CONTENT.featured,
    films: cleanPayload.films || INITIAL_CONTENT.films,
    promos: cleanPayload.promos || INITIAL_CONTENT.promos,
    updatedAt: new Date().toISOString(),
    updatedBy: "admin",
  };

  // Always save locally immediately for instant feedback
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("lighthouse_content", JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: payload }));
    }
  } catch {
    // ignore
  }

  // Save to Firestore with a reasonable timeout so admin UI doesn't hang indefinitely on network issues
  const savePromise = setDoc(docRef, payload, { merge: true });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("네트워크 응답 시간 초과")), 8000)
  );

  try {
    await Promise.race([savePromise, timeoutPromise]);
    return payload;
  } catch (error: any) {
    console.error("Firestore saveSiteContentToCloud error:", error);
    throw new Error(error?.message || "클라우드 저장소 통신 중 오류가 발생했습니다.");
  }
}

export async function checkFirestoreStatus(): Promise<{ connected: boolean; filmCount: number; updatedAt?: string }> {
  try {
    const docRef = doc(db, "site_content", "main");
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 2500)
    );
    const snap = await Promise.race([getDoc(docRef), timeoutPromise]);
    if (snap && snap.exists()) {
      const d = snap.data();
      return {
        connected: true,
        filmCount: Array.isArray(d.films) ? d.films.length : 0,
        updatedAt: d.updatedAt,
      };
    }
    return { connected: true, filmCount: 0 };
  } catch {
    return { connected: false, filmCount: 0 };
  }
}

