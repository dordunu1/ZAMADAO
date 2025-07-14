// @ts-ignore: recharts types may not be available
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import React, { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';

// DiceBear Avatars API
const getDiceBearAvatar = (address: string) =>
  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${address}`;

interface Vote {
  address: string;
  timestamp: number; // Unix timestamp (ms)
}

interface VotersLeaderboardProps {
  votes: Vote[];
  eligibleVoters?: number;
}

const COLORS = ['#6366F1', '#F59E42', '#10B981'];

const VotersLeaderboard: React.FC<VotersLeaderboardProps> = ({ votes, eligibleVoters }) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  // Defensive: filter out invalid votes
  const validVotes = Array.isArray(votes)
    ? votes.filter(vote => typeof vote.address === 'string' && vote.address.length >= 10 && typeof vote.timestamp === 'number')
    : [];
  const totalVoters = validVotes.length;
  const participationRate = eligibleVoters ? Math.round((totalVoters / eligibleVoters) * 100) : null;

  // Pagination logic
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(validVotes.length / pageSize);
  const paginatedVotes = validVotes.slice(page * pageSize, (page + 1) * pageSize);

  // Chart data for bar/pie
  const chartData = [
    { name: 'Voted', value: totalVoters },
    eligibleVoters ? { name: 'Not Voted', value: Math.max(eligibleVoters - totalVoters, 0) } : null
  ].filter(Boolean) as { name: string; value: number }[];

  // Line chart data: cumulative votes over time
  const lineChartData = useMemo(() => {
    if (!validVotes.length) return [];
    // Sort votes by timestamp
    const sorted = [...validVotes].sort((a, b) => a.timestamp - b.timestamp);
    let cumulative = 0;
    return sorted.map((vote, idx) => {
      cumulative = idx + 1;
      return {
        time: vote.timestamp ? new Date(vote.timestamp).toLocaleString() : `Vote ${idx + 1}`,
        cumulativeVotes: cumulative,
      };
    });
  }, [validVotes]);

  return (
    <div className="bg-white/90 dark:bg-card-dark/90 border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama space-y-8">
      <h2 className="text-xl font-semibold mb-6 text-accent dark:text-text-primary-dark">Voters Leaderboard</h2>
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-border-dark">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVotes.map((vote) => (
              <tr key={vote.address} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition">
                <td className="px-4 py-2">
                  <img
                    src={getDiceBearAvatar(vote.address)}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-border-dark"
                  />
                </td>
                <td className="px-4 py-2 font-mono text-accent dark:text-text-primary-dark">
                  {vote.address.slice(0, 6) + '...' + vote.address.slice(-4)}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success border border-success/30 rounded-xl text-xs font-medium">
                    <CheckCircle size={14} /> Voted
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              className="px-3 py-1 rounded border border-zama-light-orange dark:border-border-dark bg-white dark:bg-surface-dark text-accent dark:text-text-primary-dark disabled:opacity-50"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-accent dark:text-text-primary-dark">Page {page + 1} of {totalPages}</span>
            <button
              className="px-3 py-1 rounded border border-zama-light-orange dark:border-border-dark bg-white dark:bg-surface-dark text-accent dark:text-text-primary-dark disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-4 mb-4">
          <label className="font-medium text-accent dark:text-text-primary-dark">Analytics:</label>
          <select
            value={chartType}
            onChange={e => setChartType(e.target.value as 'bar' | 'pie' | 'line')}
            className="px-3 py-1 rounded border border-zama-light-orange dark:border-border-dark bg-white dark:bg-surface-dark text-accent dark:text-text-primary-dark"
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="line">Line Chart</option>
          </select>
        </div>
        <div style={{ width: '100%', height: 250 }}>
          {chartType === 'bar' ? (
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366F1" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === 'pie' ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer>
              <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={40} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="cumulativeVotes" stroke="#6366F1" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {eligibleVoters && (
          <div className="mt-4 text-center text-sm text-accent dark:text-text-primary-dark">
            Participation Rate: <span className="font-semibold">{participationRate}%</span> ({totalVoters} of {eligibleVoters} eligible)
          </div>
        )}
      </div>
    </div>
  );
};

export default VotersLeaderboard; 