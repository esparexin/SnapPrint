export const DEFAULT_RATES = {
  A4: {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
  },
};

export function formatRupees(paise?: number): string {
  if (typeof paise !== 'number') return '0';
  const rs = paise / 100;
  return Number.isInteger(rs) ? `₹${rs}` : `₹${rs.toFixed(2)}`;
}
