import { ipcRequest } from '../services/ipc'
import flyd from 'flyd'
import R from 'ramda'

const tapNil = (fn) => R.compose(R.always(null), fn)
const values = flyd.scan(R.flip(R.append), [])

export const requests  = flyd.stream()
export const errors    = flyd.stream()
export const responses = requests.map((r) => ipcRequest(r).catch(tapNil(errors)))

export const syncing  = flyd.combine((req, resp) => req().length > resp().length, [requests, responses].map(values))

export const installUpdate   = () => requests('install-update')
export const checkForUpdates = () => requests('check-updates')
export const updateAvailable = responses.map(R.complement(R.isNil))