/* ============================================================
   Component: LineChart.jsx
   Description: SVG line chart with area fill and hover dots
   ============================================================ */

import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export default function LineChart({ data, height = 220, color = '#F5A800' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const padding = { top: 20, right: 20, bottom: 40, left: 10 };
  const width = 100; // Percentage-based
  
  if (!data || data.length === 0) {
    return (
      <div className="kfpl-line-chart-wrap" style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
        No trend data available.
      </div>
    );
  }
  
  const values = data.map(d => d.amount || 0);
  const maxVal = Math.max(...values, 1) * 1.15;
  const minVal = 0;

  // We'll use viewBox percentage approach
  const chartWidth = 500;
  const chartHeight = height;
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const getX = (i) => padding.left + (i / (data.length > 1 ? data.length - 1 : 1)) * plotW;
  const getY = (val) => padding.top + plotH - (((val || 0) - minVal) / (maxVal - minVal)) * plotH;

  // Create path
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.amount || 0) }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Area path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

  // Grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const y = padding.top + (plotH / gridCount) * i;
    const val = maxVal - (maxVal / gridCount) * i;
    return { y, val };
  });

  return (
    <div className="kfpl-line-chart-wrap" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: `${height}px` }}>
        {/* Grid lines */}
        <g className="kfpl-line-chart-grid">
          {gridLines.map((g, i) => (
            <line key={i} x1={padding.left} y1={g.y} x2={chartWidth - padding.right} y2={g.y} />
          ))}
        </g>

        {/* Area fill */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <path d={linePath} className="kfpl-line-chart-path" stroke={color} />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 6 : 4}
            fill={hoveredIndex === i ? color : 'var(--color-white)'}
            stroke={color}
            strokeWidth="2"
            className="kfpl-line-chart-dot"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={chartHeight - 8}
            textAnchor="middle"
            className="kfpl-line-chart-label"
          >
            {d.month}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="kfpl-chart-tooltip"
          style={{
            left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
            top: `${points[hoveredIndex].y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {data[hoveredIndex].month}: {formatCurrency(data[hoveredIndex].amount)}
        </div>
      )}
    </div>
  );
}

/* ============ END: LineChart.jsx ============ */
