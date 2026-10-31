import React, { useRef, useState, useEffect, useCallback } from "react";
import { Film } from "../data/content.ts";
import { resolveAssetUrl } from "../utils/assets.ts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ArtworksSectionProps {
  films: Film[];
  mainArtworkIds?: string[];
  onSelectFilm: (id: string) => void;
}

interface ArtworkDisplayItem {
  id: string;
  filmId: string;
  title: string;
  filmTitleKo?: string;
  director: string;
  imageUrl: string;
  designer?: string;
  artworkType?: string;
}

export const ArtworksSection: React.FC<ArtworksSectionProps> = ({
  films,
  mainArtworkIds,
  onSelectFilm,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef({ startX: 0, scrollLeft: 0, moved: false });

  // Compute all individual registered artwork items across all films
  const artworkItems: ArtworkDisplayItem[] = React.useMemo(() => {
    const items: ArtworkDisplayItem[] = [];

    films.forEach((film) => {
      if (!film || film.showInMainArtworks === false) return;

      const artList = Array.isArray(film.artworks) ? film.artworks : [];

      if (artList.length > 0) {
        // Include each individual artwork registered for this film
        artList.forEach((art, artIdx) => {
          if (!art) return;
          const artUrl = typeof art === "string" ? art : art.imageUrl;
          if (!artUrl || !artUrl.trim()) return;

          const artDesigner = typeof art === "object" ? art.designer : undefined;
          const designer =
            (artDesigner && artDesigner.trim()) ||
            (film.artworkDesigner && film.artworkDesigner.trim()) ||
            "";

          const artTitle = typeof art === "object" ? art.title : undefined;
          const artType = typeof art === "object" ? art.type : undefined;
          const artId =
            typeof art === "object" && art.id
              ? art.id
              : `${film.id}-art-${artIdx}`;

          const displayTitle =
            artTitle && artTitle.trim()
              ? `${film.title} — ${artTitle.trim()}`
              : film.title;

          items.push({
            id: artId,
            filmId: film.id,
            title: displayTitle,
            filmTitleKo: film.titleKo,
            director: film.director,
            imageUrl: artUrl.trim(),
            designer,
            artworkType: artType || "포스터",
          });
        });
      } else {
        // Fallback if film has no entries in its artworks array
        const img =
          (film.mainArtworkImage && film.mainArtworkImage.trim()) ||
          (film.posterImage && film.posterImage.trim()) ||
          (film.heroImage && film.heroImage.trim());

        if (img) {
          items.push({
            id: `${film.id}-main`,
            filmId: film.id,
            title: film.title,
            filmTitleKo: film.titleKo,
            director: film.director,
            imageUrl: img.trim(),
            designer: (film.artworkDesigner && film.artworkDesigner.trim()) || "",
            artworkType: "오리지널 포스터",
          });
        }
      }
    });

    // If still empty, fallback to first 4 films that have posters
    if (items.length === 0) {
      films.slice(0, 4).forEach((film) => {
        const img = film.posterImage || film.heroImage;
        if (img) {
          items.push({
            id: film.id,
            filmId: film.id,
            title: film.title,
            filmTitleKo: film.titleKo,
            director: film.director,
            imageUrl: img,
            designer: film.artworkDesigner || "",
            artworkType: "포스터",
          });
        }
      });
    }

    return items;
  }, [films]);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons, artworkItems.length]);

  const handleScroll = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".artwork-card")?.clientWidth || 320;
    const scrollAmount = cardWidth * 1.5;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse Drag-to-Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    setIsMouseDown(true);
    setIsDragging(false);
    dragInfoRef.current = {
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const el = trackRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragInfoRef.current.startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
      dragInfoRef.current.moved = true;
    }
    el.scrollLeft = dragInfoRef.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleCardClick = (filmId: string, e: React.MouseEvent) => {
    if (dragInfoRef.current.moved || isDragging) {
      e.preventDefault();
      return;
    }
    onSelectFilm(filmId);
  };

  if (artworkItems.length === 0) return null;

  return (
    <section className="artworks-section" id="artworks" aria-label="Artworks and posters gallery">
      {/* Header with White Background and High-End Typography */}
      <div className="artworks-header">
        <div className="artworks-header-left">
          <h2>ARTWORKS.</h2>
          <small>LIGHTHOUSE ORIGINAL ARTWORKS & ARCHIVE ↘</small>
        </div>

        <div className="artworks-controls">
          <span className="artworks-swipe-hint">SWIPE / DRAG</span>
          <button
            type="button"
            className="artworks-nav-btn"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="이전 아트워크"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="artworks-nav-btn"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="다음 아트워크"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Swipe Track */}
      <div className="artworks-swiper-container">
        <div
          ref={trackRef}
          className={`artworks-track ${isDragging ? "is-dragging" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {artworkItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="artwork-card"
              role="button"
              tabIndex={0}
              onClick={(e) => handleCardClick(item.filmId, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFilm(item.filmId);
                }
              }}
              title={`${item.title} — 상세보기`}
            >
              <div className="artwork-poster-frame">
                {item.imageUrl ? (
                  <img
                    alt={`${item.title} artwork poster`}
                    className="artwork-poster-img"
                    loading={index < 3 ? "eager" : "lazy"}
                    src={resolveAssetUrl(item.imageUrl)}
                    draggable={false}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.style.opacity = "0";
                    }}
                  />
                ) : null}
              </div>

              {/* English Film Title on top, English Director and Designed by on the bottom row */}
              <div className="artwork-meta">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                  <span className="artwork-title">{item.title}</span>
                  {item.artworkType && item.artworkType !== "메인/오리지널 포스터" && item.artworkType !== "포스터" && (
                    <span className="artwork-type-tag">{item.artworkType}</span>
                  )}
                </div>
                <div className="artwork-meta-sub">
                  <span className="artwork-director">{item.director}</span>
                  {item.designer ? (
                    <span className="artwork-designer">DESIGNED BY {item.designer}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
