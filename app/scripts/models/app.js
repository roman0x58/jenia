'use strict'

import flyd from 'flyd'
import R from 'ramda'
import { collectionMixin } from '../components/util'
import { dropRepeatsWith } from 'flyd/module/droprepeats'

const AppModel = collectionMixin({
    servers: flyd.stream([]),
    route: flyd.stream(),
    settings: flyd.stream({
        keepindock: false,
        saveserverpass: false,
        quitonclose: false
    }),
    default(credentials, state) {
        const def = (state, crds) => AppModel.update('servers', R.assoc('default', state, crds), serverIndex(crds))
        if (R.equals(true, state)) {
            let servers = AppModel.servers()
            let current = defaultServer(servers)
            if (current) {
                def(false, current)
            }
        }
        return def(state, credentials)
    }
})

export const serverPredicate = (credentials) => R.whereEq(R.pick(['server', 'login'], credentials))
export const serverIndex = (credentials) => R.findIndex(serverPredicate(credentials), AppModel.servers())
export const findServer = (credentials) => R.find(serverPredicate(credentials), AppModel.servers())
export const defaultServer = R.find(R.propEq('default', true))

const history = R.compose(flyd.scan(R.compose(R.takeLast(2), R.flip(R.append)), []), dropRepeatsWith(R.eqProps('name')))
AppModel.history = history(AppModel.route)

export default AppModel