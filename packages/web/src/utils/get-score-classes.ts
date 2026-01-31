export const getScoreClasses = (score: number | undefined) => {
  if (score === undefined) return '';
  if (score >= 0.7) return 'bg-match-high-bg text-match-high-text';
  if (score >= 0.5) return 'bg-match-mid-bg text-match-mid-text';
  return 'bg-match-low-bg text-match-low-text';
};
