'use strict'

const R = require('ramda')

module.exports = (app, win, bookmarks = [], jobs = []) => {
    let template = [
        {
            label: 'Bookmarks',
            enabled: !R.isEmpty(bookmarks),
            submenu: bookmarks
        },
        {
            type: 'separator'
        },
        {
            label: win.isVisible() ? 'Hide app' : 'Show app',
            click: app.toggleVisible
        },
        {
            label: 'Bring to Front',
            click: () => {
                if (!win.isVisible()) {
                    app.toggleVisible()
                }
                win.focus()
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'About',
            click() {
                if (!win.isVisible()) {
                    app.toggleVisible()
                }
                win.webContents.send('route', { path: 'settings', attrs: { page: 'About' } })
            }
        },
        {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
                app.willQuitApp = true
                app.quit()
            }
        }
    ]

    if (jobs.length > 0) {
        template = R.flatten([
            { label: 'Current buildings', disabled: true },
            { type: 'separator' },
            jobs,
            { type: 'separator' },
            template
        ])
    }

    return template
}