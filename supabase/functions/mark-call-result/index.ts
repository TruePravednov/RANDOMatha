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

    const { selectionId, isSuccessful } = await req.json();

    if (!selectionId) {
      return new Response(
        JSON.stringify({ error: "selectionId обязателен" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем имя менеджера из выбора
    const { data: selection, error: selectError } = await supabase
      .from("manager_selections")
      .select("manager_name")
      .eq("id", selectionId)
      .single();

    if (selectError || !selection) {
      throw new Error("Выбор не найден");
    }

    // Обновляем запись о выборе
    const { error } = await supabase
      .from("manager_selections")
      .update({
        is_successful: isSuccessful,
        marked_at: new Date().toISOString()
      })
      .eq("id", selectionId);

    if (error) {
      throw error;
    }

    // Обновляем менеджера: ТОЛЬКО сохраняем результат последнего звонка
    // (счетчик уже увеличен при выборе)
    await supabase
      .from("managers")
      .update({
        last_call_successful: isSuccessful
      })
      .eq("name", selection.manager_name);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ошибка" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
