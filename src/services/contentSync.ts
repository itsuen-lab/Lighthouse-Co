/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase.ts";
import { SiteContent, INITIAL_CONTENT, DEFAULT_NAV_ITEMS } from "../data/content.ts";
import { resolveAssetUrl, formatGoogleDriveImageUrl } from "../utils/assets.ts";

export const CONTENT_COLLECTION = "site_content";
export const CONTENT_DOC_ID = "main";

export const getContentDocRef = () => {
  if (!db) return null;
  try {
    return doc(db, CONTENT_COLLECTION, CONTENT_DOC_ID);
  } catch (err) {
    console.warn("Failed to create Firestore doc reference:", err);
    return null;
  }
};

/**
 * Normalizes any raw data into a strictly valid SiteContent object.
 * Guaranteed never to throw on unexpected types, nulls, or invalid data.
 */
export function normalizeContent(raw: any): SiteContent {
  if (!raw || typeof raw !== "object") {
    return INITIAL_CONTENT;
  }

  const base: SiteContent = {
    ...INITIAL_CONTENT,
    ...raw,
  };

  // 1. Validate & sanitize films
  if (!Array.isArray(base.films) || base.films.length === 0) {
    base.films = INITIAL_CONTENT.films;
  } else {
    const validFilms = base.films
      .filter((f) => f && typeof f === "object" && typeof f.id === "string")
      .map((f) => {
        const film = { ...f };
        if (film.heroImage && typeof film.heroImage === "string") {
          film.heroImage = formatGoogleDriveImageUrl(film.heroImage);
        }
        if (film.posterImage && typeof film.posterImage === "string") {
          film.posterImage = formatGoogleDriveImageUrl(film.posterImage);
        }
        if (film.mainArtworkImage && typeof film.mainArtworkImage === "string") {
          film.mainArtworkImage = formatGoogleDriveImageUrl(film.mainArtworkImage);
        }

        if (
          film.id === "celine" &&
          (!film.posterImage ||
            typeof film.posterImage !== "string" ||
            film.posterImage.includes("images.unsplash.com/photo-1485846234645"))
        ) {
          film.posterImage = resolveAssetUrl("/assets/aistudio/___________________________________________2_5ecc6cfd.jpg");
        }

        if (typeof (film as any).artworkDesigner === "string") {
          film.artworkDesigner = (film as any).artworkDesigner.trim();
        }

        if (Array.isArray(film.artworks)) {
          film.artworks = film.artworks
            .map((art: any) => {
              if (typeof art === "string") {
                const trimmed = art.trim();
                return trimmed ? { imageUrl: formatGoogleDriveImageUrl(trimmed), type: "메인/오리지널 포스터", showInMain: true } : null;
              }
              if (art && typeof art === "object") {
                const img = typeof art.imageUrl === "string" ? art.imageUrl : "";
                return {
                  id: typeof art.id === "string" ? art.id : undefined,
                  imageUrl: formatGoogleDriveImageUrl(img),
                  type: typeof art.type === "string" && art.type.trim() ? art.type.trim() : "메인/오리지널 포스터",
                  title: typeof art.title === "string" ? art.title : "",
                  caption: typeof art.caption === "string" ? art.caption : "",
                  designer: typeof art.designer === "string" ? art.designer : undefined,
                  showInMain: art.showInMain !== false,
                };
              }
              return null;
            })
            .filter(Boolean) as any[];
        }

        return film;
      });

    base.films = validFilms.length > 0 ? validFilms : INITIAL_CONTENT.films;
  }

  // 2. Validate & sanitize featured list (must be array of string IDs)
  if (!Array.isArray(base.featured) || base.featured.length === 0) {
    base.featured = INITIAL_CONTENT.featured;
  } else {
    const rawFeaturedList = base.featured as any[];
    const validFeatured = rawFeaturedList
      .map((item: any) => (typeof item === "string" ? item.trim() : item?.id ? String(item.id).trim() : ""))
      .filter((id: string) => id.length > 0);

    base.featured = validFeatured.length > 0 ? validFeatured : INITIAL_CONTENT.featured;
  }

  // 3. Validate & sanitize promos
  if (!Array.isArray(base.promos) || base.promos.length === 0) {
    base.promos = INITIAL_CONTENT.promos;
  } else {
    const validPromos = base.promos
      .filter((p) => p && typeof p === "object" && typeof p.id === "string")
      .map((p) => ({
        ...p,
        image: typeof p.image === "string" ? formatGoogleDriveImageUrl(p.image) : p.image,
        titleLines: Array.isArray(p.titleLines)
          ? p.titleLines.map(String)
          : [(p as any).title || "SPECIAL PROJECT"],
        visible: p.visible !== false,
      }));

    base.promos = validPromos.length > 0 ? validPromos : INITIAL_CONTENT.promos;
  }

  // 4. Validate & sanitize navItems
  if (!Array.isArray(base.navItems) || base.navItems.length === 0) {
    base.navItems = DEFAULT_NAV_ITEMS;
  } else {
    const validNav = base.navItems.filter(
      (n) => n && typeof n === "object" && typeof n.id === "string" && typeof n.label === "string"
    );
    base.navItems = validNav.length > 0 ? validNav : DEFAULT_NAV_ITEMS;
  }

  // 5. Visibility and contact metadata
  base.promosVisible = base.promosVisible !== false;
  base.artworksVisible = base.artworksVisible !== false;
  if (!Array.isArray(base.mainArtworkIds) || base.mainArtworkIds.length === 0) {
    base.mainArtworkIds = INITIAL_CONTENT.mainArtworkIds || [];
  } else {
    base.mainArtworkIds = (base.mainArtworkIds as any[])
      .map((item) => (typeof item === "string" ? item.trim() : item?.id ? String(item.id).trim() : ""))
      .filter((id) => id.length > 0);
  }

  const initialContact = INITIAL_CONTENT.contact || {
    email: "keeper@lighthouse.re.kr",
    youtubeUrl: "https://www.youtube.com/channel/UCZGkkk92ozbMX4Zo3WYCSbg",
    instagramUrl: "https://www.instagram.com/filmlighthouse",
    xUrl: "https://x.com/filmxlighthouse",
    inquiryEndpoint: "https://script.google.com/macros/s/AKfycbx5J9UTRPe0IM9mRuEUbhs9fjDnJOZgqgiGfTlD9DyQEOpJ-TDCTArqym1iRo3o-_qVqg/exec",
  };

  const rawContact = (base.contact && typeof base.contact === "object" ? base.contact : {}) as any;
  base.contact = {
    email: typeof rawContact.email === "string" ? rawContact.email : initialContact.email,
    youtubeUrl: typeof rawContact.youtubeUrl === "string" ? rawContact.youtubeUrl : initialContact.youtubeUrl,
    instagramUrl: typeof rawContact.instagramUrl === "string" ? rawContact.instagramUrl : initialContact.instagramUrl,
    xUrl: typeof rawContact.xUrl === "string" ? rawContact.xUrl : initialContact.xUrl,
    inquiryEndpoint: typeof rawContact.inquiryEndpoint === "string" ? rawContact.inquiryEndpoint : initialContact.inquiryEndpoint,
  };

  const rawDirector = (base.director && typeof base.director === "object" ? base.director : {}) as any;
  base.director = {
    photo: typeof rawDirector.photo === "string" ? formatGoogleDriveImageUrl(rawDirector.photo) : INITIAL_CONTENT.director.photo,
    quote: typeof rawDirector.quote === "string" ? rawDirector.quote : INITIAL_CONTENT.director.quote,
    name: typeof rawDirector.name === "string" ? rawDirector.name : INITIAL_CONTENT.director.name,
  };

  return base;
}

