'use strict'
import m from 'mithril'
import R from 'ramda'
import flyd from 'flyd'
import logLevel from 'loglevel'
import { Maybe } from 'ramda-fantasy'

export const transform = R.curry((func, stream) => R.compose(stream, func, R.call)(stream))
export const $rm = R.compose(transform, R.without, R.of)
export const $update = R.compose(transform, R.update)
export const $add = R.compose(transform, R.append)
export const expandPath = (pathName, target) => pathName.split('.').reduce((model, path) => model[path], target)
export const withProps = (props, fn) => R.compose(
    R.apply(fn),
    R.unapply(R.converge(R.concat, [R.compose(R.props(props), R.head), R.tail]))
)

const factory = logLevel.methodFactory
logLevel.setDefaultLevel(logLevel.levels.TRACE)
logLevel.methodFactory = (methodName, logLevel, loggerName) => {
    const m = factory(methodName, logLevel, loggerName)
    return function (message, ...args) {
        if (R.is(Object, message)) {
            args = R.append(message, args)
            message = 'dump object'
        }
        try {
            m.apply(logLevel, R.concat([`%c[${loggerName}] %c` + message, 'font-weight:bold', 'font-weight:normal'], args))
        } catch (e) {
            //
        }

    }
}

export const logFactory = logLevel

export const streamify = (fn) => (stream) => fn(stream())

export const withoutRedraw = (fn, ...args) => R.juxt([(e) => e.redraw = false, fn])(...args)
export const capitalize = R.compose(
    R.join(''),
    R.juxt([R.compose(R.toUpper, R.head), R.tail])
)
export const promisify = (fn, timeout) => (vnode) => {
    fn(vnode)
    return new Promise((resolve) => setTimeout(resolve, timeout))
}
const platforms = ['linux', 'darwin', 'win32']
export const platform = R.fromPairs(R.map((k) => [k, R.always(R.equals(window.shared.platform, k))])(platforms))
export const env = R.fromPairs(R.chain((logic) =>
    R.map(([m, p]) => [m, (v) => R[logic](platform[p], R.is(Function, v) ? v : R.always(v))(R.T)]
        , R.map((p) => [R.concat(logic, capitalize(p)), p], platforms)),
    ['unless', 'when']))

export const checkPaths = R.curry((route, paths) =>
    R.any(R.equals(route.name))(R.ifElse(R.is(Array), R.identity, R.of)(paths)))

const log = logLevel.getLogger('app')
export const collectionMixin = (target) => R.merge(target, ({
    add(pathName, item) {
        log.debug(`[collection] Adding an item from ${pathName}`, item)
        return $add(item)(expandPath(pathName, target))
    },

    del(pathName, item) {
        log.debug(`[collection] Removing an item from ${pathName}`, item)
        return $rm(item)(expandPath(pathName, target))
    },

    update(pathName, item, idx) {
        log.debug(`[collection] Updating an item from ${pathName}`, item)
        return $update(idx, item)(expandPath(pathName, target))
    },

    addOrUpdate(pathName, item, predicate) {
        const collection = expandPath(pathName, target)()
        const idx = R.findIndex(predicate(item), collection)

        R.invoker(3, idx === -1 ? 'add' : 'update')(pathName, item, idx)(this)
    }
}))

export default {
    id: (prefix = '') => {
        const id = Math.random().toString(16).slice(2)
        return `${prefix + id}`
    },
    contains: R.curry((needle, str) => str.includes(needle)),
    toArray: R.ifElse(R.is(Array), R.identity, R.of),
    exists: (m, f) => Maybe(m).map(f).getOrElse(false),
    classy: R.compose(R.join(' '), R.keys, R.pickBy((v) => R.equals(true, v))),
    toM: (f) => ({ view: f }),
    isM: (o) => R.is(Function, R.prop('view', o)),
    throttle: function (fn, delay) {
        let timeout
        return function () {
            if (!timeout) {
                timeout = setTimeout(() => {
                    timeout = 0
                    fn.apply(this, Array.prototype.slice.call(arguments))
                }, delay)
            }
        }
    },
    debounce: function (fn, wait, immidiate) {
        let timeout
        return function () {
            clearTimeout(timeout)
            if (immidiate && !timeout) {
                fn.apply(this, Array.prototype.slice.call(arguments))
            }
            timeout = setTimeout(() => {
                timeout = null
                fn.apply(this, Array.prototype.slice.call(arguments))
            }, (wait || 1))
        }
    },
    // Working on an object, you can set or get value from it
    // firstly you should initialize an object passing it in this function, and you'll get a curried function
    // Thus if you provide array of props in the curried function then it returns an object with the plucked props
    // e.g config(['class']) -> { class : 'some class' }
    config: R.curryN(2, (stream, prop, value) => {
        stream = R.ifElse(flyd.isStream, R.identity, flyd.stream)(stream)

        if (R.and(R.is(Object, prop), !R.is(Array, prop))) {
            return stream(R.merge(stream(), prop))
        }
        const proceed = (p) => {
            const lens = R.lensProp(p)

            const streamInvoke = R.ifElse(flyd.isStream, R.call, R.identity)
            const isGetter = R.always(R.equals(value, undefined))
            const getValue = R.view(lens)
            const setValue = R.set(lens, value)

            return R.ifElse(isGetter,
                // config getter
                R.compose(streamInvoke, getValue),
                // config setter
                R.compose(stream, setValue)
            )(stream())
        }
        return R.is(Array)(prop) ? R.zipObj(prop, R.map(proceed, prop)) : proceed(prop)

    }),
    svg: (name, cls = '', handler) => {
        return m('svg', { class: R.trim('jn-icon ' + cls), onclick: handler }, m('use', { 'xlink:href': `images/sprite.svg#${name}` }))
    }
}