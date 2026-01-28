import { useState, useEffect } from 'react';
import { Shuffle, CheckCircle, XCircle } from 'lucide-react';
import { FUNCTIONS_URL } from './supabaseClient';

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

interface QueueItem {
  name: string;
  priority: string;
  selectionCount: number;
  lastCallSuccessful: boolean | null;
}

function App() {
  const [managersCount, setManagersCount] = useState<number>(0);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [animating, setAnimating] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [markingResult, setMarkingResult] = useState(false);

  useEffect(() => {
    const randomText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(randomText);
  }, []);

  const handleShuffle = async () => {
    setLoading(true);
    setAnimating(true);
    setError(null);

    const newText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(newText);

    try {
      const response = await fetch(`${FUNCTIONS_URL}/get-random-manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка выбора менеджера');
      }

      const data = await response.json();

      setTimeout(() => {
        setSelectedManager(data.name);
        setSelectionId(data.selectionId);
        setManagersCount(data.total);
        setAnimating(false);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to get random manager:', err);
      setError(err instanceof Error ? err.message : 'Ошибка выбора менеджера');
      setAnimating(false);
      setLoading(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMarkResult = async (isSuccessful: boolean) => {
    if (!selectionId) {
      setError('Сначала выберите менеджера');
      return;
    }

    setMarkingResult(true);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/mark-call-result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectionId,
          isSuccessful,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка записи результата');
      }

      showNotification('✓ Данные записаны');
      setSelectionId(null);

      if (showQueue) {
        loadQueue();
      }
    } catch (err) {
      console.error('Failed to mark result:', err);
      setError(err instanceof Error ? err.message : 'Ошибка записи результата');
    } finally {
      setMarkingResult(false);
    }
  };

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/get-queue`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки очереди');
      }

      const data = await response.json();
      setQueue(data.queue || []);
    } catch (err) {
      console.error('Failed to load queue:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки очереди');
    } finally {
      setQueueLoading(false);
    }
  };

  const toggleQueue = () => {
    if (showQueue) {
      setShowQueue(false);
      setShowCodeInput(false);
      setCodeInput('');
      setCodeError('');
    } else {
      setShowCodeInput(true);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput === '7610') {
      setShowQueue(true);
      setShowCodeInput(false);
      setCodeInput('');
      setCodeError('');
      loadQueue();
    } else {
      setCodeError('Неверный код доступа');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {notification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {notification}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">🎰 Рандомайзер Менеджеров</h1>

          <div className="mb-4 text-sm text-gray-600">
            Всего менеджеров: <span className="font-bold">{managersCount || '—'}</span>
          </div>

          {(selectedManager || animating) && (
            <div className="mb-8">
              <div className={`p-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl transition-all duration-500 ${animating ? 'scale-105 animate-pulse' : 'scale-100'}`}>
                <p className="text-blue-100 text-sm mb-3">Выбран:</p>
                <p className={`text-4xl font-bold text-white transition-all duration-300 ${animating ? 'blur-sm' : 'blur-0'}`}>
                  {animating ? '???' : selectedManager}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleShuffle}
            disabled={loading || animating}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            <Shuffle className={loading || animating ? 'animate-spin' : ''} size={28} />
            {loading || animating ? 'Крутим барабан...' : buttonText}
          </button>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleMarkResult(true)}
              disabled={!selectionId || markingResult}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle size={20} />
              Дозвонились
            </button>
            <button
              onClick={() => handleMarkResult(false)}
              disabled={!selectionId || markingResult}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <XCircle size={20} />
              Не дозвонились
            </button>
          </div>

          <button 
            onClick={toggleQueue}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg mt-3 flex items-center justify-center gap-2"
          >
            <span>📋</span>
            {showQueue ? 'Скрыть очередь' : 'Показать очередь'}
          </button>

          {showCodeInput && (
            <form onSubmit={handleCodeSubmit} className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Введите код доступа"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  OK
                </button>
              </div>
              {codeError && (
                <p className="mt-2 text-sm text-red-600">{codeError}</p>
              )}
            </form>
          )}

          {showQueue && (
            <div className="mt-6 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Очередь менеджеров</h3>

              {queueLoading ? (
                <div className="py-8 text-gray-500">Загрузка...</div>
              ) : queue.length === 0 ? (
                <div className="py-8 text-gray-500">Очередь пуста</div>
              ) : (
                <div className="space-y-2">
                  {queue.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-left flex items-center justify-between ${
                        item.priority === 'Ещё не звонили'
                          ? 'bg-blue-50 border border-blue-200'
                          : item.priority === 'Недозвон'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          #{index + 1} {item.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.priority} • Выбран сегодня: {item.selectionCount} раз
                        </div>
                      </div>
                      <div className="ml-2">
                        {item.lastCallSuccessful === null ? (
                          <span className="text-2xl">❓</span>
                        ) : item.lastCallSuccessful ? (
                          <CheckCircle className="text-green-500" size={24} />
                        ) : (
                          <XCircle className="text-red-500" size={24} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            Система использует базу данных Supabase
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
