export function formatTimeRemaining(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getProposalStatus(votingDeadline: number, resolutionDeadline: number, resolved: boolean) {
  const now = Date.now();
  
  if (resolved) return 'RESOLVED';
  if (now < votingDeadline) return 'VOTING';
  if (now < resolutionDeadline) return 'WAITING_RESOLUTION';
  return 'RESOLVED';
}