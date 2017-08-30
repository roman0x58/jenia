'use strict'
import mask from '../components/mask'
import notifications from '../components/notifications'
import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import logFactory from 'loglevel'

const log = logFactory.getLogger('jenkins')
log.setLevel('warn')

const JenkinsException = function (message, request) {
    this.message = message
    this.request = request
}

let callApi = function (login, password, baseUrl, issuer, path, options, segment = 'api/json') {
    // es6 default arg caused unpredicted behavior
    options = options || {}
    const url = new URL(!R.isEmpty(segment) ? `${path}/${segment}` : path, baseUrl)
    if (options.query) {
        R.forEachObjIndexed((v, k) => {
            if (!R.isNil(v)) url.searchParams.append(k, v)
        }, options.query)
        options = R.omit('query', options)
    }

    if (!options.background) {
        mask.show()
    }

    return m.request(R.merge({
        url: url,
        method: 'GET',
        background: options.background,
        extract: function (xhr) {
            try {
                if (!R.is(Function, this.deserialize)) {
                    return xhr.responseText ? JSON.parse(xhr.responseText) : null
                } else {
                    return this.deserialize(xhr.responseText)
                }
            } catch (e) {
                throw new JenkinsException(R.or(xhr.statusText, 'Malformed response body'), xhr)
            }
        },
        config: function (xhr) {
            xhr.timeout = 10000
            if (options.issuer && issuer.isJust) {
                issuer = issuer.chain(R.identity)
                xhr.setRequestHeader(R.prop('crumbRequestField', issuer), R.prop('crumb', issuer))
            }
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${login}:${password}`))
        }
    }, options))
        .then(R.tap(() => { if (!options.background) { mask.hide() } }))
        .then(R.tap((r) => log.debug(`[request, background=${!!options.background}] URL - ${url.path} Response`, r)))
        .catch((err) => {
            if (!options.background) {
                mask.hide()
                if (options.notify !== false) {
                    notifications.error(`An error occured while connecting to jenkins server ${url.host}... ${err.message}`)
                }
            }
            throw err
        })
}

const createUrl = (url) => {
    if (!url.startsWith('http')) {
        return new URL('http://' + url)
    }
    return new URL(url)
}

export default function (options) {
    const { login, password } = options
    const api = R.partial(callApi, [login, password, createUrl(options.server)])
    const crumb = () => api(Maybe.Nothing(), 'crumbIssuer', { background: true }).then(Maybe)
    return api(Maybe.Nothing(), '', { query: { tree: 'primaryView[name,url],views[name,url],useCrumbs' } })
        .then((response) => Promise.all([R.equals(response.useCrumbs, true) ? crumb() : Maybe.Nothing(), response]))
        .then(([issuer, response]) => ({ req: R.partial(api, [issuer]), credentials: R.always(options), info: response }))
        .then(R.tap(mask.hide))
}

