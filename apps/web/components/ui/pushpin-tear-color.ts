export const clamp01 = (v: number) => (Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0);

export function mixHex(a: string, b: string, t: number) {
  const parse = (h: string) => {
    const s = h.replace('#', '');
    const f =
      s.length === 3
        ? s
            .split('')
            .map((c) => c + c)
            .join('')
        : s.padEnd(6, '0').slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
  };
  const [x, y, k] = [parse(a), parse(b), clamp01(t)];
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * k)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
