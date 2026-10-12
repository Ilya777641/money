import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

function QuickInput({ onAdd }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [categories, setCategories] = useState([]);
  const [overriding, setOverriding] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Загружаем категории один раз (для селекта переопределения)
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Debounced парсинг при вводе
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!text.trim()) {
      setParsed(null);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        setParsed(data);
      } catch {
        setParsed(null);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [text]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsed || !parsed.amount) {
      alert('Не могу распознать сумму. Пример: "минеральная вода 50"');
      return;
    }

    setLoading(true);
    await onAdd({
      amount: parsed.amount,
      category: overriding ? overrideCategory : parsed.category,
      description: parsed.description,
      date: new Date().toISOString().slice(0, 10),
    });

    setText('');
    setParsed(null);
    setOverriding(false);
    setOverrideCategory('');
    setLoading(false);
  };

  const catInfo = categories.find(c => c.name === (overriding ? overrideCategory : parsed?.category));

  return (
    <form className="card quick-input" onSubmit={handleSubmit}>
      <h2>➕ Что потратил?</h2>
      <input
        type="text"
        className="quick-input-field"
        placeholder="минеральная вода 50"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOverriding(false);
        }}
        autoFocus
      />

      {parsed && parsed.amount && (
        <div className={`parsed-preview confidence-${parsed.confidence}`}>
          <div className="parsed-info">
            <span className="parsed-emoji">{catInfo?.emoji || '📦'}</span>
            <div>
              <div className="parsed-category">
                {overriding ? overrideCategory : parsed.category}
              </div>
              <div className="parsed-desc">{parsed.description}</div>
            </div>
            <div className="parsed-amount">{parsed.amount.toLocaleString('ru-RU')} ₽</div>
          </div>

          {parsed.confidence === 'low' && !overriding && (
            <div className="parsed-hint">
              ⚠️ Не уверен в категории — уточни:
            </div>
          )}

          <div className="parsed-actions">
            {!overriding ? (
              <>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Сохраняю...' : '✅ Добавить'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setOverriding(true);
                    setOverrideCategory(parsed.category);
                  }}
                >
                  ✏️ Изменить категорию
                </button>
              </>
            ) : (
              <>
                <select
                  className="category-select"
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Сохраняю...' : '✅ Добавить'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {text && !parsed?.amount && (
        <div className="parsed-hint">
          💡 В конце строки укажи сумму: «{text} 100»
        </div>
      )}
    </form>
  );
}

export default QuickInput;