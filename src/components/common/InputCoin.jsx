import React, { useState, useEffect } from 'react'
import './InputCoin.css'
import { useDataContext } from '../../context/DataContext'

const InputCoin = () => {
    const { panel, tradePairs, handlePanelUpdate } = useDataContext();
    const [options, setOptions] = useState({ suggestions: [], input: panel.selected, focused: false })
    const [blurTimeout, setBlurTimeout] = useState(null)

    const search = (input, data) => {
        if (!input) return []
        const list = Array.isArray(data) ? data : []
        const regex = new RegExp(input, 'i')
        const matches = list.filter(item => regex.test(item)).sort()
        return matches.length > 10 ? matches.slice(0, 10) : matches
    }

    const handleInput = (event) => {
        const input = event.target.value
        setOptions(prev => ({ ...prev, input, suggestions: search(input, tradePairs) }))
    }

    const handleFocus = () => {
        if (blurTimeout) clearTimeout(blurTimeout)
        setOptions(prev => ({ ...prev, input: '', suggestions: [], focused: true }))
    }

    const handleBlur = () => {
        if (blurTimeout) clearTimeout(blurTimeout)
        const timeout = setTimeout(() => {
            setOptions(prev => ({ ...prev, input: panel.selected, suggestions: [], focused: false }))
        }, 200)
        setBlurTimeout(timeout)
    }

    const handleSuggestionClick = (value) => {
        if (blurTimeout) clearTimeout(blurTimeout)
        setOptions({ input: value, suggestions: [], focused: false })
        handlePanelUpdate({ ...panel, selected: value }, true)
    }

    useEffect(() => {
        let frame = requestAnimationFrame(() => {
            setOptions(prev => {
                if (prev.input === panel.selected || prev.focused) {
                    return prev
                }
                return {
                    ...prev,
                    input: panel.selected,
                }
            })
        })
        return () => cancelAnimationFrame(frame)
    }, [panel.selected])

    return (
        <div className="coin-input-wrapper">
            <input
                name="coin-input"
                type="text"
                className="coin-input"
                placeholder="Search pair..."
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleInput}
                value={options.input}
            />
            <div
                className="coin-dropdown"
                style={{ display: options.suggestions.length ? 'block' : 'none' }}
            >
                {options.suggestions.map((suggestion, index) => (
                    <div
                        className="coin-dropdown-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSuggestionClick(suggestion)}
                        key={index}
                    >
                        {suggestion}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default InputCoin
