import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function MonthChart({ daily, year, month }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  const values = [];

  const byDate = {};
  daily.forEach(d => {
    const day = parseInt(d.date.slice(8, 10));
    byDate[day] = d.total;
  });

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i.toString());
    values.push(byDate[i] || 0);
  }

  const data = {
    labels: days,
    datasets: [
      {
        label: 'Расходы, ₽',
        data: values,
        backgroundColor: 'rgba(107, 31, 46, 0.65)',
        hoverBackgroundColor: '#6b1f2e',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2a1f1a',
        titleColor: '#faf6ee',
        bodyColor: '#faf6ee',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => `${items[0].label} число`,
          label: (ctx) => `${ctx.parsed.y.toLocaleString('ru-RU')} ₽`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#7a6a5c', font: { size: 11 } },
        grid: { color: 'rgba(184, 147, 90, 0.15)' },
      },
      x: {
        ticks: { color: '#7a6a5c', font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="card">
      <h2>📈 Расходы по дням</h2>
      <div className="chart-wrap">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

export default MonthChart;