function ExpenseList({ expenses, categories, onDelete, loading }) {
  if (loading) {
    return <div className="card"><p>⏳ Загрузка...</p></div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="card empty-state">
        <p>Пока нет трат в этом месяце</p>
        <p className="empty-hint">Добавь первую через строку выше ↑</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="card">
      <h2>📋 Последние траты</h2>
      <div className="expense-list">
        {expenses.map(e => {
          const cat = categories.find(c => c.name === e.category);
          return (
            <div key={e.id} className="expense-item">
              <div
                className="expense-emoji"
                style={{ background: `${cat?.color || '#b8935a'}15` }}
              >
                {cat?.emoji || '📦'}
              </div>
              <div className="expense-info">
                <div className="expense-desc">
                  {e.description || e.category}
                </div>
                <div className="expense-meta">
                  {formatDate(e.date)} · {e.category}
                </div>
              </div>
              <div className="expense-amount">
                {parseFloat(e.amount).toLocaleString('ru-RU')} ₽
              </div>
              <button
                className="expense-delete"
                onClick={() => onDelete(e.id)}
                title="Удалить"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExpenseList;