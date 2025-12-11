

class VolumeProfileRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }

    draw(target) {
        if (!this._data || this._data.length === 0 || !this._options || !this._series) return;

        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const horizontalPixelRatio = scope.horizontalPixelRatio;
            const verticalPixelRatio = scope.verticalPixelRatio;

            ctx.save();
            ctx.scale(horizontalPixelRatio, verticalPixelRatio);

            const width = scope.mediaSize.width;
            const height = scope.mediaSize.height;

            // Draw bars
            this._data.forEach(row => {
                const y1 = this._series.priceToCoordinate(row.price); // High of the row (approx)
                const y2 = this._series.priceToCoordinate(row.price - row.step); // Low of the row

                if (y1 === null || y2 === null) return;

                // Ensure y1 is top and y2 is bottom
                const top = Math.min(y1, y2);
                const bottom = Math.max(y1, y2);
                const barHeight = Math.max(1, bottom - top);

                if (top > height || bottom < 0) return;

                const maxVol = this._options.maxVolume;
                const barWidth = (row.vol / maxVol) * (width * (this._options.widthPercent / 100));

                const x = this._options.align === 'right' ? width - barWidth : 0;

                ctx.fillStyle = row.type === 'up' ? this._options.upColor : this._options.downColor;
                ctx.globalAlpha = this._options.opacity;

                ctx.fillRect(x, top, barWidth, barHeight);
            });

            ctx.restore();
        });
    }

    update(data, options, series) {
        this._data = data;
        this._options = options;
        this._series = series;
    }
}

export class VolumeProfilePrimitive {
    constructor(options) {
        this._options = {
            upColor: '#26a69a',
            downColor: '#ef5350',
            opacity: 0.55,
            widthPercent: 30,
            align: 'right',
            maxVolume: 100,
            ...options
        };
        this._data = [];
        this._renderer = new VolumeProfileRenderer();
    }

    setData(data) {
        this._data = Array.isArray(data) ? data : [];
        if (this._data.length === 0) {
            this._options.maxVolume = 0;
            this._renderer.update(this._data, this._options, this._series);
            this._requestUpdate();
            return;
        }
        // Calculate max volume for scaling
        const maxVol = Math.max(...this._data.map(d => d.vol || 0), 0.0001);
        this._options.maxVolume = maxVol;
        this._renderer.update(this._data, this._options, this._series);
        this._requestUpdate();
    }

    updateAllViews() {
        // no-op
    }

    paneViews() {
        return [{
            renderer: () => this._renderer,
            zOrder: () => 'bottom' // Render behind candles
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
        this._renderer.update(this._data, this._options, this._series);
    }

    detached() {
        this._chart = null;
        this._requestUpdate = () => { };
    }
}
