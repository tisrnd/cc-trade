import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationProvider } from './NotificationProvider'
import { useNotifications } from '../hooks/useNotifications'
import { NOTIFICATION_TYPES } from '../constants/notification'
import { useEffect } from 'react'

// Test component to consume context
const TestConsumer = ({ onMount }) => {
    const context = useNotifications()

    // Call onMount with context when component mounts
    if (onMount) {
        onMount(context)
    }

    return (
        <div>
            <span data-testid="count">{context.notifications.length}</span>
            <span data-testid="history-count">{context.notificationHistory.length}</span>
            <div data-testid="notifications">
                {context.notifications.map(n => (
                    <span key={n.id} data-testid={`notification-${n.id}`}>{n.message}</span>
                ))}
            </div>
        </div>
    )
}

// Helper to get context in tests
const renderWithContext = () => {
    const contextRef = { current: null }

    const TestWrapper = () => {
        const context = useNotifications()

        // Use useEffect to avoid side effects during render
        useEffect(() => {
            contextRef.current = context
        })



        return (
            <div>
                <span data-testid="count">{context.notifications.length}</span>
                <span data-testid="history-count">{context.notificationHistory.length}</span>
                <div data-testid="notifications">
                    {context.notifications.map(n => (
                        <span key={n.id} data-testid={`notification-${n.id}`}>{n.message}</span>
                    ))}
                </div>
            </div>
        )
    }

    const result = render(
        <NotificationProvider>
            <TestWrapper />
        </NotificationProvider>
    )

    return { ...result, getContext: () => contextRef.current }
}

