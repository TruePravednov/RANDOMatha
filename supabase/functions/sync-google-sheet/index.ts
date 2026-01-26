import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SPREADSHEET_ID = "15_rKGMjb7pamSu2dscRPzV-j17JdCP_ahJqGnafut0Q";
const HEADER_ROWS = 3;

interface ManagerFromSheet {
  name: string;
  isPresent: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error("Не удалось загрузить таблицу");
    }

    const csvText = await response.text();
    const lines = csvText.split("\n").filter((line) => line.trim());

    const managersFromSheet: ManagerFromSheet[] = [];

    for (let i = HEADER_ROWS; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split(",").map((c) => c.trim().replace(/"/g, "").replace(/\r/g, ""));

      const name = cells[1];
      const attendance = cells[2];

      if (
        name &&
        name.length > 2 &&
        !name.match(/^\d+$/) &&
        !name.startsWith("КМ ") &&
        name !== "№" &&
        attendance?.toLowerCase() === "да"
      ) {
        managersFromSheet.push({
          name: name.trim(),
          isPresent: true
        });
      }
    }

    await supabase
      .from("managers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const managersToInsert = managersFromSheet.map(m => ({
      name: m.name,
      is_present: true
    }));

    await supabase
      .from("managers")
      .insert(managersToInsert);

    const added = managersToInsert.length;
    const presentCount = managersToInsert.length;

    await supabase
      .from("sync_info")
      .upsert({
        id: 1,
        last_sync_at: new Date().toISOString(),
        managers_count: presentCount
      });

    return new Response(
      JSON.stringify({
        success: true,
        totalInSheet: managersFromSheet.length,
        presentCount,
        added
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
