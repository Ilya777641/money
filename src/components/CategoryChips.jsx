import { useState } from 'react';

function CategoryChips({ categories, onAdd }) {
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !amount) return;

    await onAdd({
      amount: parseFloat(amount),
      category: selected.name,
      description: description.trim() || null,
      date: new Date().toISOString().slice(0, 10),
    });

    setAmount('');
    setDescription('');
    setSelected(null);
  };

  return (
    <div className="card">
      <h2>⚡ Быстрый выбор категории</h2>

      <div className="chips">
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            className={`chip ${selected?.id === c.id ? 'chip-active' : ''}`}
            style={{
              borderColor: selected?.id === c.id ? c.color : 'transparent',
              background: selected?.id === c.id ? `${c.color}15` : undefined,
            }}
            onClick={() => {
              setSelected(c);
              if (selected?.id === c.id) setSelected(null);
            }}
          >
            <span className="chip-emoji">{c.emoji}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {selected && (
        <form className="chip-form" onSubmit={handleSubmit}>
          <input
            type="number"
            step="0.01"
            placeholder="Сумма, ₽"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          <input
            type="text"
            placeholder="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" className="btn-primary">✅ Добавить</button>
        </form>
      )}
    </div>
  );
}

export default CategoryChips;