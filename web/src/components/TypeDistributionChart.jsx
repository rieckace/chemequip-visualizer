import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export function TypeDistributionChart({ typeDistribution }) {
  const labels = Object.keys(typeDistribution || {})
  const values = labels.map((k) => typeDistribution[k])

  if (!labels.length) return null

  const data = {
    labels,
    datasets: [
      {
        label: 'Count',
        data: values,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Equipment Type Distribution' },
    },
  }

  return <Bar options={options} data={data} />
}
