import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: syncInfo } = await supabase
      .from("sync_info")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const { data: selections } = await supabase
      .from("manager_selections")
      .select("manager_name, is_successful")
      .order("selected_at", { ascending: false });

    const stats: Record<string, { total: number; successful: number }> = {};

    for (const sel of selections || []) {
      if (!stats[sel.manager_name]) {
        stats[sel.manager_name] = { total: 0, successful: 0 };
      }
      stats[sel.manager_name].total++;
      if (sel.is_successful === true) {
        stats[sel.manager_name].successful++;
      }
    }

    const managerStats = Object.entries(stats)
      .map(([name, data]) => ({
        name,
        total: data.total,
        successful: data.successful
      }))
      .sort((a, b) => b.total - a.total);

    return new Response(
      JSON.stringify({
        syncInfo: syncInfo || { last_sync_at: null, managers_count: 0 },
        managerStats
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ошибка" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
