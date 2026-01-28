import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getMoscowDateTime() {
  const now = new Date();
  const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return moscowTime;
}

function getCurrentWorkingDayStart() {
  const moscowNow = getMoscowDateTime();
  const currentDate = new Date(moscowNow);

  if (moscowNow.getUTCHours() < 6) {
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  }

  return currentDate.toISOString().split('T')[0];
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

    const workingDayStart = getCurrentWorkingDayStart();

    const { data: managers } = await supabase
      .from("managers")
      .select("*")
      .eq("is_present", true);

    if (!managers || managers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Нет доступных менеджеров" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Сбрасываем счетчики если нужно
    const needReset = managers.some(m => m.last_reset_date !== workingDayStart);
    if (needReset) {
      await supabase
        .from("managers")
        .update({
          selection_count_today: 0,
          last_reset_date: workingDayStart
        })
        .eq("is_present", true);

      const { data: resetManagers } = await supabase
        .from("managers")
        .select("*")
        .eq("is_present", true);

      managers.splice(0, managers.length, ...resetManagers!);
    }

    // Разделяем по приоритетам
    const neverCalled = managers.filter(m => m.last_call_successful === null);
    const unsuccessfulCalls = managers.filter(m => m.last_call_successful === false);
    const successfulCalls = managers.filter(m => m.last_call_successful === true);

    // Сортируем каждую группу по количеству выборов
    const sortByCount = (a: any, b: any) =>
      (a.selection_count_today || 0) - (b.selection_count_today || 0);

    neverCalled.sort(sortByCount);
    unsuccessfulCalls.sort(sortByCount);
    successfulCalls.sort(sortByCount);

    // Формируем упорядоченную очередь
    const queue = [
      ...neverCalled.map(m => ({
        name: m.name,
        priority: 'Ещё не звонили',
        selectionCount: m.selection_count_today || 0,
        lastCallSuccessful: m.last_call_successful
      })),
      ...unsuccessfulCalls.map(m => ({
        name: m.name,
        priority: 'Недозвон',
        selectionCount: m.selection_count_today || 0,
        lastCallSuccessful: m.last_call_successful
      })),
      ...successfulCalls.map(m => ({
        name: m.name,
        priority: 'Дозвонились',
        selectionCount: m.selection_count_today || 0,
        lastCallSuccessful: m.last_call_successful
      }))
    ];

    return new Response(
      JSON.stringify({ queue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ошибка" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
