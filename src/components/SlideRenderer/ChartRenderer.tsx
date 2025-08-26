import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartRendererProps {
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  chartData?: any;
  className?: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartType = 'bar', chartData, className }) => {
  const isValid = chartData && Array.isArray(chartData.labels) && Array.isArray(chartData.datasets);
  if (!isValid) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-[var(--secondary-brown)] ${className || ''}`}>
        유효한 차트 데이터가 없습니다
      </div>
    );
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const },
      title: { display: false },
    },
    scales: (chartType === 'doughnut' || chartType === 'pie') ? {} : {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  // const style = { width: '100%', height: '100%' } as const;

  switch (chartType) {
    case 'line':
      return <div className={className} style={{ height: 320 }}><Line data={chartData} options={options} /></div>;
    case 'doughnut':
    case 'pie':
      return <div className={className} style={{ height: 320 }}><Doughnut data={chartData} options={options} /></div>;
    case 'scatter':
      return <div className={className} style={{ height: 320 }}><Scatter data={chartData} options={options} /></div>;
    case 'bar':
    default:
      return <div className={className} style={{ height: 320 }}><Bar data={chartData} options={options} /></div>;
  }
};

export default ChartRenderer;