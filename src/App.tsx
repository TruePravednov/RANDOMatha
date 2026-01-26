import { useState, useEffect } from 'react';
import { Shuffle, Check, X, RefreshCw, Clock, Users, BarChart3, Download } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// DEBUG: Check if environment variables are loaded
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('WARNING: Supabase environment variables not configured. Using placeholder values.');
}

const BUTTON_TEXTS = [
  "Покемон, я выбираю тебя!",
  "Найти крайнего",
  "FINISH HIM!",
  "Принести в жертву",
  "Избранный",
  "Во имя Рандома",
  "Git Blame",
  "Система наведения",
  "Крутите барабан!",
  "Ты водишь!"
];

const MOCK_MANAGERS = [
  "Александр",
  "Мария",
  "Дмитрий",
  "Елена",
  "Иван",
  "Ольга",
  "Сергей",
  "Анна",
  "Михаил",
  "Татьяна"
];

interface SyncInfo {
  last_sync_at: string | null;
  managers_count: number;
}

interface ManagerStat {
  name: string;
  total: number;
  successful: number;
}

interface Selection {
  name: string;
  selectionId: string;
  total: number;
}

const headers = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

function App() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [managerStats, setManagerStats] = useState<ManagerStat[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [marked, setMarked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [animating, setAnimating] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-stats`, { headers });
      const data = await response.json();
      if (!data.error) {
        setSyncInfo(data.syncInfo);
        setManagerStats(data.managerStats);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
    const randomText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(randomText);
  }, []);

  const getRandomManager = async () => {
    setLoading(true);
    setAnimating(true);
    setError(null);
    setMarked(false);

    // Меняем текст кнопки на случайный
    const newText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(newText);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-random-manager`, { headers });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTimeout(() => {
        setSelection({
          name: data.name,
          selectionId: data.selectionId,
          total: data.total
        });
        setSyncInfo(prev => prev ? { ...prev, managers_count: data.total } : { last_sync_at: new Date().toISOString(), managers_count: data.total });
        setAnimating(false);
      }, 1000);
    } catch (err) {
      // Fallback to mock data when Supabase is not available
      console.log('Using fallback mock data');
      const randomManager = MOCK_MANAGERS[Math.floor(Math.random() * MOCK_MANAGERS.length)];
      setTimeout(() => {
        setSelection({
          name: randomManager,
          selectionId: 'mock-' + Date.now(),
          total: MOCK_MANAGERS.length
        });
        setSyncInfo(prev => prev ? { ...prev, managers_count: MOCK_MANAGERS.length } : { last_sync_at: null, managers_count: MOCK_MANAGERS.length });
        setAnimating(false);
      }, 1000);
    }

    setLoading(false);
  };

  const markResult = async (isSuccessful: boolean) => {
    if (!selection?.selectionId || marked) return;

    setMarking(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/mark-call-result`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          selectionId: selection.selectionId,
          isSuccessful
        })
      });
      setMarked(true);
      fetchStats();
    } catch {
      // ignore
    }
    setMarking(false);
  };

  const syncWithGoogleSheet = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-google-sheet`, { headers });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка синхронизации');
    }

    setSyncing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              <span className="text-sm">
                Синхр: <span className="font-medium">{formatDate(syncInfo?.last_sync_at || null)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users size={18} className="text-green-400" />
              <span className="text-sm">
                Менеджеров: <span className="font-medium">{syncInfo?.managers_count || 0}</span>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={syncWithGoogleSheet}
              disabled={syncing}
              className="px-3 py-2 hover:bg-white/10 disabled:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-sm"
              title="Синхронизировать с Google Sheets"
            >
              <Download size={16} className={syncing ? 'animate-bounce' : ''} />
              {syncing ? 'Синхр...' : 'Синхр. с таблицей'}
            </button>
            <button
              onClick={fetchStats}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Обновить данные"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">Рандомайзер менеджеров</h1>

          {(selection || animating) && (
            <div className="mb-8">
              <div className={`p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-4 transition-all duration-500 ${animating ? 'scale-105 animate-pulse' : 'scale-100'}`}>
                <p className="text-blue-100 text-sm mb-2">Выбран:</p>
                <p className={`text-3xl font-bold text-white transition-all duration-300 ${animating ? 'blur-sm' : 'blur-0'}`}>
                  {animating ? '???' : selection?.name}
                </p>
              </div>

              {!marked ? (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => markResult(true)}
                    disabled={marking}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-xl transition-colors"
                  >
                    <Check size={20} />
                    Дозвонился
                  </button>
                  <button
                    onClick={() => markResult(false)}
                    disabled={marking}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-xl transition-colors"
                  >
                    <X size={20} />
                    Не берет
                  </button>
                </div>
              ) : (
                <p className="text-green-600 font-medium">Результат записан</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={getRandomManager}
            disabled={loading || animating}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
          >
            <Shuffle className={loading || animating ? 'animate-spin' : ''} size={24} />
            {loading || animating ? 'Крутим барабан...' : buttonText}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 size={24} className="text-blue-600" />
              <span className="font-semibold text-gray-800">Статистика выборов</span>
            </div>
            <span className="text-gray-400">{showStats ? '−' : '+'}</span>
          </button>

          {showStats && (
            <div className="border-t">
              {managerStats.length === 0 ? (
                <p className="p-6 text-center text-gray-500">Пока нет данных</p>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {managerStats.map((stat) => (
                    <div key={stat.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <span className="font-medium text-gray-800">{stat.name}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          Выбран: <span className="font-semibold text-gray-700">{stat.total}</span>
                        </span>
                        <span className="text-green-600">
                          Успешно: <span className="font-semibold">{stat.successful}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
