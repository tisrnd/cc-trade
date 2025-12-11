
export const formatTimeDuration = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return '';

    const absSeconds = Math.abs(seconds);
    const sign = seconds < 0 ? '-' : '';

    if (absSeconds < 60) {
        return `${sign}${Math.round(absSeconds)}s`;
    }

    const minutes = Math.floor(absSeconds / 60);
    if (minutes < 60) {
        const secs = Math.round(absSeconds % 60);
        return secs > 0 ? `${sign}${minutes}m ${secs}s` : `${sign}${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const mins = minutes % 60;
        return mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days < 7) {
        return remainingHours > 0 ? `${sign}${days}d ${remainingHours}h` : `${sign}${days}d`;
    }

    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return remainingDays > 0 ? `${sign}${weeks}w ${remainingDays}d` : `${sign}${weeks}w`;
};
