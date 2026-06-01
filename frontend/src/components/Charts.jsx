import styles from './Charts.module.css';

export function LineChart({ data, title }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const height = 200;

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <svg viewBox={`0 0 ${data.length * 40} ${height}`} className={styles.svg}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`grid-${i}`}
            x1="0"
            y1={(height * (i + 1)) / 5}
            x2={data.length * 40}
            y2={(height * (i + 1)) / 5}
            stroke="var(--border-color)"
            strokeDasharray="4,4"
          />
        ))}

        {/* Line path */}
        <polyline
          points={data
            .map(
              (d, i) => `${i * 40 + 20},${height - (d.value / maxValue) * height + 20}`
            )
            .join(' ')}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="2"
        />

        {/* Points */}
        {data.map((d, i) => (
          <circle
            key={`point-${i}`}
            cx={i * 40 + 20}
            cy={height - (d.value / maxValue) * height + 20}
            r="3"
            fill="var(--accent-cyan)"
          />
        ))}

        {/* Labels */}
        {data.map((d, i) => (
          i % Math.ceil(data.length / 6) === 0 && (
            <text
              key={`label-${i}`}
              x={i * 40 + 20}
              y={height + 35}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="10"
            >
              {d.time}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

export function PieChart({ data, title }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return (
      <div className={styles.chart}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartEmpty}>No data for this chart yet</p>
      </div>
    );
  }
  const colors = [
    'var(--severity-critical)',
    'var(--severity-high)',
    'var(--severity-medium)',
    'var(--severity-low)',
  ];
  const slices = data.map((item, idx) => {
    const sliceAngleDeg = (item.value / total) * 360;
    const prevValue = data.slice(0, idx).reduce((sum, d) => sum + d.value, 0);

    const startAngleDeg = -90 + (prevValue / total) * 360;
    const endAngleDeg = startAngleDeg + sliceAngleDeg;

    const startAngle = (startAngleDeg * Math.PI) / 180;
    const endAngle = (endAngleDeg * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startAngle);
    const y1 = 100 + 80 * Math.sin(startAngle);
    const x2 = 100 + 80 * Math.cos(endAngle);
    const y2 = 100 + 80 * Math.sin(endAngle);

    const largeArc = sliceAngleDeg > 180 ? 1 : 0;

    const pathData = [
      `M 100 100`,
      `L ${x1} ${y1}`,
      `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    const midAngle = ((startAngleDeg + sliceAngleDeg / 2) * Math.PI) / 180;
    const pct = (item.value / total) * 100;
    const labelRadius = 48;
    const labelX = 100 + labelRadius * Math.cos(midAngle);
    const labelY = 100 + labelRadius * Math.sin(midAngle);

    return {
      pathData,
      labelX,
      labelY,
      pct,
      showLabel: pct >= 6,
      color: colors[idx % colors.length],
      item,
    };
  });

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.pieContainer}>
        <svg viewBox="0 0 200 200" className={styles.pieSvg} aria-hidden="true">
          {slices.map((slice, idx) => (
            <g key={`slice-${idx}`}>
              <path d={slice.pathData} fill={slice.color} stroke="var(--bg-card)" strokeWidth="2" />
              {slice.showLabel && (
                <text
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={styles.pieLabel}
                >
                  {`${slice.pct.toFixed(0)}%`}
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className={styles.pieLegend}>
          {data.map((item, idx) => {
            const pct = ((item.value / total) * 100).toFixed(0);
            return (
            <div key={`legend-${idx}`} className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{ background: colors[idx % colors.length] }}
              ></span>
              <span className={styles.legendLabel}>
                {item.name} ({item.value}) · {pct}%
              </span>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BarChart({ data, title }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.barContainer}>
        {data.map((item, idx) => {
          const colors = [
            'var(--accent-cyan)',
            'var(--accent-blue)',
            'var(--accent-purple)',
            'var(--severity-high)',
          ];
          return (
            <div key={`bar-${idx}`} className={styles.barItem}>
              <div className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${(item.value / maxValue) * 150}px`,
                    background: colors[idx % colors.length],
                  }}
                  title={`${item.name}: ${item.value}`}
                ></div>
              </div>
              <span className={styles.barLabel}>{item.name}</span>
              <span className={styles.barValue}>{item.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
