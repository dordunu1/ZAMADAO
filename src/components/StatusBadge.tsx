import React from 'react';
import { Vote, Clock, CheckCircle, XCircle } from 'lucide-react';
import { ProposalStatus } from '../types/proposal';

interface StatusBadgeProps {
  status: ProposalStatus;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.Active:
        return {
          icon: Vote,
          text: 'Voting',
          className: 'bg-primary/20 text-primary border-primary/30 shadow-zama'
        };
      case ProposalStatus.Reveal:
        return {
          icon: Clock,
          text: 'Awaiting Resolution',
          className: 'bg-warning/20 text-warning border-warning/30 shadow-zama'
        };
      case ProposalStatus.Closed:
        return {
          icon: CheckCircle,
          text: 'Resolved',
          className: 'bg-success/20 text-success border-success/30 shadow-zama'
        };
      default:
        return {
          icon: XCircle,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-xl border font-medium backdrop-blur-sm transition-all duration-300 ${config.className} ${sizeClasses}`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{config.text}</span>
    </div>
  );
};

export default StatusBadge;