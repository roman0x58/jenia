'use strict'

import flyd from 'flyd'
import R from 'ramda'
import { collectionMixin } from '../components/util'
import { dropRepeatsWith } from 'flyd/module/droprepeats'
import { env } from '../components/util'

const AppModel = collectionMixin({
    servers: flyd.stream([]),
    route: flyd.stream(),
    settings: flyd.stream({
        refreshinterval: 5,
        keepindock: false,
        saveserverpass: false,
        // On linux platforms quitonclose setting
        // by defeault should be true
        quitonclose: env.linux(),
        autoupdate: false
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
export const setting = (prop) => R.prop(prop, AppModel.settings())

const history = R.compose(flyd.scan(R.compose(R.takeLast(2), R.flip(R.append)), []), dropRepeatsWith(R.equals))
AppModel.history = history(AppModel.route)
export default AppModel