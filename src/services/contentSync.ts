/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "../firebase.ts";
import { SiteContent, INITIAL_CONTENT, DEFAULT_NAV_ITEMS } from "../data/content.ts";

export const CONTENT_DOC_PATH = "site_content/main";

export function normalizeContent(raw: any): SiteContent {
  const base: SiteContent = { ...INITIAL_CONTENT, ...raw };
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
  }
  if (Array.isArray(base.films)) {
    base.films = base.films.map((f) => {
      if (f.id === "celine" && (!f.posterImage || f.posterImage.includes("images.unsplash.com/photo-1485846234645"))) {
        return { ...f, posterImage: "/assets/aistudio/___________________________________________2_5ecc6cfd.jpg" };
      }
      return f;
    });
  }
  if (!Array.isArray(base.navItems) || base.navItems.length === 0) {
    base.navItems = DEFAULT_NAV_ITEMS;
  }
  if (base.promosVisible === undefined) {
    base.promosVisible = true;
  }
  if (Array.isArray(base.promos)) {
    base.promos = base.promos.map((p) => ({
      ...p,
      visible: p.visible !== false,
    }));
  }
  if (!base.contact) {
    base.contact = INITIAL_CONTENT.contact;
  } else {
    base.contact = { ...INITIAL_CONTENT.contact, ...base.contact };
  }
  return base;
}

export function subscribeToSiteContent(
  onUpdate: (content: SiteContent, isCloud: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(db, "site_content", "main");

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data();
        const normalized = normalizeContent(cloudData);
        // Cache in localStorage for instant initial load on this device
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem("lighthouse_content", JSON.stringify(normalized));
          }
        } catch {
          // ignore
        }
        onUpdate(normalized, true);
      } else {
        // Doc doesn't exist yet in cloud; use local or initial
        onUpdate(INITIAL_CONTENT, false);
      }
    },
    (error) => {
      console.warn("Firestore subscription notice (using local cache):", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, "site_content/main");
    }
  );

  return unsubscribe;
}

export async function saveSiteContentToCloud(content: SiteContent): Promise<void> {
  const docRef = doc(db, "site_content", "main");
  const cleanPayload = JSON.parse(JSON.stringify(content));

  const payload = {
    ...cleanPayload,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || "admin",
  };

  try {
    await setDoc(docRef, payload);
    // Also save locally as fast cache
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("lighthouse_content", JSON.stringify(content));
      }
    } catch {
      // ignore
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "site_content/main");
  }
}
