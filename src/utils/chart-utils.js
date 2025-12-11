
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (value) => String(value).padStart(2, '0');

const businessDayToTimestamp = (time) => {
    if (!time) return 0;
    const date = new Date(Date.UTC(time.year, time.month - 1, time.day));
    return Math.floor(date.getTime() / 1000);
};

export const toTimestamp = (time) => {
    if (typeof time === 'number') return time;
    if (typeof time === 'object') {
        if ('timestamp' in time && typeof time.timestamp === 'number') {
            return time.timestamp;
        }
        if ('year' in time) {
            return businessDayToTimestamp(time);
        }
    }
    return 0;
};

export const getIntervalUnit = (interval = '1h') => {
    if (!interval) return 'minutes';
    const suffix = interval.slice(-1);
    switch (suffix) {
        case 's':
            return 'seconds';
        case 'm':
            return 'minutes';
        case 'h':
            return 'hours';
        case 'd':
            return 'days';
        case 'w':
            return 'weeks';
        case 'M':
            return 'months';
        default:
            return 'minutes';
    }
};

export const formatTickLabel = (timestamp, unit) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    if (unit === 'seconds') {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    if (unit === 'minutes' || unit === 'hours') {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    if (unit === 'days' || unit === 'weeks') {
        return `${MONTHS[date.getMonth()]} ${pad(date.getDate())}`;
    }
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatTooltipLabel = (timestamp, unit) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const includeYear = !(unit === 'seconds' || unit === 'minutes' || unit === 'hours');
    const baseDate = `${MONTHS[date.getMonth()]} ${pad(date.getDate())}${includeYear ? `, ${date.getFullYear()}` : ''}`;
    if (unit === 'seconds') {
        return `${baseDate} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    if (unit === 'minutes' || unit === 'hours') {
        return `${baseDate} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return baseDate;
};

export const buildTimeScaleFormatters = (interval) => {
    const unit = getIntervalUnit(interval);
    const timeVisible = unit === 'seconds' || unit === 'minutes' || unit === 'hours';
    const secondsVisible = unit === 'seconds';

    return {
        timeVisible,
        secondsVisible,
        tickFormatter: (time) => formatTickLabel(toTimestamp(time), unit),
        tooltipFormatter: (time) => formatTooltipLabel(toTimestamp(time), unit),
    };
};
