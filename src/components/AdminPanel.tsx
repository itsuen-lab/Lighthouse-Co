import React, { useState, useEffect, useCallback } from "react";
import { Film, SiteContent, PromoCard, NavItem, DEFAULT_NAV_ITEMS, ContactInfo, INITIAL_CONTENT, ArtworkEntry, DirectorNote, JournalPost } from "../data/content.ts";
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
  BookOpen,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import { fetchAnalyticsData, resetAnalyticsData, AnalyticsData } from "../services/analytics.ts";

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

type TabType = "films" | "featured" | "artworks" | "navigation" | "director" | "journal" | "about" | "promo" | "contact" | "analytics" | "security" | "export";

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

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsResetConfirm, setAnalyticsResetConfirm] = useState<boolean>(false);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetchAnalyticsData();
      setAnalyticsData(res);
    } catch (e) {
      console.warn("Analytics fetch failed:", e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  // Tab 3 Artwork Registration Form States
  const [newArtFilmId, setNewArtFilmId] = useState<string>("");
  const [newArtType, setNewArtType] = useState<string>("메인/오리지널 포스터");
  const [newArtTitle, setNewArtTitle] = useState<string>("");
  const [newArtImageUrl, setNewArtImageUrl] = useState<string>("");
  const [newArtDesigner, setNewArtDesigner] = useState<string>("");

  // Tab Journal Board Form States
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [newJournalTitle, setNewJournalTitle] = useState<string>("");
  const [newJournalSubtitle, setNewJournalSubtitle] = useState<string>("");
  const [newJournalCategory, setNewJournalCategory] = useState<string>("ESSAY");
  const [newJournalDate, setNewJournalDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  });
  const [newJournalImageUrl, setNewJournalImageUrl] = useState<string>("");
  const [newJournalAuthor, setNewJournalAuthor] = useState<string>("LIGHTHOUSE");
  const [newJournalTagsInput, setNewJournalTagsInput] = useState<string>("");
  const [newJournalContent, setNewJournalContent] = useState<string>("");
  const [newJournalVisibleOnMain, setNewJournalVisibleOnMain] = useState<boolean>(true);
  const [newJournalVisibleOnBoard, setNewJournalVisibleOnBoard] = useState<boolean>(true);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [journalDeleteTarget, setJournalDeleteTarget] = useState<JournalPost | null>(null);
  const [editingPostNewTag, setEditingPostNewTag] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Journal Action Handlers
  const handleAddNewJournalPost = () => {
    if (!newJournalTitle.trim()) {
      alert("저널 글 제목을 입력해 주세요.");
      return;
    }
    const formattedImg = newJournalImageUrl.trim() ? formatGoogleDriveImageUrl(newJournalImageUrl.trim()) : "";
    const parsedTags = newJournalTagsInput
      .split(/[,#\s]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0);

    const newPost: JournalPost = {
      id: "journal-" + Date.now().toString(36),
      title: newJournalTitle.trim(),
      subtitle: newJournalSubtitle.trim() || undefined,
      category: newJournalCategory.trim() || "ESSAY",
      tags: parsedTags,
      date: newJournalDate.trim() || "2026.03.15",
      imageUrl: formattedImg || undefined,
      author: newJournalAuthor.trim() || "LIGHTHOUSE",
      content: newJournalContent.trim() || "본문 내용이 등록되었습니다.",
      visible: true,
      visibleOnMain: newJournalVisibleOnMain,
      visibleOnBoard: newJournalVisibleOnBoard,
    };

    const nextList = [newPost, ...(data.journalPosts || INITIAL_CONTENT.journalPosts || [])];
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);

    // Reset inputs
    setNewJournalTitle("");
    setNewJournalSubtitle("");
    setNewJournalImageUrl("");
    setNewJournalTagsInput("");
    setNewJournalContent("");
    setNewJournalVisibleOnMain(true);
    setNewJournalVisibleOnBoard(true);
    showToast("새 저널 게시글이 성공적으로 등록 및 저장되었습니다.");
  };

  const handleAddTagToJournalPost = (postId: string, rawTag: string) => {
    const clean = rawTag.trim().replace(/^#/, "");
    if (!clean) return;
    const currentList = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
    const nextList = currentList.map((post) => {
      if (post.id !== postId) return post;
      const currentTags = Array.isArray(post.tags) ? [...post.tags] : [];
      if (currentTags.some((t) => t.toLowerCase() === clean.toLowerCase())) return post;
      return { ...post, tags: [...currentTags, clean] };
    });
    const nextData: SiteContent = { ...data, journalPosts: nextList };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    setEditingPostNewTag((prev) => ({ ...prev, [postId]: "" }));
    showToast(`‘#${clean}’ 태그가 추가되었습니다.`);
  };

  const handleRemoveTagFromJournalPost = (postId: string, tagToRemove: string) => {
    const currentList = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
    const nextList = currentList.map((post) => {
      if (post.id !== postId) return post;
      const currentTags = Array.isArray(post.tags) ? post.tags : [];
      return { ...post, tags: currentTags.filter((t) => t !== tagToRemove) };
    });
    const nextData: SiteContent = { ...data, journalPosts: nextList };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`‘#${tagToRemove}’ 태그가 삭제되었습니다.`);
  };

  const handleUpdateJournalPost = (id: string, field: keyof JournalPost, value: any) => {
    let sanitized = value;
    if (field === "imageUrl" && typeof value === "string") {
      sanitized = formatGoogleDriveImageUrl(value);
    }
    const currentList = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
    const nextList = currentList.map((post) => {
      if (post.id !== id) return post;
      const updated = { ...post, [field]: sanitized };
      if (field === "visibleOnMain" || field === "visibleOnBoard") {
        const m = updated.visibleOnMain !== undefined ? updated.visibleOnMain === true : updated.visible !== false;
        const b = updated.visibleOnBoard !== undefined ? updated.visibleOnBoard === true : updated.visible !== false;
        updated.visible = m || b;
      }
      return updated;
    });
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
  };

  const handleDeleteJournalPost = (id: string) => {
    const post = (data.journalPosts || INITIAL_CONTENT.journalPosts || []).find((p) => p.id === id);
    if (post) {
      setJournalDeleteTarget(post);
    }
  };

  const handleConfirmDeleteJournalPost = () => {
    if (!journalDeleteTarget) return;
    const targetId = journalDeleteTarget.id;
    const targetTitle = journalDeleteTarget.title;

    const nextList = (data.journalPosts || INITIAL_CONTENT.journalPosts || []).filter((p) => p.id !== targetId);
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);

    if (selectedJournalId === targetId) setSelectedJournalId(null);
    if (editingJournalId === targetId) setEditingJournalId(null);
    setJournalDeleteTarget(null);
    showToast(`‘${targetTitle || "저널 게시글"}’이(가) 정상적으로 삭제되었습니다.`);
  };

  const handleToggleJournalMainVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let nextVal = false;
    let targetTitle = "";
    const currentList = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
    const nextList = currentList.map((post) => {
      if (post.id !== id) return post;
      targetTitle = post.title;
      const currentMain = post.visibleOnMain !== undefined ? post.visibleOnMain === true : post.visible !== false;
      nextVal = !currentMain;
      const currentBoard = post.visibleOnBoard !== undefined ? post.visibleOnBoard === true : post.visible !== false;
      return {
        ...post,
        visibleOnMain: nextVal,
        visible: nextVal || currentBoard,
      };
    });
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`[메인 발행] 상태가 ${nextVal ? "ON(노출)" : "OFF(숨김)"}으로 전환되었습니다.`);
  };

  const handleToggleJournalBoardVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let nextVal = false;
    let targetTitle = "";
    const currentList = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
    const nextList = currentList.map((post) => {
      if (post.id !== id) return post;
      targetTitle = post.title;
      const currentBoard = post.visibleOnBoard !== undefined ? post.visibleOnBoard === true : post.visible !== false;
      nextVal = !currentBoard;
      const currentMain = post.visibleOnMain !== undefined ? post.visibleOnMain === true : post.visible !== false;
      return {
        ...post,
        visibleOnBoard: nextVal,
        visible: currentMain || nextVal,
      };
    });
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`[게시판 발행] 상태가 ${nextVal ? "ON(노출)" : "OFF(숨김)"}으로 전환되었습니다.`);
  };

  const handleToggleJournalVisibility = (id: string) => {
    let nextVal = false;
    const nextList = (data.journalPosts || INITIAL_CONTENT.journalPosts || []).map((post) => {
      if (post.id !== id) return post;
      nextVal = post.visible === false;
      return { ...post, visible: nextVal };
    });
    const nextData: SiteContent = {
      ...data,
      journalPosts: nextList,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`해당 저널 게시글의 전체 노출이 [${nextVal ? "ON" : "OFF"}]으로 변경되었습니다.`);
  };

  const handleMoveJournalPost = (index: number, direction: "up" | "down") => {
    const list = [...(data.journalPosts || INITIAL_CONTENT.journalPosts || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const nextData: SiteContent = {
      ...data,
      journalPosts: list,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`저널 게시글 순서가 변경되었습니다 (${targetIndex + 1}번째로 이동).`);
  };

  const handleSetJournalPostRank = (fromIndex: number, toRank: number) => {
    const targetIndex = toRank - 1;
    const list = [...(data.journalPosts || INITIAL_CONTENT.journalPosts || [])];
    if (targetIndex < 0 || targetIndex >= list.length || targetIndex === fromIndex) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(targetIndex, 0, moved);
    const nextData: SiteContent = {
      ...data,
      journalPosts: list,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`저널 게시글이 ${toRank}번째 순위로 배치되었습니다.`);
  };

  const handleToggleJournalSectionVisibility = () => {
    const nextVal = data.journalVisible === false ? true : false;
    const nextData: SiteContent = {
      ...data,
      journalVisible: nextVal,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`메인 화면 저널 섹션이 [${nextVal ? "노출" : "숨김"}] 처리되었습니다.`);
  };

  const handleAboutChange = (field: "ko" | "en", value: string) => {
    const cur = data.about || INITIAL_CONTENT.about || { ko: "", en: "" };
    const nextAbout = {
      ...cur,
      [field]: value,
    };
    const nextData: SiteContent = {
      ...data,
      about: nextAbout,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
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
    const nextFilms = data.films.map((f) => (f.id === id ? { ...f, [field]: sanitizedValue } : f));
    const nextData: SiteContent = {
      ...data,
      films: nextFilms,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
  };

  const handleFilmPatch = (id: string, patch: Partial<Film>) => {
    const nextFilms = data.films.map((f) => {
      if (f.id !== id) return f;
      const updated = { ...f, ...patch };
      if (typeof patch.heroImage === "string") updated.heroImage = formatGoogleDriveImageUrl(patch.heroImage);
      if (typeof patch.posterImage === "string") updated.posterImage = formatGoogleDriveImageUrl(patch.posterImage);
      if (typeof patch.mainArtworkImage === "string") updated.mainArtworkImage = formatGoogleDriveImageUrl(patch.mainArtworkImage);
      return updated;
    });
    const nextData: SiteContent = {
      ...data,
      films: nextFilms,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
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
      showInMain: false,
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
    const img = (film.mainArtworkImage && film.mainArtworkImage.trim()) || (film.posterImage && film.posterImage.trim());
    if (!img) {
      alert("해당 영화에 등록된 포스터 이미지가 없습니다.");
      return;
    }
    const newArt: ArtworkEntry = {
      id: `art-${Date.now()}`,
      type: "메인/오리지널 포스터",
      imageUrl: formatGoogleDriveImageUrl(img),
      designer: film.artworkDesigner || "",
      showInMain: film.showInMainArtworks === true,
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
      heroImage: "",
      posterImage: "",
      summary: "English synopsis goes here.",
      summaryKo: "한국어 시놉시스를 입력하세요.",
      country: "Korea",
      runtime: "100 min",
      youtubeUrl: "",
      showInMainArtworks: false, // 영화 등록 시 메인 아트워크에 자동 노출되지 않도록 기본값 OFF
      artworks: [],
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
        const currentShow = film.showInMainArtworks === true;
        nextVal = !currentShow;
        artTitleOrType = film.title;
        return { ...film, showInMainArtworks: nextVal };
      }
      const updatedList = currentList.map((art, idx) => {
        if (idx !== artIndex) return art;
        const base: ArtworkEntry =
          typeof art === "string"
            ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: art, showInMain: false }
            : { ...art };
        const currentShow = base.showInMain === true;
        nextVal = !currentShow;
        artTitleOrType = base.title || base.type || "아트워크";
        return { ...base, showInMain: nextVal };
      });
      return {
        ...film,
        artworks: updatedList,
      };
    });

    const nextData: SiteContent = {
      ...data,
      films: nextFilms,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`[${artTitleOrType}] 메인 노출이 [${nextVal ? "ON" : "OFF"}]으로 변경되었습니다 (즉시 저장 완료).`);
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
          const isShow = typeof art === "object" ? art.showInMain === true : false;
          // 메인 노출 안 되는 건 여기에선 완전히 제외
          if (!isShow) return;

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
            showInMain: true,
          });
        });
      } else {
        // 영화 대표 포스터도 메인 노출이 켜져 있을 때만 포함
        if (film.showInMainArtworks !== true) return;

        const img = (film.mainArtworkImage && film.mainArtworkImage.trim()) ||
          (film.posterImage && film.posterImage.trim());
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
            showInMain: true,
          });
        }
      }
    });

    if (Array.isArray(data.mainArtworkIds) && data.mainArtworkIds.length > 0) {
      const orderMap = new Map<string, number>();
      data.mainArtworkIds.forEach((id, idx) => {
        orderMap.set(id, idx);
      });

      list.sort((a, b) => {
        let rankA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
        if (rankA === -1 && orderMap.has(a.filmId)) rankA = orderMap.get(a.filmId)!;
        if (rankA === -1) rankA = 9999;

        let rankB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
        if (rankB === -1 && orderMap.has(b.filmId)) rankB = orderMap.get(b.filmId)!;
        if (rankB === -1) rankB = 9999;

        return rankA - rankB;
      });
    }

    return list;
  }, [data.films, data.mainArtworkIds]);

  // Unexposed artworks list (kept separate so they don't clutter the main active sequence)
  const unexposedArtworks = React.useMemo(() => {
    const list: FlatArtworkItem[] = [];
    data.films.forEach((film) => {
      const artList = Array.isArray(film.artworks) ? film.artworks : [];
      if (artList.length > 0) {
        artList.forEach((art, idx) => {
          if (!art) return;
          const artUrl = typeof art === "string" ? art : art.imageUrl;
          if (!artUrl || !artUrl.trim()) return;
          const artId = (typeof art === "object" && art.id) ? art.id : `${film.id}-art-${idx}`;
          const isShow = typeof art === "object" ? art.showInMain === true : false;
          if (isShow) return;

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
            showInMain: false,
          });
        });
      } else {
        if (film.showInMainArtworks === true) return;
        const img = (film.mainArtworkImage && film.mainArtworkImage.trim()) ||
          (film.posterImage && film.posterImage.trim());
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
            showInMain: false,
          });
        }
      }
    });
    return list;
  }, [data.films]);

  // Set direct Artwork Position (1순위, 2순위...) like Hero Manager
  const handleSetArtworkPosition = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= allArtworksForMain.length) return;

    // Take current ordered list of artworks
    const reorderedList = [...allArtworksForMain];
    const [moved] = reorderedList.splice(fromIndex, 1);
    reorderedList.splice(toIndex, 0, moved);

    // Form strict unique ID list for all artworks in new order
    const newOrderIds = reorderedList.map((item) => item.id);

    const nextData: SiteContent = {
      ...data,
      mainArtworkIds: newOrderIds,
    };
    lastSaveTimeRef.current = Date.now();
    setData(nextData);
    onSave(nextData);
    showToast(`아트워크가 ${toIndex + 1}순위(${toIndex === 0 ? "★제일 왼쪽" : ""}) 위치로 변경 및 저장되었습니다.`);
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
      image: "",
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
    } catch (err: any) {
      console.error("Cloud save error:", err);
      const errorMessage = err?.message || String(err) || "알 수 없는 에러";
      showToast("❌ 저장 실패: " + errorMessage);
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
            <span>디렉터스 노트 관리 ({((data.directorNotes ? data.directorNotes.filter((n) => n.visible !== false).length : 1))})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("journal")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "journal" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "journal" ? "3px solid #fff" : "3px solid transparent",
              color: activeTab === "journal" ? "#fff" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <BookOpen size={16} />
            <span>저널 게시판 관리 ({(data.journalPosts || INITIAL_CONTENT.journalPosts || []).length})</span>
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
            onClick={() => setActiveTab("analytics")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              background: activeTab === "analytics" ? "#1e1e1e" : "transparent",
              border: 0,
              borderLeft: activeTab === "analytics" ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === "analytics" ? "#60a5fa" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <BarChart3 size={16} />
            <span>방문 및 조회 통계 (ANALYTICS)</span>
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

                      {/* Byline Prefix Selector (A FILM BY vs A PROGRAM BY) */}
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.14)",
                          padding: "16px 18px",
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span>바이라인 수식어 표기 (영화 / 프로그램 구분)</span>
                            <span style={{ fontSize: "11px", color: "#888", fontWeight: 400 }}>
                              * 상세 페이지에서 감독/기획자 명 앞에 노출되는 문구입니다
                            </span>
                          </label>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#f59e0b",
                              fontFamily: "monospace",
                              background: "rgba(245,158,11,0.1)",
                              padding: "3px 8px",
                              border: "1px solid rgba(245,158,11,0.25)",
                              borderRadius: "2px",
                            }}
                          >
                            미리보기: {(currentFilm.bylinePrefix?.trim() || "A FILM BY").toUpperCase()}{currentFilm.director ? ` ${currentFilm.director.toUpperCase()}` : ""}{currentFilm.year ? ` · ${currentFilm.year}` : ""}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleFilmPatch(currentFilm.id, { bylinePrefix: "A FILM BY", directorLabel: "DIRECTOR" })}
                            style={{
                              padding: "8px 16px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background:
                                currentFilm.bylinePrefix === "A FILM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel === "DIRECTOR")
                                  ? "#ffffff"
                                  : "#1c1c1c",
                              color:
                                currentFilm.bylinePrefix === "A FILM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel === "DIRECTOR")
                                  ? "#000000"
                                  : "#aaaaaa",
                              border:
                                "1px solid " +
                                (currentFilm.bylinePrefix === "A FILM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel === "DIRECTOR")
                                  ? "#ffffff"
                                  : "rgba(255,255,255,0.2)"),
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              borderRadius: "2px",
                            }}
                          >
                            🎬 A FILM BY (영화)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFilmPatch(currentFilm.id, { bylinePrefix: "A PROGRAM BY", directorLabel: "PROGRAMMER" })}
                            style={{
                              padding: "8px 16px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background:
                                currentFilm.bylinePrefix === "A PROGRAM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel !== "DIRECTOR")
                                  ? "#e50914"
                                  : "#1c1c1c",
                              color:
                                currentFilm.bylinePrefix === "A PROGRAM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel !== "DIRECTOR")
                                  ? "#ffffff"
                                  : "#aaaaaa",
                              border:
                                "1px solid " +
                                (currentFilm.bylinePrefix === "A PROGRAM BY" || (!currentFilm.bylinePrefix && currentFilm.directorLabel !== "DIRECTOR")
                                  ? "#e50914"
                                  : "rgba(255,255,255,0.2)"),
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              borderRadius: "2px",
                            }}
                          >
                            📽️ A PROGRAM BY (프로그램)
                          </button>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
                            <span style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap" }}>직접 입력:</span>
                            <input
                              type="text"
                              placeholder="예: A FILM BY, A PROGRAM BY, CURATED BY..."
                              value={currentFilm.bylinePrefix || ""}
                              onChange={(e) => handleFilmChange(currentFilm.id, "bylinePrefix", e.target.value)}
                              style={{
                                flex: 1,
                                background: "#080808",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#fff",
                                padding: "8px 12px",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>

                        {/* Program Lineup Selection (어 프로그램 바이 선택 시 관련 영화들 선택) */}
                        {((currentFilm.bylinePrefix || "").trim().toUpperCase() === "A PROGRAM BY" ||
                          currentFilm.directorLabel === "PROGRAMMER" ||
                          (currentFilm.programFilmIds && currentFilm.programFilmIds.length > 0)) && (
                          <div
                            style={{
                              marginTop: "16px",
                              padding: "16px 18px",
                              background: "rgba(229, 9, 20, 0.06)",
                              border: "1px solid rgba(229, 9, 20, 0.3)",
                              borderRadius: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <label style={{ fontSize: "12px", color: "#f87171", fontWeight: 700, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>📽️ 프로그램 수록 영화 선택 (PROGRAM LINEUP)</span>
                              </label>
                              <span style={{ fontSize: "11px", color: "#e50914", fontWeight: 600 }}>
                                선택된 영화: {(currentFilm.programFilmIds || []).length}편
                              </span>
                            </div>
                            <p style={{ margin: "0 0 12px 0", fontSize: "11px", color: "#bbb", lineHeight: 1.5 }}>
                              ‘A PROGRAM BY’ 기획전에 포함할 영화들을 선택하세요. 선택된 영화들은 프로그램 상세 페이지 하단에 컴팩트한 카드 형태로 표시되며, 방문자가 클릭하면 해당 영화의 상세 페이지로 즉시 이동합니다.
                            </p>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                                gap: "8px",
                                maxHeight: "220px",
                                overflowY: "auto",
                                padding: "4px 2px",
                              }}
                            >
                              {data.films
                                .filter((f) => f.id !== currentFilm.id)
                                .map((f) => {
                                  const isSelected = (currentFilm.programFilmIds || []).includes(f.id);
                                  return (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => {
                                        const prev = currentFilm.programFilmIds || [];
                                        const next = isSelected ? prev.filter((id) => id !== f.id) : [...prev, f.id];
                                        handleFilmPatch(currentFilm.id, { programFilmIds: next });
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 10px",
                                        background: isSelected ? "rgba(229, 9, 20, 0.2)" : "#0c0c0c",
                                        border: isSelected ? "1.5px solid #e50914" : "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        color: isSelected ? "#ffffff" : "#999999",
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "16px",
                                          height: "16px",
                                          borderRadius: "2px",
                                          border: isSelected ? "1px solid #e50914" : "1px solid #555",
                                          background: isSelected ? "#e50914" : "transparent",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#fff",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {isSelected && <Check size={11} />}
                                      </div>
                                      {(f.stillUrl || f.heroImage || f.posterImage) && (
                                        <img
                                          src={resolveAssetUrl(f.stillUrl || f.heroImage || f.posterImage || "")}
                                          alt=""
                                          style={{ width: "36px", height: "24px", objectFit: "cover", borderRadius: "1px", flexShrink: 0 }}
                                        />
                                      )}
                                      <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                                        <div
                                          style={{
                                            fontSize: "12px",
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? "#fff" : "#ccc",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                        >
                                          {f.title}
                                        </div>
                                        <div style={{ fontSize: "10px", color: isSelected ? "#fca5a5" : "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {f.director || "감독 미상"}{f.year ? ` · ${f.year}` : ""}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Informational notice: empty metadata won't appear */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.18)",
                          padding: "10px 14px",
                          borderRadius: "3px",
                          fontSize: "12px",
                          color: "#ccc",
                          lineHeight: "1.5",
                        }}
                      >
                        💡 <strong>상세 페이지 표시 안내:</strong> 프로그래머/디렉터, 연도, 개봉일, 국가, 러닝타임 중 내용을 쓰지 않고 빈칸으로 두면 상세 페이지에서 해당 항목이 자동으로 숨겨집니다.
                      </div>

                      {/* Programmer / Director */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ fontSize: "11px", color: "#aaa" }}>
                            프로그래머 / 디렉터 이름 (Name)
                          </label>
                          {currentFilm.director && (
                            <button
                              type="button"
                              onClick={() => handleFilmChange(currentFilm.id, "director", "")}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e50914",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ✕ 비우기 (상세 페이지에서 미표시)
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="미입력 시 상세 페이지에 나타나지 않음"
                          value={currentFilm.director || ""}
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

                        {/* Role Label selection */}
                        <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "#888", marginRight: "4px" }}>상세 역할 표기:</span>
                          {[
                            { label: "📽️ 프로그래머 (PROGRAMMER)", value: "PROGRAMMER" },
                            { label: "🎬 디렉터 (DIRECTOR)", value: "DIRECTOR" },
                            { label: "큐레이터 (CURATOR)", value: "CURATOR" },
                          ].map((role) => {
                            const activeRole = (
                              currentFilm.directorLabel ||
                              (currentFilm.bylinePrefix === "A FILM BY" ? "DIRECTOR" : "PROGRAMMER")
                            ).toUpperCase();
                            const isSelected = activeRole === role.value;
                            return (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => handleFilmChange(currentFilm.id, "directorLabel", role.value)}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: isSelected ? "#ffffff" : "#181818",
                                  color: isSelected ? "#000000" : "#aaaaaa",
                                  border: `1px solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.15)"}`,
                                  cursor: "pointer",
                                  borderRadius: "2px",
                                }}
                              >
                                {role.label}
                              </button>
                            );
                          })}
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#666" }}>직접 입력:</span>
                            <input
                              type="text"
                              placeholder="예: PROGRAMMER..."
                              value={currentFilm.directorLabel || ""}
                              onChange={(e) => handleFilmChange(currentFilm.id, "directorLabel", e.target.value)}
                              style={{
                                width: "120px",
                                background: "#080808",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "#fff",
                                padding: "4px 8px",
                                fontSize: "11px",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Year */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ fontSize: "11px", color: "#aaa" }}>
                            제작 연도 (Year)
                          </label>
                          {currentFilm.year && (
                            <button
                              type="button"
                              onClick={() => handleFilmChange(currentFilm.id, "year", "")}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e50914",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ✕ 비우기 (상세 페이지에서 미표시)
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="미입력 시 상세 페이지에 나타나지 않음 (예: 2026)"
                          value={currentFilm.year || ""}
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

                      {/* Release */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ fontSize: "11px", color: "#aaa" }}>
                            국내 개봉일 (예: 2026.09.30)
                          </label>
                          {currentFilm.release && (
                            <button
                              type="button"
                              onClick={() => handleFilmChange(currentFilm.id, "release", "")}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e50914",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ✕ 비우기 (상세 페이지에서 미표시)
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={currentFilm.release || ""}
                          placeholder="미입력 시 상세 페이지에 나타나지 않음"
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

                      {/* Country & Runtime */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ fontSize: "11px", color: "#aaa" }}>
                            국가 및 러닝타임 (Country & Runtime)
                          </label>
                          {(currentFilm.country || currentFilm.runtime) && (
                            <button
                              type="button"
                              onClick={() => handleFilmPatch(currentFilm.id, { country: "", runtime: "" })}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e50914",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ✕ 둘 다 비우기
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="국가 (미입력 시 숨김)"
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
                            placeholder="러닝타임 (미입력 시 숨김)"
                            value={currentFilm.runtime || ""}
                            onChange={(e) => handleFilmChange(currentFilm.id, "runtime", e.target.value)}
                            style={{
                              width: "160px",
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
                        <button
                          type="button"
                          onClick={() => handleToggleArtworkExposure(currentFilm.id, -1)}
                          style={{
                            background: currentFilm.showInMainArtworks === true ? "rgba(34, 197, 94, 0.22)" : "#161616",
                            border: currentFilm.showInMainArtworks === true ? "1.5px solid #22c55e" : "1.5px solid rgba(255, 255, 255, 0.25)",
                            color: currentFilm.showInMainArtworks === true ? "#4ade80" : "#888",
                            padding: "6px 14px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                            boxShadow: currentFilm.showInMainArtworks === true ? "0 0 8px rgba(34, 197, 94, 0.25)" : "none",
                            borderRadius: "2px",
                          }}
                          title="영화 대표 포스터의 메인화면 아트워크 슬라이더 노출 여부 (실시간 자동 저장)"
                        >
                          {currentFilm.showInMainArtworks === true ? (
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
                              <span>대표 포스터 메인 노출 ON</span>
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
                              <span>대표 포스터 메인 숨김 OFF</span>
                            </>
                          )}
                        </button>
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
                                  showInMain: false,
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
                                  showInMain: false,
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
                                  showInMain: false,
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
                                  showInMain: false,
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
                                  showInMain: false,
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
                                  ? { id: `art-${idx}`, type: "메인/오리지널 포스터", imageUrl: rawArt, title: "", designer: "", showInMain: false }
                                  : {
                                      ...rawArt,
                                      id: rawArt.id || `art-${idx}`,
                                      type: rawArt.type || "메인/오리지널 포스터",
                                      imageUrl: rawArt.imageUrl || "",
                                      title: rawArt.title || "",
                                      caption: rawArt.caption || "",
                                      designer: rawArt.designer || "",
                                      showInMain: rawArt.showInMain === true,
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
                                      ? { id: `art-${i}`, type: "메인/오리지널 포스터", imageUrl: item, title: "", designer: "", showInMain: false }
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
                                          background: artItem.showInMain === true ? "rgba(34, 197, 94, 0.22)" : "#161616",
                                          border: artItem.showInMain === true ? "1.5px solid #22c55e" : "1.5px solid rgba(255, 255, 255, 0.25)",
                                          color: artItem.showInMain === true ? "#4ade80" : "#888",
                                          padding: "6px 12px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          whiteSpace: "nowrap",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          transition: "all 0.15s ease",
                                          boxShadow: artItem.showInMain === true ? "0 0 8px rgba(34, 197, 94, 0.25)" : "none",
                                        }}
                                        title="클릭 시 메인 화면 아트워크 슬라이더 노출/숨김을 즉시 전환합니다"
                                      >
                                        {artItem.showInMain === true ? (
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

                        {/* Right Action Controls: Release Exposure & Jump Button */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {/* Exposure Release Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleArtworkExposure(item.filmId, item.artIndex)}
                            style={{
                              background: "rgba(239, 68, 68, 0.12)",
                              border: "1.5px solid rgba(239, 68, 68, 0.5)",
                              color: "#f87171",
                              padding: "7px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.15s ease",
                              minWidth: "125px",
                              justifyContent: "center",
                            }}
                            title="클릭 시 메인 노출을 해제하고 이 순위 목록에서 제외합니다"
                          >
                            <EyeOff size={13} color="#f87171" />
                            <span>메인 노출 해제</span>
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

              {/* Unexposed Artworks Section (Collapsible - Not visible in main ranking list by default) */}
              {unexposedArtworks.length > 0 && (
                <details
                  style={{
                    background: "#0d0d0d",
                    border: "1px dashed rgba(255,255,255,0.18)",
                    padding: "16px 20px",
                    marginTop: "20px",
                    cursor: "pointer",
                  }}
                >
                  <summary
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#aaa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      userSelect: "none",
                    }}
                  >
                    <span>
                      미노출 아트워크 목록 ({unexposedArtworks.length}개) — 필요한 경우 메인 화면에 추가할 수 있습니다.
                    </span>
                    <span style={{ fontSize: "11px", color: "#f59e0b" }}>목록 펼치기 / 접기 ▾</span>
                  </summary>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                    {unexposedArtworks.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "#141414",
                          border: "1px solid rgba(255,255,255,0.08)",
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            alt=""
                            src={resolveAssetUrl(item.imageUrl)}
                            style={{ width: "36px", height: "50px", objectFit: "cover", opacity: 0.6 }}
                          />
                          <div>
                            <div style={{ fontSize: "13px", color: "#ccc", fontWeight: 600 }}>
                              {item.filmTitleKo || item.filmTitle}
                            </div>
                            <div style={{ fontSize: "11px", color: "#777" }}>
                              {item.type} {item.title ? `· ${item.title}` : ""} {item.designer ? `(Designed by ${item.designer})` : ""}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleArtworkExposure(item.filmId, item.artIndex)}
                          style={{
                            background: "#222",
                            border: "1px solid #22c55e",
                            color: "#4ade80",
                            padding: "6px 12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            borderRadius: "2px",
                          }}
                        >
                          <Plus size={12} />
                          <span>메인에 노출하기</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
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

          {/* TAB 3: DIRECTOR NOTE MULTI-MANAGEMENT */}
          {activeTab === "director" && (() => {
            const currentNotes: DirectorNote[] = (Array.isArray(data.directorNotes) && data.directorNotes.length > 0)
              ? data.directorNotes
              : [
                  {
                    id: "note-1",
                    quote: data.director?.quote || "Photography is truth. The cinema is truth twenty-four times per second.",
                    photo: data.director?.photo || "",
                    directorName: data.director?.name || "Jean-Luc Godard",
                    filmTitle: "",
                    visible: true,
                  },
                ];

            const handleAddDirectorNote = () => {
              const newId = `note-${Date.now()}`;
              const newNote: DirectorNote = {
                id: newId,
                quote: "새로운 인용구 또는 감독의 코멘트를 입력하세요.",
                photo: "",
                directorName: "",
                filmTitle: "",
                visible: true,
              };
              const updatedNotes = [...currentNotes, newNote];
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
              showToast("새 디렉터스 노트가 추가되었습니다 (하단에 이어서 노출).");
            };

            const handleUpdateDirectorNote = (id: string, field: keyof DirectorNote, val: any) => {
              const updatedNotes = currentNotes.map((n) => {
                if (n.id !== id) return n;
                const finalVal = field === "photo" && typeof val === "string" ? formatGoogleDriveImageUrl(val) : val;
                return { ...n, [field]: finalVal };
              });
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
            };

            const exposedNotes = currentNotes.filter((n) => n.visible !== false);
            const unexposedNotes = currentNotes.filter((n) => n.visible === false);

            const handleToggleDirectorNote = (id: string) => {
              let nextState = true;
              const updatedNotes = currentNotes.map((n) => {
                if (n.id !== id) return n;
                nextState = n.visible === false ? true : false;
                return { ...n, visible: nextState };
              });
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
              showToast(nextState ? "디렉터스 노트가 메인에 노출되도록 등록되었습니다." : "디렉터스 노트의 메인 노출이 해제되었습니다.");
            };

            const handleMoveDirectorNote = (expIndex: number, direction: "up" | "down") => {
              const targetExpIndex = direction === "up" ? expIndex - 1 : expIndex + 1;
              if (targetExpIndex < 0 || targetExpIndex >= exposedNotes.length) return;
              const newExposed = [...exposedNotes];
              const temp = newExposed[expIndex];
              newExposed[expIndex] = newExposed[targetExpIndex];
              newExposed[targetExpIndex] = temp;
              const updatedNotes = [...newExposed, ...unexposedNotes];
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
              showToast(`노출 순위가 ${targetExpIndex + 1}순위로 변경되었습니다.`);
            };

            const handleSetDirectorNoteRank = (currentExpIndex: number, targetRank: number) => {
              const targetExpIndex = targetRank - 1;
              if (targetExpIndex < 0 || targetExpIndex >= exposedNotes.length || currentExpIndex === targetExpIndex) return;
              const newExposed = [...exposedNotes];
              const [removed] = newExposed.splice(currentExpIndex, 1);
              newExposed.splice(targetExpIndex, 0, removed);
              const updatedNotes = [...newExposed, ...unexposedNotes];
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
              showToast(`${targetRank}순위로 노출 순서가 변경되었습니다.`);
            };

            const handleDeleteDirectorNote = (id: string, index?: number) => {
              if (currentNotes.length <= 1) {
                if (!confirm("디렉터스 노트를 삭제하시겠습니까? (최소 1개는 유지하는 것을 권장합니다)")) return;
              } else {
                if (!confirm(typeof index === "number" ? `${index + 1}순위 디렉터스 노트를 삭제하시겠습니까?` : "디렉터스 노트를 삭제하시겠습니까?")) return;
              }
              const updatedNotes = currentNotes.filter((n) => n.id !== id);
              const firstVisible = updatedNotes.find((n) => n.visible !== false) || updatedNotes[0];
              const nextData = {
                ...data,
                directorNotes: updatedNotes,
                director: {
                  photo: firstVisible?.photo || "",
                  quote: firstVisible?.quote || "",
                  name: firstVisible?.directorName || "",
                },
              };
              setData(nextData);
              onSave(nextData);
              showToast("디렉터스 노트가 삭제되었습니다.");
            };

            const exposedCount = exposedNotes.length;

            return (
              <div style={{ maxWidth: "960px" }}>
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
                      디렉터스 노트 관리 시스템
                    </h2>
                    <p style={{ margin: 0, color: "#888", fontSize: "13px", lineHeight: "1.6" }}>
                      메인 화면 아트워크 섹션 아래에 위치하는 100svh 대형 시네마틱 명대사 및 감독 코멘트 섹션입니다.
                      <br />
                      여러 개를 등록하면 <strong>1순위부터 차례대로 아래로 이어서 노출</strong>됩니다. (현재 등록: <strong style={{ color: "#f59e0b" }}>{currentNotes.length}개</strong> / 메인 노출 중: <strong style={{ color: "#22c55e" }}>{exposedCount}개</strong>)
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Section Global Toggle */}
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: data.directorNotesVisible !== false ? "#10b981" : "#888",
                        background: "#181818",
                        border: "1px solid rgba(255,255,255,0.15)",
                        padding: "8px 14px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={data.directorNotesVisible !== false}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          const nextData = { ...data, directorNotesVisible: nextVal };
                          setData(nextData);
                          onSave(nextData);
                          showToast(`디렉터스 노트 섹션이 ${nextVal ? "노출 [ON]" : "전체 숨김 [OFF]"} 처리되었습니다.`);
                        }}
                        style={{ accentColor: "#f59e0b", width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span>{data.directorNotesVisible !== false ? "전체 섹션 ON" : "전체 섹션 OFF"}</span>
                    </label>

                    {/* Add Note Button */}
                    <button
                      type="button"
                      onClick={handleAddDirectorNote}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#f59e0b",
                        border: "none",
                        color: "#000",
                        padding: "10px 18px",
                        fontSize: "12px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                        borderRadius: "2px",
                        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
                      }}
                    >
                      <Plus size={16} strokeWidth={3} />
                      <span>디렉터스 노트 추가</span>
                    </button>
                  </div>
                </div>

                {/* Guide Banner */}
                <div
                  style={{
                    background: "#141414",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    padding: "14px 18px",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>🎬</span>
                  <div style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.6" }}>
                    <strong style={{ color: "#f59e0b" }}>메인 노출 관리 안내:</strong>{" "}
                    각 카드의 <strong>[순위 드롭다운]</strong> 및 <strong>[▲ / ▼]</strong> 버튼으로 상하 노출 순서를 변경할 수 있으며, <strong>[메인 노출 ON/OFF]</strong> 스위치로 선별 노출할 수 있습니다. 1순위가 가장 먼저 보이고 추가된 노트들이 이어서 하단에 펼쳐집니다.
                  </div>
                </div>

                {/* Notes List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {exposedNotes.length === 0 ? (
                    <div
                      style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        background: "#0c0c0c",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        color: "#888",
                      }}
                    >
                      <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#bbb", fontWeight: 600 }}>
                        현재 메인 화면에 노출 중인 디렉터스 노트가 없습니다.
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                        상단의 <strong>[디렉터스 노트 추가]</strong>를 누르거나, 아래 미노출 목록에서 <strong>[+ 메인에 노출하기]</strong>를 클릭하세요.
                      </p>
                    </div>
                  ) : (
                    exposedNotes.map((note, index) => {
                      const isExposed = true;
                      const previewPhoto = resolveAssetUrl(note.photo || "");

                      return (
                        <div
                          key={note.id || index}
                          style={{
                            background: "#101010",
                            border: "1px solid rgba(255,255,255,0.18)",
                            transition: "all 0.2s ease",
                            overflow: "hidden",
                          }}
                        >
                          {/* Note Card Header Bar */}
                          <div
                            style={{
                              background: "#181818",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              padding: "12px 18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "12px",
                            }}
                          >
                            {/* Left: Rank Controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              {/* Rank Badge */}
                              <span
                                style={{
                                  background: "#f59e0b",
                                  color: "#000",
                                  fontWeight: 900,
                                  fontSize: "11px",
                                  padding: "4px 8px",
                                  borderRadius: "3px",
                                  letterSpacing: "0.06em",
                                }}
                              >
                                {index + 1}순위
                              </span>

                              {/* Rank Select Dropdown */}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", color: "#888", fontWeight: 600 }}>순위 변경:</span>
                                <select
                                  value={index + 1}
                                  onChange={(e) => handleSetDirectorNoteRank(index, Number(e.target.value))}
                                  style={{
                                    background: "#080808",
                                    border: "1px solid rgba(245, 158, 11, 0.4)",
                                    color: "#f59e0b",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    outline: "none",
                                  }}
                                >
                                  {exposedNotes.map((_, rIdx) => (
                                    <option key={rIdx} value={rIdx + 1}>
                                      {rIdx + 1}순위 {rIdx === 0 ? "(★제일 상단)" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Up / Down Move Buttons */}
                              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveDirectorNote(index, "up")}
                                  style={{
                                    background: "#222",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: index === 0 ? "#555" : "#fff",
                                    width: "28px",
                                    height: "26px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: index === 0 ? "not-allowed" : "pointer",
                                  }}
                                  title="한 칸 위로 이동"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === exposedNotes.length - 1}
                                  onClick={() => handleMoveDirectorNote(index, "down")}
                                  style={{
                                    background: "#222",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: index === exposedNotes.length - 1 ? "#555" : "#fff",
                                    width: "28px",
                                    height: "26px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: index === exposedNotes.length - 1 ? "not-allowed" : "pointer",
                                  }}
                                  title="한 칸 아래로 이동"
                                >
                                  <ArrowDown size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Right: Release Exposure & Delete Buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {/* Release Exposure Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleDirectorNote(note.id)}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  border: "1.5px solid rgba(239, 68, 68, 0.5)",
                                  color: "#f87171",
                                  padding: "6px 14px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  borderRadius: "2px",
                                  transition: "all 0.15s ease",
                                }}
                                title="클릭 시 메인 노출을 해제하고 이 순위 목록에서 제외합니다"
                              >
                                <EyeOff size={13} color="#f87171" />
                                <span>메인 노출 해제</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteDirectorNote(note.id, index)}
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "#888",
                                  padding: "6px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  borderRadius: "2px",
                                }}
                                title="디렉터스 노트 삭제"
                              >
                                <Trash2 size={13} />
                                <span>삭제</span>
                              </button>
                            </div>
                          </div>

                        {/* Note Card Body (Editor & Live Preview Grid) */}
                        <div
                          style={{
                            padding: "20px 22px",
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                            gap: "24px",
                            alignItems: "start",
                          }}
                        >
                          {/* Form Inputs Column */}
                          <div>
                            {/* Quote Textarea */}
                            <div style={{ marginBottom: "16px" }}>
                              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#f59e0b", fontWeight: 700, marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                                <span>한국어/원문 인용구·명대사 문구 (Quote) *</span>
                                <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 400 }}>↵ 엔터 줄바꿈이 화면에 그대로 반영됩니다</span>
                              </label>
                              <textarea
                                rows={4}
                                value={note.quote}
                                onChange={(e) => handleUpdateDirectorNote(note.id, "quote", e.target.value)}
                                placeholder="인용구 또는 감독의 코멘트를 입력하세요."
                                style={{
                                  width: "100%",
                                  background: "#080808",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "#fff",
                                  padding: "12px",
                                  fontSize: "16px",
                                  fontFamily: "'Noto Serif KR', serif",
                                  lineHeight: "1.6",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>

                            {/* Attribution Row: Director Name & Film Title */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                                  감독/인물명 (선택)
                                </label>
                                <input
                                  type="text"
                                  value={note.directorName || ""}
                                  placeholder="예: Jean-Luc Godard"
                                  onChange={(e) => handleUpdateDirectorNote(note.id, "directorName", e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "#080808",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#fff",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                                  관련 영화 제목 (선택)
                                </label>
                                <input
                                  type="text"
                                  value={note.filmTitle || ""}
                                  placeholder="예: Contempt / 경멸"
                                  onChange={(e) => handleUpdateDirectorNote(note.id, "filmTitle", e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "#080808",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#fff",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Background Photo URL */}
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>
                                배경 사진 이미지 URL (구글 드라이브 링크 지원, 비워두면 다크 시네마 그래픽)
                              </label>
                              <input
                                type="text"
                                value={note.photo || ""}
                                placeholder="https://drive.google.com/... 또는 https://... 이미지 링크"
                                onChange={(e) => handleUpdateDirectorNote(note.id, "photo", e.target.value)}
                                style={{
                                  width: "100%",
                                  background: "#080808",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "#fff",
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  outline: "none",
                                  fontFamily: "monospace",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>

                          {/* Live Preview Column */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.08em" }}>
                                📺 실시간 메인 노출 미리보기
                              </span>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  color: isExposed ? "#4ade80" : "#888",
                                }}
                              >
                                {isExposed ? `[${index + 1}순위 메인 노출]` : "[메인 숨김]"}
                              </span>
                            </div>

                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                height: "230px",
                                background: "#111",
                                backgroundImage: previewPhoto ? `url(${previewPhoto})` : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                border: "1px solid rgba(255,255,255,0.15)",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                padding: "20px",
                                boxSizing: "border-box",
                              }}
                            >
                              {/* Dark gradient overlay matching website */}
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: previewPhoto
                                    ? "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)"
                                    : "linear-gradient(135deg, #2b2b2a, #141413)",
                                  pointerEvents: "none",
                                }}
                              />

                              {/* Preview Quote Content */}
                              <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                                <p
                                  style={{
                                    fontFamily: "'Noto Serif KR', serif",
                                    fontSize: "15px",
                                    color: "#fff",
                                    lineHeight: "1.5",
                                    margin: "0 0 10px",
                                    textShadow: "0 2px 10px rgba(0,0,0,0.7)",
                                    whiteSpace: "pre-line",
                                    wordBreak: "keep-all",
                                  }}
                                >
                                  “{note.quote || "인용구 문구를 입력해 주세요."}”
                                </p>
                                {(note.directorName || note.filmTitle) && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      color: "rgba(255,255,255,0.8)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {note.directorName && <span style={{ fontWeight: 700 }}>— {note.directorName}</span>}
                                    {note.filmTitle && <span style={{ color: "#f59e0b" }}>〈{note.filmTitle}〉</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Collapsible Unexposed Drawer */}
              {unexposedNotes.length > 0 && (
                <details
                  style={{
                    background: "#0d0d0d",
                    border: "1px dashed rgba(255,255,255,0.18)",
                    padding: "16px 20px",
                    marginTop: "24px",
                  }}
                >
                  <summary
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#aaa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <span>
                      미노출 디렉터스 노트 ({unexposedNotes.length}개) — 필요한 경우 메인 화면에 다시 추가할 수 있습니다.
                    </span>
                    <span style={{ fontSize: "11px", color: "#f59e0b" }}>목록 펼치기 / 접기 ▾</span>
                  </summary>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    {unexposedNotes.map((note, unexpIdx) => {
                      const previewPhoto = resolveAssetUrl(note.photo || "");
                      return (
                        <div
                          key={note.id || unexpIdx}
                          style={{
                            background: "#141414",
                            border: "1px solid rgba(255,255,255,0.08)",
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                            {previewPhoto ? (
                              <img
                                alt=""
                                src={previewPhoto}
                                style={{ width: "45px", height: "45px", objectFit: "cover", opacity: 0.6, borderRadius: "2px" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "45px",
                                  height: "45px",
                                  background: "#222",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "18px",
                                  opacity: 0.5,
                                }}
                              >
                                🎬
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "#ccc",
                                  fontStyle: "italic",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                “{note.quote || "(인용구 없음)"}”
                              </div>
                              <div style={{ fontSize: "11px", color: "#777", marginTop: "4px" }}>
                                {note.directorName ? `— ${note.directorName}` : ""} {note.filmTitle ? `〈${note.filmTitle}〉` : ""}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleDirectorNote(note.id)}
                              style={{
                                background: "#10b981",
                                border: "none",
                                color: "#000",
                                padding: "6px 14px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                borderRadius: "2px",
                              }}
                            >
                              <Eye size={12} strokeWidth={2.5} />
                              <span>+ 메인에 노출하기</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDirectorNote(note.id)}
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                borderRadius: "2px",
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          );
        })()}

          {/* TAB: JOURNAL BOARD MANAGEMENT (저널 게시판 관리) */}
          {activeTab === "journal" && (() => {
            const posts = data.journalPosts || INITIAL_CONTENT.journalPosts || [];
            const isSectionVisible = data.journalVisible !== false;

            return (
              <div style={{ maxWidth: "1080px" }}>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                    저널 게시판 관리 (JOURNAL)
                  </h2>
                  <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                    라이트하우스 공식 저널 글(에세이, 비평, 시네마 노트, 아카이브)을 등록 및 편집하고, 순서와 [메인 화면 / 게시판 페이지] 발행 여부를 각각 개별적으로 관리합니다.
                  </p>
                </div>

                {/* Section Visibility Master Control Card */}
                <div
                  style={{
                    background: "#101010",
                    border: `1px solid ${isSectionVisible ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                    padding: "20px 24px",
                    marginBottom: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ minWidth: "260px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <BookOpen size={16} style={{ color: isSectionVisible ? "#4ade80" : "#f87171" }} />
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                        메인 화면 저널(JOURNAL) 섹션 전체 노출 설정
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "2px",
                          background: isSectionVisible ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: isSectionVisible ? "#4ade80" : "#f87171",
                          border: `1px solid ${isSectionVisible ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
                        }}
                      >
                        {isSectionVisible ? "현재 메인 화면에 노출 중 (ON)" : "현재 메인 화면에서 숨김 (OFF)"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#999", lineHeight: 1.5 }}>
                      {isSectionVisible
                        ? `메인 화면(ABOUT 하단 및 네비게이션)에 저널 섹션이 노출 중입니다. 각 글의 [메인 발행]이 켜진 글들이 표시됩니다.`
                        : `메인 화면에서 저널 섹션이 완전히 숨겨집니다. (상단 네비게이션이나 ABOUT 하단 링크를 통한 전용 게시판 페이지는 계속 접근 가능합니다)`}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSectionVisible) handleToggleJournalSectionVisibility();
                      }}
                      style={{
                        background: isSectionVisible ? "#15803d" : "#1a1a1a",
                        border: `1px solid ${isSectionVisible ? "#22c55e" : "rgba(255,255,255,0.2)"}`,
                        color: isSectionVisible ? "#fff" : "#777",
                        padding: "8px 18px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: isSectionVisible ? "default" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Eye size={13} />
                      <span>메인 섹션 노출 (ON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSectionVisible) handleToggleJournalSectionVisibility();
                      }}
                      style={{
                        background: !isSectionVisible ? "#b91c1c" : "#1a1a1a",
                        border: `1px solid ${!isSectionVisible ? "#ef4444" : "rgba(255,255,255,0.2)"}`,
                        color: !isSectionVisible ? "#fff" : "#777",
                        padding: "8px 18px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: !isSectionVisible ? "default" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <EyeOff size={13} />
                      <span>메인 섹션 숨김 (OFF)</span>
                    </button>
                  </div>
                </div>

                {/* New Journal Post Registration Card */}
                <div
                  style={{
                    background: "#101010",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    padding: "28px",
                    marginBottom: "36px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "20px",
                      paddingBottom: "14px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Plus size={16} style={{ color: "#f59e0b" }} />
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                        새 저널 게시글 작성 및 등록
                      </h3>
                    </div>
                    <span style={{ fontSize: "11px", color: "#888" }}>
                      이미지 링크와 줄바꿈 텍스트를 지원합니다
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                        글 제목 (Title) <span style={{ color: "#ef4444" }}>*필수</span>
                      </label>
                      <input
                        type="text"
                        value={newJournalTitle}
                        onChange={(e) => setNewJournalTitle(e.target.value)}
                        placeholder="예: 자크 드미의 〈쉘부르의 우산〉: 색채와 멜로디의 미학"
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          padding: "10px 12px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                        부제목 / 한 줄 소개 (Subtitle)
                      </label>
                      <input
                        type="text"
                        value={newJournalSubtitle}
                        onChange={(e) => setNewJournalSubtitle(e.target.value)}
                        placeholder="예: 모든 대사가 노래가 되는 누벨바그의 찬란한 순간"
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          padding: "10px 12px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                        카테고리 (Category)
                      </label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <select
                          value={newJournalCategory}
                          onChange={(e) => setNewJournalCategory(e.target.value)}
                          style={{
                            flex: 1,
                            background: "#080808",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: "#fff",
                            padding: "10px 8px",
                            fontSize: "12px",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="ESSAY">ESSAY (에세이)</option>
                          <option value="CRITIQUE">CRITIQUE (비평)</option>
                          <option value="NOTE">NOTE (시네마 노트)</option>
                          <option value="NEWS">NEWS (소식)</option>
                          <option value="INTERVIEW">INTERVIEW (인터뷰)</option>
                          <option value="ARCHIVE">ARCHIVE (아카이브)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                        발행일자 (Date)
                      </label>
                      <input
                        type="text"
                        value={newJournalDate}
                        onChange={(e) => setNewJournalDate(e.target.value)}
                        placeholder="2026.03.15"
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          padding: "10px 12px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                        작성자 / 기고자 (Author)
                      </label>
                      <input
                        type="text"
                        value={newJournalAuthor}
                        onChange={(e) => setNewJournalAuthor(e.target.value)}
                        placeholder="LIGHTHOUSE"
                        style={{
                          width: "100%",
                          background: "#080808",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          padding: "10px 12px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                      대표 이미지 링크 (Google Drive 링크 또는 일반 웹 이미지 URL)
                    </label>
                    <input
                      type="text"
                      value={newJournalImageUrl}
                      onChange={(e) => setNewJournalImageUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... 또는 https://example.com/photo.jpg"
                      style={{
                        width: "100%",
                        background: "#080808",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        padding: "10px 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#777" }}>
                      * 구글 드라이브 링크 입력 시 고화질 웹 썸네일로 자동 변환 연동됩니다. (비워둘 시 텍스트 전용 카드로 노출됩니다)
                    </p>

                    {newJournalImageUrl.trim() && (
                      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>이미지 미리보기:</span>
                        <img
                          alt="미리보기"
                          src={resolveAssetUrl(formatGoogleDriveImageUrl(newJournalImageUrl.trim()))}
                          style={{ width: "90px", height: "55px", objectFit: "cover", border: "1px solid #333", borderRadius: "2px" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Tag System Input for New Post */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "11px", color: "#aaa", fontWeight: 600 }}>
                        태그 시스템 (Tags) — 쉼표(,) 또는 띄어쓰기 / #으로 구분하여 입력
                      </label>
                      <span style={{ fontSize: "11px", color: "#888" }}>
                        예: #누벨바그, #영화비평, #아카이브, #자크드미
                      </span>
                    </div>
                    <input
                      type="text"
                      value={newJournalTagsInput}
                      onChange={(e) => setNewJournalTagsInput(e.target.value)}
                      placeholder="#누벨바그, #아카이브, #영화비평, #에세이 (쉼표 또는 공백으로 여러 개 입력 가능)"
                      style={{
                        width: "100%",
                        background: "#080808",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        padding: "10px 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                    {(() => {
                      const tags = newJournalTagsInput
                        .split(/[,#\s]+/)
                        .map((t) => t.trim().replace(/^#/, ""))
                        .filter(Boolean);
                      if (tags.length === 0) return null;
                      return (
                        <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {tags.map((t, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "rgba(245, 158, 11, 0.15)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                color: "#f59e0b",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "2px",
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "6px", fontWeight: 600 }}>
                      글 본문 내용 (Text Content) — 줄바꿈이 화면에 그대로 반영됩니다
                    </label>
                    <textarea
                      rows={7}
                      value={newJournalContent}
                      onChange={(e) => setNewJournalContent(e.target.value)}
                      placeholder="에세이, 비평, 노트 본문을 입력하세요. 줄바꿈(엔터)을 하면 화면상에도 동일하게 단락이 구분되어 노출됩니다."
                      style={{
                        width: "100%",
                        background: "#080808",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        padding: "12px 14px",
                        fontSize: "13px",
                        lineHeight: "1.65",
                        outline: "none",
                        fontFamily: "inherit",
                        whiteSpace: "pre-wrap",
                      }}
                    />
                  </div>

                  {/* Publishing Destination Selection (발행 위치 개별 선택) */}
                  <div style={{ marginBottom: "20px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.12)", padding: "14px 18px", borderRadius: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#f59e0b", fontWeight: 700, margin: 0 }}>
                        발행 위치 개별 선택 (메인 / 게시판)
                      </label>
                      <span style={{ fontSize: "11px", color: "#888" }}>
                        글마다 메인 화면과 게시판 페이지 노출 여부를 따로 지정할 수 있습니다
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: newJournalVisibleOnMain ? "#4ade80" : "#888" }}>
                        <input
                          type="checkbox"
                          checked={newJournalVisibleOnMain}
                          onChange={(e) => setNewJournalVisibleOnMain(e.target.checked)}
                          style={{ accentColor: "#22c55e", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: 700 }}>메인 화면 발행 (MAIN)</span>
                        <span style={{ fontSize: "11px", color: "#666" }}>[메인 화면 저널 카드 섹션 노출]</span>
                      </label>

                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: newJournalVisibleOnBoard ? "#60a5fa" : "#888" }}>
                        <input
                          type="checkbox"
                          checked={newJournalVisibleOnBoard}
                          onChange={(e) => setNewJournalVisibleOnBoard(e.target.checked)}
                          style={{ accentColor: "#3b82f6", width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: 700 }}>게시판 페이지 발행 (BOARD)</span>
                        <span style={{ fontSize: "11px", color: "#666" }}>[전체 저널 게시판 목록 노출]</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewJournalPost}
                    style={{
                      background: "#22c55e",
                      border: "none",
                      color: "#fff",
                      padding: "11px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "2px",
                      boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    <Plus size={16} />
                    <span>새 저널 글 등록하기</span>
                  </button>
                </div>

                {/* Registered Posts List */}
                <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600, color: "#fff" }}>
                    등록된 저널 게시글 목록 ({posts.length}편)
                  </h3>
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    순위 조정(▲/▼) 및 노출 상태를 변경할 수 있습니다.
                  </span>
                </div>

                {posts.length === 0 ? (
                  <div style={{ background: "#111", padding: "40px", textAlign: "center", color: "#777", border: "1px dashed #333" }}>
                    등록된 저널 게시글이 없습니다. 상단에서 첫 번째 저널 글을 작성해 보세요.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {posts.map((post, idx) => {
                      const isEditing = editingJournalId === post.id;
                      const isMainExposed = post.visibleOnMain !== undefined ? post.visibleOnMain === true : post.visible !== false;
                      const isBoardExposed = post.visibleOnBoard !== undefined ? post.visibleOnBoard === true : post.visible !== false;

                      return (
                        <div
                          key={post.id || idx}
                          style={{
                            background: "#121212",
                            border: `1px solid ${isEditing ? "rgba(245, 158, 11, 0.5)" : "rgba(255, 255, 255, 0.12)"}`,
                            padding: "20px 24px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {/* Card Top Action Bar */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "14px",
                              paddingBottom: "12px",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                              flexWrap: "wrap",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {/* Rank Select */}
                              <span style={{ fontSize: "11px", color: "#888", fontWeight: 700 }}>순위:</span>
                              <select
                                value={idx + 1}
                                onChange={(e) => handleSetJournalPostRank(idx, Number(e.target.value))}
                                style={{
                                  background: "#080808",
                                  border: "1px solid rgba(245, 158, 11, 0.4)",
                                  color: "#f59e0b",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  padding: "3px 6px",
                                  cursor: "pointer",
                                  outline: "none",
                                }}
                              >
                                {posts.map((_, rIdx) => (
                                  <option key={rIdx} value={rIdx + 1}>
                                    {rIdx + 1}순위 {rIdx === 0 ? "(★제일 처음)" : ""}
                                  </option>
                                ))}
                              </select>

                              {/* Up / Down Move Buttons */}
                              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveJournalPost(idx, "up")}
                                  style={{
                                    background: "#222",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: idx === 0 ? "#555" : "#fff",
                                    width: "28px",
                                    height: "26px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: idx === 0 ? "not-allowed" : "pointer",
                                  }}
                                  title="한 칸 앞으로 이동"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === posts.length - 1}
                                  onClick={() => handleMoveJournalPost(idx, "down")}
                                  style={{
                                    background: "#222",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: idx === posts.length - 1 ? "#555" : "#fff",
                                    width: "28px",
                                    height: "26px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: idx === posts.length - 1 ? "not-allowed" : "pointer",
                                  }}
                                  title="한 칸 뒤로 이동"
                                >
                                  <ArrowDown size={13} />
                                </button>
                              </div>

                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  letterSpacing: "0.1em",
                                  padding: "3px 8px",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  color: "#fff",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                }}
                              >
                                {post.category || "ESSAY"}
                              </span>

                              <span style={{ fontSize: "11px", color: "#888" }}>
                                {post.date}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {/* Main Visibility Toggle Button */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleJournalMainVisibility(post.id, e)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: isMainExposed ? "#15803d" : "#202020",
                                  border: `1px solid ${isMainExposed ? "#4ade80" : "rgba(255, 255, 255, 0.2)"}`,
                                  color: isMainExposed ? "#ffffff" : "#888888",
                                  padding: "6px 12px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  borderRadius: "3px",
                                  boxShadow: isMainExposed ? "0 2px 8px rgba(34, 197, 94, 0.35)" : "none",
                                  transition: "all 0.15s ease",
                                }}
                                title="클릭하여 메인 화면 노출(발행) 상태 전환"
                              >
                                <span
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: isMainExposed ? "#4ade80" : "#666666",
                                    display: "inline-block",
                                  }}
                                />
                                {isMainExposed ? <Eye size={13} style={{ color: "#86efac" }} /> : <EyeOff size={13} style={{ color: "#777" }} />}
                                <span>메인 발행: {isMainExposed ? "ON" : "OFF"}</span>
                              </button>

                              {/* Board Visibility Toggle Button */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleJournalBoardVisibility(post.id, e)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: isBoardExposed ? "#1d4ed8" : "#202020",
                                  border: `1px solid ${isBoardExposed ? "#60a5fa" : "rgba(255, 255, 255, 0.2)"}`,
                                  color: isBoardExposed ? "#ffffff" : "#888888",
                                  padding: "6px 12px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  borderRadius: "3px",
                                  boxShadow: isBoardExposed ? "0 2px 8px rgba(59, 130, 246, 0.35)" : "none",
                                  transition: "all 0.15s ease",
                                }}
                                title="클릭하여 게시판 페이지 노출(발행) 상태 전환"
                              >
                                <span
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: isBoardExposed ? "#60a5fa" : "#666666",
                                    display: "inline-block",
                                  }}
                                />
                                {isBoardExposed ? <Eye size={13} style={{ color: "#93c5fd" }} /> : <EyeOff size={13} style={{ color: "#777" }} />}
                                <span>게시판 발행: {isBoardExposed ? "ON" : "OFF"}</span>
                              </button>

                              {/* Edit Mode Toggle */}
                              <button
                                type="button"
                                onClick={() => setEditingJournalId(isEditing ? null : post.id)}
                                style={{
                                  background: isEditing ? "#f59e0b" : "#222",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  color: isEditing ? "#000" : "#eee",
                                  padding: "5px 12px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {isEditing ? "수정 접기" : "내용 수정"}
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setJournalDeleteTarget(post);
                                }}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  color: "#f87171",
                                  padding: "5px 11px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  borderRadius: "2px",
                                  transition: "all 0.15s ease",
                                }}
                                title="이 글 삭제"
                              >
                                <Trash2 size={13} />
                                <span>삭제</span>
                              </button>
                            </div>
                          </div>

                          {/* Card Content Display or Edit Mode */}
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>제목</label>
                                  <input
                                    type="text"
                                    value={post.title}
                                    onChange={(e) => handleUpdateJournalPost(post.id, "title", e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>부제목</label>
                                  <input
                                    type="text"
                                    value={post.subtitle || ""}
                                    onChange={(e) => handleUpdateJournalPost(post.id, "subtitle", e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>카테고리</label>
                                  <select
                                    value={post.category || "ESSAY"}
                                    onChange={(e) => handleUpdateJournalPost(post.id, "category", e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "8px 10px",
                                      fontSize: "12px",
                                    }}
                                  >
                                    <option value="ESSAY">ESSAY</option>
                                    <option value="CRITIQUE">CRITIQUE</option>
                                    <option value="NOTE">NOTE</option>
                                    <option value="NEWS">NEWS</option>
                                    <option value="INTERVIEW">INTERVIEW</option>
                                    <option value="ARCHIVE">ARCHIVE</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>날짜</label>
                                  <input
                                    type="text"
                                    value={post.date}
                                    onChange={(e) => handleUpdateJournalPost(post.id, "date", e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>작성자</label>
                                  <input
                                    type="text"
                                    value={post.author || ""}
                                    onChange={(e) => handleUpdateJournalPost(post.id, "author", e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>이미지 링크 (구글 드라이브 / URL)</label>
                                <input
                                  type="text"
                                  value={post.imageUrl || ""}
                                  onChange={(e) => handleUpdateJournalPost(post.id, "imageUrl", e.target.value)}
                                  placeholder="https://..."
                                  style={{
                                    width: "100%",
                                    background: "#080808",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#fff",
                                    padding: "8px 10px",
                                    fontSize: "13px",
                                  }}
                                />
                              </div>

                              {/* Post Tag Management */}
                              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px dashed rgba(255, 255, 255, 0.16)", padding: "12px 14px", borderRadius: "2px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <label style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700, margin: 0 }}>
                                    태그 관리 (Tags) — 태그 클릭 시 관련 글 모아보기 연동
                                  </label>
                                  <span style={{ fontSize: "11px", color: "#888" }}>
                                    현재 등록된 태그 {(post.tags || []).length}개
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: (post.tags || []).length > 0 ? "10px" : "4px" }}>
                                  {(post.tags || []).map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        background: "rgba(245, 158, 11, 0.15)",
                                        border: "1px solid rgba(245, 158, 11, 0.45)",
                                        color: "#f59e0b",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        padding: "3px 8px",
                                        borderRadius: "2px",
                                      }}
                                    >
                                      <span>#{tag}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTagFromJournalPost(post.id, tag)}
                                        style={{
                                          background: "transparent",
                                          border: "none",
                                          color: "#ef4444",
                                          cursor: "pointer",
                                          padding: 0,
                                          fontSize: "12px",
                                          lineHeight: 1,
                                        }}
                                        title="태그 삭제"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                                  {(post.tags || []).length === 0 && (
                                    <span style={{ fontSize: "11px", color: "#666" }}>등록된 태그가 없습니다. 아래에서 태그를 추가해 보세요.</span>
                                  )}
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <input
                                    type="text"
                                    placeholder="새 태그 입력 후 [추가] 또는 엔터 (예: 아카이브, 영화제)"
                                    value={editingPostNewTag[post.id] || ""}
                                    onChange={(e) => setEditingPostNewTag((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddTagToJournalPost(post.id, editingPostNewTag[post.id] || "");
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      background: "#080808",
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      color: "#fff",
                                      padding: "6px 10px",
                                      fontSize: "12px",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddTagToJournalPost(post.id, editingPostNewTag[post.id] || "")}
                                    style={{
                                      background: "#f59e0b",
                                      border: "none",
                                      color: "#000",
                                      fontWeight: 700,
                                      fontSize: "11px",
                                      padding: "7px 14px",
                                      cursor: "pointer",
                                      borderRadius: "2px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    + 태그 추가
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                                  본문 내용 (줄바꿈이 화면에 그대로 반영됩니다)
                                </label>
                                <textarea
                                  rows={6}
                                  value={post.content}
                                  onChange={(e) => handleUpdateJournalPost(post.id, "content", e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "#080808",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#fff",
                                    padding: "10px 12px",
                                    fontSize: "13px",
                                    lineHeight: "1.65",
                                    whiteSpace: "pre-wrap",
                                    fontFamily: "inherit",
                                  }}
                                />
                              </div>

                              {/* Publishing Destinations in Edit Mode */}
                              <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "12px 16px", borderRadius: "2px" }}>
                                <label style={{ display: "block", fontSize: "11px", color: "#f59e0b", marginBottom: "8px", fontWeight: 700 }}>
                                  발행 위치 설정 (메인 화면 / 게시판 페이지 개별 제어)
                                </label>
                                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
                                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: isMainExposed ? "#4ade80" : "#888" }}>
                                    <input
                                      type="checkbox"
                                      checked={isMainExposed}
                                      onChange={(e) => handleUpdateJournalPost(post.id, "visibleOnMain", e.target.checked)}
                                      style={{ accentColor: "#22c55e", width: "15px", height: "15px", cursor: "pointer" }}
                                    />
                                    <span style={{ fontWeight: 600 }}>메인 화면 발행 (노출)</span>
                                  </label>

                                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: isBoardExposed ? "#60a5fa" : "#888" }}>
                                    <input
                                      type="checkbox"
                                      checked={isBoardExposed}
                                      onChange={(e) => handleUpdateJournalPost(post.id, "visibleOnBoard", e.target.checked)}
                                      style={{ accentColor: "#3b82f6", width: "15px", height: "15px", cursor: "pointer" }}
                                    />
                                    <span style={{ fontWeight: 600 }}>게시판 페이지 발행 (노출)</span>
                                  </label>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingJournalId(null);
                                  showToast("저널 게시글 수정이 저장되었습니다.");
                                }}
                                style={{
                                  background: "#f59e0b",
                                  border: "none",
                                  color: "#000",
                                  padding: "8px 18px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  alignSelf: "flex-start",
                                }}
                              >
                                수정 완료 (적용)
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                              {post.imageUrl && (
                                <img
                                  alt=""
                                  src={resolveAssetUrl(post.imageUrl)}
                                  style={{
                                    width: "140px",
                                    height: "90px",
                                    objectFit: "cover",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "2px",
                                    flexShrink: 0,
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
                                  {post.title}
                                </div>
                                {post.subtitle && (
                                  <div style={{ fontSize: "13px", color: "#a0a09c", marginBottom: "8px" }}>
                                    {post.subtitle}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    lineHeight: "1.6",
                                    color: "#888",
                                    whiteSpace: "pre-line",
                                    maxHeight: "78px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {post.content}
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "2px",
                                      background: isMainExposed ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                      color: isMainExposed ? "#4ade80" : "#777",
                                      border: `1px solid ${isMainExposed ? "rgba(34, 197, 94, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                                    }}
                                  >
                                    {isMainExposed ? "● 메인 노출 ON" : "○ 메인 미발행"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "2px",
                                      background: isBoardExposed ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                      color: isBoardExposed ? "#60a5fa" : "#777",
                                      border: `1px solid ${isBoardExposed ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                                    }}
                                  >
                                    {isBoardExposed ? "● 게시판 노출 ON" : "○ 게시판 미발행"}
                                  </span>
                                  {post.author && (
                                    <span style={{ fontSize: "11px", color: "#666", marginLeft: "4px" }}>
                                      작성자: {post.author}
                                    </span>
                                  )}
                                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                                    <div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap", marginLeft: "6px" }}>
                                      {post.tags.map((t, tIdx) => (
                                        <span
                                          key={tIdx}
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            color: "#f59e0b",
                                            background: "rgba(245, 158, 11, 0.12)",
                                            padding: "1px 6px",
                                            borderRadius: "2px",
                                            border: "1px solid rgba(245, 158, 11, 0.3)",
                                          }}
                                        >
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Custom Confirmation Popup: Journal Post Deletion (삭제하시겠습니까 팝업) */}
                {journalDeleteTarget && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-dialog-title"
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 9999,
                      background: "rgba(0, 0, 0, 0.78)",
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "20px",
                    }}
                    onClick={() => setJournalDeleteTarget(null)}
                  >
                    <div
                      style={{
                        background: "#161616",
                        border: "1px solid rgba(239, 68, 68, 0.45)",
                        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.25)",
                        borderRadius: "3px",
                        width: "100%",
                        maxWidth: "480px",
                        padding: "26px 28px",
                        color: "#fff",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ef4444",
                            }}
                          >
                            <Trash2 size={18} />
                          </div>
                          <h3 id="delete-dialog-title" style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#fff" }}>
                            저널 게시글 삭제
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setJournalDeleteTarget(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#888",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="닫기"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Main Message */}
                      <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#eee", lineHeight: 1.5 }}>
                        정말 이 저널 게시글을 <strong>삭제하시겠습니까?</strong>
                      </p>

                      {/* Target Post Preview Box */}
                      <div
                        style={{
                          background: "#0d0d0d",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          padding: "14px 16px",
                          borderRadius: "2px",
                          marginBottom: "16px",
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700, marginBottom: "4px" }}>
                          [{journalDeleteTarget.category || "ESSAY"}] {journalDeleteTarget.date}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {journalDeleteTarget.title}
                        </div>
                        {journalDeleteTarget.subtitle && (
                          <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                            {journalDeleteTarget.subtitle}
                          </div>
                        )}
                      </div>

                      <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#f87171", lineHeight: 1.4 }}>
                        * 삭제 시 메인 화면과 게시판 페이지에서 즉시 제외되며 복구할 수 없습니다.
                      </p>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => setJournalDeleteTarget(null)}
                          style={{
                            background: "#252525",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#ddd",
                            padding: "9px 20px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            borderRadius: "2px",
                          }}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteJournalPost}
                          style={{
                            background: "#dc2626",
                            border: "none",
                            color: "#fff",
                            padding: "9px 22px",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            borderRadius: "2px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                          }}
                        >
                          <Trash2 size={14} />
                          <span>삭제하기</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: ABOUT SECTION */}
          {activeTab === "about" && (
            <div style={{ maxWidth: "860px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 500, margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                    ABOUT 섹션 관리
                  </h2>
                  <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                    회사 소개 국/영문 바이링구얼 문구를 편집합니다. 줄바꿈과 단락 구분이 실시간으로 메인 화면에 반영됩니다.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", padding: "4px 10px", borderRadius: "3px" }}>
                    ✓ 실시간 자동 저장 및 클라우드 동기화
                  </span>
                </div>
              </div>

              <div style={{ background: "#101010", border: "1px solid rgba(255,255,255,0.12)", padding: "28px", marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                    한국어 소개 (Korean)
                  </label>
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    줄바꿈(엔터) 및 빈 줄을 넣으면 메인 화면에서도 그대로 줄바꿈/단락으로 출력됩니다
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={data.about?.ko ?? (INITIAL_CONTENT.about?.ko || "")}
                  onChange={(e) => handleAboutChange("ko", e.target.value)}
                  placeholder="한국어 소개 문구를 입력하세요..."
                  style={{
                    width: "100%",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "14px",
                    fontSize: "14px",
                    lineHeight: "1.7",
                    outline: "none",
                    borderRadius: "2px",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />

                <div style={{ marginTop: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                      영문 소개 (English)
                    </label>
                    <span style={{ fontSize: "11px", color: "#888" }}>
                      Line breaks and paragraphs will be displayed as written
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={data.about?.en ?? (INITIAL_CONTENT.about?.en || "")}
                    onChange={(e) => handleAboutChange("en", e.target.value)}
                    placeholder="Enter English description here..."
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
                      borderRadius: "2px",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#777" }}>
                    * 텍스트를 입력하는 즉시 메인 페이지 ABOUT 섹션과 데이터베이스에 실시간으로 반영됩니다.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSave(data);
                      showToast("ABOUT 섹션 소개 문구가 안전하게 저장되었습니다.");
                    }}
                    style={{
                      background: "#e50914",
                      border: "none",
                      color: "#fff",
                      padding: "8px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    저장 확인
                  </button>
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

          {/* TAB: ANALYTICS & VISITOR STATS (어드민 전용 방문 및 조회수 통계 대시보드) */}
          {activeTab === "analytics" && (
            <div style={{ maxWidth: "1080px" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "28px",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0, letterSpacing: "-0.03em", color: "#ffffff" }}>
                      사이트 방문 및 조회 통계
                    </h2>
                    <span
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid #3b82f6",
                        color: "#93c5fd",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "2px",
                        letterSpacing: "0.06em",
                      }}
                    >
                      ADMIN ONLY
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", color: "#888", fontSize: "13px" }}>
                    관리자 전용 통계 대시보드입니다. 일반 방문자에게는 절대 노출되지 않으며, 실시간 Firestore 및 로컬 캐시와 연동됩니다.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={loadAnalytics}
                    disabled={isLoadingAnalytics}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#1c1c1c",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "#fff",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: isLoadingAnalytics ? "wait" : "pointer",
                      borderRadius: "3px",
                      transition: "all 0.15s ease",
                    }}
                    title="최신 통계 데이터 새로고침"
                  >
                    <RefreshCw size={14} className={isLoadingAnalytics ? "animate-spin" : ""} />
                    <span>{isLoadingAnalytics ? "갱신 중..." : "새로고침"}</span>
                  </button>

                  {analyticsResetConfirm ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const fresh = await resetAnalyticsData();
                          setAnalyticsData(fresh);
                          setAnalyticsResetConfirm(false);
                          setToastMessage("통계 데이터가 성공적으로 초기화되었습니다.");
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        style={{
                          background: "#dc2626",
                          border: "1px solid #ef4444",
                          color: "#fff",
                          padding: "8px 14px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          borderRadius: "3px",
                        }}
                      >
                        정말 초기화
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnalyticsResetConfirm(false)}
                        style={{
                          background: "#222",
                          border: "1px solid #555",
                          color: "#bbb",
                          padding: "8px 10px",
                          fontSize: "11px",
                          cursor: "pointer",
                          borderRadius: "3px",
                        }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnalyticsResetConfirm(true)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#ef4444",
                        padding: "8px 14px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        borderRadius: "3px",
                      }}
                      title="누적된 통계 수치를 0으로 재설정"
                    >
                      통계 초기화
                    </button>
                  )}
                </div>
              </div>

              {/* KPI Cards Grid */}
              {(() => {
                const totalVisits = analyticsData?.totalVisits ?? 0;
                const todayVisits = analyticsData?.todayVisits ?? 0;
                const totalPostViews = Object.values(analyticsData?.postViews ?? {}).reduce((a, b) => a + b, 0);
                const totalFilmViews = Object.values(analyticsData?.filmViews ?? {}).reduce((a, b) => a + b, 0);

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px",
                      marginBottom: "32px",
                    }}
                  >
                    {/* KPI 1: Total Visits */}
                    <div
                      style={{
                        background: "#111111",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        padding: "20px 22px",
                        borderRadius: "4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#93c5fd", letterSpacing: "0.08em" }}>
                          총 누적 방문 수
                        </span>
                        <div style={{ background: "rgba(59, 130, 246, 0.15)", padding: "6px", borderRadius: "4px", color: "#60a5fa" }}>
                          <Users size={16} />
                        </div>
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>
                        {totalVisits.toLocaleString()}
                        <span style={{ fontSize: "14px", fontWeight: 400, color: "#777", marginLeft: "4px" }}>회</span>
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#60a5fa" }}>
                        전체 기기 및 브라우저 세션 합산
                      </div>
                    </div>

                    {/* KPI 2: Today Visits */}
                    <div
                      style={{
                        background: "#111111",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        padding: "20px 22px",
                        borderRadius: "4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#86efac", letterSpacing: "0.08em" }}>
                          오늘 방문 수 (TODAY)
                        </span>
                        <div style={{ background: "rgba(34, 197, 94, 0.15)", padding: "6px", borderRadius: "4px", color: "#4ade80" }}>
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>
                        {todayVisits.toLocaleString()}
                        <span style={{ fontSize: "14px", fontWeight: 400, color: "#777", marginLeft: "4px" }}>회</span>
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#4ade80" }}>
                        오늘 고유 접속 세션
                      </div>
                    </div>

                    {/* KPI 3: Total Journal Views */}
                    <div
                      style={{
                        background: "#111111",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        padding: "20px 22px",
                        borderRadius: "4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#fde047", letterSpacing: "0.08em" }}>
                          저널 글 총 조회수
                        </span>
                        <div style={{ background: "rgba(245, 158, 11, 0.15)", padding: "6px", borderRadius: "4px", color: "#fbbf24" }}>
                          <BookOpen size={16} />
                        </div>
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>
                        {totalPostViews.toLocaleString()}
                        <span style={{ fontSize: "14px", fontWeight: 400, color: "#777", marginLeft: "4px" }}>회</span>
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#fbbf24" }}>
                        전체 저널 게시글 열람 합계
                      </div>
                    </div>

                    {/* KPI 4: Total Film Detail Views */}
                    <div
                      style={{
                        background: "#111111",
                        border: "1px solid rgba(236, 72, 153, 0.3)",
                        padding: "20px 22px",
                        borderRadius: "4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#f472b6", letterSpacing: "0.08em" }}>
                          상영작/프로그램 상세 조회수
                        </span>
                        <div style={{ background: "rgba(236, 72, 153, 0.15)", padding: "6px", borderRadius: "4px", color: "#f472b6" }}>
                          <FilmIcon size={16} />
                        </div>
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>
                        {totalFilmViews.toLocaleString()}
                        <span style={{ fontSize: "14px", fontWeight: 400, color: "#777", marginLeft: "4px" }}>회</span>
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#f472b6" }}>
                        개별 영화 및 프로그램 상세 열람
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 7-Day Visits Visual Trend Chart */}
              {(() => {
                // Generate last 7 days keys
                const days: { dateStr: string; label: string; count: number }[] = [];
                const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
                const now = new Date();

                for (let i = 6; i >= 0; i--) {
                  const target = new Date();
                  target.setDate(now.getDate() - i);
                  const yyyy = target.getFullYear();
                  const mm = String(target.getMonth() + 1).padStart(2, "0");
                  const dd = String(target.getDate()).padStart(2, "0");
                  const dateStr = `${yyyy}-${mm}-${dd}`;
                  const count = analyticsData?.dailyVisits?.[dateStr] ?? 0;
                  const label = `${mm}/${dd} (${dayLabels[target.getDay()]})`;
                  days.push({ dateStr, label, count });
                }

                const maxCount = Math.max(1, ...days.map((d) => d.count));

                return (
                  <div
                    style={{
                      background: "#101010",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      padding: "24px 28px",
                      marginBottom: "32px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#fff" }}>
                          최근 7일 일별 방문자 수 추이
                        </h3>
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#777" }}>
                          일자별 고유 방문자 세션 추세를 시각적으로 확인합니다.
                        </p>
                      </div>
                      <span style={{ fontSize: "11px", color: "#888" }}>
                        최대 일일 방문: <strong style={{ color: "#fff" }}>{maxCount}회</strong>
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        height: "170px",
                        padding: "16px 8px 0",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                        gap: "12px",
                      }}
                    >
                      {days.map((day, idx) => {
                        const heightPct = Math.round((day.count / maxCount) * 100);
                        const isToday = idx === days.length - 1;
                        return (
                          <div
                            key={day.dateStr}
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              height: "100%",
                              justifyContent: "flex-end",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: isToday ? "#4ade80" : "#ffffff",
                                marginBottom: "6px",
                              }}
                            >
                              {day.count}
                            </span>
                            <div
                              style={{
                                width: "100%",
                                maxWidth: "56px",
                                height: `${Math.max(6, heightPct)}%`,
                                background: isToday
                                  ? "linear-gradient(180deg, #22c55e 0%, #15803d 100%)"
                                  : "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                                borderRadius: "3px 3px 0 0",
                                transition: "all 0.3s ease",
                                boxShadow: isToday ? "0 0 10px rgba(34, 197, 94, 0.4)" : "none",
                              }}
                              title={`${day.label}: ${day.count}회 방문`}
                            />
                            <span
                              style={{
                                marginTop: "8px",
                                fontSize: "11px",
                                color: isToday ? "#86efac" : "#888",
                                fontWeight: isToday ? 700 : 400,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Two-Column Ranking Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Left Column: Popular Journal Posts */}
                {(() => {
                  const allPosts = data.journalPosts && data.journalPosts.length > 0
                    ? data.journalPosts
                    : (INITIAL_CONTENT.journalPosts || []);

                  const sortedPosts = [...allPosts].sort((a, b) => {
                    const viewA = analyticsData?.postViews?.[a.id] ?? 0;
                    const viewB = analyticsData?.postViews?.[b.id] ?? 0;
                    return viewB - viewA;
                  });

                  const maxPostView = Math.max(1, ...(sortedPosts.map((p) => analyticsData?.postViews?.[p.id] ?? 0)));

                  return (
                    <div
                      style={{
                        background: "#101010",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "4px",
                        padding: "24px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                          <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                            <BookOpen size={16} color="#fbbf24" />
                            <span>인기 저널 글 조회 순위</span>
                          </h3>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#777" }}>
                            방문자들이 가장 많이 읽은 저널 글 순서입니다.
                          </p>
                        </div>
                        <span style={{ fontSize: "11px", color: "#888" }}>총 {sortedPosts.length}편</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {sortedPosts.map((post, idx) => {
                          const views = analyticsData?.postViews?.[post.id] ?? 0;
                          const ratio = Math.round((views / maxPostView) * 100);
                          const isTop3 = idx < 3;

                          return (
                            <div
                              key={post.id}
                              style={{
                                background: "#0c0c0c",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                padding: "12px 14px",
                                borderRadius: "3px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      width: "22px",
                                      height: "22px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: "2px",
                                      background: isTop3 ? "rgba(245, 158, 11, 0.2)" : "#181818",
                                      color: isTop3 ? "#fbbf24" : "#888",
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: "#f1f1ee",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {post.title}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#777", marginTop: "2px" }}>
                                      {post.category && <span style={{ color: "#aaa" }}>[{post.category}] </span>}
                                      {post.author ? `${post.author} · ` : ""}{post.date}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "rgba(245, 158, 11, 0.12)",
                                    border: "1px solid rgba(245, 158, 11, 0.3)",
                                    color: "#fde047",
                                    padding: "3px 8px",
                                    borderRadius: "2px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  <span>{views.toLocaleString()}</span>
                                  <span style={{ fontSize: "9px", color: "#bbb" }}>회</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${ratio}%`,
                                    height: "100%",
                                    background: isTop3 ? "#f59e0b" : "#4b5563",
                                    borderRadius: "2px",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Right Column: Popular Films & Programs */}
                {(() => {
                  const sortedFilms = [...data.films].sort((a, b) => {
                    const viewA = analyticsData?.filmViews?.[a.id] ?? 0;
                    const viewB = analyticsData?.filmViews?.[b.id] ?? 0;
                    return viewB - viewA;
                  });

                  const maxFilmView = Math.max(1, ...(sortedFilms.map((f) => analyticsData?.filmViews?.[f.id] ?? 0)));

                  return (
                    <div
                      style={{
                        background: "#101010",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "4px",
                        padding: "24px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                          <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FilmIcon size={16} color="#f472b6" />
                            <span>인기 상영작 / 프로그램 순위</span>
                          </h3>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#777" }}>
                            상세 정보가 가장 많이 열람된 상영작 및 프로그램 순서입니다.
                          </p>
                        </div>
                        <span style={{ fontSize: "11px", color: "#888" }}>총 {sortedFilms.length}편</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {sortedFilms.map((film, idx) => {
                          const views = analyticsData?.filmViews?.[film.id] ?? 0;
                          const ratio = Math.round((views / maxFilmView) * 100);
                          const isTop3 = idx < 3;
                          const isProgram = (film.bylinePrefix || "").trim().toUpperCase() === "A PROGRAM BY" || film.directorLabel === "PROGRAMMER";

                          return (
                            <div
                              key={film.id}
                              style={{
                                background: "#0c0c0c",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                padding: "12px 14px",
                                borderRadius: "3px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      width: "22px",
                                      height: "22px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: "2px",
                                      background: isTop3 ? "rgba(236, 72, 153, 0.2)" : "#181818",
                                      color: isTop3 ? "#f472b6" : "#888",
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>

                                  {(film.stillUrl || film.heroImage || film.posterImage) && (
                                    <img
                                      src={resolveAssetUrl(film.stillUrl || film.heroImage || film.posterImage || "")}
                                      alt=""
                                      style={{ width: "38px", height: "26px", objectFit: "cover", borderRadius: "2px", flexShrink: 0 }}
                                    />
                                  )}

                                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: 600,
                                          color: "#f1f1ee",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {film.title}
                                      </span>
                                      {isProgram && (
                                        <span style={{ fontSize: "9px", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "0 4px", borderRadius: "1px" }}>
                                          PROGRAM
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#777", marginTop: "2px" }}>
                                      {film.director || "감독 미상"}{film.year ? ` · ${film.year}` : ""}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "rgba(236, 72, 153, 0.12)",
                                    border: "1px solid rgba(236, 72, 153, 0.3)",
                                    color: "#f472b6",
                                    padding: "3px 8px",
                                    borderRadius: "2px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  <span>{views.toLocaleString()}</span>
                                  <span style={{ fontSize: "9px", color: "#bbb" }}>회</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${ratio}%`,
                                    height: "100%",
                                    background: isTop3 ? "#ec4899" : "#4b5563",
                                    borderRadius: "2px",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Notice */}
              <div
                style={{
                  marginTop: "28px",
                  padding: "14px 18px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                  borderRadius: "3px",
                  fontSize: "12px",
                  color: "#888",
                  lineHeight: 1.6,
                }}
              >
                🔒 <strong>보안 및 개인정보 보호 안내:</strong> 본 통계 시스템은 일반 사용자 화면에 카운터나 로깅 표시를 일절 노출하지 않으며(Zero-UI), 브라우저 세션 기반으로 중복 집계를 방지하여 실제 순수 방문/열람 지표를 제공합니다.
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
