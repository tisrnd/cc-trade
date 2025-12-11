import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './OrderFormModal.css';
import { Modal, Button, Form } from 'react-bootstrap';
import { calculatePrecision, precisionTruncate } from '../../../utils/precision';
import { useDataContext } from '../../../context/DataContext';

const OrderFormModal = ({ show, onHide, onSave, initialData }) => {
    const { balances, filters, panel } = useDataContext();
    const [price, setPrice] = useState('');
    const [amount, setAmount] = useState('');
    const [total, setTotal] = useState(''); // Add total state
    const [side, setSide] = useState('BUY');
    const [sliderValue, setSliderValue] = useState(0);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });


    const prevValues = useRef({ amount: '', total: '' }); // Store valid values

    const precision = useMemo(() => calculatePrecision(filters?.[panel?.selected]), [filters, panel?.selected]);
    const priceDecimals = precision?.price ?? 2;
    const quantityDecimals = precision?.quantity ?? 4;
    const notionalDecimals = precision?.notional ?? 2;
    const priceStep = precision?.tickSize ?? 0.01;
    const quantityStep = precision?.stepSize ?? 0.0001;

    const dialogRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const draggingRef = useRef(false);

    const [isEditing, setIsEditing] = useState(false);

    // Load initial data when modal opens
    useEffect(() => {
        if (!(show && initialData)) return;
        let frame = requestAnimationFrame(() => {
            const initPrice = initialData.price || '';
            const initAmount = initialData.amount || '';
            setPrice(initPrice);
            setAmount(initAmount);

            // Calculate initial total
            if (initPrice && initAmount) {
                const t = parseFloat(initPrice) * parseFloat(initAmount);
                setTotal(Number.isFinite(t) ? t.toFixed(notionalDecimals) : '');
            } else {
                setTotal('');
            }

            setSide(initialData.side || 'BUY');
            setIsEditing(!!(initialData.orderId || initialData.id));

            // Calculate initial slider percentage
            if (balances && panel) {
                const currentPrice = parseFloat(initPrice || 0);
                const currentAmount = parseFloat(initAmount || 0);

                if (currentPrice > 0 && currentAmount > 0) {
                    let percentage = 0;
                    if (initialData.side === 'BUY') {
                        const coin = panel.market === 'BTC' ? 'BTC' : 'USDT';
                        const balance = balances[coin] ? parseFloat(balances[coin].available) : 0;
                        if (balance >= 0) {
                            const totalVal = currentPrice * currentAmount;
                            const totalPower = balance + totalVal;
                            if (totalPower > 0) {
                                percentage = (totalVal / totalPower) * 100;
                            }
                        }
                    } else {
                        const baseCoin = panel.selected.replace(panel.market, '');
                        const balance = balances[baseCoin] ? parseFloat(balances[baseCoin].available) : 0;
                        const totalPower = balance + currentAmount;
                        if (totalPower > 0) {
                            percentage = (currentAmount / totalPower) * 100;
                        }
                    }
                    setSliderValue(Math.min(100, Math.max(0, Math.round(percentage))));
                } else {
                    setSliderValue(0);
                }
            } else {
                setSliderValue(0);
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [show, initialData, balances, panel, notionalDecimals]);

    const updateTotal = (p, a) => {
        if (!p || !a) {
            setTotal('');
            return;
        }
        const numericTotal = parseFloat(p) * parseFloat(a);
        if (Number.isFinite(numericTotal)) {
            setTotal(numericTotal.toFixed(notionalDecimals));
        } else {
            setTotal('');
        }
    };

    // Helper to get max available amount based on balance
    const getMaxAmount = useCallback(() => {
        if (!balances || !filters || !panel) return 0;
        const coin = panel.market === 'BTC' ? 'BTC' : 'USDT'; // Quote
        const baseCoin = panel.selected.replace(panel.market, ''); // Base

        const currentOrderNotional = isEditing && initialData.side === 'BUY' ? (parseFloat(initialData.price) * parseFloat(initialData.amount)) : 0;
        const currentOrderAmount = isEditing && initialData.side === 'SELL' ? parseFloat(initialData.amount) : 0;

        const quoteBalance = (balances[coin] ? parseFloat(balances[coin].available) : 0) + currentOrderNotional;
        const baseBalance = (balances[baseCoin] ? parseFloat(balances[baseCoin].available) : 0) + currentOrderAmount;

        if (side === 'BUY') {
            if (!price || parseFloat(price) === 0) return 0;
            return quoteBalance / parseFloat(price);
        } else {
            return baseBalance;
        }
    }, [balances, filters, panel, side, price, isEditing, initialData]);

    const handleModalEntered = useCallback((node) => {
        const dialogNode = node?.querySelector('.modal-dialog');
        dialogRef.current = dialogNode;
        setDragPosition({ x: 0, y: 0 });
        if (dialogNode) {
            dialogNode.style.transform = '';
        }
    }, []);

    const handleModalExited = useCallback(() => {
        draggingRef.current = false;
        dialogRef.current = null;
        setDragPosition({ x: 0, y: 0 });
    }, []);

    const handleDragStart = useCallback((event) => {
        if (event.button !== 0) return;
        if (event.target.closest && event.target.closest('.btn-close')) return;
        if (!dialogRef.current) return;
        draggingRef.current = true;
        dragOffsetRef.current = {
            x: event.clientX - dragPosition.x,
            y: event.clientY - dragPosition.y,
        };
        event.preventDefault();
    }, [dragPosition]);

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (!draggingRef.current) return;
            event.preventDefault();
            const nextX = event.clientX - dragOffsetRef.current.x;
            const nextY = event.clientY - dragOffsetRef.current.y;
            setDragPosition({ x: nextX, y: nextY });
        };

        const handleMouseUp = () => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;
        dialogNode.style.transform = `translate(${dragPosition.x}px, ${dragPosition.y}px)`;
    }, [dragPosition]);

    // --- Amount Handlers ---
    const handleAmountFocus = () => {
        prevValues.current.amount = amount;
    };

    const handleAmountChange = (e) => {
        const val = e.target.value;
        setAmount(val);
        updateTotal(price, val);
    };

    const handleAmountBlur = () => {
        const val = parseFloat(amount);

        if (!Number.isFinite(val) || val < 0) {
            // Invalid: revert
            setAmount(prevValues.current.amount);
            return;
        }

        const max = getMaxAmount();
        let finalAmount = val;

        if (val > max) {
            finalAmount = max;
        }

        const truncated = precisionTruncate(finalAmount, quantityDecimals);
        setAmount(truncated.toFixed(quantityDecimals));

        // Update slider
        if (max > 0) {
            const pct = (finalAmount / max) * 100;
            setSliderValue(Math.min(100, Math.max(0, Math.round(pct))));
        } else {
            setSliderValue(0);
        }
        updateTotal(price, truncated.toFixed(quantityDecimals));
    };

    // --- Total Handlers ---
    const handleTotalFocus = () => {
        prevValues.current.total = total;
    };

    const handleTotalChange = (e) => {
        setTotal(e.target.value);
    };

    const handleTotalBlur = () => {
        const val = parseFloat(total);

        if (!Number.isFinite(val) || val < 0) {
            // Invalid: revert
            setTotal(prevValues.current.total);
            return;
        }

        if (!price || parseFloat(price) === 0) return;

        let newAmount = val / parseFloat(price);
        const maxAmount = getMaxAmount();

        if (newAmount > maxAmount) {
            newAmount = maxAmount;
            // We will let the effect update the total to match the max amount * price
        }

        const truncated = precisionTruncate(newAmount, quantityDecimals);
        setAmount(truncated.toFixed(quantityDecimals));

        // If we capped it, the effect will run and update total.
        // If we didn't cap it, the effect will run and update total (possibly correcting precision).

        // Update slider
        if (maxAmount > 0) {
            const pct = (newAmount / maxAmount) * 100;
            setSliderValue(Math.min(100, Math.max(0, Math.round(pct))));
        } else {
            setSliderValue(0);
        }
        updateTotal(price, truncated.toFixed(quantityDecimals));
    };

    const handleSliderChange = (e) => {
        const val = e.target.value;
        setSliderValue(val);

        if (!balances || !filters || !panel) return;

        const maxAmount = getMaxAmount();
        const newAmount = maxAmount * (val / 100);
        const truncated = precisionTruncate(newAmount, quantityDecimals);
        const finalAmount = truncated.toFixed(quantityDecimals);
        setAmount(finalAmount);
        updateTotal(price, finalAmount);
    };

    const handleSave = () => {
        const parsedPrice = precisionTruncate(parseFloat(price), priceDecimals);
        const parsedAmount = precisionTruncate(parseFloat(amount), quantityDecimals);

        onSave({
            price: parsedPrice,
            amount: parsedAmount,
            side,
            symbol: panel.selected,
            id: initialData?.orderId || initialData?.id // Pass ID if updating
        });
        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            data-bs-theme="dark"
            className="order-form-modal"
            onEntered={handleModalEntered}
            onExited={handleModalExited}
        >
            <Modal.Header
                closeButton
                onMouseDown={handleDragStart}
                className="draggable-modal-header"
            >
                <Modal.Title>{side} {panel?.selected}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Side</Form.Label>
                        <div className="d-flex gap-2">
                            <Button
                                variant={side === 'BUY' ? 'success' : 'outline-secondary'}
                                onClick={() => setSide('BUY')}
                                className="w-50"
                                disabled={isEditing && side === 'SELL'}
                            >
                                BUY
                            </Button>
                            <Button
                                variant={side === 'SELL' ? 'danger' : 'outline-secondary'}
                                onClick={() => setSide('SELL')}
                                className="w-50"
                                disabled={isEditing && side === 'BUY'}
                            >
                                SELL
                            </Button>
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formPrice">
                        <Form.Label>Price ({panel?.market})</Form.Label>
                        <Form.Control
                            type="number"
                            step={priceStep}
                            value={price}
                            onChange={(e) => {
                                setPrice(e.target.value);
                                updateTotal(e.target.value, amount);
                            }}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formAmount">
                        <Form.Label>Amount</Form.Label>
                        <Form.Control
                            type="number"
                            step={quantityStep}
                            value={amount}
                            onChange={handleAmountChange}
                            onFocus={handleAmountFocus}
                            onBlur={handleAmountBlur}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formTotal">
                        <Form.Label>Total ({panel?.market})</Form.Label>
                        <Form.Control
                            type="number"
                            step={Math.pow(10, -notionalDecimals)}
                            value={total}
                            onChange={handleTotalChange}
                            onFocus={handleTotalFocus}
                            onBlur={handleTotalBlur}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Amount %: {sliderValue}%</Form.Label>
                        <Form.Range
                            value={sliderValue}
                            onChange={handleSliderChange}
                            className={side === 'BUY' ? 'slider-buy' : 'slider-sell'}
                            style={{
                                '--slider-fill': `${sliderValue}%`,
                                '--slider-color': side === 'BUY' ? '#198754' : '#dc3545'
                            }}
                        />
                    </Form.Group>
                </Form >
            </Modal.Body >
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant={side === 'BUY' ? 'success' : 'danger'} onClick={handleSave} data-testid="submit-order-btn">
                    {side}
                </Button>
            </Modal.Footer>
        </Modal >
    );
};

export default OrderFormModal;
