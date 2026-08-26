import { useState } from 'react';

const SEGMENT_COLORS = ['#F5A800', '#1565C0', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function DonutChart({ data, size = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: `${size}px`, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        No data available
      </div>
    );
  }

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const center = size / 2;
  const radius = center - 12;

  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);

  const getSlicePath = (startAngle, endAngle, r) => {
    const startX = center + r * Math.cos(startAngle);
    const startY = center + r * Math.sin(startAngle);
    const endX = center + r * Math.cos(endAngle);
    const endY = center + r * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${center} ${center} L ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  let cumulativeAngle = -Math.PI / 2;

  const slices = data.map((item, i) => {
    const fraction = totalValue > 0 ? (item.value / totalValue) : 0;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const isFullCircle = fraction >= 0.999;
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

    return {
      ...item,
      startAngle,
      endAngle,
      isFullCircle,
      color,
      path: isFullCircle ? '' : getSlicePath(startAngle, endAngle, radius),
      hoverPath: isFullCircle ? '' : getSlicePath(startAngle, endAngle, radius + 5)
    };
  });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div 
        className="kfpl-pie-wrap" 
        style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
        onMouseMove={handleMouseMove}
      >
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {slices.map((slice, i) => {
            const isHovered = hoveredIndex === i;
            if (slice.isFullCircle) {
              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={isHovered ? radius + 4 : radius}
                  fill={slice.color}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHovered ? `drop-shadow(0 6px 16px ${slice.color}66)` : 'none'
                  }}
                />
              );
            }

            return (
              <path
                key={i}
                d={isHovered ? slice.hoverPath : slice.path}
                fill={slice.color}
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinejoin="round"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  filter: isHovered ? `drop-shadow(0 6px 16px ${slice.color}66)` : 'none'
                }}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredIndex !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 12}px`,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(10, 25, 18, 0.96)',
              border: `1px solid ${slices[hoveredIndex].color}`,
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              zIndex: 9999,
              pointerEvents: 'none',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontWeight: 800, color: '#FBBF24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: slices[hoveredIndex].color }} />
              {slices[hoveredIndex].segment}
            </div>
            <div style={{ color: '#E2E8F0', fontSize: '0.78rem', marginBottom: '2px' }}>
              Investment Share: <strong style={{ color: '#ffffff' }}>{slices[hoveredIndex].value}%</strong>
            </div>
            {slices[hoveredIndex].amount !== undefined && (
              <div style={{ fontWeight: 800, color: '#F5A800', fontSize: '0.88rem', marginTop: '2px' }}>
                ₹{Number(slices[hoveredIndex].amount).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend below without overlapping */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '10px 16px',
          marginTop: '16px',
          width: '100%',
          padding: '0 8px'
        }}
      >
        {slices.map((cl) => (
          <div 
            key={cl.segment} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.82rem',
              color: 'var(--color-navy)',
              fontWeight: 600
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cl.color, flexShrink: 0 }} />
            <span>{cl.segment}</span>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>({cl.value}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ END: DonutChart.jsx ============ */
