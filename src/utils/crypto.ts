export function generateSalt(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function computeCommitment(
  voter: string,
  proposalId: number,
  voteType: number,
  weight: number,
  salt: string
): string {
  // Simulate keccak256 hash for demo purposes
  const data = `${voter}${proposalId}${voteType}${weight}${salt}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}