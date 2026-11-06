/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { INITIAL_CONTENT, Film, SiteContent, DEFAULT_NAV_ITEMS, NavItem, ArtworkEntry, JournalPost } from "./data/content.ts";
import { subscribeToSiteContent, saveSiteContentToCloud, normalizeContent } from "./services/contentSync.ts";
import { recordSiteVisit, recordPostView, recordFilmView } from "./services/analytics.ts";
import { SlidersHorizontal, ArrowUpRight, Check, Send, Loader2, Sparkles, AlertCircle, Plus, ZoomIn, X, ExternalLink, Search, ArrowLeft, ArrowRight, LayoutGrid, List, BookOpen } from "lucide-react";
import { AdminAuthModal } from "./components/AdminAuthModal.tsx";
import { ArtworksSection } from "./components/ArtworksSection.tsx";
import { resolveAssetUrl } from "./utils/assets.ts";

const AdminPanel = React.lazy(() =>
  import("./components/AdminPanel.tsx").then((m) => ({ default: m.AdminPanel }))
);

function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Sandboxed or cross-origin iframe security fallback
  }
  return null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Sandboxed or cross-origin iframe fallback
  }
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Sandboxed or cross-origin iframe fallback
  }
}

export default function App() {
  const [content, setContent] = useState<SiteContent>(() => {
    const saved = safeGetStorage("lighthouse_content");
    if (saved) {
      try {
        if (
          saved.includes("images.unsplash.com") ||
          saved.includes("ae0c4f96-7ccc-11e7-83c9-6be3df13972a") ||
          (saved.includes('"celine"') && saved.includes('"eureka"') && saved.includes('"contempt"') && !saved.includes('"remake"'))
        ) {
          safeRemoveStorage("lighthouse_content");
          return INITIAL_CONTENT;
        }
        return normalizeContent(JSON.parse(saved));
      } catch {
        return INITIAL_CONTENT;
      }
    }
    return INITIAL_CONTENT;
  });

  // Real-time Cloud DB synchronization across all browsers and devices
  useEffect(() => {
    const unsubscribe = subscribeToSiteContent((cloudContent) => {
      setContent(cloudContent);
    });

    const handleCustomSync = (e: Event) => {
      const custom = (e as CustomEvent).detail;
      if (custom) {
        setContent(normalizeContent(custom));
      }
    };
    window.addEventListener("lighthouse_content_sync", handleCustomSync);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "lighthouse_content" && e.newValue) {
        try {
          setContent(normalizeContent(JSON.parse(e.newValue)));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      unsubscribe();
      window.removeEventListener("lighthouse_content_sync", handleCustomSync);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const [activeFilmId, setActiveFilmId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(7);

  // Dedicated Journal Board Page State
  const [isJournalPage, setIsJournalPage] = useState<boolean>(false);
  const [readingJournalPost, setReadingJournalPost] = useState<JournalPost | null>(null);
  const [journalCategoryFilter, setJournalCategoryFilter] = useState<string>("ALL");
  const [journalTagFilter, setJournalTagFilter] = useState<string | null>(null);
  const [journalSearchQuery, setJournalSearchQuery] = useState<string>("" );
  const [journalViewMode, setJournalViewMode] = useState<"grid" | "table">("grid");

  // Poster & Artwork Lightbox Zoom Modal State
  interface LightboxItem {
    url: string;
    title: string;
    titleKo?: string;
    type?: string;
    designer?: string;
    subtitle?: string;
  }
  const [lightboxImage, setLightboxImage] = useState<LightboxItem | null>(null);

  // Journal Post Full Reader Modal State
  const [activeJournalPost, setActiveJournalPost] = useState<JournalPost | null>(null);

  // Close lightbox & journal reader on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxImage) setLightboxImage(null);
        if (activeJournalPost) setActiveJournalPost(null);
        if (readingJournalPost) setReadingJournalPost(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage, activeJournalPost, readingJournalPost]);
  
  // Security & Admin Authentication State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    const masterPw = "Diddlsah211!!@@";
    safeSetStorage("lh_admin_pw", masterPw);
    return masterPw;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return safeGetStorage("lh_is_authenticated") === "true";
  });
  const [stealthMode, setStealthMode] = useState<boolean>(() => {
    const saved = safeGetStorage("lh_stealth_mode");
    return saved === null ? true : saved === "true";
  });

  const logoClickRef = useRef<{ count: number; timer: NodeJS.Timeout | null }>({
    count: 0,
    timer: null,
  });

  const requestAdminAccess = useCallback(() => {
    if (isAuthenticated) {
      setIsAdminOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated]);

  // Global secret shortcut: Ctrl+Shift+A or Cmd+Shift+A to open Admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        requestAdminAccess();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestAdminAccess]);

  // Hover poster magnetic state
  const [posterVisible, setPosterVisible] = useState(false);
  const [posterSrc, setPosterSrc] = useState<string>("");
  const posterRef = useRef<HTMLDivElement>(null);
  const posterPosRef = useRef({
    curX: 0,
    curY: 0,
    targetX: 0,
    targetY: 0,
    curR: -4,
    targetR: -4,
    active: false,
    animId: 0,
  });

  const scenesRef = useRef<(HTMLElement | null)[]>([]);

  // Inquiry Form State & Handlers
  const [inquiryCategory, setInquiryCategory] = useState<string>("배급/협업 제안");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryContact, setInquiryContact] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [inquiryErrorMsg, setInquiryErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{ name: string; contact: string; category: string; time: string } | null>(null);
  const inquiryFormRef = useRef<HTMLFormElement>(null);

  const handleSubmitInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInquiryErrorMsg(null);

    const trimmedName = inquiryName.trim();
    const trimmedContact = inquiryContact.trim();
    const trimmedMessage = inquiryMessage.trim();

    if (!trimmedName) {
      setInquiryErrorMsg("성함 또는 단체명을 입력해 주세요.");
      return;
    }
    if (!trimmedContact) {
      setInquiryErrorMsg("회신받으실 이메일 주소 또는 연락처를 입력해 주세요.");
      return;
    }
    if (!trimmedMessage) {
      setInquiryErrorMsg("문의 내용을 입력해 주세요.");
      return;
    }

    setInquiryStatus("submitting");

    const endpoint =
      content.contact?.inquiryEndpoint?.trim() ||
      INITIAL_CONTENT.contact?.inquiryEndpoint ||
      "https://script.google.com/macros/s/AKfycbx5J9UTRPe0IM9mRuEUbhs9fjDnJOZgqgiGfTlD9DyQEOpJ-TDCTArqym1iRo3o-_qVqg/exec";

    const now = new Date();
    const timeFormatted = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const autoSubject = `[${inquiryCategory}] ${trimmedName}님의 문의`;

    const payloadData: Record<string, string> = {
      name: trimmedName,
      이름: trimmedName,
      contact: trimmedContact,
      email: trimmedContact,
      이메일: trimmedContact,
      phone: trimmedContact,
      category: inquiryCategory,
      문의유형: inquiryCategory,
      subject: autoSubject,
      제목: autoSubject,
      message: trimmedMessage,
      문의내용: trimmedMessage,
      timestamp: now.toISOString(),
      접수일시: timeFormatted,
    };

    setSubmittedData({
      name: trimmedName,
      contact: trimmedContact,
      category: inquiryCategory,
      time: timeFormatted,
    });

    try {
      // 1. Submit via hidden iframe form (handles Google Apps Script 302 redirect natively)
      if (inquiryFormRef.current) {
        inquiryFormRef.current.submit();
      }

      // 2. Parallel fetch POST with mode: 'no-cors'
      const formData = new FormData();
      Object.entries(payloadData).forEach(([k, v]) => formData.append(k, v));

      try {
        await fetch(endpoint, {
          method: "POST",
          mode: "no-cors",
          body: formData,
        });
      } catch {
        // no-cors mode handles opaque response
      }

      setTimeout(() => {
        setInquiryStatus("success");
      }, 1000);
    } catch (err) {
      console.error("Inquiry form submit:", err);
      setInquiryStatus("success");
    }
  };

  const handleResetInquiryForm = () => {
    setInquiryName("");
    setInquiryContact("");
    setInquiryMessage("");
    setInquiryStatus("idle");
    setInquiryErrorMsg(null);
  };

  // Hash-based routing
  const handleHashChange = useCallback(() => {
    let hash = "";
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      hash = window.location.hash.slice(1);
    }

    if (hash === "admin") {
      requestAdminAccess();
      return;
    }

    if (hash === "journal" || hash === "journal-page" || hash.startsWith("journal-")) {
      setIsJournalPage(true);
      setActiveFilmId(null);
      if (hash.startsWith("journal-") && hash !== "journal-page") {
        const postId = hash.replace("journal-", "");
        const foundPost = (content.journalPosts || INITIAL_CONTENT.journalPosts || []).find((p) => p.id === postId);
        if (foundPost) setReadingJournalPost(foundPost);
      } else {
        setReadingJournalPost(null);
      }
      window.scrollTo(0, 0);
      return;
    }
    setIsJournalPage(false);

    if (hash.startsWith("film-")) {
      const filmId = hash.replace("film-", "");
      const found = (content.films || []).find((f) => f && f.id === filmId);
      if (found) {
        setActiveFilmId(found.id);
        window.scrollTo(0, 0);
        return;
      }
    }
    setActiveFilmId(null);
    if (hash && hash !== "home") {
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }, [content.films, content.journalPosts, requestAdminAccess]);

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleHashChange]);

  // Analytics Tracking (Admin-only stats, silently recorded)
  useEffect(() => {
    recordSiteVisit();
  }, []);

  useEffect(() => {
    if (activeFilmId) {
      recordFilmView(activeFilmId);
    }
  }, [activeFilmId]);

  useEffect(() => {
    if (readingJournalPost?.id) {
      recordPostView(readingJournalPost.id);
    }
  }, [readingJournalPost?.id]);

  // Unified Hero Slides: Unlimited films & promo cards with customizable order
  interface FilmHeroSlide {
    type: "film";
    id: string;
    title: string;
    titleKo: string;
    release?: string;
    director: string;
    year: string;
    image: string;
    film: Film;
  }

  interface PromoHeroSlide {
    type: "promo";
    id: string;
    title: string;
    titleLines: string[];
    subtitle: string;
    kicker: string;
    image: string;
    url: string;
    ctaText: string;
    badgeTopLeft?: string;
    badgeTopRight?: string;
  }

  type HeroSlide = FilmHeroSlide | PromoHeroSlide;

  const heroSlides: HeroSlide[] = (content.featured || []).reduce<HeroSlide[]>((acc, rawId) => {
    if (!rawId) return acc;
    const strId = typeof rawId === "string" ? rawId : String((rawId as any)?.id || "");
    if (!strId) return acc;

    const cleanPromoId = strId.startsWith("promo:") ? strId.replace("promo:", "") : strId;
    const cleanFilmId = strId.startsWith("film:") ? strId.replace("film:", "") : strId;

    const promo = (content.promos || []).find((p) => p && (p.id === cleanPromoId || p.id === strId));
    if (promo) {
      acc.push({
        type: "promo",
        id: promo.id,
        title: (promo.titleLines || []).join(" "),
        titleLines: promo.titleLines || [],
        subtitle: promo.subtitle || "",
        kicker: promo.kicker || "SPECIAL PROJECT",
        image: promo.image,
        url: promo.url,
        ctaText: promo.ctaText || "STORE / EXPLORE",
        badgeTopLeft: promo.badgeTopLeft || "LIGHTHOUSE / FEATURED PROJECT",
        badgeTopRight: promo.badgeTopRight,
      });
      return acc;
    }

    const film = (content.films || []).find((f) => f && (f.id === cleanFilmId || f.id === strId));
    if (film) {
      acc.push({
        type: "film",
        id: film.id,
        title: film.title,
        titleKo: film.titleKo,
        release: film.release,
        director: film.director,
        year: film.year,
        image: film.heroImage,
        film,
      });
      return acc;
    }
    return acc;
  }, []);

  // Fallback if no hero items selected: first 3 films
  const availableFilms = content.films && content.films.length > 0 ? content.films : INITIAL_CONTENT.films;
  const finalHeroSlides: HeroSlide[] =
    heroSlides.length > 0
      ? heroSlides
      : availableFilms.slice(0, 3).map((film) => ({
          type: "film",
          id: film.id,
          title: film.title,
          titleKo: film.titleKo,
          release: film.release,
          director: film.director,
          year: film.year,
          image: film.heroImage,
          film,
        }));

  // Magnetic hover poster animation
  const animatePoster = useCallback(() => {
    const state = posterPosRef.current;
    state.curX += (state.targetX - state.curX) * 0.16;
    state.curY += (state.targetY - state.curY) * 0.16;
    state.curR += (state.targetR - state.curR) * 0.12;

    if (posterRef.current) {
      posterRef.current.style.left = `${state.curX}px`;
      posterRef.current.style.top = `${state.curY}px`;
      posterRef.current.style.setProperty("--r", `${state.curR}deg`);
    }

    if (
      state.active ||
      Math.abs(state.targetX - state.curX) > 0.2 ||
      Math.abs(state.targetY - state.curY) > 0.2 ||
      Math.abs(state.targetR - state.curR) > 0.2
    ) {
      state.animId = requestAnimationFrame(animatePoster);
    } else {
      state.animId = 0;
    }
  }, []);

  const ensurePosterAnimation = useCallback(() => {
    if (!posterPosRef.current.animId) {
      posterPosRef.current.animId = requestAnimationFrame(animatePoster);
    }
  }, [animatePoster]);

  const handleRowMouseEnter = (film: Film, e: React.MouseEvent) => {
    const poster = film.posterImage && film.posterImage.trim();
    if (!poster) {
      setPosterVisible(false);
      setPosterSrc("");
      posterPosRef.current.active = false;
      return;
    }
    const state = posterPosRef.current;
    setPosterSrc(poster);
    setPosterVisible(true);
    state.active = true;

    const clampVal = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));
    const halfW = Math.min(190, window.innerWidth * 0.45);
    const halfH = Math.min(180, window.innerHeight * 0.45);
    const x = clampVal(e.clientX + 140, halfW, window.innerWidth - halfW);
    const y = clampVal(e.clientY + 150, halfH, window.innerHeight - halfH);

    state.targetX = state.curX = x;
    state.targetY = state.curY = y;
    ensurePosterAnimation();
  };

  const handleRowMouseMove = (e: React.MouseEvent) => {
    const state = posterPosRef.current;
    if (!state.active) return;
    const clampVal = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));
    const halfW = Math.min(190, window.innerWidth * 0.45);
    const halfH = Math.min(180, window.innerHeight * 0.45);
    const x = clampVal(e.clientX + 140, halfW, window.innerWidth - halfW);
    const y = clampVal(e.clientY + 150, halfH, window.innerHeight - halfH);

    state.targetR = clampVal((x - state.targetX) * 0.06, -8, 8);
    state.targetX = x;
    state.targetY = y;
    ensurePosterAnimation();
  };

  const handleRowMouseLeave = () => {
    const state = posterPosRef.current;
    state.active = false;
    state.targetR = -4;
    setPosterVisible(false);
    ensurePosterAnimation();
  };

  // Scroll curtain and parallax effects
  useEffect(() => {
    let pending = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));

    const paint = () => {
      pending = false;
      if (activeFilmId) return;

      const count = scenesRef.current.length;
      if (count === 0) return;

      const vh = window.innerHeight || 1;
      const isReduced = reducedMotion.matches;

      // Phase 1: Batch READ all rects (zero layout thrashing)
      const rects: (DOMRect | null)[] = new Array(count);
      for (let i = 0; i < count; i++) {
        const el = scenesRef.current[i];
        rects[i] = el ? el.getBoundingClientRect() : null;
      }

      // Phase 2: Batch WRITE all styles
      for (let index = 0; index < count; index++) {
        const scene = scenesRef.current[index];
        const rect = rects[index];
        if (!scene || !rect) continue;

        if (isReduced) {
          scene.style.setProperty("--curtain-shade", "0");
          scene.style.setProperty("--text-shift", "0px");
          scene.style.setProperty("--text-opacity", "1");
          continue;
        }

        // Skip scenes far outside viewport to save style calculation and paint cycles
        if (rect.bottom < -200 || rect.top > vh * 2) {
          continue;
        }

        const nextRect = rects[index + 1];
        const coverProgress = nextRect ? clamp(1 - nextRect.top / vh, 0, 1) : 0;
        const shade = coverProgress * 0.35;
        const p = clamp((rect.top - vh * 0.14) / vh, -1, 1);

        scene.style.setProperty("--curtain-shade", shade.toFixed(3));
        scene.style.setProperty("--text-shift", `${(p * 14).toFixed(1)}px`);
        scene.style.setProperty(
          "--text-opacity",
          String(Math.max(0.75, 1 - Math.abs(p) * 0.15))
        );
      }
    };

    const requestPaint = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(paint);
      }
    };

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint, { passive: true });
    paint();

    return () => {
      window.removeEventListener("scroll", requestPaint);
      window.removeEventListener("resize", requestPaint);
    };
  }, [activeFilmId, finalHeroSlides.length]);

  const openFilmDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsJournalPage(false);
    setReadingJournalPost(null);
    window.location.hash = `film-${id}`;
    recordFilmView(id);
  };

  const closeDetail = () => {
    setActiveFilmId(null);
    window.location.hash = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openJournalPage = (postId?: string) => {
    setIsJournalPage(true);
    setActiveFilmId(null);
    if (postId) {
      const found = (content.journalPosts || INITIAL_CONTENT.journalPosts || []).find((p) => p.id === postId);
      setReadingJournalPost(found || null);
      window.location.hash = `journal-${postId}`;
      recordPostView(postId);
    } else {
      setReadingJournalPost(null);
      window.location.hash = "journal";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeJournalPage = () => {
    setIsJournalPage(false);
    setReadingJournalPost(null);
    window.location.hash = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMoreFilms = () => {
    setVisibleCount((prev) => Math.min(prev + 7, content.films.length));
  };

  // Admin & Security Handlers
  const handleSaveAdmin = async (updated: SiteContent): Promise<void> => {
    const normalized = normalizeContent(updated);
    setContent(normalized);
    safeSetStorage("lighthouse_content", JSON.stringify(normalized));
    await saveSiteContentToCloud(normalized);
  };

  const handleToggleArtworkMainExposure = async (filmId: string, artworkIndex: number) => {
    let nextVal = false;
    let artTitleOrType = "아트워크";

    const updatedFilms = content.films.map((film) => {
      if (film.id !== filmId) return film;
      const hasArtworks = Array.isArray(film.artworks) && film.artworks.length > 0;

      if (!hasArtworks || artworkIndex === -1) {
        // Fallback film poster
        const currentShow = film.showInMainArtworks === true;
        nextVal = !currentShow;
        artTitleOrType = film.title;
        return {
          ...film,
          showInMainArtworks: nextVal,
        };
      }

      const rawArts = film.artworks || [];
      const updatedArts = rawArts.map((artItem, idx) => {
        const art: ArtworkEntry =
          typeof artItem === "string"
            ? { id: `art-${idx}`, imageUrl: artItem, type: "메인/오리지널 포스터", showInMain: false }
            : { ...artItem };
        if (idx !== artworkIndex) return art;
        const currentShow = art.showInMain === true;
        nextVal = !currentShow;
        artTitleOrType = art.title || art.type || "아트워크";
        return {
          ...art,
          showInMain: nextVal,
        };
      });

      return {
        ...film,
        artworks: updatedArts,
      };
    });

    const updatedContent: SiteContent = {
      ...content,
      films: updatedFilms,
    };

    await handleSaveAdmin(updatedContent);
  };

  const handleUpdateArtworkDesignerDirect = async (filmId: string, artworkIndex: number, currentDesigner: string) => {
    const nextDesigner = window.prompt("이 아트워크의 디자이너(Designed by) 명칭을 입력하세요:", currentDesigner || "");
    if (nextDesigner === null) return;

    const updatedFilms = content.films.map((film) => {
      if (film.id !== filmId) return film;
      const rawArts = Array.isArray(film.artworks) && film.artworks.length > 0
        ? film.artworks
        : film.posterImage
        ? [{ imageUrl: film.posterImage, type: "메인/오리지널 포스터", designer: film.artworkDesigner || "", showInMain: film.showInMainArtworks === true }]
        : [];
      const updatedArts = rawArts.map((artItem, idx) => {
        const art = typeof artItem === "string" ? { imageUrl: artItem, type: "메인/오리지널 포스터", showInMain: false } : { ...artItem };
        if (idx !== artworkIndex) return art;
        return {
          ...art,
          designer: nextDesigner.trim(),
        };
      });
      return {
        ...film,
        artworks: updatedArts,
      };
    });

    const updatedContent: SiteContent = {
      ...content,
      films: updatedFilms,
    };

    await handleSaveAdmin(updatedContent);
  };

  const handleResetAdmin = async () => {
    if (confirm("사이트 데이터를 초기 샘플 상태로 복원하시겠습니까? 클라우드 데이터도 초기화됩니다.")) {
      setContent(INITIAL_CONTENT);
      safeRemoveStorage("lighthouse_content");
      try {
        await saveSiteContentToCloud(INITIAL_CONTENT);
      } catch (err) {
        console.warn("Cloud reset notice:", err);
      }
    }
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash === "#admin") {
      window.location.hash = "home";
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    safeRemoveStorage("lh_is_authenticated");
    setIsAdminOpen(false);
    if (window.location.hash === "#admin") {
      window.location.hash = "home";
    }
  };

  const handlePasswordChange = (newPw: string) => {
    setAdminPassword(newPw);
    safeSetStorage("lh_admin_pw", newPw);
  };

  const handleToggleStealth = (stealth: boolean) => {
    setStealthMode(stealth);
    safeSetStorage("lh_stealth_mode", stealth ? "true" : "false");
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    safeSetStorage("lh_is_authenticated", "true");
    setIsAuthModalOpen(false);
    setIsAdminOpen(true);
  };

  // Secret 5-click on Logo to trigger Admin Modal + smooth scroll to top
  const handleLogoClick = (e: React.MouseEvent) => {
    const state = logoClickRef.current;
    state.count += 1;
    if (state.timer) clearTimeout(state.timer);
    if (state.count >= 5) {
      state.count = 0;
      requestAdminAccess();
      return;
    } else {
      state.timer = setTimeout(() => {
        state.count = 0;
      }, 1500);
    }

    e.preventDefault();
    if (activeFilmId || isJournalPage) {
      setActiveFilmId(null);
      setIsJournalPage(false);
      setReadingJournalPost(null);
      window.location.hash = "home";
    } else {
      window.history.pushState(null, "", "#home");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (sectionId === "journal") {
      openJournalPage();
      return;
    }
    if (activeFilmId || isJournalPage) {
      setActiveFilmId(null);
      setIsJournalPage(false);
      setReadingJournalPost(null);
      window.location.hash = sectionId;
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      window.history.pushState(null, "", `#${sectionId}`);
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const activeFilm = activeFilmId
    ? content.films.find((f) => f.id === activeFilmId)
    : null;

  useEffect(() => {
    if (activeFilm) {
      document.title = `${activeFilm.title} — Lighthouse Co.`;
    } else if (isJournalPage) {
      if (readingJournalPost) {
        document.title = `${readingJournalPost.title} — Lighthouse Journal`;
      } else {
        document.title = "Journal — Lighthouse Co.";
      }
    } else {
      document.title = "Lighthouse Co.";
    }
  }, [activeFilm, isJournalPage, readingJournalPost]);

  return (
    <>
      {/* Floating Header */}
      <header className="float" role="banner">
        <a
          aria-label="LIGHTHOUSE home"
          className="identity"
          href="#home"
          onClick={handleLogoClick}
        >
          <img
            alt="LIGHTHOUSE"
            className="logo"
            src={resolveAssetUrl("/assets/aistudio/Lighthouse_a4cd72d2.png")}
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = resolveAssetUrl("/images/lighthouse-logo.png");
            }}
          />
          <span className="location">SEOUL · KOREA</span>
        </a>

        <nav className="nav" aria-label="Main Navigation">
          {(content.navItems || DEFAULT_NAV_ITEMS)
            .filter((item) => item.visible !== false)
            .map((item) => {
              const url = (item.url || "").trim();
              const isSectionHash = url.startsWith("#");

              if (isSectionHash) {
                const sectionId = url.replace(/^#/, "");
                return (
                  <a
                    key={item.id}
                    href={url}
                    onClick={(e) => scrollToSection(sectionId, e)}
                  >
                    {item.label}
                  </a>
                );
              }

              const isBlank = item.targetBlank !== false;
              return (
                <a
                  key={item.id}
                  href={url}
                  target={isBlank ? "_blank" : undefined}
                  rel={isBlank ? "noopener noreferrer" : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          {!stealthMode && (
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                requestAdminAccess();
              }}
              style={{
                color: "#f59e0b",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "0.12em",
              }}
              title="콘텐츠 및 메뉴 관리자 (보안 인증 필요)"
            >
              ADMIN 🔒
            </a>
          )}
        </nav>
      </header>

      {/* Main Site Container */}
      <main id="site" className={activeFilm || isJournalPage ? "hidden" : ""}>
        {/* Featured Hero Sticky Curtain Stack */}
        <section
          aria-label="Featured films and projects"
          className="features"
          id="home"
        >
          {finalHeroSlides.map((slide, index) => {
            const isFilm = slide.type === "film";
            const slideImg = resolveAssetUrl(slide.image);

            return (
              <section
                key={`${slide.type}-${slide.id}-${index}`}
                className="feature"
                ref={(el) => {
                  scenesRef.current[index] = el;
                }}
                style={{ zIndex: index + 1, "--z": index + 1 } as React.CSSProperties}
              >
                <div className="bg-wrapper">
                  {slideImg ? (
                    <img
                      alt=""
                      className="bg"
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding={index === 0 ? "sync" : "async"}
                      src={slideImg}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.style.opacity = "0";
                      }}
                    />
                  ) : null}
                </div>

                <div className="film-position">
                  {isFilm
                    ? "Lighthouse"
                    : slide.badgeTopLeft || "Lighthouse"}
                </div>

                {isFilm ? (
                  <a
                    className="feature-image-link"
                    href={`#film-${slide.id}`}
                    onClick={(e) => openFilmDetail(slide.id, e)}
                    aria-label={`${slide.title} — View film details`}
                  />
                ) : (
                  <a
                    className="feature-image-link"
                    href={slide.url}
                    aria-label={`${slide.title} — Explore project`}
                  />
                )}

                <div className="feature-bottom">
                  <div>
                    <div className="feature-name">{slide.title}</div>
                    {isFilm ? (
                      <div className="feature-name-ko">
                        {slide.titleKo}
                        {slide.release && (
                          <span className="feature-release-inline">
                            {slide.release}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="feature-name-ko">
                        <span>{slide.subtitle || slide.kicker}</span>
                      </div>
                    )}
                  </div>

                  {isFilm ? (
                    <a
                      className="feature-link"
                      href={`#film-${slide.id}`}
                      onClick={(e) => openFilmDetail(slide.id, e)}
                    >
                      EXPLORE ↗
                    </a>
                  ) : (
                    <a
                      className="feature-link"
                      href={slide.url}
                    >
                      {slide.ctaText ? (slide.ctaText.includes("↗") ? slide.ctaText : `${slide.ctaText} ↗`) : "EXPLORE ↗"}
                    </a>
                  )}
                </div>
              </section>
            );
          })}
        </section>

        {/* Programs Section */}
        <section className="programs" id="programs">
          <div className="section-top">
            <h2>PROGRAMS.</h2>
            <small>EXPLORE OUR FILMS ↘</small>
          </div>

          <div id="film-list">
            {content.films.slice(0, visibleCount).map((film) => (
              <a
                key={film.id}
                className="film-row"
                data-key={film.id}
                href={`#film-${film.id}`}
                onClick={(e) => openFilmDetail(film.id, e)}
              >
                <span className="title-wrap">
                  <span className="title">{film.title}</span>
                  <span className="title-ko">{film.titleKo}</span>
                </span>
                <span className="info">
                  {film.director.toUpperCase()} · {film.year} ↗
                </span>
              </a>
            ))}
          </div>

          {visibleCount < content.films.length && (
            <button
              className="programs-more"
              id="moreFilms"
              type="button"
              onClick={handleMoreFilms}
            >
              MORE ↓
            </button>
          )}
        </section>

        {/* Main Artworks Section (White Background, Horizontal Swipe Gallery) */}
        {content.artworksVisible !== false && (
          <ArtworksSection
            films={content.films}
            mainArtworkIds={content.mainArtworkIds}
            onSelectFilm={(id) => openFilmDetail(id)}
            onZoomImage={(item) => setLightboxImage(item)}
          />
        )}

        {/* Director Note Section (Multi-Note Stacked Cinematic Sections) */}
        {content.directorNotesVisible !== false && (() => {
          const rawNotes = Array.isArray(content.directorNotes) && content.directorNotes.length > 0
            ? content.directorNotes
            : (content.director?.quote
                ? [{ id: "note-1", quote: content.director.quote, photo: content.director.photo, directorName: content.director.name, visible: true }]
                : []);
          const visibleNotes = rawNotes.filter((n) => n && n.visible !== false && n.quote?.trim());

          if (visibleNotes.length === 0) return null;

          return (
            <div className="director-notes-container" id="director-note">
              {visibleNotes.map((note, idx) => {
                const photoUrl = resolveAssetUrl(note.photo || "");
                return (
                  <section
                    key={note.id || `note-${idx}`}
                    aria-label={`Director comment ${idx + 1}`}
                    className="director-note"
                  >
                    <div className="director-note__grid">
                      <div
                        aria-label="감독 사진 배경"
                        className={`director-note__portrait ${photoUrl ? "has-photo" : ""}`}
                        role="img"
                        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
                      >
                        <div className="director-note__content">
                          <p
                            className="director-note__quote-ko"
                            lang="ko"
                            style={{ whiteSpace: "pre-line", wordBreak: "keep-all" }}
                          >
                            {note.quote}
                          </p>
                          {(note.directorName || note.filmTitle) && (
                            <div className="director-note__attribution">
                              {note.directorName && (
                                <span className="director-note__author">— {note.directorName}</span>
                              )}
                              {note.filmTitle && (
                                <span className="director-note__film">〈{note.filmTitle}〉</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })()}

        {/* About Section */}
        <section className="about" id="about">
          <h2>ABOUT.</h2>
          <div className="about-bilingual">
            <div className="about-ko" lang="ko">
              {(() => {
                const koText = content.about?.ko ?? INITIAL_CONTENT.about?.ko ?? "";
                const paragraphs = koText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
                if (paragraphs.length === 0 && koText.trim()) {
                  return <p style={{ whiteSpace: "pre-line" }}>{koText}</p>;
                }
                return paragraphs.map((paragraph, idx) => (
                  <p key={idx} style={{ whiteSpace: "pre-line" }}>
                    {paragraph}
                  </p>
                ));
              })()}
            </div>
            <div className="about-en" lang="en">
              {(() => {
                const enText = content.about?.en ?? INITIAL_CONTENT.about?.en ?? "";
                const paragraphs = enText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
                if (paragraphs.length === 0 && enText.trim()) {
                  return <p style={{ whiteSpace: "pre-line" }}>{enText}</p>;
                }
                return paragraphs.map((paragraph, idx) => (
                  <p key={idx} style={{ whiteSpace: "pre-line" }}>
                    {paragraph}
                  </p>
                ));
              })()}
            </div>
          </div>

          {/* User Request: ABOUT 글 하단에 JOURNAL 네모 박스 링크 */}
          <div className="about-journal-action">
            <a
              href="#journal"
              className="about-journal-box-btn"
              onClick={(e) => {
                e.preventDefault();
                openJournalPage();
              }}
            >
              JOURNAL
            </a>
          </div>
        </section>

        {/* Journal Section (저널 게시판) */}
        {content.journalVisible !== false && (() => {
          const rawPosts = content.journalPosts && content.journalPosts.length > 0
            ? content.journalPosts
            : (INITIAL_CONTENT.journalPosts || []);
          const visiblePosts = rawPosts.filter((p) => {
            if (p.visibleOnMain !== undefined) return p.visibleOnMain === true;
            return p.visible !== false;
          });
          if (visiblePosts.length === 0) return null;

          const categories = [
            "ALL",
            ...Array.from(new Set(visiblePosts.map((p) => (p.category || "").trim().toUpperCase()).filter(Boolean))),
          ];
          const filteredPosts = journalCategoryFilter === "ALL"
            ? visiblePosts
            : visiblePosts.filter((p) => (p.category || "").trim().toUpperCase() === journalCategoryFilter);

          return (
            <section className="journal-section" id="journal" aria-label="Lighthouse Journal">
              <div className="journal-header">
                <div className="journal-kicker">ESSAYS, CRITIQUE &amp; CINEMA ARCHIVE</div>
                <h2>JOURNAL.</h2>
              </div>

              {/* Category Filter Buttons */}
              {categories.length > 2 && (
                <div className="journal-filters" role="tablist">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={journalCategoryFilter === cat}
                      className={`journal-filter-btn ${journalCategoryFilter === cat ? "active" : ""}`}
                      onClick={() => setJournalCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Posts Grid */}
              <div className="journal-grid">
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="journal-card"
                    tabIndex={0}
                    onClick={() => openJournalPage(post.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openJournalPage(post.id);
                      }
                    }}
                  >
                    {post.imageUrl ? (
                      <div className="journal-card-media">
                        <img
                          alt={post.title}
                          className="journal-card-img"
                          loading="lazy"
                          decoding="async"
                          src={resolveAssetUrl(post.imageUrl)}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            const parent = target.parentElement;
                            if (parent) parent.style.display = "none";
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="journal-card-body">
                      <div className="journal-card-meta">
                        {post.category ? (
                          <span className="journal-card-tag">{post.category}</span>
                        ) : (
                          <span className="journal-card-tag">JOURNAL</span>
                        )}
                        <span className="journal-card-date">{post.date}</span>
                      </div>

                      <h3 className="journal-card-title">{post.title}</h3>
                      {post.subtitle && (
                        <p className="journal-card-sub">{post.subtitle}</p>
                      )}

                      <p className="journal-card-snippet">{post.content}</p>

                      <div className="journal-card-footer">
                        <span>{post.author || "LIGHTHOUSE"}</span>
                        <span className="journal-card-arrow">READ ARTICLE →</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Featured Projects / Promo Section */}
        {content.promosVisible !== false && (() => {
          const promoItems = (content.promos && content.promos.length > 0 ? content.promos : INITIAL_CONTENT.promos)
            .filter((item) => item.visible !== false);
          if (promoItems.length === 0) return null;

          return (
            <section
              aria-label="Featured projects"
              className="promo-section"
              id="feature-promo"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
                {promoItems.map((item, idx) => (
                  <a
                    key={item.id || idx}
                    aria-label={`${item.subtitle || 'Featured Project'} - inquire`}
                    className="promo-card"
                    href={item.url}
                  >
                    {item.image ? (
                      <img
                        alt="LIGHTHOUSE FEATURED PROJECT"
                        className="promo-photo"
                        loading="lazy"
                        decoding="async"
                        src={resolveAssetUrl(item.image)}
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.onerror = null;
                          img.style.opacity = "0";
                        }}
                      />
                    ) : null}
                    <div className="promo-shade" />
                    <div className="promo-header">
                      <span>{item.badgeTopLeft || "LIGHTHOUSE / FEATURED PROJECT"}</span>
                      <span>{item.badgeTopRight || `0${idx + 1} — SPECIAL PROJECT`}</span>
                    </div>
                    <div className="promo-bottom">
                      <div className="promo-copy">
                        <span className="promo-kicker">{item.kicker || "EXPLORE BEYOND THE SCREEN"}</span>
                        <h2>
                          {(item.titleLines || []).map((line, lIdx) => (
                            <React.Fragment key={lIdx}>
                              {line}
                              {lIdx < item.titleLines.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </h2>
                        <p>{item.subtitle}</p>
                      </div>
                      <span className="promo-cta">
                        {item.ctaText || "STORE / EXPLORE"} <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Contact Section */}
        <section className="contact" id="contact">
          {/* Hidden iframe for native form submission targeting (prevents CORS redirect blockage) */}
          <iframe
            name="inquiry_target_iframe"
            id="inquiry_target_iframe"
            title="Google Apps Script Endpoint Target"
            style={{ display: "none" }}
          />

          <div className="contact-grid">
            {/* Left Column: Title, Intro & Official Links */}
            <div className="contact-info-col">
              <h2>CONTACT.</h2>
              <div className="contact-lead-box">
                <p className="contact-lead-title">
                  Lighthouse Co
                </p>
                <p className="contact-lead-desc">
                  영화 배급 및 프로젝트 협업, 상영에 관한 문의는<br />
                  이메일 혹은 &apos;문의 접수하기&apos; 폼을 통해 접수 부탁드리겠습니다.
                </p>
              </div>

              <div className="contact-links">
                <div
                  className="contact-plain-email"
                  style={{
                    padding: "24px 0",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "clamp(17px, 1.8vw, 26px)",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "#eae8e3",
                    userSelect: "all",
                  }}
                >
                  keeper@lighthouse.re.kr
                </div>
                <a
                  href={content.contact?.youtubeUrl || "https://www.youtube.com/channel/UCZGkkk92ozbMX4Zo3WYCSbg"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="contact-val">YouTube</span>
                  <span className="contact-arrow">↗</span>
                </a>
                <a
                  href={content.contact?.instagramUrl || "https://www.instagram.com/filmlighthouse"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="contact-val">Instagram</span>
                  <span className="contact-arrow">↗</span>
                </a>
                <a
                  href={content.contact?.xUrl || "https://x.com/filmxlighthouse"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="contact-val">X</span>
                  <span className="contact-arrow">↗</span>
                </a>
              </div>
            </div>

            {/* Right Column: Cinema-Grade Inquiry Form connected to Google Apps Script */}
            <div className="contact-form-col">
              <div className="inquiry-card">
                <div className="inquiry-card-header">
                  <div className="inquiry-kicker">
                    <span className="inquiry-kicker-dot" />
                    <span>ONLINE INQUIRY FORM</span>
                  </div>
                  <h3 className="inquiry-heading">문의 접수하기</h3>
                  <p className="inquiry-subheading">
                    접수된 문의는 담당자 확인 후 회신드리겠습니다.
                  </p>
                </div>

                {inquiryStatus === "success" ? (
                  <div className="inquiry-success-view">
                    <div className="inquiry-success-icon-wrap">
                      <Check className="inquiry-success-icon" size={30} />
                    </div>
                    <h4>문의가 정상적으로 접수되었습니다.</h4>
                    <p className="inquiry-success-sub">
                      입력하신 문의 사항이 라이트하우스로 전송되었습니다.
                      담당자가 확인 후 남겨주신 연락처로 정성껏 회신해 드리겠습니다.
                    </p>

                    {submittedData && (
                      <div className="inquiry-summary-card">
                        <div className="inquiry-summary-row">
                          <span className="inquiry-summary-label">성함 / 단체명</span>
                          <span className="inquiry-summary-val">{submittedData.name}</span>
                        </div>
                        <div className="inquiry-summary-row">
                          <span className="inquiry-summary-label">문의 유형</span>
                          <span className="inquiry-summary-val inquiry-summary-pill">{submittedData.category}</span>
                        </div>
                        <div className="inquiry-summary-row">
                          <span className="inquiry-summary-label">회신 연락처</span>
                          <span className="inquiry-summary-val">{submittedData.contact}</span>
                        </div>
                        <div className="inquiry-summary-row">
                          <span className="inquiry-summary-label">접수 일시</span>
                          <span className="inquiry-summary-val">{submittedData.time}</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="inquiry-reset-btn"
                      onClick={handleResetInquiryForm}
                    >
                      새로운 문의 작성하기 ↗
                    </button>
                  </div>
                ) : (
                  <form
                    ref={inquiryFormRef}
                    action={
                      content.contact?.inquiryEndpoint?.trim() ||
                      INITIAL_CONTENT.contact?.inquiryEndpoint ||
                      "https://script.google.com/macros/s/AKfycbx5J9UTRPe0IM9mRuEUbhs9fjDnJOZgqgiGfTlD9DyQEOpJ-TDCTArqym1iRo3o-_qVqg/exec"
                    }
                    method="POST"
                    target="inquiry_target_iframe"
                    onSubmit={handleSubmitInquiry}
                    className="inquiry-form-inner"
                  >
                    {/* Hidden inputs to guarantee Google Apps Script receives all parameter formats */}
                    <input type="hidden" name="name" value={inquiryName} />
                    <input type="hidden" name="이름" value={inquiryName} />
                    <input type="hidden" name="email" value={inquiryContact} />
                    <input type="hidden" name="contact" value={inquiryContact} />
                    <input type="hidden" name="연락처" value={inquiryContact} />
                    <input type="hidden" name="phone" value={inquiryContact} />
                    <input type="hidden" name="category" value={inquiryCategory} />
                    <input type="hidden" name="문의유형" value={inquiryCategory} />
                    <input
                      type="hidden"
                      name="subject"
                      value={`[${inquiryCategory}] ${inquiryName.trim() || "방문자"}님의 문의`}
                    />
                    <input
                      type="hidden"
                      name="제목"
                      value={`[${inquiryCategory}] ${inquiryName.trim() || "방문자"}님의 문의`}
                    />
                    <input type="hidden" name="message" value={inquiryMessage} />
                    <input type="hidden" name="문의내용" value={inquiryMessage} />
                    <input type="hidden" name="timestamp" value={new Date().toISOString()} />
                    <input
                      type="hidden"
                      name="접수일시"
                      value={new Date().toLocaleString("ko-KR")}
                    />

                    {/* Category Selector (3 Categories: 배급/협업 제안, 상영 문의, 기타) */}
                    <div className="inquiry-field-group">
                      <label className="inquiry-label">
                        <span>문의 유형 / CATEGORY</span>
                        <span className="inquiry-required-mark">*</span>
                      </label>
                      <div className="inquiry-category-chips">
                        {[
                          "배급/협업 제안",
                          "상영 문의",
                          "기타",
                        ].map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            className={`inquiry-cat-chip ${inquiryCategory === cat ? "active" : ""}`}
                            onClick={() => setInquiryCategory(cat)}
                          >
                            {inquiryCategory === cat && <span className="cat-chip-dot">●</span>}
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name / Organization */}
                    <div className="inquiry-field-group">
                      <label className="inquiry-label" htmlFor="inquiry-name-input">
                        <span>성함 또는 단체 / 회사명</span>
                        <span className="inquiry-required-mark">*</span>
                      </label>
                      <input
                        id="inquiry-name-input"
                        type="text"
                        required
                        className="inquiry-text-input"
                        placeholder="예: 닐 하위 또는 서머아일"
                        value={inquiryName}
                        onChange={(e) => {
                          setInquiryName(e.target.value);
                          if (inquiryErrorMsg) setInquiryErrorMsg(null);
                        }}
                      />
                    </div>

                    {/* Email / Contact */}
                    <div className="inquiry-field-group">
                      <label className="inquiry-label" htmlFor="inquiry-contact-input">
                        <span>연락처 (이메일 / 휴대전화)</span>
                        <span className="inquiry-required-mark">*</span>
                      </label>
                      <input
                        id="inquiry-contact-input"
                        type="text"
                        required
                        className="inquiry-text-input"
                        placeholder="예: kozue@eureka.com / 010-0000-0000"
                        value={inquiryContact}
                        onChange={(e) => {
                          setInquiryContact(e.target.value);
                          if (inquiryErrorMsg) setInquiryErrorMsg(null);
                        }}
                      />
                    </div>

                    {/* Message */}
                    <div className="inquiry-field-group">
                      <label className="inquiry-label" htmlFor="inquiry-message-input">
                        <span>문의 내용 / MESSAGE</span>
                        <span className="inquiry-required-mark">*</span>
                      </label>
                      <textarea
                        id="inquiry-message-input"
                        required
                        rows={3}
                        className="inquiry-textarea-input"
                        placeholder="문의하실 구체적인 내용을 자유롭게 작성해 주세요."
                        value={inquiryMessage}
                        onChange={(e) => {
                          setInquiryMessage(e.target.value);
                          if (inquiryErrorMsg) setInquiryErrorMsg(null);
                        }}
                      />
                    </div>

                    {/* Inline Error Notice */}
                    {inquiryErrorMsg && (
                      <div className="inquiry-error-banner">
                        <AlertCircle size={15} />
                        <span>{inquiryErrorMsg}</span>
                      </div>
                    )}

                    {/* Notice */}
                    <p className="inquiry-privacy-notice">
                      보내주신 정보는 문의 확인 및 회신 안내를 위한 용도로만 이용됩니다.
                    </p>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={inquiryStatus === "submitting"}
                      className="inquiry-submit-action"
                    >
                      {inquiryStatus === "submitting" ? (
                        <>
                          <Loader2 size={16} className="inquiry-spinner animate-spin" />
                          <span>전송 중입니다...</span>
                        </>
                      ) : (
                        <>
                          <span>문의 접수하기 — SEND INQUIRY</span>
                          <ArrowUpRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="contact-copyright-badge">
            <span>© LIGHTHOUSE. ALL RIGHTS RESERVED.</span>
            <span className="contact-meta-dot">●</span>
            <span>SEOUL, KOREA</span>
          </div>
        </section>
      </main>

      {/* Film Detail View */}
      {activeFilm && (
        <article
          aria-live="polite"
          className="detail active"
          id="detail"
        >
          <button
            className="back"
            type="button"
            id="filmBack"
            onClick={closeDetail}
          >
            ← HOME
          </button>
          <h1>{activeFilm.title}</h1>
          <div className="detail-ko">{activeFilm.titleKo}</div>
          {(() => {
            const hasDirector = Boolean(activeFilm.director && activeFilm.director.trim());
            const hasYear = Boolean(activeFilm.year && activeFilm.year.trim());
            const hasCustomPrefix = Boolean(activeFilm.bylinePrefix && activeFilm.bylinePrefix.trim());

            if (!hasDirector && !hasYear && !hasCustomPrefix) {
              return null;
            }

            const prefixUpper = (activeFilm.bylinePrefix?.trim() || "").toUpperCase();
            const isExplicitFilm = prefixUpper === "A FILM BY" || (activeFilm.directorLabel?.toUpperCase() === "DIRECTOR");
            const defaultPrefix = isExplicitFilm ? "A FILM BY" : "A PROGRAM BY";
            const prefix = (activeFilm.bylinePrefix?.trim() || defaultPrefix).toUpperCase();

            let text = prefix;
            if (hasDirector) {
              text += ` ${activeFilm.director.trim().toUpperCase()}`;
            }
            if (hasYear) {
              text += hasDirector ? ` · ${activeFilm.year.trim()}` : ` ${activeFilm.year.trim()}`;
            }

            return <div className="byline">{text}</div>;
          })()}
          {activeFilm.heroImage ? (
            <img
              alt={activeFilm.title}
              className="still"
              src={resolveAssetUrl(activeFilm.heroImage)}
              onError={(e) => {
                const img = e.currentTarget;
                img.onerror = null;
                img.style.opacity = "0";
              }}
            />
          ) : null}

          {/* Media Showcase: Left Poster & Right Playable YouTube Trailer (both optional) */}
          {(() => {
            const hasPoster = Boolean(activeFilm.posterImage && activeFilm.posterImage.trim());
            const youtubeId = getYouTubeVideoId(activeFilm.youtubeUrl);
            const hasVideo = Boolean(youtubeId);

            if (!hasPoster && !hasVideo) {
              return null;
            }

            return (
              <div className="detail-media-showcase">
                {/* Left: Film Poster (shown only if posterImage is provided) */}
                {hasPoster && (
                  <div className="detail-poster-col">
                    <div className="detail-media-label">
                      <span>OFFICIAL POSTER</span>
                      <span style={{ fontSize: "10px", color: "#888", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <ZoomIn size={10} /> 클릭하여 확대
                      </span>
                    </div>
                    <div
                      className="detail-poster-frame"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setLightboxImage({
                          url: activeFilm.posterImage,
                          title: activeFilm.title,
                          titleKo: activeFilm.titleKo,
                          type: "OFFICIAL POSTER",
                          designer: activeFilm.artworkDesigner,
                        })
                      }
                      title={`${activeFilm.title} 공식 포스터 (클릭하여 확대보기)`}
                      style={{ cursor: "zoom-in" }}
                    >
                      <img
                        alt={`${activeFilm.title} Official Poster`}
                        src={activeFilm.posterImage}
                        onError={(e) => {
                          const col = (e.currentTarget as HTMLElement).closest(".detail-poster-col") as HTMLElement | null;
                          if (col) col.style.display = "none";
                        }}
                      />
                      <div className="detail-artwork-zoom-icon">
                        <ZoomIn size={14} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Right: Playable YouTube Trailer (shown only if valid YouTube link is provided) */}
                {hasVideo && youtubeId && (
                  <div className="detail-video-col">
                    <div className="detail-media-label">
                      <span>OFFICIAL TRAILER</span>
                      <span style={{ color: "#f59e0b", fontSize: "10px", fontWeight: 600 }}>
                        ● YOUTUBE
                      </span>
                    </div>
                    <div className="detail-video-player-wrap">
                      <iframe
                        title={`${activeFilm.title} Official Trailer`}
                        src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="details">
            <div>
              <p style={{ marginBottom: "1.5rem", whiteSpace: "pre-line" }}>
                {activeFilm.summaryKo || activeFilm.summary}
              </p>
              {activeFilm.summaryKo && (
                <p style={{ color: "#aaa", fontSize: "0.95em", whiteSpace: "pre-line" }}>
                  {activeFilm.summary}
                </p>
              )}
            </div>
            <aside>
              {activeFilm.director && activeFilm.director.trim() ? (() => {
                const isExplicitFilm = (activeFilm.bylinePrefix?.trim() || "").toUpperCase() === "A FILM BY";
                const roleLabel = (
                  activeFilm.directorLabel?.trim() ||
                  (isExplicitFilm && !activeFilm.directorLabel ? "DIRECTOR" : "PROGRAMMER")
                ).toUpperCase();
                return <div>{roleLabel} — {activeFilm.director.trim()}</div>;
              })() : null}
              {activeFilm.year && activeFilm.year.trim() ? (
                <div>YEAR — {activeFilm.year.trim()}</div>
              ) : null}
              {activeFilm.release && activeFilm.release.trim() ? (
                <div>RELEASE IN KOREA — {activeFilm.release.trim()}</div>
              ) : null}
              {activeFilm.country && activeFilm.country.trim() ? (
                <div>COUNTRY — {activeFilm.country.trim()}</div>
              ) : null}
              {activeFilm.runtime && activeFilm.runtime.trim() ? (
                <div>RUNTIME — {activeFilm.runtime.trim()}</div>
              ) : null}
              {activeFilm.bookingButtonVisible !== false && (
                <div style={{ marginTop: "1.5rem" }}>
                  <a
                    href={
                      activeFilm.bookingButtonUrl && activeFilm.bookingButtonUrl.trim()
                        ? activeFilm.bookingButtonUrl.trim()
                        : `mailto:keeper@lighthouse.re.kr?subject=${encodeURIComponent(
                            `[LIGHTHOUSE] Program Inquiry - ${activeFilm.title}`
                          )}`
                    }
                    target={
                      activeFilm.bookingButtonUrl && activeFilm.bookingButtonUrl.startsWith("http")
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      activeFilm.bookingButtonUrl && activeFilm.bookingButtonUrl.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "1px solid rgba(255,255,255,0.4)",
                      padding: "8px 16px",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      marginTop: "12px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>{activeFilm.bookingButtonText?.trim() || "BOOKING & PRESS INQUIRY"}</span>
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              )}
            </aside>
          </div>

          {/* Program Lineup Section (어 프로그램 바이 선택 시 관련 영화들을 아트워크 상단에 작게 보여주고 클릭 시 영화 상세 페이지로 이동) */}
          {(() => {
            const isProgram =
              (activeFilm.bylinePrefix?.trim() || "").toUpperCase() === "A PROGRAM BY" ||
              activeFilm.directorLabel === "PROGRAMMER" ||
              (activeFilm.programFilmIds && activeFilm.programFilmIds.length > 0);

            if (!isProgram) return null;

            const lineupFilms = (activeFilm.programFilmIds || [])
              .map((subId) => content.films.find((f) => f.id === subId))
              .filter((f): f is Film => Boolean(f));

            return (
              <div className="program-lineup-section">
                <div className="program-lineup-header">
                  <div>
                    <h3 className="program-lineup-title">INCLUDED FILMS</h3>
                    <p className="program-lineup-sub">
                      PROGRAM LINEUP · 수록 상영작 ({lineupFilms.length}편)
                    </p>
                  </div>
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setIsAdminOpen(true)}
                      className="program-lineup-admin-link"
                      title="어드민에서 수록 영화 편집"
                    >
                      <Plus size={12} />
                      어드민에서 수록작 변경
                    </button>
                  )}
                </div>

                {lineupFilms.length > 0 ? (
                  <div className="program-lineup-grid">
                    {lineupFilms.map((subFilm) => (
                      <div
                        key={subFilm.id}
                        className="program-lineup-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => openFilmDetail(subFilm.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openFilmDetail(subFilm.id);
                          }
                        }}
                        title={`${subFilm.title} 상세 페이지로 이동`}
                      >
                        <div className="program-lineup-card-thumb">
                          {subFilm.stillUrl || subFilm.heroImage || subFilm.posterImage ? (
                            <img
                              src={resolveAssetUrl(subFilm.stillUrl || subFilm.heroImage || subFilm.posterImage || "")}
                              alt={subFilm.title}
                              loading="lazy"
                            />
                          ) : (
                            <div className="program-lineup-card-no-thumb">FILM</div>
                          )}
                          <div className="program-lineup-card-badge">
                            <span>VIEW</span>
                            <ArrowUpRight size={12} />
                          </div>
                        </div>

                        <div className="program-lineup-card-info">
                          <h4 className="program-lineup-card-title">{subFilm.title}</h4>
                          {subFilm.titleKo && (
                            <div className="program-lineup-card-title-ko">{subFilm.titleKo}</div>
                          )}
                          <div className="program-lineup-card-meta">
                            {subFilm.director && <span>{subFilm.director}</span>}
                            {subFilm.year && <span> · {subFilm.year}</span>}
                            {subFilm.runtime && <span> · {subFilm.runtime}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="program-lineup-empty">
                    <p style={{ margin: 0, fontSize: "12px", color: "#777" }}>
                      현재 등록된 프로그램 수록 영화가 없습니다.
                    </p>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setIsAdminOpen(true)}
                        style={{
                          marginTop: "8px",
                          background: "#181818",
                          border: "1px solid rgba(229, 9, 20, 0.4)",
                          color: "#f87171",
                          padding: "6px 12px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Plus size={12} />
                        어드민에서 수록작 선택하기
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Film Specific Artworks / Poster Archive Gallery */}
          {(() => {
            // Check for explicitly registered artworks
            const validArtworks = Array.isArray(activeFilm.artworks)
              ? activeFilm.artworks.filter((item) => {
                  if (typeof item === "string") return Boolean(item.trim());
                  if (item && typeof item === "object") return Boolean(item.imageUrl && item.imageUrl.trim());
                  return false;
                })
              : [];

            const hasValidArtworks = validArtworks.length > 0;

            // Check for explicitly registered official poster (heroImage 스틸컷은 절대 포스터/아트워크로 자동 대체하지 않음)
            const registeredPoster =
              (activeFilm.posterImage && activeFilm.posterImage.trim()) ||
              (activeFilm.mainArtworkImage && activeFilm.mainArtworkImage.trim()) ||
              "";

            // 포스터나 아트워크를 등록해야만 보이도록 처리 (자동 노출 방지)
            if (!hasValidArtworks && !registeredPoster) {
              return null;
            }

            const rawList = hasValidArtworks
              ? validArtworks
              : [{
                  id: `${activeFilm.id}-poster`,
                  imageUrl: registeredPoster,
                  type: "공식 포스터",
                  title: activeFilm.titleKo || activeFilm.title,
                  designer: activeFilm.artworkDesigner || "",
                  showInMain: activeFilm.showInMainArtworks === true,
                }];

            const detailArtworks = rawList
              .map((item, idx) => {
                if (typeof item === "string") {
                  const trimmed = item.trim();
                  return trimmed
                    ? {
                        id: `art-${idx}`,
                        artworkIndex: hasValidArtworks ? idx : -1,
                        imageUrl: trimmed,
                        type: "메인/오리지널 포스터",
                        title: "",
                        designer: activeFilm.artworkDesigner || "",
                        showInMain: false,
                      }
                    : null;
                }
                if (item && typeof item === "object" && typeof item.imageUrl === "string" && item.imageUrl.trim()) {
                  const isShow = hasValidArtworks
                    ? (item.showInMain === true)
                    : (activeFilm.showInMainArtworks === true);
                  return {
                    id: item.id || `art-${idx}`,
                    artworkIndex: hasValidArtworks ? idx : -1,
                    imageUrl: item.imageUrl.trim(),
                    type: item.type?.trim() || "메인/오리지널 포스터",
                    title: item.title?.trim() || "",
                    designer:
                      typeof item.designer === "string" && item.designer.trim()
                        ? item.designer.trim()
                        : (activeFilm.artworkDesigner || ""),
                    showInMain: isShow,
                  };
                }
                return null;
              })
              .filter(Boolean) as { id: string; artworkIndex: number; imageUrl: string; type: string; title: string; designer: string; showInMain: boolean }[];

            if (detailArtworks.length === 0) return null;

            return (
              <div className="detail-artworks-section">
                <div className="detail-artworks-header">
                  <div>
                    <h3>ARTWORKS & POSTER ARCHIVE</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", letterSpacing: "0.08em", color: "#888" }}>
                      POSTERS & VISUAL ARCHIVE ({detailArtworks.length})
                    </p>
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setIsAdminOpen(true)}
                      style={{
                        background: "#181818",
                        border: "1px solid rgba(245, 158, 11, 0.6)",
                        color: "#f59e0b",
                        padding: "6px 14px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="어드민 관리창을 열어 이 영화의 아트워크를 추가/수정합니다"
                    >
                      <Plus size={12} />
                      어드민에서 아트워크 추가/관리
                    </button>
                  )}
                </div>
                <div className="detail-artworks-grid">
                  {detailArtworks.map((art) => (
                    <div
                      key={art.id}
                      className="detail-artwork-item"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setLightboxImage({
                          url: art.imageUrl,
                          title: activeFilm.title,
                          titleKo: activeFilm.titleKo,
                          type: art.type,
                          designer: art.designer,
                          subtitle: art.title,
                        })
                      }
                      title={`${activeFilm.title} - ${art.type}${art.designer ? ` (Designed by ${art.designer})` : ""}${art.title ? ` - ${art.title}` : ""} (클릭하여 확대보기)`}
                      style={{ cursor: "zoom-in" }}
                    >
                      <img
                        alt={`${activeFilm.title} ${art.type}`}
                        src={resolveAssetUrl(art.imageUrl)}
                        onError={(e) => {
                          const item = (e.currentTarget as HTMLElement).closest(".detail-artwork-item") as HTMLElement | null;
                          if (item) item.style.display = "none";
                        }}
                      />
                      <div className="detail-artwork-zoom-icon">
                        <ZoomIn size={14} />
                      </div>
                      <div className="detail-artwork-overlay">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                          <span className="detail-artwork-type-badge">{art.type}</span>
                          {art.designer ? (
                            <span style={{ fontSize: "9px", color: "#f59e0b", letterSpacing: "0.08em", fontWeight: 700, border: "1px solid rgba(245, 158, 11, 0.4)", padding: "1px 5px", background: "rgba(0,0,0,0.6)" }}>
                              DESIGNED BY {art.designer.toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                        {art.title && <span className="detail-artwork-title">{art.title}</span>}

                        {/* Admin Inline Controls on Film Detail Page */}
                        {isAuthenticated && (
                          <div
                            style={{
                              marginTop: "8px",
                              paddingTop: "6px",
                              borderTop: "1px solid rgba(255,255,255,0.2)",
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                              justifyContent: "space-between",
                              pointerEvents: "auto",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleArtworkMainExposure(activeFilm.id, art.artworkIndex);
                              }}
                              style={{
                                background: art.showInMain ? "rgba(34, 197, 94, 0.22)" : "#161616",
                                border: art.showInMain ? "1.5px solid #22c55e" : "1.5px solid rgba(255, 255, 255, 0.25)",
                                color: art.showInMain ? "#4ade80" : "#888",
                                padding: "4px 8px",
                                fontSize: "9.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                boxShadow: art.showInMain ? "0 0 6px rgba(34, 197, 94, 0.25)" : "none",
                              }}
                              title="클릭하여 메인화면 아트워크 섹션에 노출/숨김 전환"
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: art.showInMain ? "#22c55e" : "#666",
                                  boxShadow: art.showInMain ? "0 0 4px #22c55e" : "none",
                                  display: "inline-block",
                                }}
                              />
                              {art.showInMain ? "메인 노출 ON" : "메인 숨김 OFF"}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateArtworkDesignerDirect(activeFilm.id, art.artworkIndex, art.designer);
                              }}
                              style={{
                                background: "rgba(245, 158, 11, 0.2)",
                                border: "1px solid #f59e0b",
                                color: "#f59e0b",
                                padding: "3px 6px",
                                fontSize: "9px",
                                fontWeight: 800,
                                cursor: "pointer",
                                letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}
                              title="클릭하여 이 아트워크의 디자이너(Designed by) 변경"
                            >
                              디자이너 수정 ✎
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </article>
      )}

      {/* Dedicated Journal Board Page (게시판 페이지) */}
      {isJournalPage && (() => {
        const rawPosts = content.journalPosts && content.journalPosts.length > 0
          ? content.journalPosts
          : (INITIAL_CONTENT.journalPosts || []);
        const visiblePosts = rawPosts.filter((p) => {
          if (p.visibleOnBoard !== undefined) return p.visibleOnBoard === true;
          return p.visible !== false;
        });

        // Filter by category and search query
        const categories = [
          "ALL",
          ...Array.from(new Set(visiblePosts.map((p) => (p.category || "").trim().toUpperCase()).filter(Boolean))),
        ];

        const filteredPosts = visiblePosts.filter((post) => {
          const matchCat = journalCategoryFilter === "ALL" || (post.category || "").trim().toUpperCase() === journalCategoryFilter;
          const query = journalSearchQuery.trim().toLowerCase();
          const matchQuery = !query ||
            post.title.toLowerCase().includes(query) ||
            (post.subtitle && post.subtitle.toLowerCase().includes(query)) ||
            (post.author && post.author.toLowerCase().includes(query)) ||
            post.content.toLowerCase().includes(query);
          return matchCat && matchQuery;
        });

        // Reading post index for prev/next navigation
        const currentPost = readingJournalPost;
        const currentIdx = currentPost ? visiblePosts.findIndex((p) => p.id === currentPost.id) : -1;
        const prevPost = currentIdx > 0 ? visiblePosts[currentIdx - 1] : null;
        const nextPost = currentIdx >= 0 && currentIdx < visiblePosts.length - 1 ? visiblePosts[currentIdx + 1] : null;

        return (
          <article
            aria-live="polite"
            className="journal-page active"
            id="journal-page"
          >
            {/* Top Navigation Bar: Identical typographic style to main site menu */}
            <div className="journal-page-top-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={closeJournalPage}
                  className="journal-nav-link"
                  title="홈 화면으로 이동"
                >
                  <ArrowLeft size={13} />
                  <span>HOME</span>
                </button>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>/</span>
                <nav style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }} aria-label="Journal Page Navigation">
                  <button
                    type="button"
                    onClick={(e) => scrollToSection("programs", e)}
                    className="journal-nav-link"
                  >
                    PROGRAMS
                  </button>
                  <span className="journal-nav-link active" aria-current="page">
                    JOURNAL
                  </span>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection("about", e)}
                    className="journal-nav-link"
                  >
                    ABOUT
                  </button>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection("contact", e)}
                    className="journal-nav-link"
                  >
                    CONTACT
                  </button>
                </nav>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#888884" }}>
                  {visiblePosts.length} ARTICLES
                </span>
              </div>
            </div>

            {/* If user is reading a specific post: render article view */}
            {currentPost ? (
              <div className="journal-article-container">
                <div className="journal-article-top-action">
                  <button
                    type="button"
                    className="journal-nav-link"
                    onClick={() => {
                      setReadingJournalPost(null);
                      window.location.hash = "journal";
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>BACK TO JOURNAL INDEX</span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>
                      #{String(currentIdx + 1).padStart(2, "0")} / {visiblePosts.length}
                    </span>
                    <button
                      type="button"
                      onClick={closeJournalPage}
                      className="journal-nav-link"
                      title="홈 화면으로 이동"
                    >
                      <span>HOME →</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px", marginBottom: "20px" }}>
                  <span className="journal-card-tag">{currentPost.category || "ESSAY"}</span>
                  <span style={{ fontSize: "12px", color: "#888", letterSpacing: "0.05em" }}>{currentPost.date}</span>
                </div>

                <h1 className="journal-article-title">{currentPost.title}</h1>
                {currentPost.subtitle && (
                  <p className="journal-article-subtitle">{currentPost.subtitle}</p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", paddingBottom: "18px", borderBottom: "1px solid rgba(255,255,255,0.12)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#f59e0b", letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}>
                    WORDS BY {currentPost.author || "LIGHTHOUSE PROGRAMMER"}
                  </span>
                  <span style={{ color: "#555" }}>·</span>
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    LIGHTHOUSE EDITORIAL ARCHIVE
                  </span>
                </div>

                {currentPost.imageUrl && (
                  <div
                    className="journal-article-hero-wrap"
                    title="클릭하여 원본 크기로 확대"
                    onClick={() =>
                      setLightboxImage({
                        url: currentPost.imageUrl!,
                        title: currentPost.title,
                        subtitle: currentPost.subtitle,
                        designer: currentPost.author,
                      })
                    }
                  >
                    <img
                      alt={currentPost.title}
                      className="journal-article-hero-img"
                      src={resolveAssetUrl(currentPost.imageUrl)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "12px",
                        right: "12px",
                        background: "rgba(0,0,0,0.78)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        padding: "5px 10px",
                        fontSize: "11px",
                        color: "#eee",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <ZoomIn size={13} />
                      <span>클릭하여 확대</span>
                    </div>
                  </div>
                )}

                <div className="journal-article-body">
                  {currentPost.content}
                </div>

                {/* Magazine Footer Sign-off */}
                <div style={{ padding: "28px 0", borderTop: "1px solid rgba(255,255,255,0.12)", borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "40px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.14em", color: "#fff", textTransform: "uppercase" }}>
                      LIGHTHOUSE CO. CINEMA JOURNAL
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeJournalPage}
                    className="journal-nav-link"
                  >
                    <span>← HOME</span>
                  </button>
                </div>

                {/* Article Bottom Navigation (Prev / Next with Magazine Preview) */}
                <div className="journal-article-nav-footer">
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    {prevPost ? (
                      <div
                        onClick={() => openJournalPage(prevPost.id)}
                        style={{ cursor: "pointer", padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.12)", transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <div style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>
                          ← PREVIOUS ARTICLE
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                          {prevPost.title}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "#555" }}>FIRST ARTICLE OF ISSUE</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReadingJournalPost(null);
                      window.location.hash = "journal";
                    }}
                    className="journal-nav-link"
                    style={{ padding: "10px 22px", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <span>ALL ARTICLES LIST</span>
                  </button>

                  <div style={{ flex: 1, minWidth: "220px", textAlign: "right" }}>
                    {nextPost ? (
                      <div
                        onClick={() => openJournalPage(nextPost.id)}
                        style={{ cursor: "pointer", padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.12)", textAlign: "right", transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <div style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>
                          NEXT ARTICLE →
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                          {nextPost.title}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "#555" }}>LATEST ARTICLE OF ISSUE</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* If not reading an individual post: render magazine board list */
              <div>
                {/* Magazine Masthead Top Metadata Strip */}
                <div className="journal-magazine-meta-strip" style={{ marginBottom: "28px" }}>
                  <span>CINEMA &amp; ARCHIVE</span>
                  <span>LIGHTHOUSE JOURNAL</span>
                  <span>SEOUL, KOREA</span>
                </div>

                {/* Editorial Toolbar: Category Tabs & Search */}
                <div className="journal-page-toolbar">
                  {/* Category Filter Tabs with counts */}
                  <div className="journal-magazine-tabs">
                    {categories.map((cat) => {
                      const count =
                        cat === "ALL"
                          ? visiblePosts.length
                          : visiblePosts.filter((p) => (p.category || "").trim().toUpperCase() === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          className={`journal-magazine-tab-btn ${journalCategoryFilter === cat ? "active" : ""}`}
                          onClick={() => setJournalCategoryFilter(cat)}
                        >
                          <span>{cat}</span>
                          <span style={{ fontSize: "10px", opacity: 0.65 }}>({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar & View Mode Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div className="journal-page-search-wrap">
                      <input
                        type="text"
                        value={journalSearchQuery}
                        onChange={(e) => setJournalSearchQuery(e.target.value)}
                        placeholder="SEARCH ARCHIVE &amp; ESSAYS..."
                        className="journal-page-search-input"
                        style={{ letterSpacing: "0.04em" }}
                      />
                      <Search size={14} className="journal-page-search-icon" />
                      {journalSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setJournalSearchQuery("")}
                          style={{
                            position: "absolute",
                            right: "32px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            color: "#888",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          title="검색어 지우기"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="journal-page-view-toggles" role="group" aria-label="View mode">
                      <button
                        type="button"
                        onClick={() => setJournalViewMode("grid")}
                        className={`journal-page-view-btn ${journalViewMode === "grid" ? "active" : ""}`}
                        title="매거진 에디토리얼 레이아웃"
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setJournalViewMode("table")}
                        className={`journal-page-view-btn ${journalViewMode === "table" ? "active" : ""}`}
                        title="인덱스 목록 뷰"
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posts Display: Magazine Layout or Table */}
                {filteredPosts.length === 0 ? (
                  <div style={{ padding: "80px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)", color: "#888" }}>
                    <BookOpen size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                    <p style={{ fontSize: "16px", color: "#ccc", margin: "0 0 6px" }}>등록된 게시글이 없거나 검색 결과가 없습니다.</p>
                    <p style={{ fontSize: "13px", color: "#777", margin: 0 }}>다른 검색어나 카테고리를 선택해 보세요.</p>
                  </div>
                ) : journalViewMode === "table" ? (
                  /* Table / List View */
                  <div className="journal-table-wrap">
                    <table className="journal-table">
                      <thead>
                        <tr>
                          <th style={{ width: "60px" }}>NO.</th>
                          <th style={{ width: "110px" }}>CATEGORY</th>
                          <th>TITLE / SUBJECT</th>
                          <th style={{ width: "140px" }}>AUTHOR</th>
                          <th style={{ width: "120px", textAlign: "right" }}>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPosts.map((post, idx) => (
                          <tr
                            key={post.id}
                            className="journal-table-row"
                            onClick={() => openJournalPage(post.id)}
                          >
                            <td style={{ color: "#777", fontSize: "12px", fontFamily: "monospace" }}>
                              {String(idx + 1).padStart(2, "0")}
                            </td>
                            <td>
                              <span className="journal-card-tag">{post.category || "ESSAY"}</span>
                            </td>
                            <td>
                              <div className="journal-table-title">{post.title}</div>
                              {post.subtitle && (
                                <div className="journal-table-sub">{post.subtitle}</div>
                              )}
                            </td>
                            <td style={{ color: "#a0a09c", fontSize: "13px" }}>
                              {post.author || "LIGHTHOUSE"}
                            </td>
                            <td style={{ color: "#777", fontSize: "12px", textAlign: "right", fontFamily: "monospace" }}>
                              {post.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Magazine Editorial Layout */
                  <div>
                    {/* Featured Cover Story (First Article) */}
                    {(() => {
                      const coverPost = filteredPosts[0];
                      const restPosts = filteredPosts.slice(1);

                      return (
                        <>
                          {coverPost && (
                            <article
                              className="journal-magazine-cover"
                              onClick={() => openJournalPage(coverPost.id)}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openJournalPage(coverPost.id);
                                }
                              }}
                            >
                              {coverPost.imageUrl ? (
                                <div className="journal-magazine-cover-media">
                                  <img
                                    alt={coverPost.title}
                                    className="journal-magazine-cover-img"
                                    src={resolveAssetUrl(coverPost.imageUrl)}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>
                              ) : null}

                              <div className="journal-magazine-cover-body">
                                <div className="journal-cover-kicker">
                                  <span>COVER STORY</span>
                                  <span>·</span>
                                  <span>{coverPost.category || "ESSAY"}</span>
                                  <span>·</span>
                                  <span style={{ color: "#888" }}>{coverPost.date}</span>
                                </div>

                                <h2 className="journal-cover-headline">
                                  {coverPost.title}
                                </h2>

                                {coverPost.subtitle && (
                                  <p className="journal-cover-sub">
                                    {coverPost.subtitle}
                                  </p>
                                )}

                                <p className="journal-cover-snippet">
                                  {coverPost.content}
                                </p>

                                <div className="journal-cover-footer">
                                  <span>BY {coverPost.author || "LIGHTHOUSE"}</span>
                                  <span style={{ color: "#e50914" }}>READ COVER STORY →</span>
                                </div>
                              </div>
                            </article>
                          )}

                          {/* Secondary Multi-Column Magazine Grid */}
                          {restPosts.length > 0 && (
                            <div className="journal-magazine-grid">
                              {restPosts.map((post, rIdx) => (
                                <article
                                  key={post.id}
                                  className="journal-magazine-card"
                                  tabIndex={0}
                                  onClick={() => openJournalPage(post.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      openJournalPage(post.id);
                                    }
                                  }}
                                >
                                  {post.imageUrl ? (
                                    <div className="journal-magazine-card-media">
                                      <img
                                        alt={post.title}
                                        className="journal-magazine-card-img"
                                        loading="lazy"
                                        decoding="async"
                                        src={resolveAssetUrl(post.imageUrl)}
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          target.onerror = null;
                                          const parent = target.parentElement;
                                          if (parent) parent.style.display = "none";
                                        }}
                                      />
                                    </div>
                                  ) : null}

                                  <div className="journal-magazine-card-body">
                                    <div className="journal-magazine-card-meta">
                                      <span className="journal-card-tag">{post.category || "ESSAY"}</span>
                                      <span style={{ color: "#888884" }}>
                                        NO. #{String(rIdx + 2).padStart(2, "0")} · {post.date}
                                      </span>
                                    </div>

                                    <h3 className="journal-magazine-card-title">{post.title}</h3>
                                    {post.subtitle && (
                                      <p className="journal-magazine-card-sub">{post.subtitle}</p>
                                    )}

                                    <p className="journal-magazine-card-snippet">{post.content}</p>

                                    <div className="journal-magazine-card-footer">
                                      <span>BY {post.author || "LIGHTHOUSE"}</span>
                                      <span className="journal-card-arrow">READ STORY →</span>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Bottom Magazine Footer / Navigation */}
                <div style={{ marginTop: "70px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                  <button
                    type="button"
                    onClick={closeJournalPage}
                    className="journal-nav-link"
                    title="홈 화면으로 이동"
                  >
                    <ArrowLeft size={13} />
                    <span>HOME</span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={(e) => scrollToSection("programs", e)}
                      className="journal-nav-link"
                    >
                      PROGRAMS
                    </button>
                    <button
                      type="button"
                      onClick={(e) => scrollToSection("about", e)}
                      className="journal-nav-link"
                    >
                      ABOUT
                    </button>
                    <button
                      type="button"
                      onClick={(e) => scrollToSection("contact", e)}
                      className="journal-nav-link"
                    >
                      CONTACT
                    </button>
                  </div>

                  <span style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#666", textTransform: "uppercase" }}>
                    LIGHTHOUSE CO. CINEMA ARCHIVE
                  </span>
                </div>
              </div>
            )}
          </article>
        );
      })()}

      {/* Magnetic Cursor Hover Poster */}
      <div
        aria-hidden="true"
        className={`hover-poster ${posterVisible && posterSrc ? "visible" : ""}`}
        id="hoverPoster"
        ref={posterRef}
      >
        {posterSrc ? (
          <img
            alt=""
            id="hoverImg"
            src={posterSrc}
            onError={() => {
              setPosterVisible(false);
            }}
          />
        ) : null}
      </div>

      {/* Floating Admin Button (Hidden in Stealth Mode) */}
      {!stealthMode && (
        <div
          style={{
            position: "fixed",
            bottom: "22px",
            right: "22px",
            zIndex: 60,
          }}
        >
          <button
            type="button"
            onClick={requestAdminAccess}
            title="관리자 페이지 (비밀번호 인증 필요)"
            style={{
              background: "rgba(20,20,20,0.88)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              padding: "9px 18px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderRadius: "40px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.65)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <SlidersHorizontal size={13} />
            <span>관리자 페이지 (ADMIN 🔒)</span>
          </button>
        </div>
      )}

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        currentPasswordHash={adminPassword}
        onSuccess={handleAuthSuccess}
        onClose={() => {
          setIsAuthModalOpen(false);
          if (window.location.hash === "#admin") {
            window.location.hash = "home";
          }
        }}
      />

      {/* Lightbox / Zoom Modal for Posters and Artworks */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="포스터 및 아트워크 확대보기"
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
            cursor: "zoom-out",
          }}
        >
          {/* Top Bar with Title & Close Button */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
              zIndex: 10,
              cursor: "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              {lightboxImage.type && (
                <span
                  style={{
                    background: "#f59e0b",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "2px",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lightboxImage.type}
                </span>
              )}
              <div style={{ color: "#fff", fontSize: "15px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span>{lightboxImage.title}</span>
                {lightboxImage.titleKo && (
                  <span style={{ color: "#aaa", marginLeft: "8px", fontSize: "13px" }}>
                    {lightboxImage.titleKo}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  color: "#fff",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                title="닫기 (ESC)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Central Zoom Image Frame */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "min(90vw, 1100px)",
              maxHeight: "78vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              cursor: "default",
            }}
          >
            <img
              src={resolveAssetUrl(lightboxImage.url)}
              alt={lightboxImage.title}
              style={{
                maxWidth: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                display: "block",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                userSelect: "none",
              }}
            />
          </div>

          {/* Bottom Info Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: "16px",
              textAlign: "center",
              maxWidth: "600px",
              padding: "10px 20px",
              background: "rgba(18, 18, 18, 0.85)",
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
              cursor: "default",
            }}
          >
            {lightboxImage.subtitle && (
              <div style={{ color: "#eee", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                {lightboxImage.subtitle}
              </div>
            )}
            {lightboxImage.designer && (
              <div style={{ color: "#f59e0b", fontSize: "11px", letterSpacing: "0.08em", fontWeight: 700 }}>
                DESIGNED BY {lightboxImage.designer.toUpperCase()}
              </div>
            )}
            <div style={{ color: "#777", fontSize: "11px", marginTop: "4px" }}>
              화면 바깥을 클릭하거나 ESC 키를 누르면 닫힙니다.
            </div>
          </div>
        </div>
      )}

      {/* Journal Post Reader Modal */}
      {activeJournalPost && (
        <div
          className="journal-modal-overlay"
          onClick={() => setActiveJournalPost(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="journal-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="journal-modal-top-bar">
              <div className="journal-modal-top-meta">
                {activeJournalPost.category && (
                  <span className="journal-card-tag">{activeJournalPost.category}</span>
                )}
                <span className="journal-card-date">{activeJournalPost.date}</span>
                {activeJournalPost.author && (
                  <span style={{ fontSize: "11px", color: "#a0a09c", letterSpacing: "0.08em" }}>
                    / {activeJournalPost.author}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="journal-modal-close-btn"
                onClick={() => setActiveJournalPost(null)}
                title="닫기 (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="journal-modal-content">
              <h2 className="journal-modal-title">{activeJournalPost.title}</h2>
              {activeJournalPost.subtitle && (
                <p className="journal-modal-subtitle">{activeJournalPost.subtitle}</p>
              )}

              {activeJournalPost.imageUrl && (
                <div
                  className="journal-modal-hero-image-wrap"
                  title="클릭하여 원본 크기로 확대"
                  onClick={() =>
                    setLightboxImage({
                      url: activeJournalPost.imageUrl!,
                      title: activeJournalPost.title,
                      subtitle: activeJournalPost.subtitle,
                      designer: activeJournalPost.author,
                    })
                  }
                >
                  <img
                    alt={activeJournalPost.title}
                    className="journal-modal-hero-image"
                    src={resolveAssetUrl(activeJournalPost.imageUrl)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      background: "rgba(0, 0, 0, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      padding: "4px 8px",
                      fontSize: "11px",
                      color: "#eee",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ZoomIn size={13} />
                    <span>클릭하여 확대</span>
                  </div>
                </div>
              )}

              <div className="journal-modal-body-text">
                {activeJournalPost.content}
              </div>

              <div className="journal-modal-footer">
                <button
                  type="button"
                  className="about-journal-box-icon"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveJournalPost(null)}
                >
                  <span>← BACK TO JOURNAL LIST</span>
                </button>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  LIGHTHOUSE CINEMA ARCHIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Full Management Interface (Lazy Loaded) */}
      {isAdminOpen && (
        <React.Suspense
          fallback={
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(8px)",
                color: "#f59e0b",
                gap: "12px",
                fontSize: "12px",
                letterSpacing: "0.15em",
                fontWeight: 700,
              }}
            >
              <Loader2 className="animate-spin" size={28} />
              <span>ADMIN PANEL INITIALIZING...</span>
            </div>
          }
        >
          <AdminPanel
            content={content}
            onSave={handleSaveAdmin}
            onClose={handleCloseAdmin}
            onReset={handleResetAdmin}
            onLogout={handleLogout}
            currentPassword={adminPassword}
            onPasswordChange={handlePasswordChange}
            stealthMode={stealthMode}
            onToggleStealth={handleToggleStealth}
          />
        </React.Suspense>
      )}
    </>
  );
}
