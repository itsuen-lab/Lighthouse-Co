import React, { useState } from "react";
import { Film, SiteContent, PromoCard } from "../data/content.ts";
import {
  Film as FilmIcon,
  Quote,
  Info,
  Sparkles,
  Mail,
  Download,
  Plus,
  Trash2,
  Check,
  Copy,
  RotateCcw,
  X,
  ExternalLink,
  Star,
  Eye,
  ShieldCheck,
  LogOut,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface AdminPanelProps {
  content: SiteContent;
  onSave: (updated: SiteContent) => void;
  onClose: () => void;
  onReset: () => void;
  onLogout: () => void;
  currentPassword: string;
  onPasswordChange: (newPw: string) => void;
  stealthMode: boolean;
  onToggleStealth: (stealth: boolean) => void;
}

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

type TabType = "films" | "featured" | "director" | "about" | "promo" | "contact" | "security" | "export";

export const AdminPanel: React.FC<AdminPanelProps> = ({
  content,
  onSave,
  onClose,
  onReset,
  onLogout,
  currentPassword,
  onPasswordChange,
  stealthMode,
  onToggleStealth,
}) => {
  const [data, setData] = useState<SiteContent>(() => {
    const copy: SiteContent = JSON.parse(JSON.stringify(content));
    if (!Array.isArray(copy.promos) || copy.promos.length === 0) {
      if (copy.promo) {
        copy.promos = [
          {
            id: "promo-1",
            badgeTopLeft: "LIGHTHOUSE / FEATURED PROJECT",
            badgeTopRight: "01 — SPECIAL PROJECT",
            kicker: "EXPLORE BEYOND THE SCREEN",
            titleLines: copy.promo.titleLines || ["Objects &", "Moving Images."],
            subtitle: copy.promo.subtitle || "영화 밖에서 이어지는 새로운 경험",
            ctaText: "STORE / EXPLORE",
            url: copy.promo.url || "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
            image: copy.promo.image || "/images/promo-example.jpg",
          },
        ];
      } else {
        copy.promos = [
          {
            id: "promo-1",
            badgeTopLeft: "LIGHTHOUSE / FEATURED PROJECT",
            badgeTopRight: "01 — SPECIAL PROJECT",
            kicker: "EXPLORE BEYOND THE SCREEN",
            titleLines: ["Objects &", "Moving Images."],
            subtitle: "영화 밖에서 이어지는 새로운 경험",
            ctaText: "STORE / EXPLORE",
            url: "mailto:keeper@lighthouse.re.kr?subject=Lighthouse%20Store%20Inquiry",
            image: "/images/promo-example.jpg",
          },
        ];
      }
    }
    return copy;
  });

  const [activeTab, setActiveTab] = useState<TabType>("films");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(
    data.films[0]?.id || null
  );
  const [selectedPromoId, setSelectedPromoId] = useState<string>(
    data.promos?.[0]?.id || "promo-1"
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Film Handlers
  const handleFilmChange = (id: string, field: keyof Film, value: string) => {
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  };

  const handleAddNewFilm = () => {
    const newId = "film-" + Date.now().toString(36);
    const newFilm: Film = {
      id: newId,
      title: "New Film Title",
      titleKo: "새로운 영화 제목",
      release: "2026.12.01",
      director: "Director Name",
      year: "2026",
      heroImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1920&q=80",
      posterImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
      summary: "English synopsis goes here.",
      summaryKo: "한국어 시놉시스를 입력하세요.",
      country: "Korea",
      runtime: "100 min",
      youtubeUrl: "",
    };

    setData((prev) => ({
      ...prev,
      films: [newFilm, ...prev.films],
    }));
    setSelectedFilmId(newId);
    showToast("새 영화가 추가되었습니다.");
  };

  const handleDeleteFilm = (id: string) => {
    if (data.films.length <= 1) {
      alert("최소 1편 이상의 영화가 등록되어 있어야 합니다.");
      return;
    }
    if (confirm("정말 이 영화를 삭제하시겠습니까?")) {
      setData((prev) => ({
        ...prev,
        featured: prev.featured.filter((fId) => fId !== id),
        films: prev.films.filter((f) => f.id !== id),
      }));
      setSelectedFilmId(data.films.find((f) => f.id !== id)?.id || null);
      showToast("영화가 삭제되었습니다.");
    }
  };

  const isItemFeatured = (type: "film" | "promo", id: string) => {
    const targetPrefixed = `${type}:${id}`;
    return data.featured.some(
      (fId) =>
        fId === targetPrefixed ||
        fId === id ||
        (type === "promo" && fId.startsWith("promo:") && fId.replace("promo:", "") === id) ||
        (type === "film" && (fId === id || fId.replace("film:", "") === id))
    );
  };

  const toggleFeaturedItem = (type: "film" | "promo", id: string) => {
    const isFeatured = isItemFeatured(type, id);
    if (isFeatured) {
      if (data.featured.length <= 1) {
        alert("메인 Hero 슬라이드는 최소 1개 이상 유지되어야 합니다.");
        return;
      }
      setData((prev) => ({
        ...prev,
        featured: prev.featured.filter(
          (fId) =>
            fId !== id &&
            fId !== `${type}:${id}` &&
            !(type === "promo" && fId.startsWith("promo:") && fId.replace("promo:", "") === id) &&
            !(type === "film" && (fId === id || fId.replace("film:", "") === id))
        ),
      }));
      showToast(`${type === "film" ? "영화" : "프로모션 카드"}가 메인 Hero에서 제외되었습니다.`);
    } else {
      const newKey = type === "promo" ? `promo:${id}` : id;
      setData((prev) => ({
        ...prev,
        featured: [...prev.featured, newKey],
      }));
      showToast(`${type === "film" ? "영화" : "프로모션 카드"}가 메인 Hero에 추가되었습니다.`);
    }
  };

  const handleMoveFeatured = (index: number, direction: "up" | "down") => {
    setData((prev) => {
      const list = [...prev.featured];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, featured: list };
    });
  };

  const handleRemoveFeatured = (index: number) => {
    if (data.featured.length <= 1) {
      alert("메인 Hero 슬라이드는 최소 1개 이상 유지되어야 합니다.");
      return;
    }
    setData((prev) => ({
      ...prev,
      featured: prev.featured.filter((_, i) => i !== index),
    }));
    showToast("해당 슬라이드가 메인 Hero에서 제외되었습니다.");
  };

  const handleAddFeaturedSlot = () => {
    const unusedFilm = data.films.find((f) => !isItemFeatured("film", f.id));
    const unusedPromo = (data.promos || []).find((p) => !isItemFeatured("promo", p.id));
    
    let toAdd = "";
    if (unusedFilm) {
      toAdd = unusedFilm.id;
    } else if (unusedPromo) {
      toAdd = `promo:${unusedPromo.id}`;
    } else if (data.films[0]) {
      toAdd = data.films[0].id;
    }

    if (!toAdd) {
      alert("추가할 수 있는 영화나 프로모션 카드가 없습니다.");
      return;
    }

    setData((prev) => ({
      ...prev,
      featured: [...prev.featured, toAdd],
    }));
    showToast("새 메인 Hero 슬라이드가 추가되었습니다.");
  };

  const handleMoveFilm = (index: number, direction: "up" | "down", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setData((prev) => {
      const list = [...prev.films];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, films: list };
    });
  };

  // Promo Handlers
  const handlePromoChange = (id: string, field: keyof PromoCard, value: any) => {
    setData((prev) => ({
      ...prev,
      promos: (prev.promos || []).map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  const handleAddNewPromo = () => {
    const newId = "promo-" + Date.now().toString(36);
    const count = (data.promos || []).length + 1;
    const newPromo: PromoCard = {
      id: newId,
      badgeTopLeft: "LIGHTHOUSE / FEATURED PROJECT",
      badgeTopRight: `${count < 10 ? "0" + count : count} — SPECIAL PROJECT`,
      kicker: "EXPLORE BEYOND THE SCREEN",
      titleLines: ["New Project &", "Moving Images."],
      subtitle: "새로운 기획 프로젝트 소개 문구를 입력하세요.",
      ctaText: "STORE / EXPLORE",
      url: "mailto:keeper@lighthouse.re.kr?subject=Special%20Project",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
    };

    setData((prev) => ({
      ...prev,
      promos: [...(prev.promos || []), newPromo],
    }));
    setSelectedPromoId(newId);
    showToast("새 프로모션 카드가 추가되었습니다.");
  };

  const handleDeletePromo = (id: string) => {
    if ((data.promos || []).length <= 1) {
      alert("최소 1개 이상의 프로모션 카드가 유지되어야 합니다.");
      return;
    }
    if (confirm("이 프로모션 카드를 삭제하시겠습니까?")) {
      const nextPromos = (data.promos || []).filter((p) => p.id !== id);
      setData((prev) => ({ ...prev, promos: nextPromos }));
      setSelectedPromoId(nextPromos[0]?.id || "");
      showToast("프로모션 카드가 삭제되었습니다.");
    }
  };

  const handleMovePromo = (index: number, direction: "up" | "down") => {
    setData((prev) => {
      const list = [...(prev.promos || [])];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, promos: list };
    });
  };

  // Save to parent
  const handleSaveAll = () => {
    onSave(data);
    showToast("모든 변경 사항이 사이트에 저장 및 적용되었습니다.");
  };

  // Generate content.js code
  const generateContentJs = () => {
    return `/* LIGHTHOUSE CONTENT SETTINGS — site data */
window.LIGHTHOUSE_CONTENT = ${JSON.stringify(data, null, 2)};
`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateContentJs());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast("content.js 코드가 클립보드에 복사되었습니다.");
  };

  const currentFilm = data.films.find((f) => f.id === selectedFilmId) || data.films[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(8, 8, 8, 0.94)",
        backdropFilter: "blur(16px)",
        color: "#f1f1ee",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      {/* Admin Top Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          background: "#121212",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            alt="LIGHTHOUSE"
            src="/assets/aistudio/Lighthouse_a4cd72d2.png"
            style={{ height: "24px", width: "auto" }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#a0a09c",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              paddingLeft: "16px",
            }}
          >
            ADMINISTRATION / 콘텐츠 관리자
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {toastMessage && (
            <span
              style={{
                fontSize: "12px",
                color: "#86efac",
                background: "rgba(22, 101, 52, 0.4)",
                padding: "6px 14px",
                borderRadius: "2px",
                border: "1px solid rgba(134, 239, 172, 0.3)",
              }}
            >
              {toastMessage}
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#888",
              padding: "9px 16px",
              fontSize: "11px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="초기 샘플 데이터로 복원"
          >
            <RotateCcw size={12} />
            초기화
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f1f1ee",
              border: "1px solid #fff",
              color: "#111",
              padding: "9px 22px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            <Check size={14} />
            적용 및 저장
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              padding: "9px 14px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="관리자 세션 로그아웃"
          >
            <LogOut size={13} />
            로그아웃
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#aaa",
              padding: "8px",
              cursor: "pointer",
            }}
            title="관리자 닫기"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Navigation Sidebar */}
        <aside
          style={{
            width: "240px",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            background: "#0e0e0e",
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("films")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "films" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "films" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "films" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <FilmIcon size={16} />
            <span>영화 및 프로그램</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("featured")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "featured" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "featured" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "featured" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Star size={16} />
            <span>메인 히어로 ({data.featured.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("director")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "director" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "director" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "director" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Quote size={16} />
            <span>디렉터스 노트</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "about" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "about" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "about" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Info size={16} />
            <span>회사 소개 (ABOUT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("promo")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "promo" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "promo" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "promo" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Sparkles size={16} />
            <span>기획 프로젝트 (Promo)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "contact" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "contact" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "contact" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Mail size={16} />
            <span>연락처 및 소셜 (CONTACT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "security" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "security" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "security" ? "#f59e0b" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <ShieldCheck size={16} />
            <span>보안 및 비밀번호</span>
          </button>

          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 24px",
                background: activeTab === "export" ? "#1e1e1e" : "transparent",
                border: 0,
                borderLeft: activeTab === "export" ? "3px solid #fff" : "3px solid transparent",
                color: activeTab === "export" ? "#fff" : "#888",
                fontSize: "13px",
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <Download size={16} />
              <span>content.js 내보내기</span>
            </button>
          </div>
        </aside>

        {/* Content Workspace Area */}
        <main style={{ flex: 1, overflowY: "auto", padding: "36px 48px", background: "#151515" }}>
          {/* TAB 1: FILMS MANAGER */}
          {activeTab === "films" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "28px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                    영화 및 프로그램 관리
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#888", fontSize: "13px" }}>
                    상영작 목록을 편집하고, 메인 추천작에 노출할 영화를 설정합니다. (총 {data.films.length}편)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewFilm}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#222",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    padding: "10px 18px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={16} />새 영화 추가
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: "32px", alignItems: "start" }}>
                {/* Film selection list with sequence numbers and reordering buttons */}
                <div
                  style={{
                    background: "#0f0f0f",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "2px",
                    maxHeight: "75vh",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      background: "#141414",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "#888",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>상영작 순서 ({data.films.length}편)</span>
                    <span style={{ fontSize: "10px", color: "#666" }}>▲▼ 순서 조정</span>
                  </div>

                  {data.films.map((film, index) => {
                    const isSelected = film.id === selectedFilmId;
                    const isFeatured = isItemFeatured("film", film.id);
                    return (
                      <div
                        key={film.id}
                        onClick={() => setSelectedFilmId(film.id)}
                        style={{
                          padding: "14px 14px 14px 16px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: isSelected ? "#1c1c1c" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          borderLeft: isSelected ? "3px solid #f1f1ee" : "3px solid transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Order Number Badge */}
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: isSelected ? "#fff" : "#666",
                            fontWeight: 700,
                            width: "20px",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: isSelected ? "#fff" : "#ccc",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {film.title || "Untitled Film"}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#888",
                              marginTop: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {film.titleKo || "한글 제목 없음"} · {film.year}
                            </span>
                            {isFeatured && (
                              <span
                                title="메인 추천작(Hero)에 포함됨"
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  letterSpacing: "0.1em",
                                  color: "#f59e0b",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  padding: "1px 5px",
                                  borderRadius: "2px",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}
                              >
                                HERO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order Up/Down Buttons */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            flexShrink: 0,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={(e) => handleMoveFilm(index, "up", e)}
                            style={{
                              background: "transparent",
                              border: 0,
                              color: index === 0 ? "#333" : "#888",
                              cursor: index === 0 ? "default" : "pointer",
                              padding: "2px 4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "2px",
                            }}
                            title="위로 1칸 이동"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={index === data.films.length - 1}
                            onClick={(e) => handleMoveFilm(index, "down", e)}
                            style={{
                              background: "transparent",
                              border: 0,
                              color: index === data.films.length - 1 ? "#333" : "#888",
                              cursor: index === data.films.length - 1 ? "default" : "pointer",
                              padding: "2px 4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "2px",
                            }}
                            title="아래로 1칸 이동"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Edit Form for currentFilm */}
                {currentFilm && (
                  <div
                    style={{
                      background: "#101010",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "32px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        paddingBottom: "16px",
                        marginBottom: "24px",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>
                          영화 상세 정보 편집
                        </h3>
                        {(() => {
                          const curIdx = data.films.findIndex((f) => f.id === currentFilm.id);
                          return (
                            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                              현재 순서: <strong style={{ color: "#fff" }}>{curIdx + 1}</strong> / {data.films.length}번째 (메인 화면 상영작 노출 순서)
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Order Move Buttons in Header */}
                        {(() => {
                          const curIdx = data.films.findIndex((f) => f.id === currentFilm.id);
                          return (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.15)",
                                padding: "2px",
                              }}
                            >
                              <button
                                type="button"
                                disabled={curIdx <= 0}
                                onClick={() => handleMoveFilm(curIdx, "up")}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "transparent",
                                  border: 0,
                                  color: curIdx <= 0 ? "#444" : "#ccc",
                                  padding: "5px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: curIdx <= 0 ? "default" : "pointer",
                                }}
                                title="상영작 순서를 위로 1칸 이동합니다"
                              >
                                <ArrowUp size={12} /> 위로
                              </button>
                              <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.1)" }} />
                              <button
                                type="button"
                                disabled={curIdx >= data.films.length - 1}
                                onClick={() => handleMoveFilm(curIdx, "down")}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "transparent",
                                  border: 0,
                                  color: curIdx >= data.films.length - 1 ? "#444" : "#ccc",
                                  padding: "5px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: curIdx >= data.films.length - 1 ? "default" : "pointer",
                                }}
                                title="상영작 순서를 아래로 1칸 이동합니다"
                              >
                                <ArrowDown size={12} /> 아래로
                              </button>
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => toggleFeaturedItem("film", currentFilm.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: isItemFeatured("film", currentFilm.id)
                              ? "rgba(245, 158, 11, 0.2)"
                              : "#1e1e1e",
                            border: `1px solid ${
                              isItemFeatured("film", currentFilm.id)
                                ? "rgba(245, 158, 11, 0.6)"
                                : "rgba(255,255,255,0.2)"
                            }`,
                            color: isItemFeatured("film", currentFilm.id) ? "#f59e0b" : "#ccc",
                            padding: "7px 14px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <Star size={13} />
                          {isItemFeatured("film", currentFilm.id)
                            ? "메인 Hero에서 제외"
                            : "메인 Hero로 지정"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFilm(currentFilm.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#ef4444",
                            padding: "7px 14px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={13} />
                          삭제
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          영문 제목 (Title)
                        </label>
                        <input
                          type="text"
                          value={currentFilm.title}
                          onChange={(e) => handleFilmChange(currentFilm.id, "title", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          한글 제목 (Title Ko)
                        </label>
                        <input
                          type="text"
                          value={currentFilm.titleKo}
                          onChange={(e) => handleFilmChange(currentFilm.id, "titleKo", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          감독 (Director)
                        </label>
                        <input
                          type="text"
                          value={currentFilm.director}
                          onChange={(e) => handleFilmChange(currentFilm.id, "director", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          제작 연도 (Year)
                        </label>
                        <input
                          type="text"
                          value={currentFilm.year}
                          onChange={(e) => handleFilmChange(currentFilm.id, "year", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          국내 개봉일 (예: 2026.09.30)
                        </label>
                        <input
                          type="text"
                          value={currentFilm.release || ""}
                          placeholder="미정일 경우 빈칸"
                          onChange={(e) => handleFilmChange(currentFilm.id, "release", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          국가 및 러닝타임 (예: France / 193 min)
                        </label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="국가"
                            value={currentFilm.country || ""}
                            onChange={(e) => handleFilmChange(currentFilm.id, "country", e.target.value)}
                            style={{
                              flex: 1,
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="러닝타임"
                            value={currentFilm.runtime || ""}
                            onChange={(e) => handleFilmChange(currentFilm.id, "runtime", e.target.value)}
                            style={{
                              width: "110px",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                        메인 스틸 이미지 URL (Hero Image, 16:9 권장)
                      </label>
                      <input
                        type="text"
                        value={currentFilm.heroImage}
                        onChange={(e) => handleFilmChange(currentFilm.id, "heroImage", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "10px 14px",
                          fontSize: "13px",
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                        포스터 및 마우스 오버 이미지 URL (Poster Image, 1:1.43 극장 포스터 비율 / 선택 사항)
                      </label>
                      <input
                        type="text"
                        placeholder="입력하지 않으면 상세 페이지 포스터 및 프로그램 마우스 오버 포스터가 표시되지 않습니다"
                        value={currentFilm.posterImage || ""}
                        onChange={(e) => handleFilmChange(currentFilm.id, "posterImage", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "10px 14px",
                          fontSize: "13px",
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                      <div style={{ fontSize: "11px", color: "#777", marginTop: "6px", lineHeight: "1.4" }}>
                        포스터가 없는 영화는 빈칸으로 두시면 상세 페이지 및 마우스 오버에 포스터 영역이 노출되지 않습니다.
                      </div>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          유튜브 공식 예고편 링크 (YouTube Trailer URL / 선택 사항)
                        </label>
                        {currentFilm.youtubeUrl && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: getYouTubeVideoId(currentFilm.youtubeUrl) ? "#10b981" : "#f59e0b",
                              fontWeight: 600,
                            }}
                          >
                            {getYouTubeVideoId(currentFilm.youtubeUrl)
                              ? `✓ ID: ${getYouTubeVideoId(currentFilm.youtubeUrl)} (상세 페이지에서 재생 가능)`
                              : "⚠ 유효하지 않은 유튜브 URL 형식"}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="예: https://www.youtube.com/watch?v=... (입력하지 않으면 예고편 플레이어가 표시되지 않습니다)"
                        value={currentFilm.youtubeUrl || ""}
                        onChange={(e) => handleFilmChange(currentFilm.id, "youtubeUrl", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "10px 14px",
                          fontSize: "13px",
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                      <div style={{ fontSize: "11px", color: "#777", marginTop: "6px", lineHeight: "1.4" }}>
                        유튜브 링크를 입력한 경우에만 상세 페이지에 예고편 플레이어가 표시됩니다. 링크가 없으면 예고편 영역이 전혀 노출되지 않습니다.
                      </div>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                        한국어 시놉시스 (Summary Ko)
                      </label>
                      <textarea
                        rows={3}
                        value={currentFilm.summaryKo || ""}
                        onChange={(e) => handleFilmChange(currentFilm.id, "summaryKo", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "12px 14px",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                        영문 시놉시스 (Summary En)
                      </label>
                      <textarea
                        rows={2}
                        value={currentFilm.summary}
                        onChange={(e) => handleFilmChange(currentFilm.id, "summary", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "12px 14px",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HERO STICKY SCENES MANAGER (UNLIMITED & FILMS + PROMOS) */}
          {activeTab === "featured" && (
            <div style={{ maxWidth: "880px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "28px",
                  gap: "20px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                    메인 히어로 슬라이드 관리 (Hero Sticky Scenes)
                  </h2>
                  <p style={{ margin: 0, color: "#888", fontSize: "13px", lineHeight: "1.5" }}>
                    웹사이트 첫 화면에서 전체 화면으로 스크롤 펼쳐지는 대표 영화 및 기획 프로모션 프로젝트를 개수 제한 없이 등록하고 노출 순서를 자유롭게 지정합니다. (현재 총 <strong style={{ color: "#f59e0b" }}>{data.featured.length}</strong>개 슬라이드)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddFeaturedSlot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f59e0b",
                    border: "1px solid #f59e0b",
                    color: "#000",
                    padding: "10px 18px",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    borderRadius: "2px",
                    flexShrink: 0,
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <Plus size={16} /> Hero 항목 추가
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {data.featured.map((rawId, slotIndex) => {
                  const cleanPromoId = rawId.startsWith("promo:") ? rawId.replace("promo:", "") : rawId;
                  const cleanFilmId = rawId.startsWith("film:") ? rawId.replace("film:", "") : rawId;

                  const promo = data.promos?.find((p) => p.id === cleanPromoId || p.id === rawId);
                  const film = !promo ? data.films.find((f) => f.id === cleanFilmId || f.id === rawId) : null;
                  const isPromo = Boolean(promo);

                  const thumbnail = isPromo ? promo?.image : film?.heroImage;
                  const title = isPromo ? (promo?.titleLines || []).join(" ") : film?.title;
                  const subtitle = isPromo
                    ? (promo?.subtitle || promo?.kicker || "프로모션 프로젝트")
                    : `${film?.titleKo || ""} · ${film?.director || ""} (${film?.year || ""})`;

                  return (
                    <div
                      key={`${rawId}-${slotIndex}`}
                      style={{
                        background: "#101010",
                        border: "1px solid rgba(255,255,255,0.12)",
                        padding: "18px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      {/* Order Up/Down buttons */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          disabled={slotIndex === 0}
                          onClick={() => handleMoveFeatured(slotIndex, "up")}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: slotIndex === 0 ? "#333" : "#aaa",
                            cursor: slotIndex === 0 ? "default" : "pointer",
                            padding: "3px 4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="위로 1칸 이동"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={slotIndex === data.featured.length - 1}
                          onClick={() => handleMoveFeatured(slotIndex, "down")}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: slotIndex === data.featured.length - 1 ? "#333" : "#aaa",
                            cursor: slotIndex === data.featured.length - 1 ? "default" : "pointer",
                            padding: "3px 4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="아래로 1칸 이동"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {/* Slot Number Badge */}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: "#f59e0b",
                          width: "56px",
                          flexShrink: 0,
                        }}
                      >
                        SLOT {slotIndex + 1 < 10 ? `0${slotIndex + 1}` : slotIndex + 1}
                      </span>

                      {/* Type Badge */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          padding: "3px 7px",
                          borderRadius: "2px",
                          flexShrink: 0,
                          background: isPromo ? "rgba(168, 85, 247, 0.2)" : "rgba(59, 130, 246, 0.2)",
                          color: isPromo ? "#c084fc" : "#93c5fd",
                          border: `1px solid ${isPromo ? "rgba(168, 85, 247, 0.4)" : "rgba(59, 130, 246, 0.4)"}`,
                        }}
                      >
                        {isPromo ? "PROMO" : "FILM"}
                      </span>

                      {/* Dropdown Selector */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <select
                          value={rawId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setData((prev) => {
                              const newFeatured = [...prev.featured];
                              newFeatured[slotIndex] = newId;
                              return { ...prev, featured: newFeatured };
                            });
                          }}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "9px 12px",
                            fontSize: "13px",
                            outline: "none",
                          }}
                        >
                          <optgroup label="🎬 상영작 영화 (Films)">
                            {data.films.map((f) => (
                              <option key={`opt-film-${f.id}`} value={f.id}>
                                [영화] {f.title} ({f.titleKo}) — {f.director} ({f.year})
                              </option>
                            ))}
                          </optgroup>
                          {data.promos && data.promos.length > 0 && (
                            <optgroup label="✨ 기획 프로젝트 (Promo Cards)">
                              {data.promos.map((p) => (
                                <option key={`opt-promo-${p.id}`} value={`promo:${p.id}`}>
                                  [프로모션] {(p.titleLines || []).join(" ")} — {p.subtitle}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#777",
                            marginTop: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {title} — {subtitle}
                        </div>
                      </div>

                      {/* Thumbnail Preview */}
                      {thumbnail && (
                        <img
                          alt=""
                          src={thumbnail}
                          style={{
                            width: "90px",
                            height: "50px",
                            objectFit: "cover",
                            border: "1px solid rgba(255,255,255,0.2)",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Delete Slot Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeatured(slotIndex)}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#ef4444",
                          padding: "8px 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="이 슬라이드를 메인 Hero에서 제외"
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DIRECTOR NOTE */}
          {activeTab === "director" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                디렉터스 노트 관리
              </h2>
              <p style={{ margin: "0 0 28px", color: "#888", fontSize: "13px" }}>
                영화 목록 아래에 위치하는 100svh 대형 시네마틱 명대사 및 감독 코멘트 섹션입니다.
              </p>

              <div style={{ background: "#101010", border: "1px solid rgba(255,255,255,0.12)", padding: "28px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
                  한국어 인용구/코멘트 문구 (Quote)
                </label>
                <textarea
                  rows={4}
                  value={data.director.quote}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      director: { ...prev.director, quote: e.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "14px",
                    fontSize: "18px",
                    fontFamily: "'Noto Serif KR', serif",
                    lineHeight: "1.6",
                    outline: "none",
                  }}
                />

                <div style={{ marginTop: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
                    배경 사진 이미지 URL (Photo URL, 비워두면 흑백 시네마 그래픽 적용)
                  </label>
                  <input
                    type="text"
                    value={data.director.photo || ""}
                    placeholder="https://... 또는 비워두기"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        director: { ...prev.director, photo: e.target.value },
                      }))
                    }
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT SECTION */}
          {activeTab === "about" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                ABOUT 섹션 관리
              </h2>
              <p style={{ margin: "0 0 28px", color: "#888", fontSize: "13px" }}>
                회사 소개 국/영문 바이링구얼 문구를 편집합니다.
              </p>

              <div style={{ background: "#101010", border: "1px solid rgba(255,255,255,0.12)", padding: "28px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
                  한국어 소개 (줄바꿈으로 단락 구분)
                </label>
                <textarea
                  rows={6}
                  defaultValue={
                    "라이트하우스는 예술영화관 프로그래머에 의해 설립된 영화 수입/배급사입니다.\n\n영화 프로그램의 맥락을 배급과 연결 시켜, 동시대 관객들에게 가장 유효한 영화를 선보입니다.\n\n가장 영화적인 언어를 마케팅에 적용해 영화 산업의 저변을 확대하고, 새로운 경험을 발명합니다."
                  }
                  style={{
                    width: "100%",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "14px",
                    fontSize: "15px",
                    lineHeight: "1.7",
                    outline: "none",
                  }}
                />

                <div style={{ marginTop: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
                    영문 소개 (English Description)
                  </label>
                  <textarea
                    rows={6}
                    defaultValue={
                      "Lighthouse Co. is a Korean art-house film distributor founded on extensive experience in cinema programming and film festival planning. The team is led by former theater programmers and includes in-house design and marketing staff, as well as a studio capable of DCP production. We are committed to introducing each film with care, respecting both its context and the environment in which it is screened."
                    }
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "14px",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      outline: "none",
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROMO SECTION */}
          {/* TAB 5: PROMO CARDS MANAGER (MULTI-CARD SUPPORT) */}
          {activeTab === "promo" && (() => {
            const promoList = data.promos || [];
            const activePromo = promoList.find((p) => p.id === selectedPromoId) || promoList[0];
            const activeIndex = promoList.findIndex((p) => p.id === activePromo?.id);

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "28px",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: "24px", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                      기획 프로젝트 (Promo Cards) 관리
                    </h2>
                    <p style={{ margin: "6px 0 0", color: "#888", fontSize: "13px" }}>
                      ABOUT 섹션 하단에 순서대로 이어져 표시되는 프로모션 카드들을 추가, 순서 변경, 삭제 및 편집합니다. (총 {promoList.length}개)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewPromo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#222",
                      border: "1px solid rgba(255,255,255,0.3)",
                      color: "#fff",
                      padding: "10px 18px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={16} />새 프로모션 카드 추가
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "32px", alignItems: "start" }}>
                  {/* Left: Promo Cards List */}
                  <div
                    style={{
                      background: "#0f0f0f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "2px",
                      maxHeight: "75vh",
                      overflowY: "auto",
                    }}
                  >
                    {promoList.map((card, idx) => {
                      const isSelected = card.id === (activePromo?.id || "");
                      return (
                        <div
                          key={card.id || idx}
                          onClick={() => setSelectedPromoId(card.id)}
                          style={{
                            padding: "16px",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: isSelected ? "#1c1c1c" : "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            borderLeft: isSelected ? "3px solid #f1f1ee" : "3px solid transparent",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  color: "#f59e0b",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                {card.badgeTopRight || `0${idx + 1}`}
                              </span>
                              {isItemFeatured("promo", card.id) && (
                                <span
                                  title="메인 Hero 슬라이드에 포함됨"
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 800,
                                    letterSpacing: "0.1em",
                                    color: "#c084fc",
                                    background: "rgba(168, 85, 247, 0.15)",
                                    padding: "1px 5px",
                                    borderRadius: "2px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  HERO
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: isSelected ? "#fff" : "#ccc",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {(card.titleLines || []).join(" ") || "Untitled Project"}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#888",
                                marginTop: "3px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {card.subtitle}
                            </div>
                          </div>

                          {/* Reorder Buttons */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePromo(idx, "up")}
                              style={{
                                background: "transparent",
                                border: 0,
                                color: idx === 0 ? "#444" : "#aaa",
                                cursor: idx === 0 ? "default" : "pointer",
                                padding: "2px",
                              }}
                              title="위로 이동"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === promoList.length - 1}
                              onClick={() => handleMovePromo(idx, "down")}
                              style={{
                                background: "transparent",
                                border: 0,
                                color: idx === promoList.length - 1 ? "#444" : "#aaa",
                                cursor: idx === promoList.length - 1 ? "default" : "pointer",
                                padding: "2px",
                              }}
                              title="아래로 이동"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Selected Card Form */}
                  {activePromo && (
                    <div
                      style={{
                        background: "#101010",
                        border: "1px solid rgba(255,255,255,0.12)",
                        padding: "32px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                          paddingBottom: "16px",
                          marginBottom: "24px",
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>
                          프로모션 카드 상세 편집 (순서: {activeIndex + 1}번째)
                        </h3>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedItem("promo", activePromo.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: isItemFeatured("promo", activePromo.id)
                                ? "rgba(168, 85, 247, 0.2)"
                                : "#1e1e1e",
                              border: `1px solid ${
                                isItemFeatured("promo", activePromo.id)
                                  ? "rgba(168, 85, 247, 0.6)"
                                  : "rgba(255,255,255,0.2)"
                              }`,
                              color: isItemFeatured("promo", activePromo.id) ? "#c084fc" : "#ccc",
                              padding: "7px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Star size={13} />
                            {isItemFeatured("promo", activePromo.id)
                              ? "메인 Hero에서 제외"
                              : "메인 Hero로 지정"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePromo(activePromo.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#ef4444",
                              padding: "7px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} />
                            카드 삭제
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            상단 좌측 배지 라벨
                          </label>
                          <input
                            type="text"
                            value={activePromo.badgeTopLeft || ""}
                            placeholder="LIGHTHOUSE / FEATURED PROJECT"
                            onChange={(e) => handlePromoChange(activePromo.id, "badgeTopLeft", e.target.value)}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            상단 우측 번호/타입 배지 라벨
                          </label>
                          <input
                            type="text"
                            value={activePromo.badgeTopRight || ""}
                            placeholder="01 — SPECIAL PROJECT"
                            onChange={(e) => handlePromoChange(activePromo.id, "badgeTopRight", e.target.value)}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            카드 대형 타이틀 1행
                          </label>
                          <input
                            type="text"
                            value={activePromo.titleLines[0] || ""}
                            placeholder="Objects &"
                            onChange={(e) => {
                              const lines = [...(activePromo.titleLines || ["", ""])];
                              lines[0] = e.target.value;
                              handlePromoChange(activePromo.id, "titleLines", lines);
                            }}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            카드 대형 타이틀 2행
                          </label>
                          <input
                            type="text"
                            value={activePromo.titleLines[1] || ""}
                            placeholder="Moving Images."
                            onChange={(e) => {
                              const lines = [...(activePromo.titleLines || ["", ""])];
                              lines[1] = e.target.value;
                              handlePromoChange(activePromo.id, "titleLines", lines);
                            }}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            상단 킥커 문구 (Kicker)
                          </label>
                          <input
                            type="text"
                            value={activePromo.kicker || ""}
                            placeholder="EXPLORE BEYOND THE SCREEN"
                            onChange={(e) => handlePromoChange(activePromo.id, "kicker", e.target.value)}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            CTA 버튼 문구
                          </label>
                          <input
                            type="text"
                            value={activePromo.ctaText || ""}
                            placeholder="STORE / EXPLORE"
                            onChange={(e) => handlePromoChange(activePromo.id, "ctaText", e.target.value)}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: "20px" }}>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          부제목 (Subtitle)
                        </label>
                        <input
                          type="text"
                          value={activePromo.subtitle || ""}
                          placeholder="영화 밖에서 이어지는 새로운 경험"
                          onChange={(e) => handlePromoChange(activePromo.id, "subtitle", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div style={{ marginTop: "20px" }}>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          클릭 시 이동할 링크 URL (웹 주소 또는 mailto:)
                        </label>
                        <input
                          type="text"
                          value={activePromo.url || ""}
                          placeholder="mailto:keeper@lighthouse.re.kr?subject=Inquiry 또는 https://..."
                          onChange={(e) => handlePromoChange(activePromo.id, "url", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "13px",
                            outline: "none",
                            fontFamily: "monospace",
                          }}
                        />
                      </div>

                      <div style={{ marginTop: "20px" }}>
                        <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                          프로모션 배경 이미지 URL
                        </label>
                        <input
                          type="text"
                          value={activePromo.image || ""}
                          placeholder="/images/promo-example.jpg 또는 https://..."
                          onChange={(e) => handlePromoChange(activePromo.id, "image", e.target.value)}
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "10px 14px",
                            fontSize: "13px",
                            outline: "none",
                            fontFamily: "monospace",
                          }}
                        />
                      </div>

                      {activePromo.image && (
                        <div style={{ marginTop: "16px" }}>
                          <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px" }}>
                            이미지 미리보기
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: "120px",
                              overflow: "hidden",
                              background: "#000",
                              border: "1px solid rgba(255,255,255,0.15)",
                            }}
                          >
                            <img
                              alt=""
                              src={activePromo.image}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 6: CONTACT LINKS */}
          {activeTab === "contact" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                연락처 및 소셜 미디어 (CONTACT)
              </h2>
              <p style={{ margin: "0 0 28px", color: "#888", fontSize: "13px" }}>
                하단 CONTACT 영역에 표시되는 공식 이메일 및 채널 링크를 관리합니다.
              </p>

              <div style={{ background: "#101010", border: "1px solid rgba(255,255,255,0.12)", padding: "28px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                    대표 이메일 주소 (Email)
                  </label>
                  <input
                    type="text"
                    defaultValue="keeper@lighthouse.re.kr"
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                    YouTube 채널 링크 URL
                  </label>
                  <input
                    type="text"
                    defaultValue="https://www.youtube.com/channel/UCZGkkk92ozbMX4Zo3WYCSbg"
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                    Instagram 프로필 링크 URL
                  </label>
                  <input
                    type="text"
                    defaultValue="https://www.instagram.com/filmlighthouse"
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                    X (구 Twitter) 프로필 링크 URL
                  </label>
                  <input
                    type="text"
                    defaultValue="https://x.com/filmxlighthouse"
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY SETTINGS */}
          {activeTab === "security" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                보안 및 관리자 권한 설정
              </h2>
              <p style={{ margin: "0 0 28px", color: "#888", fontSize: "13px" }}>
                관리자 페이지 비밀번호를 변경하고, 일반 방문자에게 어드민 버튼을 숨기는 스텔스 모드를 설정합니다.
              </p>

              {passwordSuccess && (
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#86efac",
                    padding: "12px 18px",
                    fontSize: "13px",
                    marginBottom: "24px",
                  }}
                >
                  {passwordSuccess}
                </div>
              )}

              {/* Password Change Box */}
              <div
                style={{
                  background: "#101010",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "28px",
                  marginBottom: "28px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>
                  관리자 마스터 비밀번호 변경
                </h3>
                <p style={{ fontSize: "12px", color: "#888", margin: "0 0 20px" }}>
                  비밀번호를 변경하면 다음 로그인부터 새 비밀번호로만 접속할 수 있습니다.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      placeholder="새 비밀번호 입력"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#080808",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        padding: "10px 14px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                      새 비밀번호 확인
                    </label>
                    <input
                      type="password"
                      placeholder="새 비밀번호 재입력"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#080808",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        padding: "10px 14px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newPasswordInput) {
                      alert("새 비밀번호를 입력해 주세요.");
                      return;
                    }
                    if (newPasswordInput !== confirmPasswordInput) {
                      alert("비밀번호 확인이 일치하지 않습니다.");
                      return;
                    }
                    onPasswordChange(newPasswordInput);
                    setNewPasswordInput("");
                    setConfirmPasswordInput("");
                    setPasswordSuccess("비밀번호가 성공적으로 변경되었습니다.");
                    setTimeout(() => setPasswordSuccess(null), 3500);
                  }}
                  style={{
                    background: "#f1f1ee",
                    border: 0,
                    color: "#111",
                    padding: "10px 20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  비밀번호 변경 저장
                </button>
              </div>

              {/* Stealth Mode Box */}
              <div
                style={{
                  background: "#101010",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "28px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>
                      스텔스 모드 (일반 방문자에게 어드민 버튼 숨기기)
                    </h3>
                    <p style={{ fontSize: "13px", color: "#999", lineHeight: "1.6", margin: "0 0 12px" }}>
                      활성화하면 상단 메뉴 바의 <code>ADMIN ⚙</code> 링크와 우측 하단 플로팅 버튼이 화면에서 완전히 숨겨집니다.
                      오직 관리자 본인만 아래 방법으로 관리자 창을 열 수 있습니다:
                    </p>
                    <ul style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.8", margin: 0, paddingLeft: "18px" }}>
                      <li>
                        단축키: <kbd style={{ background: "#222", padding: "2px 6px", border: "1px solid #444" }}>Ctrl + Shift + A</kbd> (Mac: <kbd style={{ background: "#222", padding: "2px 6px", border: "1px solid #444" }}>Cmd + Shift + A</kbd>)
                      </li>
                      <li>
                        로고 클릭: 좌측 상단 <strong>Lighthouse</strong> 로고를 빠르게 5번 연속 클릭
                      </li>
                      <li>
                        URL 직접 접속: 주소창 끝에 <code>/#admin</code> 입력 후 엔터
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStealth(!stealthMode)}
                    style={{
                      background: stealthMode ? "#16a34a" : "#222",
                      border: `1px solid ${stealthMode ? "#22c55e" : "#444"}`,
                      color: "#fff",
                      padding: "10px 18px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stealthMode ? "스텔스 활성화됨 (숨김)" : "스텔스 비활성화 (버튼 노출)"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EXPORT CONTENT.JS */}
          {activeTab === "export" && (
            <div style={{ maxWidth: "800px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                    content.js 파일 내보내기
                  </h2>
                  <p style={{ margin: "6px 0 0", color: "#888", fontSize: "13px" }}>
                    현재 설정된 모든 사이트 데이터를 원본 규격의 `content.js` 코드로 내보냅니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: copiedCode ? "#16a34a" : "#f1f1ee",
                    border: "1px solid #fff",
                    color: copiedCode ? "#fff" : "#111",
                    padding: "10px 18px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  {copiedCode ? "복사 완료!" : "전체 코드 복사"}
                </button>
              </div>

              <textarea
                readOnly
                value={generateContentJs()}
                style={{
                  width: "100%",
                  height: "550px",
                  background: "#080808",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#d1d5db",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  padding: "20px",
                  outline: "none",
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
