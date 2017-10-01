'use strict'

const { autoUpdater, shell } = require('electron')
const os = require('os')
const R = require('ramda')
const request = require('./request')
const semver = require('semver')
const flyd = require('flyd')
const paths = require('./paths')
const em = require('events')
const env = require('./env')
const fs = require('fs')

const { version, repository } = require('../package.json')

const api = (repo) => {
    const r = request('api.github.com')
    return {
        latest: () => r(`/repos/${repo}/releases/latest`).get()
    }
}

const releases = api(R.head(repository.url.match(/[^\/]+\/\w+$/gm)))

// --- assets
const filterAssets = R.compose(R.test(new RegExp(`${os.platform()}.*?${os.arch()}`, 'gi')), R.prop('browser_download_url'))
const findAssets = R.filter(filterAssets)
const feedURL = (str) => R.slice(0, R.lastIndexOf('/')(str))(str)
const asset = flyd.stream()
const assoc = (prop, v) => asset(prop && v ? R.assoc(prop, v, asset()) : R.merge(asset(), prop))()

const download = async () => {
    if (env.darwin()) {
        fs.writeFile(paths.pkg('latest.json'), JSON.stringify(asset()), (err) => {
            if (err) localUpdater.emit('error', assoc({ state: 'error', message: err }))
            autoUpdater.setFeedURL('file://' + paths.pkg('latest.json'))
            autoUpdater.checkForUpdates()
        })
    } else if (env.win32()) {
        autoUpdater.setFeedURL(feedURL(asset().url))
        autoUpdater.checkForUpdates()
    } else {
        shell.openExternal(asset().url)
        return asset()
    }

    autoUpdater.once('update-not-available', () => localUpdater.emit('error', assoc({ state: 'error', message: 'An error occured while fetching an update for version - ' + R.prop('version', asset()) })))
    return assoc('state', 'downloading')
}

autoUpdater.on('update-downloaded', () => localUpdater.emit('ready', assoc('state', 'ready')))
autoUpdater.on('error', (e) => localUpdater.emit('error', assoc({ state: 'error', message: e.message })))

const checkAsset = async () => {
    if (asset() && R.either(R.equals('downloading'), R.equals('ready'))(asset().state)) return asset()

    const latest = await releases.latest()
    const latestVersion = semver.clean(latest ? latest.tag_name : '0.0.0')

    if (semver.gt(latestVersion, version)) {
        const latestAsset = findAssets(latest.assets)
        if (!R.isEmpty(latestAsset)) {
            latestAsset
                .map(a => ({ url: a.browser_download_url, pub_date: a.created_at, state: null }))
                .map(R.assoc('version', latestVersion))
                .map(R.assoc('notes', latestVersion))
                .map(asset)

            return assoc('state', 'available')
        } else {
            localUpdater.emit('error', 'Asset not found for version - ' + latestVersion)
            return assoc('state', null)
        }
    } else {
        return assoc('state', null)
    }
}

const install = () => autoUpdater.quitAndInstall()

const localUpdater = {
    checkAsset,
    install,
    download
}

Object.setPrototypeOf(localUpdater, em.EventEmitter.prototype)

module.exports = localUpdater
