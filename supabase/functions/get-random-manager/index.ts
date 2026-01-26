import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Функция для получения текущей даты/времени по МСК
function getMoscowDateTime() {
  const now = new Date();
  // Конвертируем UTC в МСК (+3 часа)
  const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return moscowTime;
}

// Функция для получения даты начала текущего рабочего дня (6:00 МСК)
function getCurrentWorkingDayStart() {
  const moscowNow = getMoscowDateTime();
  const currentDate = new Date(moscowNow);

  // Если сейчас раньше 6:00, то рабочий день начался вчера в 6:00
  if (moscowNow.getUTCHours() < 6) {
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  }

  return currentDate.toISOString().split('T')[0]; // Возвращаем только дату
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

    // Проверяем нужно ли сбросить счетчики
    const { data: managers } = await supabase
      .from("managers")
      .select("*")
      .eq("is_present", true);

    if (!managers || managers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Нет доступных менеджеров. Выполните синхронизацию с таблицей." }),
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

      // Перечитываем данные после сброса
      const { data: resetManagers } = await supabase
        .from("managers")
        .select("*")
        .eq("is_present", true);

      managers.splice(0, managers.length, ...resetManagers!);
    }

    // Приоритетный выбор менеджера
    let eligibleManagers = [];

    // Приоритет 1: Менеджеры, которые еще не были выбраны сегодня (last_call_successful IS NULL)
    const neverCalled = managers.filter(m => m.last_call_successful === null);
    if (neverCalled.length > 0) {
      const minCount = Math.min(...neverCalled.map(m => m.selection_count_today || 0));
      eligibleManagers = neverCalled.filter(m => (m.selection_count_today || 0) === minCount);
    }

    // Приоритет 2: Менеджеры с недозвоном (last_call_successful = false)
    if (eligibleManagers.length === 0) {
      const unsuccessfulCalls = managers.filter(m => m.last_call_successful === false);
      if (unsuccessfulCalls.length > 0) {
        const minCount = Math.min(...unsuccessfulCalls.map(m => m.selection_count_today || 0));
        eligibleManagers = unsuccessfulCalls.filter(m => (m.selection_count_today || 0) === minCount);
      }
    }

    // Приоритет 3: Менеджеры с дозвоном (last_call_successful = true)
    if (eligibleManagers.length === 0) {
      const successfulCalls = managers.filter(m => m.last_call_successful === true);
      if (successfulCalls.length > 0) {
        const minCount = Math.min(...successfulCalls.map(m => m.selection_count_today || 0));
        eligibleManagers = successfulCalls.filter(m => (m.selection_count_today || 0) === minCount);
      }
    }

    // Если всё равно никого нет (не должно происходить), берем всех
    if (eligibleManagers.length === 0) {
      eligibleManagers = managers;
    }

    // Выбираем случайного из доступных
    const randomIndex = Math.floor(Math.random() * eligibleManagers.length);
    const selectedManager = eligibleManagers[randomIndex];

    // Записываем выбор
    const { data: selection } = await supabase
      .from("manager_selections")
      .insert({ manager_name: selectedManager.name })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        name: selectedManager.name,
        total: managers.length,
        selectionId: selection?.id,
        queuePosition: minCount + 1,
        eligibleCount: eligibleManagers.length
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
