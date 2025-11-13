import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // TODO: enforce this once envs are configured in all environments.
  console.warn(
    [
      "Supabase environment variables are missing.",
      "Create a `.env.local` (based on `.env.example`) with:",
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
    ].join(" ")
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
