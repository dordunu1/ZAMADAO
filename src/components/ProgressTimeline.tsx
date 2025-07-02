import React from 'react';
import { Vote, Clock, CheckCircle } from 'lucide-react';
import { ProposalStatus } from '../types/proposal';

interface ProgressTimelineProps {
  status: ProposalStatus;
  votingDeadline: number;
  resolutionDeadline: number;
  resolved: boolean;
}

const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  status,
  votingDeadline,
  resolutionDeadline,
  resolved
}) => {
  const now = Date.now();
  
  const phases = [
    {
      name: 'Voting Phase',
      icon: Vote,
      active: status === ProposalStatus.Active,
      completed: now >= votingDeadline,
      deadline: votingDeadline,
      description: 'Cast confidential votes'
    },
    {
      name: 'Waiting for Resolution', 
      icon: Clock,
      active: status === ProposalStatus.Reveal,
      completed: now >= resolutionDeadline,
      deadline: resolutionDeadline,
      description: 'Awaiting final tally'
    },
    {
      name: 'Resolved',
      icon: CheckCircle,
      active: false,
      completed: resolved,
      deadline: null,
      description: 'Results published'
    }
  ];

  return (
    <div className="flex items-center justify-between w-full">
      {phases.map((phase, index) => {
        const Icon = phase.icon;
        const isLast = index === phases.length - 1;
        
        return (
          <div key={phase.name} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`
                flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300
                ${phase.completed 
                  ? 'bg-success border-success text-white shadow-zama' 
                  : phase.active 
                    ? 'bg-primary border-primary text-white animate-pulse-subtle shadow-zama'
                    : 'bg-white/80 dark:bg-surface-dark border-zama-light-orange dark:border-border-dark text-text-muted dark:text-text-muted-dark'
                }
              `}>
                <Icon size={18} />
              </div>
              <div className="mt-3 text-center">
                <div className={`text-sm font-medium ${
                  phase.completed ? 'text-success' : phase.active ? 'text-primary' : 'text-text-secondary dark:text-text-secondary-dark'
                }`}>
                  {phase.name}
                </div>
                <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                  {phase.description}
                </div>
                {phase.deadline && (
                  <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                    {new Date(phase.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                phases[index + 1].completed || phases[index + 1].active 
                  ? 'bg-success shadow-zama' 
                  : 'bg-zama-light-orange dark:bg-border-dark'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressTimeline;