'use strict'

import R from "ramda";
import flyd from "flyd";

export const cemetery = {
    bury(key, o){
        return localStorage.setItem(key, JSON.stringify(o))
    },
    dig(key){
        return JSON.parse(localStorage.getItem(key))
    }
}

export const epitaph = (credentials) => 'appmodel-' + credentials.server + credentials.login

export const burial = (model, type) => requestAnimationFrame(() => {
    if (type === 'global') {
        const tomb = R.assoc('history', model.history(), model)
        cemetery.bury(type, tomb)
    }
    if (type === 'app') {
        if (model.jenkins()) {
            const credentials = model.jenkins().credentials()
            const tomb = credentials.default ? R.omit(['jenkins'], model) : R.pick(['bookmarks'], model)
            cemetery.bury(epitaph(credentials), tomb)
        }
    }
})
export const resurrection = (model, type) => {
    const e = type === 'app' ? epitaph(model.jenkins().credentials()) : type
    R.forEachObjIndexed((v, k) => flyd.isStream(model[k]) ? model[k](v) : model[k] = v, cemetery.dig(e))
    return model
}