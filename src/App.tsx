/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { INITIAL_CONTENT, Film, SiteContent, DEFAULT_NAV_ITEMS, NavItem } from "./data/content.ts";
import { subscribeToSiteContent, saveSiteContentToCloud, normalizeContent } from "./services/contentSync.ts";
import { SlidersHorizontal, ArrowUpRight, Check, Send, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { AdminPanel } from "./components/AdminPanel.tsx";
import { AdminAuthModal } from "./components/AdminAuthModal.tsx";
import { resolveAssetUrl } from "./utils/assets.ts";

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
  
  // Security & Admin Authentication State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    const saved = safeGetStorage("lh_admin_pw");
    if (!saved || saved === "1234" || saved === "lighthouse2026") {
      safeSetStorage("lh_admin_pw", "Diddlsah211!!@@");
      return "Diddlsah211!!@@";
    }
    return saved;
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
  const [posterSrc, setPosterSrc] = useState<string>(() => resolveAssetUrl("/images/sample-poster.jpg"));
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
  }, [content.films, requestAdminAccess]);

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleHashChange]);

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

      scenesRef.current.forEach((scene, index) => {
        if (!scene) return;
        if (reducedMotion.matches) {
          scene.style.setProperty("--curtain-shade", "0");
          scene.style.setProperty("--text-shift", "0px");
          scene.style.setProperty("--text-opacity", "1");
          return;
        }

        const vh = window.innerHeight || 1;
        const rect = scene.getBoundingClientRect();
        const nextScene = scenesRef.current[index + 1];
        const nextRect = nextScene ? nextScene.getBoundingClientRect() : null;
        const coverProgress = nextRect ? clamp(1 - nextRect.top / vh, 0, 1) : 0;
        const shade = coverProgress * 0.35;
        const p = clamp((rect.top - vh * 0.14) / vh, -1, 1);

        scene.style.setProperty("--curtain-shade", shade.toFixed(3));
        scene.style.setProperty("--text-shift", `${(p * 14).toFixed(1)}px`);
        scene.style.setProperty(
          "--text-opacity",
          String(Math.max(0.75, 1 - Math.abs(p) * 0.15))
        );
      });
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
    window.location.hash = `film-${id}`;
  };

  const closeDetail = () => {
    setActiveFilmId(null);
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
    if (activeFilmId) {
      setActiveFilmId(null);
      window.location.hash = "home";
    } else {
      window.history.pushState(null, "", "#home");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (activeFilmId) {
      setActiveFilmId(null);
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
      <main id="site" className={activeFilm ? "hidden" : ""}>
        {/* Featured Hero Sticky Curtain Stack */}
        <section
          aria-label="Featured films and projects"
          className="features"
          id="home"
        >
          {finalHeroSlides.map((slide, index) => {
            const fallbackImg = resolveAssetUrl(`/images/hero-fallback-${(index % 3) + 1}.jpg`);
            const isFilm = slide.type === "film";

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
                  <img
                    alt=""
                    className="bg"
                    loading={index === 0 ? "eager" : "lazy"}
                    src={resolveAssetUrl(slide.image) || fallbackImg}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src = fallbackImg;
                    }}
                  />
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
                      EXPLORE FILM ↗
                    </a>
                  ) : (
                    <a
                      className="feature-link"
                      href={slide.url}
                    >
                      {slide.ctaText || "STORE / EXPLORE"} ↗
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

        {/* Director Note Section */}
        <section
          aria-label="Director comment"
          className="director-note"
          id="director-note"
        >
          <div className="director-note__grid">
            <div
              aria-label="감독 사진 자리"
              className={`director-note__portrait ${
                content.director.photo ? "has-photo" : ""
              }`}
              role="img"
              style={
                content.director.photo
                  ? { backgroundImage: `url(${content.director.photo})` }
                  : undefined
              }
            >
              <div className="director-note__content">
                <p className="director-note__quote-ko" lang="ko">
                  {content.director.quote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="about" id="about">
          <h2>ABOUT.</h2>
          <div className="about-bilingual">
            <div className="about-ko" lang="ko">
              <p>
                라이트하우스는 예술영화관 프로그래머에 의해 설립된 영화 수입/배급사입니다.
              </p>
              <p>
                영화 프로그램의 맥락을 배급과 연결 시켜, 동시대 관객들에게 가장 유효한 영화를 선보입니다.
              </p>
              <p>
                가장 영화적인 언어를 마케팅에 적용해 영화 산업의 저변을 확대하고, 새로운 경험을 발명합니다.
              </p>
            </div>
            <div className="about-en" lang="en">
              <p>
                Lighthouse Co. is a Korean art-house film distributor founded on extensive
                experience in cinema programming and film festival planning. The team is
                led by former theater programmers and includes in-house design and marketing
                staff, as well as a studio capable of DCP production. We are committed to
                introducing each film with care, respecting both its context and the
                environment in which it is screened.
              </p>
            </div>
          </div>
        </section>

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
                    <img
                      alt="Abstract monochrome beam of light, campaign image"
                      className="promo-photo"
                      src={resolveAssetUrl(item.image) || resolveAssetUrl("/images/promo-example.jpg")}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = resolveAssetUrl("/images/promo-example.svg");
                      }}
                    />
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
          <div className="byline">
            A FILM BY {activeFilm.director.toUpperCase()} · {activeFilm.year}
          </div>
          <img
            alt={activeFilm.title}
            className="still"
            src={resolveAssetUrl(activeFilm.heroImage) || resolveAssetUrl("/images/hero-fallback-1.jpg")}
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = resolveAssetUrl("/images/hero-fallback-1.jpg");
            }}
          />

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
                    </div>
                    <div className="detail-poster-frame">
                      <img
                        alt={`${activeFilm.title} Official Poster`}
                        src={activeFilm.posterImage}
                        onError={(e) => {
                          const col = (e.currentTarget as HTMLElement).closest(".detail-poster-col") as HTMLElement | null;
                          if (col) col.style.display = "none";
                        }}
                      />
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
              <p style={{ marginBottom: "1.5rem" }}>
                {activeFilm.summaryKo || activeFilm.summary}
              </p>
              {activeFilm.summaryKo && (
                <p style={{ color: "#aaa", fontSize: "0.95em" }}>
                  {activeFilm.summary}
                </p>
              )}
            </div>
            <aside>
              <div>DIRECTOR — {activeFilm.director}</div>
              <div>YEAR — {activeFilm.year}</div>
              {activeFilm.release && (
                <div>RELEASE IN KOREA — {activeFilm.release}</div>
              )}
              {activeFilm.country && <div>COUNTRY — {activeFilm.country}</div>}
              {activeFilm.runtime && <div>RUNTIME — {activeFilm.runtime}</div>}
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
        </article>
      )}

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

      {/* Admin Panel Full Management Interface */}
      {isAdminOpen && (
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
      )}
    </>
  );
}
