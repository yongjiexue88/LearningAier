import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getRuntimeConfig } from "./env.ts";

const runtime = getRuntimeConfig();

export function createSupabaseClient(req: Request): SupabaseClient {
  const accessToken = req.headers.get("Authorization") ?? "";
  return createClient(runtime.supabaseUrl, runtime.supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: accessToken,
      },
    },
  });
}
