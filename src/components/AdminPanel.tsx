import React, { useState, useEffect } from "react";
import { Film, SiteContent, PromoCard, NavItem, DEFAULT_NAV_ITEMS, ContactInfo, INITIAL_CONTENT, ArtworkEntry } from "../data/content.ts";
import { normalizeContent, checkFirestoreStatus } from "../services/contentSync.ts";
import { resolveAssetUrl, formatGoogleDriveImageUrl } from "../utils/assets.ts";
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
  EyeOff,
  ShieldCheck,
  LogOut,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  Link2,
  Cloud,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

interface AdminPanelProps {
  content: SiteContent;
  onSave: (updated: SiteContent) => Promise<boolean | void> | void;
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

type TabType = "films" | "featured" | "artworks" | "navigation" | "director" | "about" | "promo" | "contact" | "security" | "export";

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
  const [data, setData] = useState<SiteContent>(() => normalizeContent(content));
  const [cloudStatus, setCloudStatus] = useState<{ connected: boolean; filmCount: number; updatedAt?: string }>({
    connected: true,
    filmCount: data.films?.length || 9,
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const lastSaveTimeRef = React.useRef<number>(0);

  // Periodically and on-mount verify Cloud Firestore connection & doc
  useEffect(() => {
    checkFirestoreStatus().then((status) => {
      setCloudStatus(status);
    });
  }, []);

  // When content prop updates from real-time Firestore sync, update data
  useEffect(() => {
    if (Date.now() - lastSaveTimeRef.current < 2500) {
      // Ignore incoming Firestore snapshots if user just performed an immediate action
      return;
    }
    setData(normalizeContent(content));
  }, [content]);

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

  // Tab 3 Artwork Registration Form States
  const [newArtFilmId, setNewArtFilmId] = useState<string>("");
  const [newArtType, setNewArtType] = useState<string>("메인/오리지널 포스터");
  const [newArtTitle, setNewArtTitle] = useState<string>("");
  const [newArtImageUrl, setNewArtImageUrl] = useState<string>("");
  const [newArtDesigner, setNewArtDesigner] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Film Handlers
  const handleFilmChange = (id: string, field: keyof Film, value: any) => {
    let sanitizedValue = value;
    if (
      typeof value === "string" &&
      (field === "heroImage" || field === "posterImage" || field === "mainArtworkImage")
    ) {
      sanitizedValue = formatGoogleDriveImageUrl(value);
    }
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => (f.id === id ? { ...f, [field]: sanitizedValue } : f)),
    }));
  };

  const handleAddNewIndividualArtwork = () => {
    const targetFilmId = newArtFilmId || data.films[0]?.id;
    if (!targetFilmId) {
      alert("영화를 선택해 주세요.");
      return;
    }
    if (!newArtImageUrl.trim()) {
      alert("아트워크 이미지 URL 또는 구글 드라이브 링크를 입력해 주세요.");
      return;
    }

    const formattedUrl = formatGoogleDriveImageUrl(newArtImageUrl.trim());
    const newArtEntry: ArtworkEntry = {
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: newArtType.trim() || "메인/오리지널 포스터",
      imageUrl: formattedUrl,
      title: newArtTitle.trim() || undefined,
      designer: newArtDesigner.trim() || undefined,
    };

    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => {
        if (f.id === targetFilmId) {
          const currentArts = Array.isArray(f.artworks) ? f.artworks : [];
          return {
            ...f,
            artworks: [...currentArts, newArtEntry],
          };
        }
        return f;
      }),
    }));

    setNewArtImageUrl("");
    setNewArtTitle("");
    setNewArtDesigner("");
    showToast("새 아트워크 및 디자이너가 등록되었습니다.");
  };

  const handleUpdateArtworkEntry = (filmId: string, artIndex: number, patch: Partial<ArtworkEntry>) => {
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => {
        if (f.id !== filmId) return f;
        const currentList = Array.isArray(f.artworks) ? f.artworks : [];
        const sanitizedPatch = { ...patch };
        if (typeof sanitizedPatch.imageUrl === "string") {
          sanitizedPatch.imageUrl = formatGoogleDriveImageUrl(sanitizedPatch.imageUrl);
        }
        const updatedList = currentList.map((art, idx) => {
          if (idx !== artIndex) return art;
          const base: ArtworkEntry =
            typeof art === "string"
              ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: art }
              : { ...art };
          return { ...base, ...sanitizedPatch };
        });
        return { ...f, artworks: updatedList };
      }),
    }));
  };

  const handleDeleteArtworkEntry = (filmId: string, artIndex: number) => {
    if (!confirm("이 아트워크를 삭제하시겠습니까?")) return;
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => {
        if (f.id !== filmId) return f;
        const currentList = Array.isArray(f.artworks) ? f.artworks : [];
        return {
          ...f,
          artworks: currentList.filter((_, idx) => idx !== artIndex),
        };
      }),
    }));
    showToast("아트워크가 삭제되었습니다.");
  };

  const handleMoveArtworkEntry = (filmId: string, artIndex: number, direction: "up" | "down") => {
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) => {
        if (f.id !== filmId) return f;
        const currentList = Array.isArray(f.artworks) ? [...f.artworks] : [];
        const targetIndex = direction === "up" ? artIndex - 1 : artIndex + 1;
        if (targetIndex < 0 || targetIndex >= currentList.length) return f;
        const temp = currentList[artIndex];
        currentList[artIndex] = currentList[targetIndex];
        currentList[targetIndex] = temp;
        return { ...f, artworks: currentList };
      }),
    }));
  };

  const handleConvertFilmPosterToArtwork = (filmId: string) => {
    const film = data.films.find((f) => f.id === filmId);
    if (!film) return;
    const img = film.mainArtworkImage || film.posterImage || film.heroImage;
    if (!img) {
      alert("해당 영화에 등록된 포스터 이미지가 없습니다.");
      return;
    }
    const newArt: ArtworkEntry = {
      id: `art-${Date.now()}`,
      type: "메인/오리지널 포스터",
      imageUrl: formatGoogleDriveImageUrl(img),
      designer: film.artworkDesigner || "",
    };
    setData((prev) => ({
      ...prev,
      films: prev.films.map((f) =>
        f.id === filmId
          ? { ...f, artworks: [newArt, ...(Array.isArray(f.artworks) ? f.artworks : [])] }
          : f
      ),
    }));
    showToast(`[${film.title}] 포스터가 개별 아트워크 목록으로 변환되었습니다.`);
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

  const getHeroIndex = (type: "film" | "promo", id: string): number => {
    const targetPrefixed = `${type}:${id}`;
    return data.featured.findIndex(
      (fId) =>
        fId === targetPrefixed ||
        fId === id ||
        (type === "promo" && fId.startsWith("promo:") && fId.replace("promo:", "") === id) ||
        (type === "film" && (fId === id || fId.replace("film:", "") === id))
    );
  };

  const isItemFeatured = (type: "film" | "promo", id: string) => {
    return getHeroIndex(type, id) !== -1;
  };

  const handleSetFeaturedPosition = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= data.featured.length) return;
    setData((prev) => {
      const list = [...prev.featured];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, featured: list };
    });
    showToast(`메인 Hero 노출 순서가 ${toIndex + 1}번째로 변경되었습니다.`);
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

  // Dedicated Instant-Save Handler for Artwork Exposure (ON / OFF)
  const handleToggleArtworkExposure = (filmId: string, artIndex: number) => {
    let nextVal = false;
    let artTitleOrType = "아트워크";

    const nextFilms = data.films.map((film) => {
      if (film.id !== filmId) return film;
      const currentList = Array.isArray(film.artworks) ? film.artworks : [];
      if (artIndex === -1) {
        // Film level fallback artwork
        const currentShow = film.showInMainArtworks !== false;
        nextVal = !currentShow;
        artTitleOrType = film.title;
        return { ...film, showInMainArtworks: nextVal };
      }
      const updatedList = currentList.map((art, idx) => {
        if (idx !== artIndex) return art;
        const base: ArtworkEntry =
          typeof art === "string"
            ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: art, showInMain: true }
            : { ...art };
        const currentShow = base.showInMain !== false;
        nextVal = !currentShow;
        artTitleOrType = base.title || base.type || "아트워크";
        return { ...base, showInMain: nextVal };
      });
      return { ...film, artworks: updatedList };
    });

    const nextData: SiteContent = {
      ...data,
      films: nextFilms,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`[${artTitleOrType}] 메인 슬라이더에 ${nextVal ? "노출 [ON]" : "숨김 [OFF]"} 설정되었습니다 (즉시 저장 완료).`);
  };

  interface FlatArtworkItem {
    id: string;
    filmId: string;
    filmTitle: string;
    filmTitleKo?: string;
    artIndex: number;
    imageUrl: string;
    type: string;
    title?: string;
    designer: string;
    showInMain: boolean;
  }

  const allArtworksForMain = React.useMemo(() => {
    const list: FlatArtworkItem[] = [];

    data.films.forEach((film) => {
      const artList = Array.isArray(film.artworks) ? film.artworks : [];
      if (artList.length > 0) {
        artList.forEach((art, idx) => {
          if (!art) return;
          const artUrl = typeof art === "string" ? art : art.imageUrl;
          if (!artUrl || !artUrl.trim()) return;
          const artId = (typeof art === "object" && art.id) ? art.id : `${film.id}-art-${idx}`;
          const isShow = typeof art === "object" ? art.showInMain !== false : true;
          const artDesigner = typeof art === "object" ? art.designer : undefined;
          const designer = (artDesigner && artDesigner.trim()) || (film.artworkDesigner && film.artworkDesigner.trim()) || "";
          const artTitle = typeof art === "object" ? art.title : undefined;
          const artType = typeof art === "object" ? art.type : "포스터";

          list.push({
            id: artId,
            filmId: film.id,
            filmTitle: film.title,
            filmTitleKo: film.titleKo,
            artIndex: idx,
            imageUrl: artUrl.trim(),
            type: artType || "포스터",
            title: artTitle,
            designer,
            showInMain: isShow && (film.showInMainArtworks !== false),
          });
        });
      } else {
        const img = (film.mainArtworkImage && film.mainArtworkImage.trim()) ||
          (film.posterImage && film.posterImage.trim()) ||
          (film.heroImage && film.heroImage.trim());
        if (img) {
          list.push({
            id: `${film.id}-main`,
            filmId: film.id,
            filmTitle: film.title,
            filmTitleKo: film.titleKo,
            artIndex: -1,
            imageUrl: img.trim(),
            type: "오리지널 포스터",
            title: film.title,
            designer: (film.artworkDesigner && film.artworkDesigner.trim()) || "",
            showInMain: film.showInMainArtworks !== false,
          });
        }
      }
    });

    if (Array.isArray(data.mainArtworkIds) && data.mainArtworkIds.length > 0) {
      list.sort((a, b) => {
        let idxA = data.mainArtworkIds!.indexOf(a.id);
        if (idxA === -1) idxA = data.mainArtworkIds!.indexOf(a.filmId);
        if (idxA === -1) idxA = 9999;

        let idxB = data.mainArtworkIds!.indexOf(b.id);
        if (idxB === -1) idxB = data.mainArtworkIds!.indexOf(b.filmId);
        if (idxB === -1) idxB = 9999;

        return idxA - idxB;
      });
    }

    return list;
  }, [data.films, data.mainArtworkIds]);

  // Set direct Artwork Position (1순위, 2순위...) like Hero Manager
  const handleSetArtworkPosition = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= allArtworksForMain.length) return;
    const currentOrder = allArtworksForMain.map((item) => item.id);
    const [moved] = currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, moved);

    const nextData: SiteContent = {
      ...data,
      mainArtworkIds: currentOrder,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`아트워크가 ${toIndex + 1}순위(${toIndex === 0 ? "★제일 왼쪽" : ""})로 설정되었습니다.`);
  };

  const handleMoveArtworkStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    handleSetArtworkPosition(index, targetIndex);
  };

  // Reorder Artwork on Main Screen (1 is leftmost: 1번이 제일 왼쪽)
  const handleMoveArtworkRank = (artworkId: string, direction: "left" | "right") => {
    const currentOrder = allArtworksForMain.map((item) => item.id);
    const curIndex = currentOrder.indexOf(artworkId);
    if (curIndex === -1) return;
    const targetIndex = direction === "left" ? curIndex - 1 : curIndex + 1;
    handleSetArtworkPosition(curIndex, targetIndex);
  };

  const handleUpdateArtworkDesignerDirect = (filmId: string, artIndex: number, designerName: string) => {
    const nextFilms = data.films.map((film) => {
      if (film.id !== filmId) return film;
      if (artIndex === -1) {
        return { ...film, artworkDesigner: designerName };
      }
      const currentList = Array.isArray(film.artworks) ? film.artworks : [];
      const updatedList = currentList.map((art, idx) => {
        if (idx !== artIndex) return art;
        const base: ArtworkEntry =
          typeof art === "string"
            ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: art }
            : { ...art };
        return { ...base, designer: designerName };
      });
      return { ...film, artworks: updatedList };
    });

    const nextData: SiteContent = {
      ...data,
      films: nextFilms,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
  };

  // Main Navigation Menu Handlers
  const handleAddNavItem = (preset?: { label: string; url: string; targetBlank?: boolean }) => {
    const newId = "nav-" + Date.now().toString(36);
    const url = preset?.url || "https://";
    const newItem: NavItem = {
      id: newId,
      label: preset?.label || "NEW MENU",
      url,
      isExternal: !url.startsWith("#"),
      targetBlank: preset?.targetBlank ?? !url.startsWith("#"),
      visible: true,
    };
    setData((prev) => ({
      ...prev,
      navItems: [...(prev.navItems || DEFAULT_NAV_ITEMS), newItem],
    }));
    showToast("새 메인 메뉴가 추가되었습니다.");
  };

  const handleUpdateNavItem = (id: string, field: keyof NavItem, value: any) => {
    setData((prev) => ({
      ...prev,
      navItems: (prev.navItems || DEFAULT_NAV_ITEMS).map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "url" && typeof value === "string") {
            const isExt = !value.startsWith("#");
            updated.isExternal = isExt;
            if (isExt && updated.targetBlank === undefined) {
              updated.targetBlank = true;
            }
          }
          return updated;
        }
        return item;
      }),
    }));
  };

  const handleMoveNavItem = (index: number, direction: "up" | "down") => {
    setData((prev) => {
      const list = [...(prev.navItems || DEFAULT_NAV_ITEMS)];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, navItems: list };
    });
  };

  const handleDeleteNavItem = (id: string) => {
    const list = data.navItems || DEFAULT_NAV_ITEMS;
    if (list.length <= 1) {
      alert("메인 메뉴는 최소 1개 이상 유지되어야 합니다.");
      return;
    }
    if (confirm("정말 이 메뉴 항목을 삭제하시겠습니까?")) {
      setData((prev) => ({
        ...prev,
        navItems: (prev.navItems || DEFAULT_NAV_ITEMS).filter((item) => item.id !== id),
      }));
      showToast("메뉴 항목이 삭제되었습니다.");
    }
  };

  const handleResetNavItems = () => {
    if (confirm("메인 메뉴를 초기 기본 메뉴(PROGRAMS, ABOUT, CONTACT)로 되돌리시겠습니까?")) {
      setData((prev) => ({
        ...prev,
        navItems: DEFAULT_NAV_ITEMS,
      }));
      showToast("메인 메뉴가 기본값으로 복원되었습니다.");
    }
  };

  const handleContactChange = (field: keyof ContactInfo, value: string) => {
    setData((prev) => ({
      ...prev,
      contact: {
        email: prev.contact?.email || "keeper@lighthouse.re.kr",
        youtubeUrl: prev.contact?.youtubeUrl || "https://www.youtube.com/channel/UCZGkkk92ozbMX4Zo3WYCSbg",
        instagramUrl: prev.contact?.instagramUrl || "https://www.instagram.com/filmlighthouse",
        xUrl: prev.contact?.xUrl || "https://x.com/filmxlighthouse",
        inquiryEndpoint: prev.contact?.inquiryEndpoint || "https://script.google.com/macros/s/AKfycbx5J9UTRPe0IM9mRuEUbhs9fjDnJOZgqgiGfTlD9DyQEOpJ-TDCTArqym1iRo3o-_qVqg/exec",
        [field]: value,
      },
    }));
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
    let sanitizedValue = value;
    if (field === "image" && typeof value === "string") {
      sanitizedValue = formatGoogleDriveImageUrl(value);
    }
    setData((prev) => ({
      ...prev,
      promos: (prev.promos || []).map((p) => (p.id === id ? { ...p, [field]: sanitizedValue } : p)),
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
      visible: true,
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

  const handleTogglePromoSectionVisibility = () => {
    setData((prev) => {
      const next = prev.promosVisible === false ? true : false;
      showToast(`메인화면 프로모션 카드 섹션이 ${next ? "노출" : "전체 숨김"} 처리되었습니다.`);
      return { ...prev, promosVisible: next };
    });
  };

  const handleTogglePromoCardVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setData((prev) => {
      const nextPromos = (prev.promos || []).map((p) => {
        if (p.id === id) {
          const nextVal = p.visible === false ? true : false;
          showToast(`해당 프로모션 카드가 메인화면에서 ${nextVal ? "노출" : "숨김"} 처리되었습니다.`);
          return { ...p, visible: nextVal };
        }
        return p;
      });
      return { ...prev, promos: nextPromos };
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  // Save to parent & cloud
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await onSave(data);
      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(nowStr);
      showToast("✅ 클라우드 Firestore(lighthouse-3bb68)에 실시간 저장 완료! (모바일 및 모든 기기 즉시 반영)");
      checkFirestoreStatus().then((st) => setCloudStatus(st));

      try {
        window.alert("저장 성공!");
      } catch {
        // Fallback if blocked
      }
    } catch (err: any) {
      console.error("Cloud save error:", err);
      const errorMessage = err?.message || String(err) || "알 수 없는 에러";
      showToast("❌ 저장 실패: " + errorMessage);

      try {
        window.alert("실패 이유: " + errorMessage);
      } catch {
        // Fallback if blocked
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshFromCloud = async () => {
    try {
      setIsSaving(true);
      const st = await checkFirestoreStatus();
      setCloudStatus(st);
      const fresh = normalizeContent(content);
      setData(fresh);
      showToast("🔄 클라우드 최신 데이터를 성공적으로 불러왔습니다.");
    } catch (err: any) {
      showToast("클라우드 데이터 확인 실패: " + (err?.message || "오류"));
    } finally {
      setIsSaving(false);
    }
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
            src={resolveAssetUrl("/assets/aistudio/Lighthouse_a4cd72d2.png")}
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
          {/* Cloud Sync Status Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: cloudStatus.connected ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${cloudStatus.connected ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              color: cloudStatus.connected ? "#4ade80" : "#f87171",
              borderRadius: "4px",
            }}
          >
            <Cloud size={14} />
            <span>
              {cloudStatus.connected
                ? `Firebase Firestore 실시간 연동 (영화 ${cloudStatus.filmCount || data.films.length}편)`
                : "클라우드 연결 확인 중..."}
            </span>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleRefreshFromCloud}
              title="클라우드 최신 데이터 즉시 새로고침"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                padding: "2px 6px",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "3px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <RefreshCw size={10} className={isSaving ? "animate-spin" : ""} />
              새로고침
            </button>

          </div>

          {lastSavedTime && (
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              마지막 저장: {lastSavedTime}
            </span>
          )}

          {toastMessage && (
            <span
              style={{
                fontSize: "12px",
                color: "#86efac",
                background: "rgba(22, 101, 52, 0.5)",
                padding: "6px 14px",
                borderRadius: "4px",
                border: "1px solid rgba(134, 239, 172, 0.4)",
                fontWeight: 600,
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
            disabled={isSaving}
            onClick={handleSaveAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isSaving ? "#6b7280" : "#22c55e",
              border: "1px solid #4ade80",
              color: "#ffffff",
              padding: "9px 22px",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              borderRadius: "4px",
              cursor: isSaving ? "wait" : "pointer",
              boxShadow: "0 0 15px rgba(34, 197, 94, 0.4)",
              transition: "all 0.2s ease",
            }}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isSaving ? "클라우드 저장 중..." : "클라우드 저장 및 적용"}
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
            onClick={() => setActiveTab("artworks")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "artworks" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "artworks" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "artworks" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <ImageIcon size={16} />
            <span>아트워크 순서·노출 관리 ({allArtworksForMain.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("navigation")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "navigation" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "navigation" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "navigation" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Compass size={16} />
            <span>메인 메뉴 & 외부 링크 ({(data.navItems || DEFAULT_NAV_ITEMS).length})</span>
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
                            {(() => {
                              const heroIdx = getHeroIndex("film", film.id);
                              if (heroIdx >= 0) {
                                return (
                                  <span
                                    title={`메인 Hero ${heroIdx + 1}순위 슬라이드로 노출`}
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 800,
                                      letterSpacing: "0.06em",
                                      color: "#000",
                                      background: "#f59e0b",
                                      padding: "1px 6px",
                                      borderRadius: "2px",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    HERO #{heroIdx + 1}
                                  </span>
                                );
                              }
                              return null;
                            })()}
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

                        {(() => {
                          const heroIdx = getHeroIndex("film", currentFilm.id);
                          if (heroIdx >= 0) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.5)",
                                  padding: "3px 8px",
                                }}
                              >
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Star size={12} fill="#f59e0b" />
                                  Hero 순서:
                                </span>
                                <select
                                  value={heroIdx}
                                  onChange={(e) => handleSetFeaturedPosition(heroIdx, Number(e.target.value))}
                                  style={{
                                    background: "#0a0a0a",
                                    border: "1px solid rgba(245, 158, 11, 0.6)",
                                    color: "#f59e0b",
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                  title="메인 Hero 노출 순서 직접 지정"
                                >
                                  {data.featured.map((_, pIdx) => (
                                    <option key={pIdx} value={pIdx}>
                                      {pIdx + 1}순위 {pIdx === 0 ? "(첫 메인)" : ""}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={heroIdx === 0}
                                  onClick={() => handleMoveFeatured(heroIdx, "up")}
                                  style={{
                                    background: "transparent",
                                    border: 0,
                                    color: heroIdx === 0 ? "#444" : "#fff",
                                    cursor: heroIdx === 0 ? "default" : "pointer",
                                    padding: "3px 4px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Hero 순서 위로 1칸"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={heroIdx === data.featured.length - 1}
                                  onClick={() => handleMoveFeatured(heroIdx, "down")}
                                  style={{
                                    background: "transparent",
                                    border: 0,
                                    color: heroIdx === data.featured.length - 1 ? "#444" : "#fff",
                                    cursor: heroIdx === data.featured.length - 1 ? "default" : "pointer",
                                    padding: "3px 4px",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Hero 순서 아래로 1칸"
                                >
                                  <ArrowDown size={12} />
                                </button>
                                <div style={{ width: "1px", height: "14px", background: "rgba(245, 158, 11, 0.3)" }} />
                                <button
                                  type="button"
                                  onClick={() => toggleFeaturedItem("film", currentFilm.id)}
                                  style={{
                                    background: "transparent",
                                    border: 0,
                                    color: "#ef4444",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    padding: "3px 6px",
                                  }}
                                  title="메인 Hero에서 제외"
                                >
                                  Hero 제외
                                </button>
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => toggleFeaturedItem("film", currentFilm.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#1e1e1e",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ccc",
                                padding: "7px 14px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Star size={13} />
                              메인 Hero로 지정
                            </button>
                          );
                        })()}

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

                    {/* Booking & Press Inquiry Button Settings */}
                    <div
                      style={{
                        marginTop: "24px",
                        padding: "18px 20px",
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f1ee" }}>
                            상세 페이지 문의/예매 버튼 (BOOKING & PRESS INQUIRY)
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#888" }}>
                            영화 상세 정보 우측 하단에 표시되는 문의 및 링크 버튼을 설정합니다.
                          </p>
                        </div>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: currentFilm.bookingButtonVisible !== false ? "#10b981" : "#888",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentFilm.bookingButtonVisible !== false}
                            onChange={(e) =>
                              handleFilmChange(currentFilm.id, "bookingButtonVisible", e.target.checked)
                            }
                            style={{ accentColor: "#f59e0b", width: "16px", height: "16px", cursor: "pointer" }}
                          />
                          <span>{currentFilm.bookingButtonVisible !== false ? "버튼 노출" : "버튼 숨김"}</span>
                        </label>
                      </div>

                      {currentFilm.bookingButtonVisible !== false && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "14px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                              버튼 문구 (Button Text)
                            </label>
                            <input
                              type="text"
                              placeholder="기본: BOOKING & PRESS INQUIRY"
                              value={currentFilm.bookingButtonText || ""}
                              onChange={(e) =>
                                handleFilmChange(currentFilm.id, "bookingButtonText", e.target.value)
                              }
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
                              버튼 링크 / 이메일 (URL or mailto)
                            </label>
                            <input
                              type="text"
                              placeholder="비워둘 시 기본 라이트하우스 배급 문의 메일 전송"
                              value={currentFilm.bookingButtonUrl || ""}
                              onChange={(e) =>
                                handleFilmChange(currentFilm.id, "bookingButtonUrl", e.target.value)
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
                      )}
                    </div>

                    {/* Film Artworks & Poster Gallery Management */}
                    <div
                      style={{
                        marginTop: "24px",
                        padding: "18px 20px",
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "14px",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f1ee" }}>
                            영화 아트워크 및 갤러리 관리 (Artworks & Poster Gallery)
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#888" }}>
                            메인 화면 아트워크 슬라이더 및 영화 상세 페이지 전용 아트워크 갤러리를 관리합니다.
                          </p>
                        </div>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: currentFilm.showInMainArtworks !== false ? "#10b981" : "#888",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={currentFilm.showInMainArtworks !== false}
                            onChange={(e) =>
                              handleFilmChange(currentFilm.id, "showInMainArtworks", e.target.checked)
                            }
                            style={{ accentColor: "#f59e0b", width: "16px", height: "16px", cursor: "pointer" }}
                          />
                          <span>{currentFilm.showInMainArtworks !== false ? "메인 아트워크에 노출" : "메인 아트워크에서 숨김"}</span>
                        </label>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                            메인 화면 대표 이미지 URL (비워둘 시 포스터 자동 사용)
                          </label>
                          <input
                            type="text"
                            placeholder="https://... (비워둘 시 포스터 사용)"
                            value={currentFilm.mainArtworkImage || ""}
                            onChange={(e) =>
                              handleFilmChange(currentFilm.id, "mainArtworkImage", e.target.value)
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

                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "#f59e0b", fontWeight: 700, marginBottom: "6px" }}>
                            아트워크 디자이너 (Designed by)
                          </label>
                          <input
                            type="text"
                            placeholder="예: Studio Shin, 피그말리온, Empire Design 등"
                            value={currentFilm.artworkDesigner || ""}
                            onChange={(e) =>
                              handleFilmChange(currentFilm.id, "artworkDesigner", e.target.value)
                            }
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(245, 158, 11, 0.45)",
                              color: "#fff",
                              padding: "10px 14px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <span style={{ fontSize: "10px", color: "#888", display: "block", marginTop: "4px" }}>
                            메인 화면 아트워크 카드 우측 하단에 &apos;DESIGNED BY [디자이너명]&apos;으로 표시됩니다.
                          </span>
                        </div>
                      </div>

                      {/* Film specific artworks list with Types/Categories */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#f1f1ee", display: "block" }}>
                              영화 아트워크 및 포스터 종류별 목록 ({(() => {
                                const list = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                return list.length;
                              })()}개)
                            </label>
                            <span style={{ fontSize: "11px", color: "#888" }}>
                              포스터 종류(메인, 티저, 스페셜 아트, 해외판, 캐릭터, 스틸컷 등)를 선택/추가하고 관리합니다.
                            </span>
                          </div>

                          {/* Quick Add Preset Buttons */}
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const currentArtworks = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const newArt: ArtworkEntry = {
                                  id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  type: "메인/오리지널 포스터",
                                  imageUrl: "",
                                  title: "",
                                  designer: "",
                                  showInMain: true,
                                };
                                handleFilmChange(currentFilm.id, "artworks", [...currentArtworks, newArt]);
                              }}
                              style={{
                                background: "#f59e0b",
                                border: "1px solid #f59e0b",
                                color: "#000",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Plus size={12} />
                              + 아트워크 추가
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentArtworks = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const newArt: ArtworkEntry = {
                                  id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  type: "티저 포스터",
                                  imageUrl: "",
                                  title: "",
                                  designer: "",
                                  showInMain: true,
                                };
                                handleFilmChange(currentFilm.id, "artworks", [...currentArtworks, newArt]);
                              }}
                              style={{
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ccc",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                cursor: "pointer",
                              }}
                            >
                              + 티저 포스터
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentArtworks = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const newArt: ArtworkEntry = {
                                  id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  type: "스페셜 아트 포스터",
                                  imageUrl: "",
                                  title: "",
                                  designer: "",
                                  showInMain: true,
                                };
                                handleFilmChange(currentFilm.id, "artworks", [...currentArtworks, newArt]);
                              }}
                              style={{
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ccc",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                cursor: "pointer",
                              }}
                            >
                              + 스페셜 아트
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentArtworks = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const newArt: ArtworkEntry = {
                                  id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  type: "해외/국제판 포스터",
                                  imageUrl: "",
                                  title: "",
                                  designer: "",
                                  showInMain: true,
                                };
                                handleFilmChange(currentFilm.id, "artworks", [...currentArtworks, newArt]);
                              }}
                              style={{
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ccc",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                cursor: "pointer",
                              }}
                            >
                              + 해외/국제판
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentArtworks = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const newArt: ArtworkEntry = {
                                  id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  type: "스틸컷 / 비주얼 아카이브",
                                  imageUrl: "",
                                  title: "",
                                  designer: "",
                                  showInMain: true,
                                };
                                handleFilmChange(currentFilm.id, "artworks", [...currentArtworks, newArt]);
                              }}
                              style={{
                                background: "#1c1c1c",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ccc",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                cursor: "pointer",
                              }}
                            >
                              + 스틸컷
                            </button>
                          </div>
                        </div>

                        {(!currentFilm.artworks || currentFilm.artworks.length === 0) ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#777",
                              padding: "20px",
                              background: "#080808",
                              border: "1px dashed rgba(255,255,255,0.15)",
                              textAlign: "center",
                            }}
                          >
                            등록된 추가 아트워크 종류가 없습니다.
                            <br />
                            상단의 <strong>[+ 아트워크 추가]</strong> 버튼을 눌러 티저 포스터, 해외판 포스터, 스페셜 아트 등 원하는 종류의 아트워크를 추가해 보세요.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {currentFilm.artworks.map((rawArt, idx) => {
                              const artItem: ArtworkEntry =
                                typeof rawArt === "string"
                                  ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: rawArt, title: "", designer: "", showInMain: true }
                                  : {
                                      ...rawArt,
                                      id: rawArt.id || `art-${idx}`,
                                      type: rawArt.type || "메인/오리지널 포스터",
                                      imageUrl: rawArt.imageUrl || "",
                                      title: rawArt.title || "",
                                      caption: rawArt.caption || "",
                                      designer: rawArt.designer || "",
                                      showInMain: rawArt.showInMain !== false,
                                    };

                              const PRESET_OPTIONS = [
                                "메인/오리지널 포스터",
                                "티저 포스터",
                                "스페셜 아트 포스터",
                                "해외/국제판 포스터",
                                "캐릭터 포스터",
                                "스틸컷 / 비주얼 아카이브",
                                "기타 (직접 입력)",
                              ];

                              const isCustomType = !PRESET_OPTIONS.slice(0, 6).includes(artItem.type || "");

                              const updateThisArt = (patch: Partial<ArtworkEntry>) => {
                                const currentList = Array.isArray(currentFilm.artworks) ? currentFilm.artworks : [];
                                const sanitizedPatch = { ...patch };
                                if (typeof sanitizedPatch.imageUrl === "string") {
                                  sanitizedPatch.imageUrl = formatGoogleDriveImageUrl(sanitizedPatch.imageUrl);
                                }
                                const nextList = currentList.map((item, i) => {
                                  if (i !== idx) return item;
                                  const baseItem: ArtworkEntry =
                                    typeof item === "string"
                                      ? { id: `art-${i}`, type: "메인/오리지널 포스터", imageUrl: item, title: "", designer: "", showInMain: true }
                                      : { ...item };
                                  return { ...baseItem, ...sanitizedPatch };
                                });
                                handleFilmChange(currentFilm.id, "artworks", nextList);
                              };

                              const isCurrentMain =
                                Boolean(currentFilm.mainArtworkImage) &&
                                Boolean(artItem.imageUrl) &&
                                currentFilm.mainArtworkImage?.trim() === artItem.imageUrl.trim();

                              return (
                                <div
                                  key={artItem.id || idx}
                                  style={{
                                    background: "#111111",
                                    border: isCurrentMain
                                      ? "1px solid rgba(245, 158, 11, 0.45)"
                                      : "1px solid rgba(255,255,255,0.12)",
                                    padding: "14px",
                                    display: "flex",
                                    gap: "14px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  {/* Thumbnail Preview */}
                                  <div
                                    style={{
                                      width: "56px",
                                      height: "80px",
                                      flexShrink: 0,
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      overflow: "hidden",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      position: "relative",
                                    }}
                                  >
                                    {artItem.imageUrl ? (
                                      <img
                                        alt=""
                                        src={resolveAssetUrl(artItem.imageUrl)}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = "none";
                                        }}
                                      />
                                    ) : (
                                      <ImageIcon size={18} color="#444" />
                                    )}
                                    {isCurrentMain && (
                                      <span
                                        style={{
                                          position: "absolute",
                                          top: "2px",
                                          right: "2px",
                                          background: "#f59e0b",
                                          color: "#000",
                                          fontSize: "8px",
                                          fontWeight: 800,
                                          padding: "1px 3px",
                                        }}
                                      >
                                        대표
                                      </span>
                                    )}
                                  </div>

                                  {/* Content Fields */}
                                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {/* Top Control Bar: Type + Title + Up/Down + Delete */}
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#888" }}>
                                        #{idx + 1}
                                      </span>

                                      {/* Type Selector Dropdown */}
                                      <select
                                        value={isCustomType ? "기타 (직접 입력)" : artItem.type}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "기타 (직접 입력)") {
                                            updateThisArt({ type: "스페셜 에디션" });
                                          } else {
                                            updateThisArt({ type: val });
                                          }
                                        }}
                                        style={{
                                          background: "#080808",
                                          border: "1px solid rgba(245, 158, 11, 0.4)",
                                          color: "#f59e0b",
                                          padding: "5px 8px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          outline: "none",
                                          cursor: "pointer",
                                        }}
                                        title="아트워크 종류 선택"
                                      >
                                        <option value="메인/오리지널 포스터">메인/오리지널 포스터</option>
                                        <option value="티저 포스터">티저 포스터</option>
                                        <option value="스페셜 아트 포스터">스페셜 아트 포스터</option>
                                        <option value="해외/국제판 포스터">해외/국제판 포스터</option>
                                        <option value="캐릭터 포스터">캐릭터 포스터</option>
                                        <option value="스틸컷 / 비주얼 아카이브">스틸컷 / 비주얼 아카이브</option>
                                        <option value="기타 (직접 입력)">기타 (직접 입력)</option>
                                      </select>

                                      {/* If custom type, allow typing custom label */}
                                      {isCustomType && (
                                        <input
                                          type="text"
                                          placeholder="아트워크 종류 직접 입력"
                                          value={artItem.type || ""}
                                          onChange={(e) => updateThisArt({ type: e.target.value })}
                                          style={{
                                            width: "120px",
                                            background: "#080808",
                                            border: "1px solid rgba(255,255,255,0.25)",
                                            color: "#fff",
                                            padding: "5px 8px",
                                            fontSize: "11px",
                                            outline: "none",
                                          }}
                                        />
                                      )}

                                      {/* Artwork Subtitle / Version description */}
                                      <input
                                        type="text"
                                        placeholder="아트워크 상세 명칭 / 버전 (예: 프랑스 극장판, BFI 특별판)"
                                        value={artItem.title || ""}
                                        onChange={(e) => updateThisArt({ title: e.target.value })}
                                        style={{
                                          flex: 1,
                                          minWidth: "160px",
                                          background: "#080808",
                                          border: "1px solid rgba(255,255,255,0.18)",
                                          color: "#fff",
                                          padding: "5px 10px",
                                          fontSize: "11px",
                                          outline: "none",
                                        }}
                                      />

                                      {/* Order Controls */}
                                      <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => {
                                            if (idx === 0) return;
                                            const currentList = [...(currentFilm.artworks || [])];
                                            const [moved] = currentList.splice(idx, 1);
                                            currentList.splice(idx - 1, 0, moved);
                                            handleFilmChange(currentFilm.id, "artworks", currentList);
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: 0,
                                            color: idx === 0 ? "#333" : "#aaa",
                                            cursor: idx === 0 ? "default" : "pointer",
                                            padding: "3px 4px",
                                          }}
                                          title="위로 이동"
                                        >
                                          <ArrowUp size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === (currentFilm.artworks?.length || 1) - 1}
                                          onClick={() => {
                                            const currentList = [...(currentFilm.artworks || [])];
                                            if (idx >= currentList.length - 1) return;
                                            const [moved] = currentList.splice(idx, 1);
                                            currentList.splice(idx + 1, 0, moved);
                                            handleFilmChange(currentFilm.id, "artworks", currentList);
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: 0,
                                            color: idx === (currentFilm.artworks?.length || 1) - 1 ? "#333" : "#aaa",
                                            cursor: idx === (currentFilm.artworks?.length || 1) - 1 ? "default" : "pointer",
                                            padding: "3px 4px",
                                          }}
                                          title="아래로 이동"
                                        >
                                          <ArrowDown size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentList = [...(currentFilm.artworks || [])];
                                            const nextList = currentList.filter((_, i) => i !== idx);
                                            handleFilmChange(currentFilm.id, "artworks", nextList);
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: 0,
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            padding: "3px 6px",
                                          }}
                                          title="이 아트워크 삭제"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Image URL row */}
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                                      <input
                                        type="text"
                                        placeholder="이미지 URL 또는 구글 드라이브 링크"
                                        value={artItem.imageUrl}
                                        onChange={(e) => updateThisArt({ imageUrl: e.target.value })}
                                        style={{
                                          flex: 1,
                                          background: "#080808",
                                          border: "1px solid rgba(255,255,255,0.2)",
                                          color: "#fff",
                                          padding: "7px 10px",
                                          fontSize: "12px",
                                          outline: "none",
                                          fontFamily: "monospace",
                                        }}
                                        title="구글 드라이브 링크를 붙여넣으면 고속 썸네일 링크로 자동 변환됩니다"
                                      />
                                      {artItem.imageUrl && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleFilmChange(currentFilm.id, "mainArtworkImage", artItem.imageUrl);
                                            showToast(`[${artItem.type}] 이미지가 메인 아트워크 대표 이미지로 지정되었습니다.`);
                                          }}
                                          style={{
                                            background: isCurrentMain ? "rgba(245, 158, 11, 0.2)" : "#1c1c1c",
                                            border: isCurrentMain ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.2)",
                                            color: isCurrentMain ? "#f59e0b" : "#ccc",
                                            padding: "7px 12px",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            whiteSpace: "nowrap",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                          title="이 이미지를 이 영화의 대표 포스터 이미지로 지정합니다"
                                        >
                                          <Star size={12} fill={isCurrentMain ? "#f59e0b" : "none"} />
                                          {isCurrentMain ? "★ 대표 아트워크" : "대표로 지정"}
                                        </button>
                                      )}
                                    </div>

                                    {/* Individual Designer & Main Exposure Toggle row */}
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                      {/* Individual Artwork Designer input box */}
                                      <div
                                        style={{
                                          flex: 1,
                                          minWidth: "260px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          background: "#080808",
                                          border: artItem.designer ? "1.5px solid #f59e0b" : "1px solid rgba(245, 158, 11, 0.45)",
                                          padding: "5px 8px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 800,
                                            color: "#f59e0b",
                                            letterSpacing: "0.06em",
                                            whiteSpace: "nowrap",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          DESIGNED BY:
                                        </span>
                                        <input
                                          type="text"
                                          placeholder={
                                            currentFilm.artworkDesigner
                                              ? `(기본값: ${currentFilm.artworkDesigner}) 개별 디자이너 입력`
                                              : "이 아트워크 개별 디자이너 / 스튜디오 입력"
                                          }
                                          value={artItem.designer || ""}
                                          onChange={(e) => updateThisArt({ designer: e.target.value })}
                                          style={{
                                            flex: 1,
                                            minWidth: "140px",
                                            background: "transparent",
                                            border: "none",
                                            color: "#fff",
                                            fontSize: "12px",
                                            outline: "none",
                                            padding: "2px 4px",
                                          }}
                                          title="해당 아트워크의 디자이너 (각 아트워크마다 다르게 지정 가능, 비워둘 시 영화 기본 디자이너 적용)"
                                        />
                                        {artItem.designer ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateThisArt({ designer: "" });
                                              showToast("개별 디자이너가 초기화되었습니다 (영화 기본 디자이너 적용).");
                                            }}
                                            style={{
                                              background: "transparent",
                                              border: "none",
                                              color: "#888",
                                              cursor: "pointer",
                                              padding: "2px 4px",
                                              display: "inline-flex",
                                              alignItems: "center",
                                            }}
                                            title="개별 디자이너 삭제 (영화 기본값으로 복귀)"
                                          >
                                            <X size={12} />
                                          </button>
                                        ) : null}
                                      </div>

                                      {/* Main Exposure Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleToggleArtworkExposure(currentFilm.id, idx);
                                        }}
                                        style={{
                                          background: artItem.showInMain !== false ? "rgba(34, 197, 94, 0.22)" : "#161616",
                                          border: artItem.showInMain !== false ? "1.5px solid #22c55e" : "1.5px solid rgba(255, 255, 255, 0.25)",
                                          color: artItem.showInMain !== false ? "#4ade80" : "#888",
                                          padding: "6px 12px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          whiteSpace: "nowrap",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          transition: "all 0.15s ease",
                                          boxShadow: artItem.showInMain !== false ? "0 0 8px rgba(34, 197, 94, 0.25)" : "none",
                                        }}
                                        title="클릭 시 메인 화면 아트워크 슬라이더 노출/숨김을 즉시 전환합니다"
                                      >
                                        {artItem.showInMain !== false ? (
                                          <>
                                            <span
                                              style={{
                                                width: "7px",
                                                height: "7px",
                                                borderRadius: "50%",
                                                background: "#22c55e",
                                                boxShadow: "0 0 6px #22c55e",
                                                display: "inline-block",
                                              }}
                                            />
                                            <Eye size={12} color="#4ade80" />
                                            <span>메인 노출 ON</span>
                                          </>
                                        ) : (
                                          <>
                                            <span
                                              style={{
                                                width: "7px",
                                                height: "7px",
                                                borderRadius: "50%",
                                                background: "#666",
                                                display: "inline-block",
                                              }}
                                            />
                                            <EyeOff size={12} color="#888" />
                                            <span style={{ color: "#aaa" }}>메인 숨김 OFF</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
                      {/* Slot Order Selector & Up/Down */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: "9px", color: "#888", fontWeight: 700 }}>순서</span>
                          <select
                            value={slotIndex}
                            onChange={(e) => handleSetFeaturedPosition(slotIndex, Number(e.target.value))}
                            style={{
                              background: "#080808",
                              border: "1px solid rgba(245, 158, 11, 0.6)",
                              color: "#f59e0b",
                              padding: "4px 6px",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                            title="Hero 노출 순서 직접 지정"
                          >
                            {data.featured.map((_, pIdx) => (
                              <option key={pIdx} value={pIdx}>
                                {pIdx + 1}순위 {pIdx === 0 ? "★첫화면" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            alignItems: "center",
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
                              padding: "2px 4px",
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
                              padding: "2px 4px",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="아래로 1칸 이동"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
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

          {/* TAB: ARTWORKS & DESIGNERS ARCHIVE MANAGER */}
          {activeTab === "artworks" && (
            <div style={{ maxWidth: "980px" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "24px",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                    메인 화면 아트워크 순서·노출 관리
                  </h2>
                  <p style={{ margin: 0, color: "#888", fontSize: "13px", lineHeight: "1.6" }}>
                    메인 화면 화이트 배경 아트워크 슬라이더에 노출되는 아트워크의 <strong>좌우 순서(1번이 제일 왼쪽)</strong>와 <strong>노출 여부(ON/OFF)</strong>를 설정합니다. 변경 사항은 즉시 자동 저장됩니다.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: data.artworksVisible !== false ? "#10b981" : "#888",
                      background: "#181818",
                      border: "1px solid rgba(255,255,255,0.15)",
                      padding: "8px 14px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={data.artworksVisible !== false}
                      onChange={(e) => {
                        const nextVal = e.target.checked;
                        const nextData = { ...data, artworksVisible: nextVal };
                        lastSaveTimeRef.current = Date.now();
                        setData(nextData);
                        onSave(nextData);
                        showToast(`메인화면 아트워크 섹션이 ${nextVal ? "노출 [ON]" : "전체 숨김 [OFF]"} 처리되었습니다 (즉시 저장 완료).`);
                      }}
                      style={{ accentColor: "#f59e0b", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span>{data.artworksVisible !== false ? "메인 아트워크 섹션 ON" : "메인 아트워크 섹션 OFF"}</span>
                  </label>
                </div>
              </div>

              {/* Order & Exposure Guide Banner (Hero Manager Style: 1순위, 2순위...) */}
              <div
                style={{
                  background: "#141414",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>
                      💡 메인 히어로 방식 직관적 순위 관리 (1순위가 제일 왼쪽)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#bbb", lineHeight: 1.6 }}>
                    각 아트워크 카드의 <strong>[순위] 드롭다운</strong>에서 <strong>1순위(★제일 왼쪽)</strong>, 2순위, 3순위를 바로 지정하거나, <strong>[▲ / ▼]</strong> 버튼으로 위아래 1칸씩 간편하게 이동할 수 있습니다.
                    <br />
                    순위 변경 및 노출 ON/OFF 스위치는 누르는 즉시 클라우드에 자동 저장됩니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("films")}
                  style={{
                    background: "#222",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#f1f1ee",
                    padding: "8px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                  title="새로운 포스터/아트워크 등록은 영화 및 프로그램 탭에서 진행할 수 있습니다"
                >
                  <FilmIcon size={13} />
                  영화별 포스터 등록/수정으로 이동
                </button>
              </div>

              {/* Artwork Cards List (Hero Manager Style: Slot & 1순위/2순위...) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
                {allArtworksForMain.length === 0 ? (
                  <div
                    style={{
                      background: "#121212",
                      border: "1px dashed rgba(255,255,255,0.2)",
                      padding: "40px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    등록된 아트워크나 영화 포스터가 없습니다. [영화 및 프로그램] 탭에서 영화 포스터를 등록해 주세요.
                  </div>
                ) : (
                  allArtworksForMain.map((item, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === allArtworksForMain.length - 1;

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: "#101010",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderLeft: item.showInMain ? "4px solid #22c55e" : "4px solid #444",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          flexWrap: "wrap",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Slot Order Selector & Up/Down (Identical to Hero Manager) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: "9px", color: "#888", fontWeight: 700 }}>순위</span>
                            <select
                              value={idx}
                              onChange={(e) => handleSetArtworkPosition(idx, Number(e.target.value))}
                              style={{
                                background: "#080808",
                                border: "1px solid rgba(245, 158, 11, 0.6)",
                                color: "#f59e0b",
                                padding: "5px 8px",
                                fontSize: "12px",
                                fontWeight: 800,
                                cursor: "pointer",
                                borderRadius: "2px",
                              }}
                              title="노출 순위 직접 선택 (1순위가 제일 왼쪽)"
                            >
                              {allArtworksForMain.map((_, pIdx) => (
                                <option key={pIdx} value={pIdx}>
                                  {pIdx + 1}순위 {pIdx === 0 ? "★제일 왼쪽" : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveArtworkStep(idx, "up")}
                              style={{
                                background: "transparent",
                                border: 0,
                                color: isFirst ? "#333" : "#aaa",
                                cursor: isFirst ? "default" : "pointer",
                                padding: "2px 4px",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="위로 1칸 이동 (더 왼쪽으로)"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveArtworkStep(idx, "down")}
                              style={{
                                background: "transparent",
                                border: 0,
                                color: isLast ? "#333" : "#aaa",
                                cursor: isLast ? "default" : "pointer",
                                padding: "2px 4px",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="아래로 1칸 이동 (더 오른쪽으로)"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Rank Badge */}
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: isFirst ? "#f59e0b" : "#ccc",
                            background: isFirst ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 255, 255, 0.06)",
                            border: isFirst ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid rgba(255, 255, 255, 0.1)",
                            padding: "6px 12px",
                            borderRadius: "2px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            minWidth: isFirst ? "120px" : "68px",
                            textAlign: "center",
                          }}
                        >
                          {isFirst ? "★ 1순위 (제일 왼쪽)" : `${idx + 1}순위`}
                        </span>

                        {/* Thumbnail Preview */}
                        <div
                          style={{
                            width: "44px",
                            height: "62px",
                            background: "#080808",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                          }}
                        >
                          <img
                            alt=""
                            src={resolveAssetUrl(item.imageUrl)}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              opacity: item.showInMain ? 1 : 0.45,
                            }}
                          />
                          {!item.showInMain && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.55)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <EyeOff size={14} color="#aaa" />
                            </div>
                          )}
                        </div>

                        {/* Artwork Metadata & Designer */}
                        <div style={{ flex: 1, minWidth: "220px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                              {item.filmTitleKo || item.filmTitle}
                            </span>
                            {item.filmTitleKo && item.filmTitle !== item.filmTitleKo && (
                              <span style={{ fontSize: "11px", color: "#888" }}>
                                ({item.filmTitle})
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#f59e0b",
                                background: "rgba(245, 158, 11, 0.12)",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                padding: "2px 6px",
                                borderRadius: "2px",
                              }}
                            >
                              {item.type}{item.title ? ` — ${item.title}` : ""}
                            </span>
                          </div>

                          {/* Editable Designer Name inline */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 800, color: "#f59e0b", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                              DESIGNED BY:
                            </span>
                            <input
                              type="text"
                              value={item.designer || ""}
                              onChange={(e) => {
                                handleUpdateArtworkDesignerDirect(item.filmId, item.artIndex, e.target.value);
                              }}
                              placeholder="(디자이너 미지정)"
                              style={{
                                background: "#080808",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "#f1f1ee",
                                fontSize: "11px",
                                padding: "3px 8px",
                                width: "170px",
                                outline: "none",
                              }}
                              title="이 아트워크의 디자이너 명칭 (수정 시 실시간 자동 저장됩니다)"
                            />
                          </div>
                        </div>

                        {/* Right Action Controls: Main Exposure Switch + Jump Button */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {/* Exposure Toggle Button (Prominent ON / OFF) */}
                          <button
                            type="button"
                            onClick={() => handleToggleArtworkExposure(item.filmId, item.artIndex)}
                            style={{
                              background: item.showInMain ? "rgba(34, 197, 94, 0.22)" : "#161616",
                              border: item.showInMain ? "1.5px solid #22c55e" : "1.5px solid rgba(255, 255, 255, 0.25)",
                              color: item.showInMain ? "#4ade80" : "#888",
                              padding: "7px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.15s ease",
                              boxShadow: item.showInMain ? "0 0 8px rgba(34, 197, 94, 0.25)" : "none",
                              minWidth: "115px",
                              justifyContent: "center",
                            }}
                            title="클릭 시 메인 화면 노출/숨김을 즉시 전환합니다 (즉시 자동 저장)"
                          >
                            {item.showInMain ? (
                              <>
                                <span
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: "#22c55e",
                                    boxShadow: "0 0 6px #22c55e",
                                    display: "inline-block",
                                  }}
                                />
                                <Eye size={12} color="#4ade80" />
                                <span>메인 노출 ON</span>
                              </>
                            ) : (
                              <>
                                <span
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    border: "1.5px solid #666",
                                    display: "inline-block",
                                  }}
                                />
                                <EyeOff size={12} color="#888" />
                                <span>메인 숨김 OFF</span>
                              </>
                            )}
                          </button>

                          {/* Jump to Film editor button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFilmId(item.filmId);
                              setActiveTab("films");
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#888",
                              padding: "7px 10px",
                              fontSize: "11px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="해당 영화 상세 편집기로 이동"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: NAVIGATION MENU & EXTERNAL LINKS */}
          {activeTab === "navigation" && (
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
                    메인 메뉴 및 외부 링크 관리
                  </h2>
                  <p style={{ margin: 0, color: "#888", fontSize: "13px", lineHeight: "1.5" }}>
                    상단 헤더에 노출되는 텍스트 메뉴를 추가하고, 클릭 시 연결될 외부 사이트 링크(네이버 스마트스토어, 인스타그램, 예매처 등) 또는 페이지 내 섹션 이동을 자유롭게 설정합니다.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleResetNavItems}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#aaa",
                      padding: "10px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title="기본 메뉴(PROGRAMS, ABOUT, CONTACT)로 복원"
                  >
                    <RotateCcw size={14} /> 기본값 복원
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNavItem()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#f1f1ee",
                      border: "1px solid #fff",
                      color: "#000",
                      padding: "10px 18px",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={16} /> 새 메뉴 추가
                  </button>
                </div>
              </div>

              {/* Quick Presets Toolbar */}
              <div
                style={{
                  background: "#101010",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "14px 18px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "11px", color: "#888", fontWeight: 700, marginRight: "4px" }}>
                  빠른 외부 링크 추가 프리셋:
                </span>
                <button
                  type="button"
                  onClick={() => handleAddNavItem({ label: "STORE", url: "https://smartstore.naver.com/", targetBlank: true })}
                  style={{
                    background: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={12} /> + 네이버 스마트스토어 (STORE)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNavItem({ label: "INSTAGRAM", url: "https://instagram.com/", targetBlank: true })}
                  style={{
                    background: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={12} /> + 인스타그램 (INSTAGRAM)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNavItem({ label: "TICKETS", url: "https://", targetBlank: true })}
                  style={{
                    background: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={12} /> + 예매처 링크 (TICKETS)
                </button>
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.15)",
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ fontSize: "10px", color: "#777", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "12px" }}>
                  헤더 메뉴 실시간 미리보기 (LIVE PREVIEW)
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    background: "#000",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.15em", color: "#fff" }}>LIGHTHOUSE</span>
                    <span style={{ fontSize: "9px", color: "#888", letterSpacing: "0.1em" }}>SEOUL · KOREA</span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    {(data.navItems || DEFAULT_NAV_ITEMS)
                      .filter((item) => item.visible !== false)
                      .map((item) => {
                        const isExt = !item.url.startsWith("#");
                        return (
                          <span
                            key={item.id}
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              letterSpacing: "0.12em",
                              color: isExt ? "#60a5fa" : "#fff",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            {item.label}
                            {isExt && <span style={{ fontSize: "10px", opacity: 0.7 }}>↗</span>}
                          </span>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Nav Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(data.navItems || DEFAULT_NAV_ITEMS).map((item, index) => {
                  const isExternal = !item.url.startsWith("#");

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: item.visible === false ? "#0c0c0c" : "#121212",
                        border: `1px solid ${item.visible === false ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)"}`,
                        opacity: item.visible === false ? 0.6 : 1,
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Order Up / Down */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveNavItem(index, "up")}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: index === 0 ? "#333" : "#aaa",
                            cursor: index === 0 ? "default" : "pointer",
                            padding: "2px 4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="위로 1칸 이동"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={index === (data.navItems || DEFAULT_NAV_ITEMS).length - 1}
                          onClick={() => handleMoveNavItem(index, "down")}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: index === (data.navItems || DEFAULT_NAV_ITEMS).length - 1 ? "#333" : "#aaa",
                            cursor: index === (data.navItems || DEFAULT_NAV_ITEMS).length - 1 ? "default" : "pointer",
                            padding: "2px 4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="아래로 1칸 이동"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {/* Number Badge */}
                      <span
                        style={{
                          fontSize: "12px",
                          fontFamily: "monospace",
                          color: "#888",
                          fontWeight: 700,
                          width: "28px",
                          flexShrink: 0,
                        }}
                      >
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>

                      {/* Type Badge */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "2px",
                          flexShrink: 0,
                          background: isExternal ? "rgba(96, 165, 250, 0.15)" : "rgba(255, 255, 255, 0.1)",
                          color: isExternal ? "#60a5fa" : "#ccc",
                          border: `1px solid ${isExternal ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isExternal ? (
                          <>
                            <ExternalLink size={10} /> 외부 링크
                          </>
                        ) : (
                          <>
                            <Link2 size={10} /> 내부 섹션
                          </>
                        )}
                      </span>

                      {/* Label Input */}
                      <div style={{ width: "160px", flexShrink: 0 }}>
                        <label style={{ display: "block", fontSize: "10px", color: "#888", marginBottom: "4px" }}>
                          메뉴 표시 텍스트
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleUpdateNavItem(item.id, "label", e.target.value)}
                          placeholder="예: STORE"
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "8px 10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* URL Input */}
                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <label style={{ fontSize: "10px", color: "#888" }}>
                            연결 대상 URL 또는 #섹션
                          </label>
                          {isExternal && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "10px",
                                color: "#60a5fa",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              링크 테스트 ↗
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateNavItem(item.id, "url", e.target.value)}
                          placeholder="https://... 또는 #programs"
                          style={{
                            width: "100%",
                            background: "#080808",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "8px 10px",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Open in new tab checkbox */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          color: "#aaa",
                          cursor: "pointer",
                          userSelect: "none",
                          flexShrink: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.targetBlank !== false}
                          onChange={(e) => handleUpdateNavItem(item.id, "targetBlank", e.target.checked)}
                          style={{ accentColor: "#60a5fa" }}
                        />
                        새 창으로 열기
                      </label>

                      {/* Visibility toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateNavItem(item.id, "visible", item.visible === false ? true : false)}
                        style={{
                          background: item.visible === false ? "rgba(255,255,255,0.05)" : "rgba(34, 197, 94, 0.15)",
                          border: `1px solid ${item.visible === false ? "rgba(255,255,255,0.15)" : "rgba(34, 197, 94, 0.4)"}`,
                          color: item.visible === false ? "#777" : "#86efac",
                          padding: "6px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                        title={item.visible === false ? "메뉴 숨김 상태 (클릭 시 노출)" : "메뉴 노출 상태 (클릭 시 숨김)"}
                      >
                        <Eye size={12} />
                        {item.visible === false ? "숨김" : "노출"}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteNavItem(item.id)}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#ef4444",
                          padding: "6px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                        title="메뉴 삭제"
                      >
                        <Trash2 size={13} />
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
                        director: { ...prev.director, photo: formatGoogleDriveImageUrl(e.target.value) },
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

                {/* Promo Section Main Screen Visibility Banner */}
                <div
                  style={{
                    background: data.promosVisible !== false ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: data.promosVisible !== false ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                    padding: "16px 20px",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: data.promosVisible !== false ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: data.promosVisible !== false ? "#4ade80" : "#f87171",
                      }}
                    >
                      {data.promosVisible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: data.promosVisible !== false ? "#4ade80" : "#f87171" }}>
                        메인화면 Promo Cards 섹션 노출: {data.promosVisible !== false ? "노출 중 (ON)" : "전체 숨김 (OFF)"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                        {data.promosVisible !== false
                          ? "메인화면 ABOUT 섹션 하단에 프로모션 카드들이 정상적으로 노출됩니다."
                          : "메인화면에서 프로모션 카드 섹션 전체가 숨겨집니다. (메인 Hero 슬라이드에 지정된 카드는 Hero 슬라이드로 유지됩니다.)"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePromoSectionVisibility}
                    style={{
                      background: data.promosVisible !== false ? "#1f2937" : "rgba(34, 197, 94, 0.2)",
                      border: `1px solid ${data.promosVisible !== false ? "rgba(255,255,255,0.2)" : "rgba(34, 197, 94, 0.5)"}`,
                      color: data.promosVisible !== false ? "#fff" : "#4ade80",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {data.promosVisible !== false ? "섹션 전체 숨기기" : "섹션 노출하기"}
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
                              {card.visible === false ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePromoCardVisibility(card.id, e)}
                                  title="클릭하여 메인화면에 노출"
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    color: "#9ca3af",
                                    background: "rgba(156, 163, 175, 0.15)",
                                    border: "1px solid rgba(156, 163, 175, 0.3)",
                                    padding: "1px 5px",
                                    borderRadius: "2px",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer",
                                  }}
                                >
                                  숨김
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePromoCardVisibility(card.id, e)}
                                  title="클릭하여 메인화면에서 숨김"
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    color: "#4ade80",
                                    background: "rgba(34, 197, 94, 0.15)",
                                    border: "1px solid rgba(34, 197, 94, 0.3)",
                                    padding: "1px 5px",
                                    borderRadius: "2px",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer",
                                  }}
                                >
                                  노출
                                </button>
                              )}
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
                            onClick={() => handleTogglePromoCardVisibility(activePromo.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: activePromo.visible !== false ? "rgba(34, 197, 94, 0.15)" : "rgba(107, 114, 128, 0.2)",
                              border: `1px solid ${
                                activePromo.visible !== false ? "rgba(34, 197, 94, 0.5)" : "rgba(255,255,255,0.2)"
                              }`,
                              color: activePromo.visible !== false ? "#4ade80" : "#9ca3af",
                              padding: "7px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {activePromo.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                            {activePromo.visible !== false ? "메인 노출 중" : "메인 숨김 상태"}
                          </button>

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

                      {/* Card Visibility Toggle Banner */}
                      <div
                        style={{
                          background: activePromo.visible !== false ? "rgba(34, 197, 94, 0.08)" : "rgba(107, 114, 128, 0.08)",
                          border: `1px solid ${activePromo.visible !== false ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.12)"}`,
                          padding: "14px 18px",
                          marginBottom: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "4px",
                              background: activePromo.visible !== false ? "rgba(34, 197, 94, 0.18)" : "rgba(107, 114, 128, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: activePromo.visible !== false ? "#4ade80" : "#9ca3af",
                            }}
                          >
                            {activePromo.visible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: activePromo.visible !== false ? "#4ade80" : "#d1d5db" }}>
                              이 카드의 메인화면 노출 상태: {activePromo.visible !== false ? "노출 중 (ON)" : "숨김 (OFF)"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                              {activePromo.visible !== false
                                ? "메인화면 ABOUT 섹션 하단의 Promo Cards 목록에 이 카드가 정상 노출됩니다."
                                : "메인화면 Promo Cards 목록에서 이 카드가 제외(숨김)됩니다."}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handlePromoChange(activePromo.id, "visible", true)}
                            style={{
                              background: activePromo.visible !== false ? "#166534" : "#1f2937",
                              border: `1px solid ${activePromo.visible !== false ? "#22c55e" : "rgba(255,255,255,0.15)"}`,
                              color: activePromo.visible !== false ? "#fff" : "#9ca3af",
                              padding: "6px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            노출 (ON)
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromoChange(activePromo.id, "visible", false)}
                            style={{
                              background: activePromo.visible === false ? "#4b5563" : "#1f2937",
                              border: `1px solid ${activePromo.visible === false ? "#9ca3af" : "rgba(255,255,255,0.15)"}`,
                              color: activePromo.visible === false ? "#fff" : "#9ca3af",
                              padding: "6px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            숨김 (OFF)
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
                          placeholder="https://... 또는 이미지 URL"
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
                연락처 및 문의 폼 설정 (CONTACT)
              </h2>
              <p style={{ margin: "0 0 28px", color: "#888", fontSize: "13px" }}>
                하단 CONTACT 영역에 표시되는 공식 이메일, 소셜 미디어 및 구글 앱스 스크립트 문의 폼 연동 URL을 관리합니다.
              </p>

              <div style={{ background: "#101010", border: "1px solid rgba(255,255,255,0.12)", padding: "28px" }}>
                {/* Google Apps Script Endpoint */}
                <div style={{ marginBottom: "28px", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#f59e0b", letterSpacing: "0.02em" }}>
                      ● 구글 앱스 스크립트 문의 폼 연동 URL (Google Apps Script Web App)
                    </label>
                    {data.contact?.inquiryEndpoint && (
                      <a
                        href={data.contact.inquiryEndpoint}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "11px",
                          color: "#aaa",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        엔드포인트 열기 <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={data.contact?.inquiryEndpoint ?? ""}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    onChange={(e) => handleContactChange("inquiryEndpoint", e.target.value)}
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#fff",
                      padding: "11px 14px",
                      fontSize: "13px",
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                  <p style={{ fontSize: "11px", color: "#888", marginTop: "8px", lineHeight: 1.5 }}>
                    방문자가 웹사이트의 <strong>CONTACT 문의 폼</strong>에 이름, 연락처, 문의 유형, 메시지를 입력하고 전송 버튼을 누르면 이 구글 앱스 스크립트 URL로 데이터가 자동 전송됩니다.
                    <br />
                    전송 파라미터: <code style={{ color: "#f59e0b" }}>name</code>, <code style={{ color: "#f59e0b" }}>email/contact</code>, <code style={{ color: "#f59e0b" }}>category</code>, <code style={{ color: "#f59e0b" }}>subject</code>, <code style={{ color: "#f59e0b" }}>message</code>, <code style={{ color: "#f59e0b" }}>timestamp</code>
                  </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                    대표 이메일 주소 (Email)
                  </label>
                  <input
                    type="text"
                    value={data.contact?.email ?? "keeper@lighthouse.re.kr"}
                    onChange={(e) => handleContactChange("email", e.target.value)}
                    placeholder="keeper@lighthouse.re.kr"
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
                    value={data.contact?.youtubeUrl ?? ""}
                    onChange={(e) => handleContactChange("youtubeUrl", e.target.value)}
                    placeholder="https://www.youtube.com/channel/..."
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
                    value={data.contact?.instagramUrl ?? ""}
                    onChange={(e) => handleContactChange("instagramUrl", e.target.value)}
                    placeholder="https://www.instagram.com/..."
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
                    value={data.contact?.xUrl ?? ""}
                    onChange={(e) => handleContactChange("xUrl", e.target.value)}
                    placeholder="https://x.com/..."
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

          {/* Sticky Bottom Save Bar */}
          <div
            style={{
              position: "sticky",
              bottom: "-36px",
              margin: "36px -48px -36px -48px",
              padding: "16px 48px",
              background: "rgba(18, 18, 18, 0.95)",
              backdropFilter: "blur(12px)",
              borderTop: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#9ca3af" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: cloudStatus.connected ? "#22c55e" : "#ef4444" }} />
              <span>
                {cloudStatus.connected
                  ? `클라우드 Firestore 실시간 동기화 준비 완료 (영화 ${data.films.length}편)`
                  : "클라우드 연결 상태 확인 중"}
              </span>
              {lastSavedTime && <span>· 최근 저장: {lastSavedTime}</span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: isSaving ? "#6b7280" : "#22c55e",
                  border: "1px solid #4ade80",
                  color: "#ffffff",
                  padding: "11px 28px",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  borderRadius: "4px",
                  cursor: isSaving ? "wait" : "pointer",
                  boxShadow: "0 0 20px rgba(34, 197, 94, 0.35)",
                }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isSaving ? "클라우드 저장 및 동기화 중..." : "변경사항 클라우드 저장 및 전체 기기 반영"}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
