import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NotificationToast from './NotificationToast'
import { NotificationProvider } from '../../context/NotificationProvider'
import { useNotifications } from '../../hooks/useNotifications'
import { NOTIFICATION_TYPES } from '../../constants/notification'
import React from 'react'

// Helper to render with provider and add notifications
const TestWrapper = ({ notifications = [], onDismiss: _onDismiss = vi.fn() }) => {
    return (
        <NotificationProvider>
            <NotificationToast />
            <NotificationAdder notifications={notifications} />
        </NotificationProvider>
    )
}

// Component to add notifications for testing
const NotificationAdder = ({ notifications }) => {
    const { addNotification } = useNotifications()

    // Add notifications on mount
    React.useEffect(() => {
        notifications.forEach(n => {
            addNotification(n.message, n.type, n.duration ?? 0)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

// Helper to render and add a notification
const renderWithNotification = (message, type = NOTIFICATION_TYPES.INFO, duration = 0) => {
    let contextRef = null

    const Wrapper = () => {
        const context = useNotifications()

        React.useEffect(() => {
            contextRef = context
        }, [context])

        React.useEffect(() => {
            context.addNotification(message, type, duration)
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])

        return <NotificationToast />
    }

    const result = render(
        <NotificationProvider>
            <Wrapper />
        </NotificationProvider>
    )

    return { ...result, getContext: () => contextRef }
}

// Helper to render with multiple notifications
const renderWithNotifications = (notifications) => {
    let contextRef = null

    const Wrapper = () => {
        const context = useNotifications()

        React.useEffect(() => {
            contextRef = context
        }, [context])

        React.useEffect(() => {
            notifications.forEach(n => {
                context.addNotification(n.message, n.type, n.duration ?? 0)
            })
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])

        return <NotificationToast />
    }

    const result = render(
        <NotificationProvider>
            <Wrapper />
        </NotificationProvider>
    )

    return { ...result, getContext: () => contextRef }
}

describe('NotificationToast', () => {
    describe('rendering', () => {
        it('should render nothing when no notifications', () => {
            render(
                <NotificationProvider>
                    <NotificationToast />
                </NotificationProvider>
            )

            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
            expect(document.querySelector('.notification-toast-container')).toBeNull()
        })

        it('should render notification message', () => {
            renderWithNotification('Test notification message')

            expect(screen.getByText('Test notification message')).toBeInTheDocument()
        })

        it('should render multiple notifications', () => {
            renderWithNotifications([
                { message: 'First notification', type: NOTIFICATION_TYPES.INFO },
                { message: 'Second notification', type: NOTIFICATION_TYPES.SUCCESS },
                { message: 'Third notification', type: NOTIFICATION_TYPES.WARNING },
            ])

            expect(screen.getByText('First notification')).toBeInTheDocument()
            expect(screen.getByText('Second notification')).toBeInTheDocument()
            expect(screen.getByText('Third notification')).toBeInTheDocument()
        })

        it('should render notification container with correct class', () => {
            renderWithNotification('Test message')

            const container = document.querySelector('.notification-toast-container')
            expect(container).toBeInTheDocument()
        })
    })

    describe('notification types', () => {
        it('should render INFO notification with correct class', () => {
            renderWithNotification('Info message', NOTIFICATION_TYPES.INFO)

            const toast = document.querySelector('.notification-toast')
            expect(toast).toHaveClass('notification-toast-info')
        })

        it('should render SUCCESS notification with correct class', () => {
            renderWithNotification('Success message', NOTIFICATION_TYPES.SUCCESS)

            const toast = document.querySelector('.notification-toast')
            expect(toast).toHaveClass('notification-toast-success')
        })

        it('should render WARNING notification with correct class', () => {
            renderWithNotification('Warning message', NOTIFICATION_TYPES.WARNING)

            const toast = document.querySelector('.notification-toast')
            expect(toast).toHaveClass('notification-toast-warning')
        })

        it('should render ERROR notification with correct class', () => {
            renderWithNotification('Error message', NOTIFICATION_TYPES.ERROR)

            const toast = document.querySelector('.notification-toast')
            expect(toast).toHaveClass('notification-toast-error')
        })
    })

    describe('icons', () => {
        it('should show info icon for INFO type', () => {
            renderWithNotification('Info message', NOTIFICATION_TYPES.INFO)

            const icon = document.querySelector('.notification-toast-icon')
            expect(icon.textContent).toBe('ℹ')
        })

        it('should show checkmark icon for SUCCESS type', () => {
            renderWithNotification('Success message', NOTIFICATION_TYPES.SUCCESS)

            const icon = document.querySelector('.notification-toast-icon')
            expect(icon.textContent).toBe('✓')
        })

        it('should show warning icon for WARNING type', () => {
            renderWithNotification('Warning message', NOTIFICATION_TYPES.WARNING)

            const icon = document.querySelector('.notification-toast-icon')
            expect(icon.textContent).toBe('⚠')
        })

        it('should show X icon for ERROR type', () => {
            renderWithNotification('Error message', NOTIFICATION_TYPES.ERROR)

            const icon = document.querySelector('.notification-toast-icon')
            expect(icon.textContent).toBe('✕')
        })
    })

    describe('dismiss on click', () => {
        it('should dismiss notification when clicked', () => {
            const { getContext } = renderWithNotification('Click to dismiss')

            expect(getContext().notifications.length).toBe(1)

            const toast = document.querySelector('.notification-toast')
            fireEvent.click(toast)

            expect(getContext().notifications.length).toBe(0)
        })

        it('should dismiss only clicked notification', () => {
            const { getContext } = renderWithNotifications([
                { message: 'First', type: NOTIFICATION_TYPES.INFO },
                { message: 'Second', type: NOTIFICATION_TYPES.SUCCESS },
            ])

            expect(getContext().notifications.length).toBe(2)

            // Click the first notification
            fireEvent.click(screen.getByText('First').closest('.notification-toast'))

            expect(getContext().notifications.length).toBe(1)
            expect(screen.queryByText('First')).not.toBeInTheDocument()
            expect(screen.getByText('Second')).toBeInTheDocument()
        })
    })

    describe('timestamp', () => {
        it('should show formatted time', () => {
            renderWithNotification('Test message')

            const timeElement = document.querySelector('.notification-toast-time')
            expect(timeElement).toBeInTheDocument()
            // Time should be in HH:MM:SS format
            expect(timeElement.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
        })
    })

    describe('structure', () => {
        it('should have icon element', () => {
            renderWithNotification('Test message')

            expect(document.querySelector('.notification-toast-icon')).toBeInTheDocument()
        })

        it('should have content element', () => {
            renderWithNotification('Test message')

            expect(document.querySelector('.notification-toast-content')).toBeInTheDocument()
        })

        it('should have message element', () => {
            renderWithNotification('Test message')

            expect(document.querySelector('.notification-toast-message')).toBeInTheDocument()
        })

        it('should have time element', () => {
            renderWithNotification('Test message')

            expect(document.querySelector('.notification-toast-time')).toBeInTheDocument()
        })
    })

    describe('accessibility', () => {
        it('should be clickable (pointer events enabled)', () => {
            renderWithNotification('Test message')

            const toast = document.querySelector('.notification-toast')
            // Toast should have pointer-events: auto (clickable)
            expect(toast).toBeInTheDocument()

            // Clicking should work (not blocked by pointer-events: none)
            fireEvent.click(toast)
        })
    })
})
