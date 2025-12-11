import { getCoin, getMarket } from './utils'
import { calculatePrecision, precisionTruncate } from './precision'

export function cancel(data, connection) {
    let req = {}

    req['symbol'] = data['symbol']
    req['orderId'] = data['id']

    connection.send(JSON.stringify({ request: 'cancelOrder', data: req }))
}

export function buysell(data, balances, filters, connection, _retries = 0) {
    let precision,
        filterCheck = false,
        timeoutCheck = true,
        req = {}

    req['symbol'] = data['symbol']

    precision = calculatePrecision(filters[req['symbol']])

    req['coin'] = getCoin(req['symbol'])
    req['market'] = getMarket(req['symbol'])
    req['orderId'] = data['id']
    req['side'] = data['side']
    req['totalValue'] = data['totalValue']
    req['price'] = (typeof data['yValue'] === 'string'
        ? precisionTruncate(parseFloat(data['yValue']), precision['price'])
        : precisionTruncate(data['yValue'], precision['price'])
    ).toFixed(precision['price'])
    // recalculate quantity to be equal to totalValue
    if (req['side'] === 'BUY') {
        req['quantity'] = parseFloat(
            precisionTruncate(req['totalValue'] / req['price'], precision['quantity'])
        )
    } else {
        req['quantity'] = parseFloat(
            precisionTruncate(data['amount'], precision['quantity'])
        )
    }
    req['request'] = req['side'] === 'SELL' ? 'sellOrder' : 'buyOrder'

    // check if we haven't broke any filter limits
    filterCheck =
        precision['minQty'] < req['quantity'] &&
        req['quantity'] < precision['maxQty'] &&
        precision['minPrice'] < req['price'] &&
        req['price'] < precision['maxPrice'] &&
        precision['status'] === 'TRADING'

    if (!filterCheck) {
        let error = 'Filter check failed!\n'
        if (
            !(
                precision['minQty'] < req['quantity'] &&
                req['quantity'] < precision['maxQty']
            )
        ) {
            error += 'Quantity is > or < than min/max allowed\n'
        }
        if (
            !(
                precision['minPrice'] < req['price'] &&
                req['price'] < precision['maxPrice']
            )
        ) {
            error += 'Price is > or < than min/max allowed\n'
        }
        if (precision['status'] !== 'TRADING') {
            error += 'Selected pair is not in TRADING status: ' + precision['status']
        }

        alert(error)
        return
    }

    if (req['side'] === 'BUY') {
        // if we don't have enough money to put an order, put flag on to wait for 1sec (in case old order haven't cancelled yet)
        if (
            parseFloat(balances['BTC']['available']) <
            req['quantity'] * req['price']
        )
            timeoutCheck = false
    } else {
        // if coins haven't been released from last SELL order - put flag on to wait for one second for Cancel to finish
        if (
            parseFloat(balances[req['coin']]['available']) <
            parseFloat(req['quantity'])
        )
            timeoutCheck = false
    }

    if (timeoutCheck) {
        connection.send(JSON.stringify({ request: req['request'], data: req }))
    } else {
        setTimeout(function () {
            console.log('timed out firing')
            connection.send(JSON.stringify({ request: req['request'], data: req }))
        }, 1000)
    }
}

export function serverDialog(data, connection) {
    connection.send(JSON.stringify({ request: 'notifyDialog', data: data }))
}

export function cancelAll(_data, _connection) { }

export function balanceUpdate(data, balances) {
    let st = Object.assign({}, balances);
    Object.keys(data).forEach((key) => {
        st[key] = data[key];
    });

    return st;
}

/**
 * Format large numbers with k/kk/kkk suffixes
 * k = thousands (10k = 10,000)
 * m = millions (10m = 10,000,000)
 * b = billions (1b = 1,000,000,000)
 */
export function formatVolumeShort(value) {
    if (!value || !Number.isFinite(value)) return '0';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1_000_000_000) {
        const formatted = (absValue / 1_000_000_000).toFixed(1);
        return sign + formatted.replace(/\.0$/, '') + 'b';
    }
    if (absValue >= 1_000_000) {
        const formatted = (absValue / 1_000_000).toFixed(1);
        return sign + formatted.replace(/\.0$/, '') + 'm';
    }
    if (absValue >= 1_000) {
        const formatted = (absValue / 1_000).toFixed(1);
        return sign + formatted.replace(/\.0$/, '') + 'k';
    }

    return sign + absValue.toFixed(0);
}

export { calculatePrecision, precisionTruncate };
