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

    // МНОГОУРОВНЕВАЯ СИСТЕМА КРУГОВ

    // КРУГ 1: В рандом попадают те, кто еще НЕ ВЫБИРАЛСЯ (selection_count = 0)
    let eligibleManagers = managers.filter(m => (m.selection_count_today || 0) === 0);
    let currentRound = 1;

    // Если КРУГ 1 закончился (все выбрались хотя бы раз)
    if (eligibleManagers.length === 0) {
      // КРУГ 2: В рандом попадают ТОЛЬКО те, кого НЕ ОТМЕТИЛИ или НЕДОЗВОН
      eligibleManagers = managers.filter(m =>
        m.last_call_successful === null || m.last_call_successful === false
      );
      currentRound = 2;
    }

    // Если и КРУГ 2 закончился (всех отметили) - ПОЛНЫЙ СБРОС
    if (eligibleManagers.length === 0) {
      await supabase
        .from("managers")
        .update({
          selection_count_today: 0,
          last_call_successful: null
        })
        .eq("is_present", true);

      return new Response(
        JSON.stringify({
          error: "Все круги пройдены! Система полностью сброшена. Нажмите еще раз.",
          resetPerformed: true,
          roundCompleted: 2
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // ВАЖНО: Сразу увеличиваем счетчик выборов (не ждем отметки результата)
    await supabase
      .from("managers")
      .update({
        selection_count_today: (selectedManager.selection_count_today || 0) + 1
      })
      .eq("name", selectedManager.name);

    return new Response(
      JSON.stringify({
        name: selectedManager.name,
        total: managers.length,
        selectionId: selection?.id,
        remainingInPool: eligibleManagers.length - 1
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
