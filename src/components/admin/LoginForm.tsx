"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        const data = await res.json() as Record<string, any>;
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm mb-2">
          ADMIN LOGIN
        </h1>
        <p className="text-pixel-gray text-xs">
          Authorized personnel only
        </p>
      </div>

      <div className="pixel-border bg-pixel-dark/80 p-6 space-y-4">
        <div>
          <label className="block text-pixel-green text-xs mb-2 font-[family-name:var(--font-pixel-stack)]">
            USER
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pixel-input text-sm"
            placeholder="username"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-pixel-green text-xs mb-2 font-[family-name:var(--font-pixel-stack)]">
            PASS
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pixel-input text-sm"
            placeholder="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p className="text-pixel-pink text-xs font-[family-name:var(--font-pixel-stack)]">
            ! {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full pixel-border bg-pixel-green/10 hover:bg-pixel-green/20 text-pixel-green font-[family-name:var(--font-pixel-stack)] text-xs py-3 transition-colors disabled:opacity-50"
        >
          {loading ? "CONNECTING..." : "[ LOGIN ]"}
        </button>
      </div>

      <div className="text-center">
        <a href="/" className="text-pixel-gray text-xs hover:text-pixel-cyan transition-colors">
          &lt; BACK TO VERSHARE
        </a>
      </div>
    </form>
  );
}
