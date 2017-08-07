'use strict'
import mask from '../components/mask'
import notifications from '../components/notifications'
import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import URI from 'urijs'
import logFactory from 'loglevel'

const log = logFactory.getLogger('jenkins')
log.setLevel('warn')

const JenkinsException = function (message, request) {
    this.message = message
    this.request = request
}

let callApi = function (login, password, uri, issuer, path, options, segment = 'api/json') {

    // es6 default arg caused unpredicted behavior
    options = options || {}
    uri = uri.clone().path(path)

    if (!R.isEmpty(segment)) {
        uri.segment(segment)
    }

    if (options.query) {
        uri.query(options.query)
        options = R.omit('query', options)
    }

    if (!options.background) {
        mask.show()
    }

    return m.request(R.merge({
        url: uri.toString(),
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
        .then(R.tap((r) => log.debug(`[request, background=${!!options.background}] URL - ${uri.path()} Response`, r)))
        .catch((err) => {
            if (!options.background) {
                mask.hide()
                if (options.notify !== false) {
                    notifications.error(`An error occured while connecting to jenkins server ${uri.hostname()}... ${err.message}`)
                }
            }
            throw err
        })
}

export default function (options) {
    let uri = new URI(options.server)

    if (R.isEmpty(uri.scheme())) {
        uri = uri
            .scheme('http')
            .hostname(options.server)
    }

    if (R.isEmpty(uri.port())) {
        uri = uri.port(8080)
    }

    const { login, password } = options
    const _api = R.partial(callApi, [login, password, uri])
    const _crumb = () => _api(Maybe.Nothing(), 'crumbIssuer', { background: true }).then(Maybe)
    return _api(Maybe.Nothing(), '', { query: { tree: 'primaryView[name,url],views[name,url],useCrumbs' } })
        .then((response) => Promise.all([R.equals(response.useCrumbs, true) ? _crumb() : Maybe.Nothing(), response]))
        .then(([issuer, response]) => ({ req: R.partial(_api, [issuer]), credentials: R.always(options), info: response }))
        .then(R.tap(mask.hide))
}

