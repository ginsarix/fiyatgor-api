export function toCronExpression(frequency, unit) {
    switch (unit) {
        case "minute":
            return `*/${frequency} * * * *`;
        case "hour":
            return `0 */${frequency} * * *`;
        case "day":
            return `0 0 */${frequency} * *`;
        case "month":
            return `0 0 1 */${frequency} *`;
    }
}
