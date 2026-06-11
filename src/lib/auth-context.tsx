"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AuthModal from "@/components/auth/AuthModal";

interface AuthContextValue {
  email: string | null;
  verified: boolean;
  loading: boolean;
  openAuth: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  email: null,
  verified: false,
  loading: true,
  openAuth: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Record<string, any>) : null))
      .then((data) => {
        if (data?.email) {
          setEmail(data.email);
          setVerified(data.emailVerified === true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAuth = useCallback(() => setModalOpen(true), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setEmail(null);
    setVerified(false);
  }, []);

  return (
    <AuthContext.Provider value={{ email, verified, loading, openAuth, logout }}>
      {children}
      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAuth={(authedEmail, isVerified) => {
          setEmail(authedEmail);
          setVerified(isVerified);
        }}
        initialEmail={email}
        initialStep={email && !verified ? "verify" : "credentials"}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
