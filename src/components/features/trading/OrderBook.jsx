import React, { useState, useEffect, useRef } from 'react';
import './OrderBook.css';
import { calculatePrecision, precisionTruncate } from '../../../utils/operations';
import { getCoin, parseBooks } from '../../../utils/utils';
import { DEFAULT_ORDER_BOOK_SETTINGS } from '../../../constants';
import { useDataContext } from '../../../context/DataContext';

const OrderBook = ({ callDialog }) => {
    const {
        panel,
        depth,
        orders,
        balances,
        filters,
        chart,
        enabledMarketBalance,
    } = useDataContext();
    const last_tick = chart?.[chart.length - 1];
    const increaseMinPrice = false;
    // Initialize state from localStorage or defaults
    const [orderBook, setOrderBook] = useState(() => {
        const saved = localStorage.getItem('orderBook');
        return saved ? JSON.parse(saved) : DEFAULT_ORDER_BOOK_SETTINGS;
    });
    const previousAccuracyRef = useRef(
        typeof orderBook?.accuracy === 'number' ? orderBook.accuracy : DEFAULT_ORDER_BOOK_SETTINGS.accuracy
    );

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('orderBook', JSON.stringify(orderBook));
    }, [orderBook]);

    useEffect(() => {
        previousAccuracyRef.current = orderBook.accuracy;
    }, [orderBook.accuracy]);

    const revertAccuracy = () => {
        setOrderBook((prev) => ({
            ...prev,
            accuracy: previousAccuracyRef.current,
        }));
    };

    const handleButtonClick = (e) => {
        if (e.target.value === '+') {
            if (orderBook.accuracy - 1 >= orderBook.min_accuracy) {
                setOrderBook((prev) => ({ ...prev, accuracy: prev.accuracy - 1 }));
            }
        } else {
            if (orderBook.accuracy + 1 <= orderBook.max_accuracy) {
                setOrderBook((prev) => ({ ...prev, accuracy: prev.accuracy + 1 }));
            }
        }
    };

    const handleAccuracyChange = (e) => {
        const nextValue = e.target.value.trim();

        if (nextValue === '') {
            revertAccuracy();
            return;
        }

        if (!/^\d+$/.test(nextValue)) {
            revertAccuracy();
            return;
        }

        const val = parseInt(nextValue, 10);
        if (Number.isNaN(val)) {
            revertAccuracy();
            return;
        }

        if (val >= orderBook.min_accuracy && val <= orderBook.max_accuracy) {
            setOrderBook((prev) => ({ ...prev, accuracy: val }));
        } else {
            revertAccuracy();
        }
    };

    const handleAccuracyBlur = (e) => {
        const value = parseInt(e.target.value, 10);
        if (
            Number.isNaN(value) ||
            value < orderBook.min_accuracy ||
            value > orderBook.max_accuracy
        ) {
            revertAccuracy();
        }
    };

    // Render Logic
    if (
        !depth ||
        Object.keys(depth).length === 0 ||
        Object.keys(filters || {}).length === 0 ||
        (Object.keys(depth.asks || {}).length === 0 && Object.keys(depth.bids || {}).length === 0)
    ) {
        return <div className="ob"><div className="color-white">No data in orderBook</div></div>;
    }

    const precision = calculatePrecision(filters?.[panel.selected] || {});
    const minPriceDelta = increaseMinPrice ? precision.minPrice : 0;

    const openOrderForm = (row, desiredSide) => {
        if (!callDialog || !row) return;

        const basePriceValue = row[4] ?? row[0];
        const numericPrice = parseFloat(basePriceValue);
        if (!Number.isFinite(numericPrice)) return;

        let adjustedPrice = numericPrice;
        if (minPriceDelta) {
            adjustedPrice =
                desiredSide === 'SELL'
                    ? numericPrice + minPriceDelta
                    : numericPrice - minPriceDelta;
        }

        const decimals = precision?.price ?? 2;
        const truncatedPrice = precisionTruncate(adjustedPrice, decimals);

        callDialog({
            price: truncatedPrice,
            amount: row[7],
            side: desiredSide,
            source: 'orderBook',
        });
    };

    const handleOrderRowClick = (row, bookSide) => {
        const desiredSide = bookSide === 'BUY' ? 'SELL' : 'BUY';
        openOrderForm(row, desiredSide);
    };
    const marketDisplayDecimals = panel.market === 'BTC' ? 6 : 0;
    const notionalDecimals = precision?.notional ?? marketDisplayDecimals;
    const formatQuoteValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return value;
        if (panel.market === 'USDT') {
            return Math.trunc(numeric).toString();
        }
        return precisionTruncate(numeric, notionalDecimals).toFixed(notionalDecimals);
    };
    const currentCoin = getCoin(panel.selected);
    const currentOrders = orders.filter((order) => {
        if (order['symbol'] === panel.selected) {
            order['price'] = parseFloat(order['price']);
            return order;
        }
        return false;
    });

    const normalizeEntry = ([price, qty]) => [parseFloat(price), parseFloat(qty)];
    const sortedBuyEntries = Object.entries(depth.bids || {})
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .map(normalizeEntry);
    const sortedSellEntries = Object.entries(depth.asks || {})
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .map(normalizeEntry);

    let buyBook = [], sellBook = [], resBuy = [], resSell = [];
    let lastItem;

    // group orders by accuracy
    if (orderBook.accuracy > 0) {
        const accPercent = orderBook.accuracy / orderBook.shown_number;
        const rawBuyBook = sortedBuyEntries;
        const rawSellBook = sortedSellEntries;

        // Process Buy Book
        for (let i = 0; i < rawBuyBook.length; i++) {
            if (!lastItem) {
                lastItem = [...rawBuyBook[i]];
                lastItem[2] = parseFloat(lastItem[0]); // store original minimal price
                continue;
            }

            let a = lastItem[0]; // price remembered
            let b = rawBuyBook[i][0]; // price ongoing
            let c = lastItem[1]; // quantity remembered
            let d = rawBuyBook[i][1]; // quantity ongoing
            let coef1 = a * c;
            let coef2 = b * d;

            if ((lastItem[2] / b - 1) * 100 < accPercent) {
                if (coef1 / coef2 > 1) {
                    lastItem[0] = a - (a - b) / (coef1 / coef2);
                } else {
                    lastItem[0] = a - (a - b) * (coef1 / coef2);
                }
                lastItem[1] += d;
            } else {
                lastItem[2] = b;
                resBuy.push(lastItem);
                lastItem = [...rawBuyBook[i]];
                lastItem[2] = lastItem[0];
            }
        }
        if (lastItem) resBuy.push(lastItem);
        if (!resBuy.length && lastItem) resBuy.push(lastItem); // Fallback

        // Process Sell Book
        lastItem = false;
        for (let i = 0; i < rawSellBook.length; i++) {
            if (!lastItem) {
                lastItem = [...rawSellBook[i]];
                lastItem[2] = parseFloat(lastItem[0]);
                continue;
            }

            let a = lastItem[0];
            let b = rawSellBook[i][0];
            let c = lastItem[1];
            let d = rawSellBook[i][1];
            let coef1 = a * c;
            let coef2 = b * d;

            if ((b / lastItem[2] - 1) * 100 < accPercent) {
                if (coef1 / coef2 > 1) {
                    lastItem[0] = b - (b - a) / (coef1 / coef2);
                } else {
                    lastItem[0] = b - (b - a) * (coef1 / coef2);
                }
                lastItem[1] += d;
            } else {
                lastItem[2] = b;
                resSell.push(lastItem);
                lastItem = [...rawSellBook[i]];
                lastItem[2] = lastItem[0];
            }
        }
        if (lastItem) resSell.push(lastItem);
    }

    if (orderBook.accuracy === 0) {
        buyBook = sortedBuyEntries.slice(0, orderBook.shown_number);
        sellBook = sortedSellEntries.slice(0, orderBook.shown_number);
    } else {
        buyBook = resBuy.slice(0, orderBook.shown_number);
        sellBook = resSell.slice(0, orderBook.shown_number);
    }

    const buyPrices = buyBook.map((item) => parseFloat(item[0]));
    const sellPrices = sellBook.map((item) => parseFloat(item[0]));

    // Flag current orders
    currentOrders.forEach((order) => {
        if (order['side'] === 'BUY') {
            for (let i = 1; i < buyPrices.length; i++) {
                let a = buyPrices[i - 1];
                let b = buyPrices[i];
                if (i === 1 && a < order['price']) {
                    if (buyBook[i - 1]) buyBook[i - 1][5] = true;
                    break;
                }
                if (a >= order['price'] && order['price'] >= b) {
                    if (Math.abs(order['price'] - a) > Math.abs(order['price'] - b)) {
                        if (buyBook[i]) buyBook[i][5] = true;
                    } else {
                        if (buyBook[i - 1]) buyBook[i - 1][5] = true;
                    }
                }
            }
        } else {
            for (let i = 1; i < sellPrices.length; i++) {
                let a = sellPrices[i - 1];
                let b = sellPrices[i];
                if (i === 1 && a > order['price']) {
                    if (sellBook[i - 1]) sellBook[i - 1][5] = true;
                    break;
                }
                if (a <= order['price'] && order['price'] <= b) {
                    if (Math.abs(order['price'] - a) > Math.abs(order['price'] - b)) {
                        if (sellBook[i]) sellBook[i][5] = true;
                    } else {
                        if (sellBook[i - 1]) sellBook[i - 1][5] = true;
                    }
                    break;
                }
            }
        }
    });

    // Calculate Max for bars
    const maxBuy = buyBook
        .map((item) => parseFloat(item[0]) * parseFloat(item[1]))
        .reduce((a, b) => a + b, 0);
    const maxSell = sellBook
        .map((item) => parseFloat(item[0]) * parseFloat(item[1]))
        .reduce((a, b) => a + b, 0);
    const maxTotal = maxBuy > maxSell ? maxBuy : maxSell;

    // Parse books for display
    const [parsedBuyBook, parsedSellBook] = parseBooks(buyBook, sellBook, precision, orderBook.shown_number);

    // Balances
    const btcAvail = precisionTruncate(
        parseFloat(balances[panel.market]?.available || 0),
        marketDisplayDecimals
    );
    const btcOnOrder = precisionTruncate(
        parseFloat(balances[panel.market]?.onOrder || 0),
        marketDisplayDecimals
    );

    // Ensure current coin balance exists
    const coinBalance = balances[currentCoin] || { available: "0.00000000", onOrder: "0.00000000" };
    let coinAvail = parseFloat(coinBalance.available);
    let coinOnOrder = parseFloat(coinBalance.onOrder);
    const bnbAvail = parseFloat(balances['BNB']?.available || 0);

    if (last_tick) {
        coinAvail = precisionTruncate(
            coinAvail * last_tick.close,
            marketDisplayDecimals
        );
        coinOnOrder = precisionTruncate(
            coinOnOrder * last_tick.close,
            marketDisplayDecimals
        );
    }

    const myOrderSell = <i className="my-order left"></i>;
    const myOrderBuy = <i className="my-order right"></i>;
    const ledRed = <div className="led-red" title={'BNB: ' + bnbAvail}></div>;

    return (
        <div className="ob">
            <div className="order-book">
                <div className="header">
                    <div className="balance-buy">
                        {bnbAvail < 0.3 ? ledRed : ''}
                        <span className="info" title={panel['market'] + ' available'}>
                            {btcAvail < 0.0001
                                ? 0
                                : btcAvail.toFixed(marketDisplayDecimals)}
                        </span>
                        <span className="info" title={panel['market'] + ' on order'}>
                            {btcOnOrder < 0.0001
                                ? 0
                                : btcOnOrder.toFixed(marketDisplayDecimals)}
                        </span>
                    </div>
                    <div className="buttons">
                        <input
                            type="button"
                            className="button plus"
                            value="+"
                            onClick={handleButtonClick}
                        />
                        <input
                            type="text"
                            id="accuracy-percent"
                            className="accuracy-percent"
                            onChange={handleAccuracyChange}
                            onBlur={handleAccuracyBlur}
                            value={orderBook.accuracy}
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                        <input
                            type="button"
                            className="button minus"
                            value="-"
                            onClick={handleButtonClick}
                        />
                    </div>
                    <div className="balance-sell">
                        <span className="info" title={currentCoin + ' available'}>
                            {coinAvail < 0.0001
                                ? 0
                                : coinAvail.toFixed(marketDisplayDecimals)}
                        </span>
                        <span className="info" title={currentCoin + ' on order'}>
                            {coinOnOrder < 0.0001
                                ? 0
                                : coinOnOrder.toFixed(marketDisplayDecimals)}
                        </span>
                    </div>
                </div>
                <div className="feed">
                    <div className="ob-buy">
                        {parsedBuyBook.map((item, index) => {
                            const totalDisplay = enabledMarketBalance ? formatQuoteValue(item[3]) : item[7];
                            const qtyDisplay = enabledMarketBalance ? formatQuoteValue(item[2]) : item[1];
                            const percentBase = enabledMarketBalance ? Number(item[3]) : Number(item[7]);
                            const percentMax = enabledMarketBalance ? maxTotal : (parsedBuyBook[parsedBuyBook.length - 1]?.[7] || 1);
                            const widthPercent = percentMax ? (percentBase / percentMax) * 100 : 0;
                            return (
                                <div className="item" key={index}>
                                    <div
                                        className="columns"
                                        onDoubleClick={() => handleOrderRowClick(item, 'BUY')}
                                    >
                                        {item[5] ? myOrderBuy : ''}
                                        <div
                                            className="bar"
                                            style={{ width: widthPercent + '%' }}
                                        ></div>
                                        <div className="column column-total">
                                            <span className="total-value">{item[6] ? <b>{totalDisplay}</b> : totalDisplay}</span>
                                        </div>
                                        <div className="column column-quantity-total">
                                            <span className="quantity-total">{item[6] ? <b>{qtyDisplay}</b> : qtyDisplay}</span>
                                        </div>
                                        <div className="column column-price">
                                            <span className="price">{item[6] ? <b>{item[4]}</b> : item[4]}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="ob-sell">
                        {parsedSellBook.map((item, index) => {
                            const totalDisplay = enabledMarketBalance ? formatQuoteValue(item[3]) : item[7];
                            const qtyDisplay = enabledMarketBalance ? formatQuoteValue(item[2]) : item[1];
                            const percentBase = enabledMarketBalance ? Number(item[3]) : Number(item[7]);
                            const percentMax = enabledMarketBalance ? maxTotal : (parsedSellBook[parsedSellBook.length - 1]?.[7] || 1);
                            const widthPercent = percentMax ? (percentBase / percentMax) * 100 : 0;
                            return (
                                <div className="item" key={index}>
                                    <div
                                        className="columns"
                                        onDoubleClick={() => handleOrderRowClick(item, 'SELL')}
                                    >
                                        {item[5] ? myOrderSell : ''}
                                        <div
                                            className="bar"
                                            style={{ width: widthPercent + '%' }}
                                        ></div>
                                        <div className="column column-price">
                                            <span className="price">{item[6] ? <b>{item[4]}</b> : item[4]}</span>
                                        </div>
                                        <div className="column column-quantity-total">
                                            <span className="quantity-total">{item[6] ? <b>{qtyDisplay}</b> : qtyDisplay}</span>
                                        </div>
                                        <div className="column column-total">
                                            <span className="total-value">{item[6] ? <b>{totalDisplay}</b> : totalDisplay}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderBook;
