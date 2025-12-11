import { DRAWING_TOOLS, FIBONACCI_LEVELS } from '../../../../constants/drawing';

class DrawingRenderer {
    constructor() {
        this._drawings = [];
        this._activeDrawing = null;
        this._selectedId = null;
        this._series = null;
        this._chart = null;
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const horizontalPixelRatio = scope.horizontalPixelRatio;
            const verticalPixelRatio = scope.verticalPixelRatio;

            ctx.save();
            ctx.scale(horizontalPixelRatio, verticalPixelRatio);

            const width = scope.mediaSize.width;

            // Draw finalized drawings
            this._drawings.forEach(drawing => {
                const isSelected = drawing.id === this._selectedId;
                this._drawShape(ctx, drawing, width, isSelected);
            });

            // Draw active (in-progress) drawing
            if (this._activeDrawing) {
                this._drawActiveShape(ctx, this._activeDrawing, width);
            }

            ctx.restore();
        });
    }

    _drawShape(ctx, drawing, width, isSelected) {
        const { type } = drawing;

        if (type === DRAWING_TOOLS.HORIZONTAL_LINE) {
            this._drawHorizontalLine(ctx, drawing, width, isSelected);
        } else if (type === DRAWING_TOOLS.TREND_LINE) {
            this._drawTrendLine(ctx, drawing, isSelected);
        } else if (type === DRAWING_TOOLS.RECTANGLE) {
            this._drawRectangle(ctx, drawing, isSelected);
        } else if (type === DRAWING_TOOLS.FIBONACCI) {
            this._drawFibonacci(ctx, drawing, width, isSelected);
        } else if (type === DRAWING_TOOLS.TEXT) {
            this._drawText(ctx, drawing, isSelected);
        }
    }

    _drawActiveShape(ctx, activeDrawing, width) {
        const { type, startPoint, currentPoint } = activeDrawing;
        if (!startPoint) return;

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([5, 5]);

        if (type === DRAWING_TOOLS.HORIZONTAL_LINE) {
            const y = this._series?.priceToCoordinate(startPoint.price);
            if (y !== null && y !== undefined) {
                ctx.beginPath();
                ctx.strokeStyle = '#26a69a';
                ctx.lineWidth = 2;
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        } else if (type === DRAWING_TOOLS.TREND_LINE && currentPoint) {
            const startY = this._series?.priceToCoordinate(startPoint.price);
            const endY = this._series?.priceToCoordinate(currentPoint.price);

            // Start point uses time (already placed)
            const startX = startPoint.time != null
                ? this._chart?.timeScale().timeToCoordinate(startPoint.time)
                : null;
            // Current point uses X directly for smooth preview
            const endX = currentPoint.x;

            if (startY !== null && endY !== null && startX !== null && endX !== null) {
                ctx.beginPath();
                ctx.strokeStyle = '#26a69a';
                ctx.lineWidth = 2;
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (type === DRAWING_TOOLS.RECTANGLE && currentPoint) {
            const startY = this._series?.priceToCoordinate(startPoint.price);
            const endY = this._series?.priceToCoordinate(currentPoint.price);

            const startX = startPoint.time != null
                ? this._chart?.timeScale().timeToCoordinate(startPoint.time)
                : startPoint.x;
            const endX = currentPoint.x;

            if (startY !== null && endY !== null && startX !== null && endX !== null) {
                const left = Math.min(startX, endX);
                const top = Math.min(startY, endY);
                const width = Math.abs(endX - startX);
                const height = Math.abs(endY - startY);

                ctx.fillStyle = '#26a69a33';
                ctx.fillRect(left, top, width, height);
                ctx.strokeStyle = '#26a69a';
                ctx.lineWidth = 2;
                ctx.strokeRect(left, top, width, height);
            }
        } else if (type === DRAWING_TOOLS.FIBONACCI && currentPoint) {
            const highPrice = Math.max(startPoint.price, currentPoint.price);
            const lowPrice = Math.min(startPoint.price, currentPoint.price);
            const priceRange = highPrice - lowPrice;

            const startX = startPoint.time != null
                ? this._chart?.timeScale().timeToCoordinate(startPoint.time)
                : startPoint.x;
            const endX = currentPoint.x;
            const leftX = Math.min(startX, endX);
            const rightX = Math.max(startX, endX);

            // Draw preview lines for each Fibonacci level
            FIBONACCI_LEVELS.forEach(level => {
                const price = highPrice - (priceRange * level);
                const y = this._series?.priceToCoordinate(price);
                if (y !== null && y !== undefined) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#26a69a';
                    ctx.lineWidth = 1;
                    ctx.moveTo(leftX, y);
                    ctx.lineTo(rightX, y);
                    ctx.stroke();
                }
            });
        }

        ctx.restore();
    }

    _drawHorizontalLine(ctx, drawing, width, isSelected) {
        const { price, color = '#26a69a' } = drawing;
        const y = this._series?.priceToCoordinate(price);

        if (y === null || y === undefined) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;

        if (isSelected) {
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([8, 4]);
        }

        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw selection handles
        if (isSelected) {
            this._drawHandle(ctx, 30, y);
            this._drawHandle(ctx, width - 30, y);
        }
    }

    _drawTrendLine(ctx, drawing, isSelected) {
        const { startTime, startPrice, startLogical, endTime, endPrice, endLogical, color = '#26a69a' } = drawing;

        // Skip if price values are missing
        if (startPrice == null || endPrice == null) return;
        // Need at least time or logical index for both points
        if (startTime == null && startLogical == null) return;
        if (endTime == null && endLogical == null) return;

        const startY = this._series?.priceToCoordinate(startPrice);
        const endY = this._series?.priceToCoordinate(endPrice);

        // Use time if available, otherwise use logical index
        let startX = startTime != null
            ? this._chart?.timeScale().timeToCoordinate(startTime)
            : this._chart?.timeScale().logicalToCoordinate(startLogical);
        let endX = endTime != null
            ? this._chart?.timeScale().timeToCoordinate(endTime)
            : this._chart?.timeScale().logicalToCoordinate(endLogical);

        if (startY === null || endY === null || startX === null || endX === null) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash([]);
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw selection handles
        if (isSelected) {
            this._drawHandle(ctx, startX, startY);
            this._drawHandle(ctx, endX, endY);
        }
    }

    _drawRectangle(ctx, drawing, isSelected) {
        const { topPrice, bottomPrice, leftLogical, rightLogical, leftTime, rightTime, color = '#26a69a' } = drawing;

        if (topPrice == null || bottomPrice == null) return;

        const topY = this._series?.priceToCoordinate(topPrice);
        const bottomY = this._series?.priceToCoordinate(bottomPrice);

        // Use time if available, otherwise use logical index
        let leftX = leftTime != null
            ? this._chart?.timeScale().timeToCoordinate(leftTime)
            : this._chart?.timeScale().logicalToCoordinate(leftLogical);
        let rightX = rightTime != null
            ? this._chart?.timeScale().timeToCoordinate(rightTime)
            : this._chart?.timeScale().logicalToCoordinate(rightLogical);

        if (topY === null || bottomY === null || leftX === null || rightX === null) return;

        const width = rightX - leftX;
        const height = bottomY - topY;

        // Draw filled rectangle with transparency
        ctx.beginPath();
        ctx.fillStyle = color + '33'; // Add 20% opacity
        ctx.fillRect(leftX, topY, width, height);

        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(leftX, topY, width, height);

        // Draw selection handles at corners
        if (isSelected) {
            this._drawHandle(ctx, leftX, topY);
            this._drawHandle(ctx, rightX, topY);
            this._drawHandle(ctx, leftX, bottomY);
            this._drawHandle(ctx, rightX, bottomY);
        }
    }

    _drawFibonacci(ctx, drawing, width, isSelected) {
        const { highPrice, lowPrice, leftLogical, rightLogical, leftTime, rightTime, color = '#26a69a' } = drawing;

        if (highPrice == null || lowPrice == null) return;

        const priceRange = highPrice - lowPrice;
        if (priceRange <= 0) return;

        // Get x coordinates
        let leftX = leftTime != null
            ? this._chart?.timeScale().timeToCoordinate(leftTime)
            : this._chart?.timeScale().logicalToCoordinate(leftLogical);
        let rightX = rightTime != null
            ? this._chart?.timeScale().timeToCoordinate(rightTime)
            : this._chart?.timeScale().logicalToCoordinate(rightLogical);

        if (leftX === null || rightX === null) return;

        // Extend lines to full width of chart
        const extendLeft = 0;
        const extendRight = width;

        // Colors for different levels
        const levelColors = {
            0: color,
            0.236: '#f59e0b',
            0.382: '#3b82f6',
            0.5: '#8b5cf6',
            0.618: '#ec4899',
            0.786: '#14b8a6',
            1: color,
        };

        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';

        // Draw each Fibonacci level
        FIBONACCI_LEVELS.forEach(level => {
            const price = highPrice - (priceRange * level);
            const y = this._series?.priceToCoordinate(price);
            if (y === null || y === undefined) return;

            const levelColor = levelColors[level] || color;

            // Draw the line
            ctx.beginPath();
            ctx.strokeStyle = levelColor;
            ctx.lineWidth = isSelected ? 2 : 1;

            if (level === 0 || level === 1) {
                ctx.setLineDash([]);
            } else {
                ctx.setLineDash([4, 4]);
            }

            // Draw line within the drawing bounds, extended to edges
            ctx.moveTo(extendLeft, y);
            ctx.lineTo(extendRight, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw vertical boundaries at the original bounds
            if (level === 0) {
                ctx.beginPath();
                ctx.strokeStyle = color + '66';
                ctx.lineWidth = 1;
                ctx.moveTo(leftX, y);
                ctx.lineTo(leftX, this._series?.priceToCoordinate(lowPrice) || y);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(rightX, y);
                ctx.lineTo(rightX, this._series?.priceToCoordinate(lowPrice) || y);
                ctx.stroke();
            }

            // Draw labels
            const levelPercent = (level * 100).toFixed(1);
            const priceText = price.toFixed(this._getPrecision(price));
            const labelText = `${levelPercent}% (${priceText})`;

            // Background for label
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(5, y - 8, textWidth + 8, 16);

            // Label text
            ctx.fillStyle = levelColor;
            ctx.fillText(labelText, 9, y + 4);
        });

        // Draw selection handles at the corners
        if (isSelected) {
            const topY = this._series?.priceToCoordinate(highPrice);
            const bottomY = this._series?.priceToCoordinate(lowPrice);
            if (topY !== null && bottomY !== null) {
                this._drawHandle(ctx, leftX, topY);
                this._drawHandle(ctx, rightX, topY);
                this._drawHandle(ctx, leftX, bottomY);
                this._drawHandle(ctx, rightX, bottomY);
            }
        }
    }

    _drawText(ctx, drawing, isSelected) {
        const { price, time, logical, text, color = '#26a69a' } = drawing;

        if (!text || price == null) return;
        if (time == null && logical == null) return;

        const y = this._series?.priceToCoordinate(price);
        let x = time != null
            ? this._chart?.timeScale().timeToCoordinate(time)
            : this._chart?.timeScale().logicalToCoordinate(logical);

        if (y === null || y === undefined || x === null || x === undefined) return;

        ctx.save();

        // Text styling
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Measure text
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 16;
        const padding = 6;

        // Draw background
        ctx.fillStyle = isSelected ? color + '40' : color + '25';
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2 : 1;

        const bgX = x - padding;
        const bgY = y - textHeight / 2 - padding / 2;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding;

        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        // Draw selection handles
        if (isSelected) {
            this._drawHandle(ctx, bgX, y);
            this._drawHandle(ctx, bgX + bgWidth, y);
        }

        ctx.restore();
    }

    _getPrecision(price) {
        if (price >= 1000) return 2;
        if (price >= 1) return 4;
        if (price >= 0.01) return 6;
        return 8;
    }

    _drawHandle(ctx, x, y) {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#26a69a';
        ctx.lineWidth = 2;
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    update(drawings, activeDrawing, selectedId, series, chart) {
        this._drawings = drawings || [];
        this._activeDrawing = activeDrawing;
        this._selectedId = selectedId;
        this._series = series;
        this._chart = chart;
    }
}

export class DrawingPrimitive {
    constructor() {
        this._drawings = [];
        this._activeDrawing = null;
        this._selectedId = null;
        this._renderer = new DrawingRenderer();
        this._chart = null;
        this._series = null;
        this._requestUpdate = () => { };
    }

    setDrawings(drawings) {
        this._drawings = drawings || [];
        this._updateRenderer();
    }

    setActiveDrawing(activeDrawing) {
        this._activeDrawing = activeDrawing;
        this._updateRenderer();
    }

    setSelectedId(selectedId) {
        this._selectedId = selectedId;
        this._updateRenderer();
    }

    _updateRenderer() {
        this._renderer.update(
            this._drawings,
            this._activeDrawing,
            this._selectedId,
            this._series,
            this._chart
        );
        this._requestUpdate();
    }

    // Hit test for clicking on drawings
    // Returns { drawing, hitType } where hitType is 'body', 'start', or 'end'
    hitTest(x, y) {
        if (!this._series || !this._chart) return null;

        const TOLERANCE = 8; // pixels
        const HANDLE_RADIUS = 10; // larger hitbox for handles

        for (const drawing of this._drawings) {
            if (drawing.type === DRAWING_TOOLS.HORIZONTAL_LINE) {
                const drawingY = this._series.priceToCoordinate(drawing.price);
                if (drawingY !== null && Math.abs(y - drawingY) <= TOLERANCE) {
                    return { drawing, hitType: 'body' };
                }
            } else if (drawing.type === DRAWING_TOOLS.TREND_LINE) {
                const startY = this._series.priceToCoordinate(drawing.startPrice);
                const endY = this._series.priceToCoordinate(drawing.endPrice);

                // Use time if available, otherwise use logical index
                let startX = drawing.startTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.startTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.startLogical);
                let endX = drawing.endTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.endTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.endLogical);

                if (startY !== null && endY !== null && startX !== null && endX !== null) {
                    // Check if clicked on start handle
                    const distToStart = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
                    if (distToStart <= HANDLE_RADIUS) {
                        return { drawing, hitType: 'start' };
                    }

                    // Check if clicked on end handle
                    const distToEnd = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2);
                    if (distToEnd <= HANDLE_RADIUS) {
                        return { drawing, hitType: 'end' };
                    }

                    // Check if clicked on line body
                    const dist = this._pointToLineDistance(x, y, startX, startY, endX, endY);
                    if (dist <= TOLERANCE) {
                        return { drawing, hitType: 'body' };
                    }
                }
            } else if (drawing.type === DRAWING_TOOLS.RECTANGLE) {
                const topY = this._series.priceToCoordinate(drawing.topPrice);
                const bottomY = this._series.priceToCoordinate(drawing.bottomPrice);

                let leftX = drawing.leftTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.leftTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.leftLogical);
                let rightX = drawing.rightTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.rightTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.rightLogical);

                if (topY !== null && bottomY !== null && leftX !== null && rightX !== null) {
                    // Check if inside rectangle bounds
                    if (x >= leftX - TOLERANCE && x <= rightX + TOLERANCE &&
                        y >= topY - TOLERANCE && y <= bottomY + TOLERANCE) {
                        return { drawing, hitType: 'body' };
                    }
                }
            } else if (drawing.type === DRAWING_TOOLS.FIBONACCI) {
                const topY = this._series.priceToCoordinate(drawing.highPrice);
                const bottomY = this._series.priceToCoordinate(drawing.lowPrice);

                let leftX = drawing.leftTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.leftTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.leftLogical);
                let rightX = drawing.rightTime != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.rightTime)
                    : this._chart.timeScale().logicalToCoordinate(drawing.rightLogical);

                if (topY !== null && bottomY !== null && leftX !== null && rightX !== null) {
                    // Check if near any Fibonacci level line (within the drawing bounds)
                    const priceRange = drawing.highPrice - drawing.lowPrice;
                    for (const level of FIBONACCI_LEVELS) {
                        const price = drawing.highPrice - (priceRange * level);
                        const lineY = this._series.priceToCoordinate(price);
                        if (lineY !== null && Math.abs(y - lineY) <= TOLERANCE) {
                            // Check if within the x bounds (or slightly beyond for easier selection)
                            if (x >= Math.min(leftX, rightX) - 50 && x <= Math.max(leftX, rightX) + 50) {
                                return { drawing, hitType: 'body' };
                            }
                        }
                    }
                }
            } else if (drawing.type === DRAWING_TOOLS.TEXT) {
                const drawingY = this._series.priceToCoordinate(drawing.price);
                let drawingX = drawing.time != null
                    ? this._chart.timeScale().timeToCoordinate(drawing.time)
                    : this._chart.timeScale().logicalToCoordinate(drawing.logical);

                if (drawingY !== null && drawingX !== null) {
                    // Approximate hit box around text
                    const textWidth = drawing.text.length * 8 + 12; // rough estimate
                    const textHeight = 24;
                    if (x >= drawingX - 6 && x <= drawingX + textWidth &&
                        y >= drawingY - textHeight / 2 && y <= drawingY + textHeight / 2) {
                        return { drawing, hitType: 'body' };
                    }
                }
            }
        }

        return null;
    }

    _pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // ISeriesPrimitive interface
    updateAllViews() {
        // no-op
    }

    paneViews() {
        return [{
            renderer: () => this._renderer,
            zOrder: () => 'top' // Render above candles
        }];
    }

    priceAxisViews() {
        return [];
    }

    timeAxisViews() {
        return [];
    }

    autoscaleInfo() {
        return null;
    }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
        this._updateRenderer();
    }

    detached() {
        this._chart = null;
        this._series = null;
        this._requestUpdate = () => { };
    }
}

