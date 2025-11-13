import {
  createContext,
  useContext,
  type PropsWithChildren,
  useMemo,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface SupabaseContextValue {
  client: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(
  undefined
);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => ({ client: supabase }), []);
  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx.client;
}
