import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useCalculatorState } from '../../context/CalculatorContext.jsx';
import { calculateIncome } from '../../logic/calculator.js';
import { formatCurrencyPhone } from '../../utils/format.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FYP_POINTS = [10, 25, 45, 70, 100];
const LABELS = ['10tr', '25tr', '45tr', '70tr', '100tr'];

export default function GrowthChart() {
  const state = useCalculatorState();

  const chartData = useMemo(() => {
    const dataPoints = FYP_POINTS.map(p => calculateIncome(state, p).total);
    return {
      labels: LABELS,
      datasets: [
        {
          label: 'Thu nhập',
          data: dataPoints,
          borderColor: '#34d399',
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(52,211,153,0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
            gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');
            return gradient;
          },
          borderWidth: 3,
          pointBackgroundColor: '#0f172a',
          pointBorderColor: '#34d399',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [state]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => formatCurrencyPhone(context.raw) + ' ₫',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.02)', borderDash: [4, 4] },
        ticks: { color: 'rgba(226,232,240,0.6)', callback: (val) => val + 'M' },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(226,232,240,0.6)' },
      },
    },
  }), []);

  return (
    <div id="incomeChart" className="relative w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
