interface RadarDatum {
  label: string;
  /** 0.0 ~ 1.0 */
  value: number;
}

interface RadarChartProps {
  data: RadarDatum[];
  /** SVG 한 변 크기(px) */
  size?: number;
}

/**
 * N축 레이더 차트(데이터 시각화). 축 개수는 data.length 에 따라 자동 — 5축이든 9축이든 동작.
 * 색/좌표는 SVG 속성으로만 지정(인라인 style 미사용).
 */
export default function RadarChart({ data, size = 260 }: RadarChartProps) {
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const R = size * 0.33;
  const labelR = R + 22;

  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const point = (i: number, level: number): [number, number] => [
    cx + R * level * Math.cos(angle(i)),
    cy + R * level * Math.sin(angle(i)),
  ];
  const join = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const rings = [0.25, 0.5, 0.75, 1].map((lvl) =>
    join(data.map((_, i) => point(i, lvl))),
  );
  const dataPts = data.map((d, i) => point(i, Math.max(d.value, 0.04)));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="취향 레이더 차트">
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#EEECF6" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E6E3F0" strokeWidth="1" />;
      })}
      <polygon
        points={join(dataPts)}
        fill="rgba(255,159,102,.28)"
        stroke="#F23BA6"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#F23BA6" />
      ))}
      {data.map((d, i) => {
        const lx = cx + labelR * Math.cos(angle(i));
        const ly = cy + labelR * Math.sin(angle(i));
        const c = Math.cos(angle(i));
        const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
        return (
          <text key={i} x={lx} y={ly + 4} textAnchor={anchor} fontSize="12" fontWeight="800" fill="#6E6A7C">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
