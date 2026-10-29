/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, X, AlertCircle, CheckCircle, Cloud, Loader2 } from "lucide-react";
import { auth, googleProvider } from "../firebase.ts";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";

interface AdminAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
  currentPasswordHash: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  currentPasswordHash,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      const res = await signInWithPopup(auth, googleProvider);
      const email = res.user.email?.toLowerCase();
      if (email === "itsuen@gmail.com") {
        onSuccess();
      } else {
        setError(`승인되지 않은 계정입니다 (${email || "이메일 없음"}). itsuen@gmail.com 계정으로 로그인해 주세요.`);
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err?.message || "Google 로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === currentPasswordHash) {
      setError(null);
      setPassword("");
      onSuccess();
    } else {
      setError("비밀번호가 일치하지 않습니다. 다시 입력해 주세요.");
    }
  };

  const isVerifiedAdmin = currentUser?.email?.toLowerCase() === "itsuen@gmail.com";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#141414",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "36px 32px",
          color: "#f1f1ee",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: 0,
            color: "#888",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <Lock size={20} color="#f59e0b" />
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            LIGHTHOUSE 관리자 인증
          </h2>
          <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: 1.5 }}>
            다른 브라우저 및 모바일 환경과 실시간 동기화되는
            <br />
            클라우드 데이터베이스 권한이 필요합니다.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "12px",
              padding: "10px 14px",
              marginBottom: "18px",
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* If already signed in with verified Google Admin account */}
        {isVerifiedAdmin ? (
          <div
            style={{
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              padding: "16px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#4ade80", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              <CheckCircle size={16} />
              <span>Google 관리자 인증 완료</span>
            </div>
            <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "14px" }}>
              {currentUser?.email} (클라우드 동기화 활성)
            </div>
            <button
              type="button"
              onClick={onSuccess}
              style={{
                width: "100%",
                background: "#22c55e",
                color: "#052e16",
                border: 0,
                padding: "11px",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              관리자 페이지 바로 열기
            </button>
          </div>
        ) : (
          /* Google Sign In Button */
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#4ade80",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginBottom: "8px",
              }}
            >
              <Cloud size={13} />
              <span>추천: 모바일 및 다중 기기 실시간 동기화 인증</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              style={{
                width: "100%",
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                padding: "12px 16px",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: isGoogleLoading ? "wait" : "pointer",
                borderRadius: "2px",
                transition: "opacity 0.2s",
                opacity: isGoogleLoading ? 0.7 : 1,
              }}
            >
              {isGoogleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
              )}
              Google 계정으로 관리자 로그인
            </button>
            <div style={{ fontSize: "11px", color: "#777", marginTop: "6px", textAlign: "center" }}>
              관리자 계정: <span style={{ color: "#aaa" }}>itsuen@gmail.com</span>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
          <span style={{ fontSize: "11px", color: "#666", letterSpacing: "0.08em" }}>또는 비밀번호 인증</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
        </div>

        <form onSubmit={handleSubmitPassword}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "#aaa",
                marginBottom: "8px",
              }}
            >
              관리자 비밀번호
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호 입력 (기본: lighthouse2026)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                style={{
                  width: "100%",
                  background: "#080808",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#fff",
                  padding: "12px 42px 12px 14px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  color: "#777",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#333",
              color: "#eee",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "11px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
          >
            비밀번호로 접속
          </button>
        </form>
      </div>
    </div>
  );
};
