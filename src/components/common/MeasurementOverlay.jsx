import React from 'react';
import { formatTimeDuration } from '../../utils/formatting';

const MEASUREMENT_BAR_WIDTH_RATIO = 0.08;

export const MeasurementOverlay = ({
    projection,
    containerSize,
    isMarketBalance: _isMarketBalance = false,
    precision = { price: 2, quantity: 3 }
}) => {
    if (!projection || !containerSize.width || !containerSize.height) return null;

    const { startX, currentX, startY, currentY, deltaPrice, deltaPercent, deltaTime } = projection;
    const isPositive = deltaPrice >= 0;
    const priceColor = isPositive ? '#22c55e' : '#ef4444';
    const timeColor = '#a855f7'; // Purple for time measurement

    // Vertical price measurement bar (at start X position)
    const priceBarX = startX;
    const desiredWidth = containerSize.width * MEASUREMENT_BAR_WIDTH_RATIO;
    const halfWidth = desiredWidth / 2;
    const availableLeft = priceBarX;
    const availableRight = containerSize.width - priceBarX;
    const effectiveHalfWidth = Math.min(halfWidth, availableLeft, availableRight);
    const barLeft = priceBarX - effectiveHalfWidth;
    const barRight = priceBarX + effectiveHalfWidth;

    // Horizontal lines at start/end price levels
    const horizontalTop = `M${barLeft},${startY} L${barRight},${startY}`;
    const horizontalBottom = `M${barLeft},${currentY} L${barRight},${currentY}`;

    // Vertical arrow for price measurement
    const arrowTopY = Math.min(startY, currentY);
    const arrowBottomY = Math.max(startY, currentY);
    const priceArrowLine = `M${priceBarX},${arrowTopY} L${priceBarX},${arrowBottomY}`;
    const arrowHeadSize = 6;
    const priceArrowTopHead = `M${priceBarX - arrowHeadSize},${arrowTopY + arrowHeadSize} L${priceBarX},${arrowTopY} L${priceBarX + arrowHeadSize},${arrowTopY + arrowHeadSize}`;
    const priceArrowBottomHead = `M${priceBarX - arrowHeadSize},${arrowBottomY - arrowHeadSize} L${priceBarX},${arrowBottomY} L${priceBarX + arrowHeadSize},${arrowBottomY - arrowHeadSize}`;

    // Time measurement (horizontal)
    const timeBarY = currentY; // Use current Y for time measurement line
    const minTimeX = Math.min(startX, currentX);
    const maxTimeX = Math.max(startX, currentX);
    const desiredHeight = 20;
    const halfHeight = desiredHeight / 2;

    // Vertical lines at start/end time positions
    const verticalStart = `M${startX},${timeBarY - halfHeight} L${startX},${timeBarY + halfHeight}`;
    const verticalEnd = `M${currentX},${timeBarY - halfHeight} L${currentX},${timeBarY + halfHeight}`;

    // Horizontal arrow for time measurement
    const timeArrowLine = `M${minTimeX},${timeBarY} L${maxTimeX},${timeBarY}`;
    const timeArrowLeftHead = `M${minTimeX + arrowHeadSize},${timeBarY - arrowHeadSize} L${minTimeX},${timeBarY} L${minTimeX + arrowHeadSize},${timeBarY + arrowHeadSize}`;
    const timeArrowRightHead = `M${maxTimeX - arrowHeadSize},${timeBarY - arrowHeadSize} L${maxTimeX},${timeBarY} L${maxTimeX - arrowHeadSize},${timeBarY + arrowHeadSize}`;

    // Format delta values
    const formattedPriceDelta = `${deltaPrice >= 0 ? '+' : ''}${deltaPrice.toFixed(precision.price)}`;
    const formattedPercent = `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(2)}%`;
    const formattedTimeDelta = formatTimeDuration(deltaTime);
    const showTimeInfo = Math.abs(currentX - startX) > 10 && formattedTimeDelta;

    // Info box positioning (center of the measurement area)
    const infoBoxX = (startX + currentX) / 2;
    const infoBoxY = (startY + currentY) / 2;

    // Ensure info box stays within container bounds
    const boxWidth = 120; // estimate
    const boxHeight = 60; // estimate
    const clampedBoxX = Math.min(Math.max(infoBoxX - boxWidth / 2, 0), containerSize.width - boxWidth);
    const clampedBoxY = Math.min(Math.max(infoBoxY - boxHeight / 2, 0), containerSize.height - boxHeight);

    return (
        <>
            <svg className="measurement-overlay" width={containerSize.width} height={containerSize.height} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 20 }}>
                {/* Subtle connecting lines from start to current */}
                <path d={`M${startX},${startY} L${currentX},${currentY}`}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4" fill="none" />

                {/* Price measurement lines */}
                <path d={horizontalTop} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="5" fill="none" opacity="0.8" />
                <path d={horizontalBottom} stroke="#f97316" strokeWidth="1.5" strokeDasharray="5" fill="none" opacity="0.8" />
                <path d={priceArrowLine} stroke={priceColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d={priceArrowTopHead} stroke={priceColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d={priceArrowBottomHead} stroke={priceColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                {/* Time measurement lines (only show if there's meaningful horizontal distance) */}
                {showTimeInfo && (
                    <>
                        <path d={verticalStart} stroke={timeColor} strokeWidth="1.5" strokeDasharray="4" fill="none" opacity="0.7" />
                        <path d={verticalEnd} stroke={timeColor} strokeWidth="1.5" strokeDasharray="4" fill="none" opacity="0.7" />
                        <path d={timeArrowLine} stroke={timeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
                        <path d={timeArrowLeftHead} stroke={timeColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={timeArrowRightHead} stroke={timeColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                )}

                {/* Start/End point markers */}
                <circle cx={startX} cy={startY} r="4" fill="#22d3ee" stroke="#0a0c14" strokeWidth="1.5" />
                <circle cx={currentX} cy={currentY} r="4" fill="#f97316" stroke="#0a0c14" strokeWidth="1.5" />
            </svg>

            {/* Combined info box */}
            <div
                className="measurement-info-box"
                style={{
                    position: 'absolute',
                    left: clampedBoxX,
                    top: clampedBoxY,
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    pointerEvents: 'none',
                    zIndex: 21,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ color: priceColor }}><span style={{ fontSize: '14px' }}>{formattedPercent}</span> {formattedPriceDelta}</span>
                </div>
                {showTimeInfo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: timeColor}}>{formattedTimeDelta}</span>
                    </div>
                )}
            </div>
        </>
    );
};
