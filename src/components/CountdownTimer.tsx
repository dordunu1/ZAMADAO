import React from 'react';
import { Clock } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  targetDate: number;
  label: string;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, label, className = '' }) => {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 text-abstain ${className}`}>
        <Clock size={16} />
        <span className="text-sm font-medium">{label} ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock size={16} className="text-primary" />
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium text-accent dark:text-text-primary-dark">{label}:</span>
        <div className="flex items-center gap-1 font-mono font-semibold text-primary">
          {days > 0 && <span>{days}d</span>}
          <span>{hours.toString().padStart(2, '0')}h</span>
          <span>{minutes.toString().padStart(2, '0')}m</span>
          {days === 0 && <span>{seconds.toString().padStart(2, '0')}s</span>}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;