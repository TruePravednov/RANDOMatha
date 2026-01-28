import { useState, useEffect } from 'react';
import { Shuffle, Phone, PhoneOff } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

function App() {
  const [totalManagers, setTotalManagers] = useState(0);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [animating, setAnimating] = useState(false);
  const [callResultMarked, setCallResultMarked] = useState(false);
  const [markingResult, setMarkingResult] = useState(false);

  useEffect(() => {
    const randomText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(randomText);
  }, []);

  const handleShuffle = async () => {
    setLoading(true);
    setAnimating(true);
    setError(null);
    setCallResultMarked(false);

    const newText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(newText);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-random-manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при получении менеджера');
      }

      const data = await response.json();

      setTimeout(() => {
        setSelectedManager(data.name);
        setSelectionId(data.selectionId);
        setTotalManagers(data.total);
        setAnimating(false);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to get random manager:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при выборе менеджера');
      setAnimating(false);
      setLoading(false);
    }
  };

  const markCallResult = async (isSuccessful: boolean) => {
    if (!selectionId) return;

    setMarkingResult(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/mark-call-result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectionId,
          isSuccessful
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при отметке результата');
      }

      setCallResultMarked(true);
    } catch (err) {
      console.error('Failed to mark call result:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении результата');
    } finally {
      setMarkingResult(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">🎰 Рандомайзер Менеджеров</h1>

          {totalManagers > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              Менеджеров в базе: <span className="font-bold">{totalManagers}</span>
            </div>
          )}

          {(selectedManager || animating) && (
            <div className="mb-6">
              <div className={`p-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl transition-all duration-500 ${animating ? 'scale-105 animate-pulse' : 'scale-100'}`}>
                <p className="text-blue-100 text-sm mb-3">Выбран:</p>
                <p className={`text-4xl font-bold text-white transition-all duration-300 ${animating ? 'blur-sm' : 'blur-0'}`}>
                  {animating ? '???' : selectedManager}
                </p>
              </div>

              {!animating && !callResultMarked && selectedManager && (
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => markCallResult(true)}
                    disabled={markingResult}
                    className="flex-1 py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    <Phone size={24} />
                    {markingResult ? 'Сохраняем...' : 'Дозвонились ✓'}
                  </button>
                  <button
                    onClick={() => markCallResult(false)}
                    disabled={markingResult}
                    className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    <PhoneOff size={24} />
                    {markingResult ? 'Сохраняем...' : 'Не дозвонились ✗'}
                  </button>
                </div>
              )}

              {callResultMarked && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium">
                  ✓ Результат сохранен
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleShuffle}
            disabled={loading || animating || markingResult}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            <Shuffle className={loading || animating ? 'animate-spin' : ''} size={28} />
            {loading || animating ? 'Крутим барабан...' : buttonText}
          </button>

          <div className="mt-6 text-xs text-gray-500">
            Умная очередь с приоритетами • База данных Supabase
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
