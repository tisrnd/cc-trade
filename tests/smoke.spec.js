import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test('app launches', async () => {
    const electronApp = await electron.launch({
        args: [path.join(process.cwd(), 'dist-electron/main.js')],
    });

    // Wait for the first window
    const page = await electronApp.firstWindow();
    console.log('First window title:', await page.title());
    let mainWindow = page;

    if (await page.title() === 'DevTools') {
        console.log('First window is DevTools, waiting for next window...');
        // Check if there is already a second window
        const windows = await electronApp.windows();
        if (windows.length > 1) {
            mainWindow = windows[1];
            console.log('Found second window already open:', await mainWindow.title());
        } else {
            mainWindow = await electronApp.waitForEvent('window');
            console.log('Second window opened:', await mainWindow.title());
        }
    }

    console.log('Waiting for title "CC-trade" on window:', await mainWindow.title());
    // Wait for title to be correct (in case it's loading)
    await mainWindow.waitForFunction(() => document.title === 'CC-trade', null, { timeout: 5000 });
    expect(await mainWindow.title()).toBe('CC-trade');

    await electronApp.close();
});
