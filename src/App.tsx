import { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';

const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/15_rKGMjb7pamSu2dscRPzV-j17JdCP_ahJqGnafut0Q/export?format=csv&gid=0';

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
  const [managers, setManagers] = useState<string[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [animating, setAnimating] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    const loadManagers = async () => {
      try {
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        
        const lines = csvText.split('\n');
        const managerNames: string[] = [];
        
        for (let i = 3; i < lines.length; i++) {
          const columns = lines[i].split(',');
          if (columns.length > 1 && columns[1].trim()) {
            const name = columns[1].trim().replace(/"/g, '');
            if (name && name !== 'КМ' && name.length > 2) {
              managerNames.push(name);
            }
          }
        }
        
        console.log('Loaded managers:', managerNames);
        setManagers(managerNames);
      } catch (err) {
        console.error('Failed to load managers:', err);
        setError('Ошибка загрузки данных');
      }
    };

    loadManagers();
    const randomText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(randomText);
  }, []);

  const handleShuffle = () => {
    if (managers.length === 0) {
      setError('Список менеджеров пуст');
      return;
    }

    setLoading(true);
    setAnimating(true);
    setError(null);

    const newText = BUTTON_TEXTS[Math.floor(Math.random() * BUTTON_TEXTS.length)];
    setButtonText(newText);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * managers.length);
      setSelectedManager(managers[randomIndex]);
      setAnimating(false);
      setLoading(false);
    }, 1000);
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
    } else {
      setCodeError('Неверный код доступа');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">🎰 Рандомайзер Менеджеров</h1>
          
          <div className="mb-4 text-sm text-gray-600">
            Загружено менеджеров: <span className="font-bold">{managers.length}</span>
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
            disabled={loading || animating || managers.length === 0}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            <Shuffle className={loading || animating ? 'animate-spin' : ''} size={28} />
            {loading || animating ? 'Крутим барабан...' : buttonText}
          </button>

          <div className="flex gap-3 mt-4">
            <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
              <span>☎️</span>
              Дозвонились ✓
            </button>
            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
              <span>✕</span>
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
              <div className="space-y-2">
                {managers.map((manager, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg text-left flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-700">
                      #{index + 1} {manager}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            Данные загружаются из Google Таблицы
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
