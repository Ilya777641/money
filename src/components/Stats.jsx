function Stats({ summary }) {
  const { total, count, avg, perDay } = summary;

  return (
    <div className="stats-row">
      <div className="stat-card stat-primary">
        <div className="stat-value">{total.toLocaleString('ru-RU')} ₽</div>
        <div className="stat-label">Потрачено</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{count}</div>
        <div className="stat-label">Трат</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{avg.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</div>
        <div className="stat-label">Средний чек</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{perDay.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</div>
        <div className="stat-label">В день</div>
      </div>
    </div>
  );
}

export default Stats;