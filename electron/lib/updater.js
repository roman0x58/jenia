'use strict'

const { autoUpdater } = require('electron')
const os = require('os')
const R = require('ramda')
const request = require('./request')
const semver = require('semver')
const flyd = require('flyd')
const paths = require('./paths')
const env = require('./env')
const filter = require('flyd/module/filter')
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
const assets = flyd.stream()
const updates = flyd.stream()

filter(R.complement(R.isNil), assets).map((u) => {
    env.whenDarwin(() =>
        fs.writeFile(paths.pkg('latest.json'), JSON.stringify(u), (err) => {
            if (err) throw err
            autoUpdater.setFeedURL('file://' + paths.pkg('latest.json'))
            autoUpdater.checkForUpdates()
        })
    )
    env.whenWin32(() => {
        autoUpdater.setFeedURL(feedURL(u.url))
        autoUpdater.checkForUpdates()
    })
})

const checkUpdates = async () => {
    const latest = await releases.latest()
    const latestVersion = semver.clean(latest ? latest.tag_name : '0.0.0')
    return new Promise((resolve, reject) => {
        if (semver.gt(latestVersion, version)) {
            const asset = findAssets(latest.assets)
            if (!R.isEmpty(asset)) {
                asset
                    .map(a => ({ url: a.browser_download_url, pub_date: a.created_at }))
                    .map(R.assoc('version', latestVersion))
                    .map(R.assoc('notes', latestVersion))
                    .map(assets)

                autoUpdater.once('update-not-available', () => reject('An error occured while fetching an update for version - ' + latestVersion))
                autoUpdater.once('update-downloaded', () => resolve(updates(assets())))
                autoUpdater.once('error', (e) => reject(e.message))
            } else {
                reject('Asset not found for version - ' + latestVersion)
            }
        } else {
            resolve(updates(null))
        }
    })
}

const installUpdate = autoUpdater.quitAndInstall

module.exports = {
    checkUpdates,
    installUpdate,
    updates
}