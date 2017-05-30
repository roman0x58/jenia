'use strict'

import R from 'ramda'
import AppModel from './models/app'
import App from './app'

export default {
    dispatch(action, ...args) {
        let a = R.split('.', action),
            m

        if(a.length > 1){
            [m, action] = a
        }
        switch (m) {
            case 'settings':
                m = AppModel
                break
            default:
                m = App.model
        }
        return m[action].apply(m, args)
    }
}