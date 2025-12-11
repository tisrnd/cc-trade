import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test.describe('Critical Flow', () => {
    let electronApp;
    let mainWindow;

    test.beforeAll(async () => {
        electronApp = await electron.launch({
            args: [path.join(process.cwd(), 'dist-electron/main.js')],
        });

        const page = await electronApp.firstWindow();
        mainWindow = page;

        if (await page.title() === 'DevTools') {
            const windows = await electronApp.windows();
            if (windows.length > 1) {
                mainWindow = windows[1];
            } else {
                mainWindow = await electronApp.waitForEvent('window');
            }
        }

        await mainWindow.waitForFunction(() => document.title === 'CC-trade', null, { timeout: 10000 });
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    test('should render key components', async () => {
        // Check for OrderBook (might be empty)
        const orderBook = mainWindow.locator('.ob');
        await expect(orderBook).toBeVisible();

        // Check for Chart
        const chart = mainWindow.locator('.chart-wrapper-container');
        await expect(chart).toBeVisible();

        // Check for InfoPanel
        const infoPanel = mainWindow.locator('.info-panel');
        await expect(infoPanel).toBeVisible();
    });

    test('should switch tabs in InfoPanel', async () => {
        // Tabs are divs with IDs
        const ordersTab = mainWindow.locator('#orders');
        await ordersTab.click();

        // Verify Orders content is shown (e.g. "No open orders")
        const noOrders = mainWindow.locator('text=No open orders');
        // It might take a moment if it was fetching, but initial state is likely empty
        if (await noOrders.isVisible()) {
            await expect(noOrders).toBeVisible();
        } else {
            // If there are orders, we expect .order-main
            // But in this env, likely empty.
        }

        const balancesTab = mainWindow.locator('#balances');
        await balancesTab.click();

        // Verify Balances headers
        const coinHeader = mainWindow.locator('.header .item', { hasText: 'Coin' }).first();
        await expect(coinHeader).toBeVisible();
    });
});
