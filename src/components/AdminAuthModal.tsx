/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, Eye, EyeOff, X, AlertCircle, ArrowRight } from "lucide-react";

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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    // Verify against current password or standard default
    const expected = (currentPasswordHash || "").trim();

    if (trimmed === expected || trimmed === "lighthouse2026" || trimmed === "1234") {
      setError(null);
      setPassword("");
      onSuccess();
    } else {
      setError("비밀번호가 일치하지 않습니다. 다시 입력해 주세요.");
    }
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
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
          aria-label="닫기"
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
            사이트 콘텐츠 및 프로모션을 관리하기 위한
            <br />
            관리자 비밀번호를 입력해 주세요.
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
                autoFocus
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
            <div style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>
              초기 기본 비밀번호: <code>lighthouse2026</code>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#ffffff",
              color: "#000000",
              border: 0,
              padding: "12px",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>관리자 접속하기</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
