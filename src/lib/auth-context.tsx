"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import AuthModal from "@/components/auth/AuthModal";

export interface InitialAuth {
  email: string | null;
  verified: boolean;
  wizardSeen: boolean;
}

interface AuthContextValue {
  email: string | null;
  verified: boolean;
  wizardSeen: boolean;
  openAuth: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  email: null,
  verified: false,
  wizardSeen: false,
  openAuth: () => {},
  logout: async () => {},
});

// Auth state arrives server-rendered (layout decodes the session cookie), so
// the first paint is already correct — no loading phase, no /api/auth/me fetch.
export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: InitialAuth;
}) {
  const [email, setEmail] = useState<string | null>(initialAuth.email);
  const [verified, setVerified] = useState(initialAuth.verified);
  const [modalOpen, setModalOpen] = useState(false);

  const openAuth = useCallback(() => setModalOpen(true), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setEmail(null);
    setVerified(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ email, verified, wizardSeen: initialAuth.wizardSeen, openAuth, logout }}
    >
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