describe('NotificationContext', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('Provider', () => {
        it('should provide default empty state', () => {
            const { getContext } = renderWithContext()

            expect(screen.getByTestId('count').textContent).toBe('0')
            expect(screen.getByTestId('history-count').textContent).toBe('0')
            expect(getContext().notifications).toEqual([])
            expect(getContext().notificationHistory).toEqual([])
        })

        it('should throw error when used outside provider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            expect(() => {
                render(<TestConsumer />)
            }).toThrow('useNotifications must be used within a NotificationProvider')

            consoleSpy.mockRestore()
        })
    })

    describe('addNotification', () => {
        it('should add a notification', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO)
            })

            expect(screen.getByTestId('count').textContent).toBe('1')
            expect(screen.getByText('Test message')).toBeInTheDocument()
        })

        it('should return notification ID', () => {
            const { getContext } = renderWithContext()

            let id
            act(() => {
                id = getContext().addNotification('Test message')
            })

            expect(typeof id).toBe('number')
            expect(id).toBeGreaterThan(0)
        })

        it('should add notification to history', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message')
            })

            expect(screen.getByTestId('history-count').textContent).toBe('1')
            expect(getContext().notificationHistory).toHaveLength(1)
            expect(getContext().notificationHistory[0].message).toBe('Test message')
        })

        it('should include timestamp in notification', () => {
            const { getContext } = renderWithContext()
            const now = Date.now()

            act(() => {
                getContext().addNotification('Test message')
            })

            const notification = getContext().notifications[0]
            expect(notification.timestamp).toBeGreaterThanOrEqual(now)
            expect(notification.timestamp).toBeLessThanOrEqual(Date.now())
        })

        it('should support different notification types', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Info', NOTIFICATION_TYPES.INFO)
                getContext().addNotification('Success', NOTIFICATION_TYPES.SUCCESS)
                getContext().addNotification('Warning', NOTIFICATION_TYPES.WARNING)
                getContext().addNotification('Error', NOTIFICATION_TYPES.ERROR)
            })

            const notifications = getContext().notifications
            expect(notifications[0].type).toBe(NOTIFICATION_TYPES.INFO)
            expect(notifications[1].type).toBe(NOTIFICATION_TYPES.SUCCESS)
            expect(notifications[2].type).toBe(NOTIFICATION_TYPES.WARNING)
            expect(notifications[3].type).toBe(NOTIFICATION_TYPES.ERROR)
        })

        it('should default to INFO type', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message')
            })

            expect(getContext().notifications[0].type).toBe(NOTIFICATION_TYPES.INFO)
        })
    })

    describe('auto-dismiss', () => {
        it('should auto-dismiss after default duration (5000ms)', async () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message')
            })

            expect(screen.getByTestId('count').textContent).toBe('1')

            act(() => {
                vi.advanceTimersByTime(5000)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })

        it('should auto-dismiss after custom duration', async () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO, 2000)
            })

            expect(screen.getByTestId('count').textContent).toBe('1')

            act(() => {
                vi.advanceTimersByTime(2000)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })

        it('should not auto-dismiss when duration is 0', async () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO, 0)
            })

            expect(screen.getByTestId('count').textContent).toBe('1')

            act(() => {
                vi.advanceTimersByTime(10000)
            })

            // Should still be there
            expect(screen.getByTestId('count').textContent).toBe('1')
        })
    })

    describe('dismissNotification', () => {
        it('should dismiss a specific notification by ID', () => {
            const { getContext } = renderWithContext()

            let id
            act(() => {
                id = getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO, 0)
            })

            expect(screen.getByTestId('count').textContent).toBe('1')

            act(() => {
                getContext().dismissNotification(id)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })

        it('should clear timeout when dismissed manually', () => {
            const { getContext } = renderWithContext()

            let id
            act(() => {
                id = getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO, 5000)
            })

            act(() => {
                getContext().dismissNotification(id)
            })

            // Advancing time should not cause any issues (timeout was cleared)
            act(() => {
                vi.advanceTimersByTime(10000)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })

        it('should not affect history when dismissing', () => {
            const { getContext } = renderWithContext()

            let id
            act(() => {
                id = getContext().addNotification('Test message', NOTIFICATION_TYPES.INFO, 0)
            })

            act(() => {
                getContext().dismissNotification(id)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
            expect(screen.getByTestId('history-count').textContent).toBe('1')
        })
    })

    describe('dismissAllNotifications', () => {
        it('should dismiss all active notifications', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Message 1', NOTIFICATION_TYPES.INFO, 0)
                getContext().addNotification('Message 2', NOTIFICATION_TYPES.INFO, 0)
                getContext().addNotification('Message 3', NOTIFICATION_TYPES.INFO, 0)
            })

            expect(screen.getByTestId('count').textContent).toBe('3')

            act(() => {
                getContext().dismissAllNotifications()
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })

        it('should clear all pending timeouts', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Message 1')
                getContext().addNotification('Message 2')
            })

            act(() => {
                getContext().dismissAllNotifications()
            })

            // Advancing time should not cause any errors
            act(() => {
                vi.advanceTimersByTime(10000)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })
    })

    describe('clearHistory', () => {
        it('should clear notification history', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Message 1')
                getContext().addNotification('Message 2')
            })

            expect(screen.getByTestId('history-count').textContent).toBe('2')

            act(() => {
                getContext().clearHistory()
            })

            expect(screen.getByTestId('history-count').textContent).toBe('0')
        })

        it('should not affect active notifications', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().addNotification('Message', NOTIFICATION_TYPES.INFO, 0)
            })

            act(() => {
                getContext().clearHistory()
            })

            expect(screen.getByTestId('count').textContent).toBe('1')
            expect(screen.getByTestId('history-count').textContent).toBe('0')
        })
    })

    describe('convenience methods', () => {
        it('notifyInfo should create INFO notification', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().notifyInfo('Info message')
            })

            expect(getContext().notifications[0].type).toBe(NOTIFICATION_TYPES.INFO)
            expect(getContext().notifications[0].message).toBe('Info message')
        })

        it('notifySuccess should create SUCCESS notification', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().notifySuccess('Success message')
            })

            expect(getContext().notifications[0].type).toBe(NOTIFICATION_TYPES.SUCCESS)
        })

        it('notifyWarning should create WARNING notification', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().notifyWarning('Warning message')
            })

            expect(getContext().notifications[0].type).toBe(NOTIFICATION_TYPES.WARNING)
        })

        it('notifyError should create ERROR notification with longer duration', () => {
            const { getContext } = renderWithContext()

            act(() => {
                getContext().notifyError('Error message')
            })

            expect(getContext().notifications[0].type).toBe(NOTIFICATION_TYPES.ERROR)

            // Should still be there after 5 seconds (default duration)
            act(() => {
                vi.advanceTimersByTime(5000)
            })

            expect(screen.getByTestId('count').textContent).toBe('1')

            // Should be dismissed after 8 seconds (error default)
            act(() => {
                vi.advanceTimersByTime(3000)
            })

            expect(screen.getByTestId('count').textContent).toBe('0')
        })
    })

    describe('history limit', () => {
        it('should limit history to 100 items', () => {
            const { getContext } = renderWithContext()

            act(() => {
                for (let i = 0; i < 110; i++) {
                    getContext().addNotification(`Message ${i}`, NOTIFICATION_TYPES.INFO, 0)
                }
            })

            expect(getContext().notificationHistory.length).toBe(100)
        })

        it('should keep most recent notifications in history', () => {
            const { getContext } = renderWithContext()

            act(() => {
                for (let i = 0; i < 110; i++) {
                    getContext().addNotification(`Message ${i}`, NOTIFICATION_TYPES.INFO, 0)
                }
            })

            // Most recent should be first in history
            expect(getContext().notificationHistory[0].message).toBe('Message 109')
        })
    })

    describe('unique IDs', () => {
        it('should generate unique IDs for each notification', () => {
            const { getContext } = renderWithContext()

            const ids = []
            act(() => {
                for (let i = 0; i < 10; i++) {
                    ids.push(getContext().addNotification(`Message ${i}`, NOTIFICATION_TYPES.INFO, 0))
                }
            })

            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(10)
        })

        it('should generate incrementing IDs', () => {
            const { getContext } = renderWithContext()

            let id1, id2, id3
            act(() => {
                id1 = getContext().addNotification('Message 1', NOTIFICATION_TYPES.INFO, 0)
                id2 = getContext().addNotification('Message 2', NOTIFICATION_TYPES.INFO, 0)
                id3 = getContext().addNotification('Message 3', NOTIFICATION_TYPES.INFO, 0)
            })

            expect(id2).toBeGreaterThan(id1)
            expect(id3).toBeGreaterThan(id2)
        })
    })
})

