'use strict'

const { app, Tray, BrowserWindow, Menu, ipcMain, nativeImage } = require('electron')
const { checkUpdates, installUpdate } = require('./lib/updater')
const paths = require('./lib/paths')
const pkg = require('./package.json')
const moment = require('moment')
const R = require('ramda')
const trayTemplate = require('./menus/traymenu')
const appMenuTemplate = require('./menus/appmenu')
const env = require('./lib/env')
const mapIndexed = R.addIndex(R.map)
if (require('./lib/squirrel')) { app.quit() }

let appWindow = null,
    bookmarks = [],
    buildingJobs = [],
    settings = null,
    tray = null

const buildTrayMenu = R.partial(R.compose(Menu.buildFromTemplate, trayTemplate), [app])
const forwardWindowEvents = (evts) =>
    evts.forEach(evt => appWindow.on(evt, (e) => appWindow.webContents.send('browser-window-' + evt, e)))
app.setName(pkg.title)

global.shared = R.pick(['title', 'version', 'author', 'homepage'], pkg)
global.shared.platform = process.platform

app.rebuildTray = () => tray.setContextMenu(R.apply(buildTrayMenu, [appWindow, bookmarks, buildingJobs]))
app.toggleVisible = () => {
    appWindow.isVisible() ? appWindow.hide() : appWindow.show()
    app.rebuildTray()
}

// const calcBuildDuration = (build) => Math.min((moment().valueOf() - build.timestamp) / build.estimatedDuration * 100, 100)
// const isJobFinished = R.propEq('progress', 100)

// ipcMain.on('building', (e, jobs) => {
//     jobs = jobs.map((i) => ({ label: i.name + ' - ' + Math.round(calcBuildDuration(i.lastBuild)) + '%', progress: Math.round(calcBuildDuration(i.lastBuild))}))
//     let [finished, building] = R.partition(isJobFinished, jobs)
//     buildingJobs = building
//     finished.map((i) => console.log('Finished', i))
//     app.rebuildTray()
// })

ipcMain.on('settings', (e, s) => {
    settings = s
    env.whenDarwin(() => {
        let isKeepInDock = R.equals(settings.keepindock, true)
        if (isKeepInDock && !app.dock.isVisible()) {
            app.dock.show()
        } else if (!isKeepInDock) {
            app.dock.hide()
        }
    })
})

ipcMain.on('window', (e, v) => e.returnValue = appWindow[v.method]())
ipcMain.on('bookmarks', (e, v) => {
    if (R.is(Array, v)) {
        v = mapIndexed((i, idx) => ({
            label: R.prop('name', i),
            accelerator: 'CmdOrCtrl+' + R.add(1, idx),
            click: () => e.sender.send('build', i)
        }))(v)
        bookmarks = v
        app.rebuildTray()
    }
})

function createWindow() {
    app.willQuitApp = false
    appWindow = new BrowserWindow({
        width: 960,
        maxWidth: 960,
        minWidth: 730,
        height: 800,
        title: pkg.title,
        frame: false,
        icon: nativeImage.createFromPath(paths.pkg('resources/linux/icon.png')),
        nodeIntegration: false,
        fullscreenable: false,
        resizable: true
    })

    if (!tray) {
        tray = new Tray(paths.pkg(`resources/${process.platform}/tray.png`))
        env.whenDarwin(() => tray.setPressedImage(paths.pkg('resources/darwin/trayactive.png')))

        const contextMenu = Menu.buildFromTemplate(trayTemplate(app, appWindow))

        tray.setToolTip(pkg.title)
        tray.setContextMenu(contextMenu)
    }
    // TODO! This is working only on OS X
    const appMenu = Menu.buildFromTemplate(appMenuTemplate(appWindow))
    Menu.setApplicationMenu(appMenu)

    appWindow.loadURL('file://' + paths.pkg('build/index.html'))

    // Forward some events to renderer
    forwardWindowEvents(['blur', 'focus', 'show'])

    appWindow.on('close', (e) => {
        if (app.willQuitApp !== true && settings.quitonclose !== true) {
            e.preventDefault()
            appWindow.hide()
        }
        else {
            app.quit()
        }
        return false
    })

    R.forEach((e) => appWindow.on(e, app.rebuildTray), ['minimize', 'hide', 'show'])
}

app.on('activate', () => R.isNil(appWindow) ? createWindow() : appWindow.show())
app.on('ready', createWindow)
app.on('before-quit', () => app.willQuitApp = true)
app.on('will-quit', () => appWindow = null)

const send = R.curryN(2, (evt, value) => appWindow.webContents.send(evt, value))
ipcMain.on('request', (e, v) => {
    R.cond([
        [R.equals('install-update'), installUpdate],
        [R.equals('check-updates'), checkUpdates],
        [R.T, (msg) => { throw new Error('Unknown message type ' + msg) }]
    ])(v.msgType).then(send(v.msgType)).catch(send(v.msgType + 'fail'))
})
