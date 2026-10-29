/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase.ts";
import { SiteContent, INITIAL_CONTENT, DEFAULT_NAV_ITEMS } from "../data/content.ts";

// 1. Unified Firestore Collection & Document Path (100% Identical for Read & Write)
export const CONTENT_COLLECTION = "site_content";
export const CONTENT_DOC_ID = "main";
export const getContentDocRef = () => doc(db, CONTENT_COLLECTION, CONTENT_DOC_ID);

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

/**
 * Real-time Firestore subscription:
 * - Listens directly to doc(db, 'site_content', 'main') via onSnapshot.
 * - Firestore cloud data ALWAYS takes absolute top priority and overrides any local state as soon as it arrives.
 */
export function subscribeToSiteContent(
  onUpdate: (content: SiteContent, isCloud: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  // Emit initial state so there is no blank screen while connecting
  const fallback = getStoredLocalContent() || INITIAL_CONTENT;
  onUpdate(fallback, false);

  try {
    const docRef = getContentDocRef();

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const cloudData = snapshot.data();
            if (cloudData && typeof cloudData === "object") {
              const normalized = normalizeContent(cloudData);

              // Update cache
              try {
                if (typeof window !== "undefined" && window.localStorage) {
                  window.localStorage.setItem("lighthouse_content", JSON.stringify(normalized));
                  window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: normalized }));
                }
              } catch {
                // ignore
              }

              // Overwrite with Firestore authoritative data
              onUpdate(normalized, true);
            }
          } else {
            console.info("Firestore site_content/main document does not exist yet.");
          }
        } catch (procErr: any) {
          console.warn("Firestore snapshot processing error:", procErr);
          if (onError) onError(procErr);
        }
      },
      (error) => {
        console.warn("Firestore onSnapshot error:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error("Firestore onSnapshot initialization failed:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Saves content to Firestore doc(db, 'site_content', 'main'):
 * - Uses JSON.parse(JSON.stringify(...)) to eliminate all `undefined` values that Firestore rejects.
 * - Directly calls setDoc so errors (permission, quota, network) are thrown and visible to user.
 */
export async function saveSiteContentToCloud(content: SiteContent): Promise<SiteContent> {
  const docRef = getContentDocRef();
  const normalized = normalizeContent(content);

  // 3. Remove all undefined values before saving to Firestore
  const sanitized = JSON.parse(
    JSON.stringify(normalized, (_key, value) => {
      return value === undefined ? null : value;
    })
  );

  const payload = {
    ...sanitized,
    featured: sanitized.featured || INITIAL_CONTENT.featured,
    films: sanitized.films || INITIAL_CONTENT.films,
    promos: sanitized.promos || INITIAL_CONTENT.promos,
    navItems: sanitized.navItems || DEFAULT_NAV_ITEMS,
    updatedAt: new Date().toISOString(),
    updatedBy: "admin",
  };

  // Strict JSON deep-clean pass
  const cleanPayload = JSON.parse(JSON.stringify(payload));

  // Perform Firestore write
  await setDoc(docRef, cleanPayload, { merge: true });

  // Update local cache & notify other tabs
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("lighthouse_content", JSON.stringify(cleanPayload));
      window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: cleanPayload }));
    }
  } catch {
    // ignore
  }

  return cleanPayload;
}

export async function checkFirestoreStatus(): Promise<{ connected: boolean; filmCount: number; updatedAt?: string }> {
  try {
    const docRef = getContentDocRef();
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      return {
        connected: true,
        filmCount: Array.isArray(d.films) ? d.films.length : 0,
        updatedAt: d.updatedAt,
      };
    }
    return { connected: true, filmCount: 0 };
  } catch (err) {
    console.warn("checkFirestoreStatus error:", err);
    return { connected: false, filmCount: 0 };
  }
}
