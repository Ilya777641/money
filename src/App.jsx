import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from './config';
import QuickInput from './components/QuickInput';
import CategoryChips from './components/CategoryChips';
import ExpenseList from './components/ExpenseList';
import Stats from './components/Stats';
import MonthChart from './components/MonthChart';

function App() {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Загрузка категорий (один раз)
  const loadCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить категории');
    }
  }, []);

  // Загрузка всех данных за выбранный месяц
  const loadMonthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expRes, sumRes, catRes, dayRes] = await Promise.all([
        axios.get(`${API_URL}/expenses?limit=500`),
        axios.get(`${API_URL}/stats/summary?year=${year}&month=${month}`),
        axios.get(`${API_URL}/stats/by-category?year=${year}&month=${month}`),
        axios.get(`${API_URL}/stats/daily?year=${year}&month=${month}`),
      ]);

      // Фильтруем расходы текущего месяца (из общего списка)
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
      const monthExpenses = expRes.data.filter(e => {
        const d = e.date.slice(0, 10);
        return d >= monthStart && d <= monthEnd;
      });

      setExpenses(monthExpenses);
      setSummary(sumRes.data);
      setByCategory(catRes.data);
      setDaily(dayRes.data);
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // Добавить расход (вызывается из QuickInput и CategoryChips)
  const handleAddExpense = async (data) => {
    try {
      await axios.post(`${API_URL}/expenses`, data);
      await loadMonthData();
    } catch (err) {
      console.error(err);
      alert('Ошибка сохранения');
    }
  };

  // Удалить расход
  const handleDeleteExpense = async (id) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      setExpenses(expenses.filter(e => e.id !== id));
      await loadMonthData();
    } catch (err) {
      console.error(err);
      alert('Ошибка удаления');
    }
  };

  // Навигация по месяцам
  const goPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  return (
    <div className="app">
      <header className="app-header">
        <h1>💰 Мои расходы</h1>
        <div className="month-nav">
          <button onClick={goPrevMonth} className="month-btn">←</button>
          <span className="month-label">{monthNames[month - 1]} {year}</span>
          <button onClick={goNextMonth} className="month-btn">→</button>
        </div>
      </header>

      {error && <div className="error-box">❌ {error}</div>}

      <main className="main">
        {/* Быстрый ввод строкой */}
        <QuickInput onAdd={handleAddExpense} />

        {/* Чипы категорий для быстрого выбора */}
        <CategoryChips
          categories={categories}
          onAdd={handleAddExpense}
        />

        {/* Итоги месяца */}
        {summary && <Stats summary={summary} />}

        {/* График по дням */}
        {daily.length > 0 && <MonthChart daily={daily} year={year} month={month} />}

        {/* Топ категорий */}
        {byCategory.length > 0 && (
          <div className="card">
            <h2>📊 Топ категорий</h2>
            <div className="by-category-list">
              {byCategory.map(c => {
                const cat = categories.find(x => x.name === c.category);
                const pct = summary?.total ? (c.total / summary.total * 100) : 0;
                return (
                  <div key={c.category} className="by-cat-row">
                    <div className="by-cat-name">
                      <span>{cat?.emoji || '📦'}</span>
                      <span>{c.category}</span>
                    </div>
                    <div className="by-cat-bar">
                      <div
                        className="by-cat-fill"
                        style={{
                          width: `${pct}%`,
                          background: cat?.color || '#b8935a'
                        }}
                      />
                    </div>
                    <div className="by-cat-amount">
                      {c.total.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Список расходов */}
        <ExpenseList
          expenses={expenses}
          categories={categories}
          onDelete={handleDeleteExpense}
          loading={loading}
        />
      </main>
    </div>
  );
}

export default App;