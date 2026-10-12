require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5174',
    'https://money-kolinchenko.netlify.app',
  ],
  credentials: false,
}));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ============================================================
// РАСХОДЫ (CRUD)
// ============================================================

// Получить расходы (фильтры: ?from=&to=&category=&limit=)
app.get('/api/expenses', async (req, res) => {
  try {
    const { from, to, category, limit } = req.query;
    const cond = [];
    const vals = [];

    if (from) { vals.push(from); cond.push(`date >= $${vals.length}`); }
    if (to) { vals.push(to); cond.push(`date <= $${vals.length}`); }
    if (category) { vals.push(category); cond.push(`category = $${vals.length}`); }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const lim = limit ? `LIMIT ${parseInt(limit)}` : 'LIMIT 200';

    const result = await pool.query(
      `SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC ${lim}`,
      vals
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// Добавить расход + автопополнение словаря
app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, category, description, date, payment_method } = req.body;

    if (!amount || !category) {
      return res.status(400).json({ error: 'amount и category обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO expenses (amount, category, description, date, payment_method)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        amount,
        category,
        description || null,
        date || new Date(),
        payment_method || 'карта'
      ]
    );

    // Автопополнение словаря: слова из описания запоминаем к категории
    if (category && category !== 'Другое' && description) {
      const words = description
        .toLowerCase()
        .replace(/[^а-яёa-z0-9\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length >= 3);

      for (const word of words) {
        await pool.query(
          `INSERT INTO keywords (word, category, hits)
           VALUES ($1, $2, 1)
           ON CONFLICT (word, category) DO UPDATE SET hits = keywords.hits + 1`,
          [word, category]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// Обновить расход
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { amount, category, description, date, payment_method } = req.body;
    const result = await pool.query(
      `UPDATE expenses
       SET amount=$1, category=$2, description=$3, date=$4, payment_method=$5
       WHERE id=$6 RETURNING *`,
      [amount, category, description, date, payment_method || 'карта', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Расход не найден' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// Удалить расход
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ============================================================
// УМНЫЙ ПАРСИНГ СТРОКИ
// ============================================================

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Пустая строка' });
    }

    // 1. Извлекаем сумму (последнее число)
    const numberMatch = text.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб|р)?\s*$/i);
    let amount = null;
    let descriptionText = text.trim();

    if (numberMatch) {
      amount = parseFloat(numberMatch[1].replace(',', '.'));
      descriptionText = text.slice(0, numberMatch.index).trim();
    }

    // 2. Разбиваем описание на слова (от 3 букв)
    const words = descriptionText
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    // 3. Ищем в словаре (побеждает самое популярное)
    let matchedCategory = null;
    let matchedWord = null;
    let confidence = 'low';

    if (words.length > 0) {
      const result = await pool.query(
        `SELECT word, category, hits FROM keywords
         WHERE word = ANY($1)
         ORDER BY hits DESC
         LIMIT 1`,
        [words]
      );

      if (result.rows.length > 0) {
        matchedCategory = result.rows[0].category;
        matchedWord = result.rows[0].word;
        confidence = result.rows[0].hits >= 3 ? 'high' : 'medium';
      }
    }

    res.json({
      amount: amount,
      description: descriptionText || text.trim(),
      category: matchedCategory || 'Другое',
      confidence: confidence,
      matchedWord: matchedWord,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка парсинга' });
  }
});

// ============================================================
// КАТЕГОРИИ
// ============================================================

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// ============================================================
// СТАТИСТИКА
// ============================================================

// Итоги за месяц
app.get('/api/stats/summary', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count,
         COALESCE(AVG(amount), 0) AS avg
       FROM expenses
       WHERE date >= $1 AND date <= $2`,
      [start, end]
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    const total = parseFloat(result.rows[0].total);
    const count = parseInt(result.rows[0].count);
    const avg = parseFloat(result.rows[0].avg);
    const perDay = total / daysInMonth;

    res.json({
      year, month,
      total,
      count,
      avg,
      perDay,
      daysInMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

// Расходы по категориям за месяц
app.get('/api/stats/by-category', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
       FROM expenses
       WHERE date >= $1 AND date <= $2
       GROUP BY category
       ORDER BY total DESC`,
      [start, end]
    );

    res.json(result.rows.map(r => ({
      category: r.category,
      total: parseFloat(r.total),
      count: parseInt(r.count),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

// Расходы по дням месяца
app.get('/api/stats/daily', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT date, SUM(amount) AS total
       FROM expenses
       WHERE date >= $1 AND date <= $2
       GROUP BY date
       ORDER BY date ASC`,
      [start, end]
    );

    res.json(result.rows.map(r => ({
      date: r.date,
      total: parseFloat(r.total),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

// ============================================================
// СЛУЖЕБНОЕ
// ============================================================

// Топ слов в словаре
app.get('/api/keywords/top', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT word, category, hits FROM keywords ORDER BY hits DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Проверка связи
app.get('/api/ping', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, time: r.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Money API запущен на порту ${PORT}`);
});