export function getStoredLocalContent(): SiteContent | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("lighthouse_content");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
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
 * Subscribes in real-time to Firestore.
 * Always passes local or default content first so render is instant.
 * Then overrides with cloud data as soon as Firestore connects.
 */
export function subscribeToSiteContent(
  onUpdate: (content: SiteContent, isCloud: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  // 1. Immediately emit default/cached data so page renders in 0.01s
  const initialData = getStoredLocalContent() || INITIAL_CONTENT;
  onUpdate(initialData, false);

  const docRef = getContentDocRef();
  if (!docRef) {
    console.warn("Firestore not available; operating in local mode.");
    return () => {};
  }

  try {
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const rawCloud = snapshot.data();
            if (rawCloud && typeof rawCloud === "object") {
              const normalized = normalizeContent(rawCloud);

              // Update local cache
              try {
                if (typeof window !== "undefined" && window.localStorage) {
                  window.localStorage.setItem("lighthouse_content", JSON.stringify(normalized));
                  window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: normalized }));
                }
              } catch {
                // ignore
              }

              // Overwrite with real-time cloud data
              onUpdate(normalized, true);
            }
          }
        } catch (procErr: any) {
          console.warn("Firestore snapshot handling notice:", procErr);
          if (onError) onError(procErr);
        }
      },
      (error) => {
        console.warn("Firestore subscription connection notice:", error?.message || error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn("Firestore onSnapshot setup notice:", err?.message || err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Saves site content to Firestore after deep cleaning undefined fields.
 */
export async function saveSiteContentToCloud(content: SiteContent): Promise<SiteContent> {
  const docRef = getContentDocRef();
  if (!docRef) {
    throw new Error("Firestore 데이터베이스가 초기화되지 않았습니다.");
  }

  const normalized = normalizeContent(content);

  // Deep-clean all undefined values into null/sanitized form
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

  const finalPayload = JSON.parse(JSON.stringify(payload));

  await setDoc(docRef, finalPayload, { merge: true });

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("lighthouse_content", JSON.stringify(finalPayload));
      window.dispatchEvent(new CustomEvent("lighthouse_content_sync", { detail: finalPayload }));
    }
  } catch {
    // ignore
  }

  return finalPayload;
}

export async function checkFirestoreStatus(): Promise<{ connected: boolean; filmCount: number; updatedAt?: string }> {
  try {
    const docRef = getContentDocRef();
    if (!docRef) return { connected: false, filmCount: 0 };

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
