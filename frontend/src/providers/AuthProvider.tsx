import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "../lib/firebaseClient";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    fullName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const token = await nextUser.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const getIdToken = async (forceRefresh = false): Promise<string | null> => {
    if (!firebaseAuth.currentUser) return null;
    const token = await firebaseAuth.currentUser.getIdToken(forceRefresh);
    setIdToken(token);
    return token;
  };

  const signIn = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const signUp = async ({
    email,
    password,
    fullName,
  }: {
    email: string;
    password: string;
    fullName?: string;
  }) => {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );
    if (fullName) {
      await updateProfile(credential.user, { displayName: fullName });
    }
    await credential.user.getIdToken(true);
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      idToken,
      getIdToken,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, idToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
