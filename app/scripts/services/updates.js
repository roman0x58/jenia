import { ipcRequest } from '../services/ipc'
import flyd from 'flyd'
import $filter from 'flyd/module/filter'
import R from 'ramda'
import m from 'mithril'
import { setting } from '../models/app'
import notifications from '../components/notifications'
import u from '../components/util'

const values = flyd.scan(R.flip(R.append), [])

const requests = flyd.stream()
const responses = requests.map(v => ipcRequest(v).catch(e => ({ state: 'error', message: e })))
const syncing = flyd.combine((req, resp) => req().length > resp().length, [requests, responses].map(values))
const asset = $filter(R.complement(R.isNil), responses)

renderer.on('asset-ready', (e, v) => asset(v))
renderer.on('asset-error', (e, v) => asset(v))

const peq = R.propEq('state')

$filter(peq('error'), asset).map(R.prop('message')).map(() => notifications.warn(
    'Sorry, an error occured, while updating Jenia, please click here to download the update directly from github and install manually.',
    {
        dismissable: false, onclick: () =>
            window.openExternal(asset() ? asset().url : window.shared.githubUrl)
    }
)
)
$filter(R.both(peq('available'), () => setting('autoupdate')), asset).map(() => requests('download-asset'))

export const update = {
    // note: returning undefined will not trigger an update to the stream
    state: flyd.immediate(flyd.combine((state, sync, me) => { me(sync() ? 'syncing' : state()) }, [asset.map(R.prop('state')), syncing])),
    install: () => requests('install'),
    check: () => requests('check-asset'),
    download: () => requests('download-asset')
}

update.state.map(m.redraw)

// Updates indicator
const svg = R.when(R.complement(R.isNil), R.curry(R.binary(u.svg))(R.__, 'jn-update-status__svg'))

export const indicator = () => {
    const state = R.or(update.state(), 'ok')
    const status = (message, attrs) =>
        m(`span.jn-update-status.jn-update-status--${state}`, [svg(attrs.svg), m('span.jn-update-status__msg', R.omit('svg', attrs), message)])
    const is = R.equals(state)
    if (R.or(is('syncing'), is('downloading')))
        return status(state === 'syncing' ? 'Checking for updates' : 'Downloading update', { svg: 'sync' })
    if (is('available'))
        return status('Download update', { onclick: update.download, svg: 'arrow-down' })
    if (is('ready'))
        return status('Install update', { onclick: update.install, svg: 'package' })
    if (is('error'))
        return status('Oops, something went wrong :\'(', { svg: 'x' })
    if (is('ok'))
        return status('Jenia is up to date', { svg: 'check' })
}