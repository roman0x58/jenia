'use strict'

const R = require('ramda')
const flyd = require('flyd')
const https = require('https')
const crypto = require('crypto')
const pkg = require('../package.json')

const succced = R.either(R.both(R.gte(R.__, 200), R.lt(R.__, 300)), R.equals(304))
const hash = v => crypto.createHash('md5').update(v).digest('hex')

const consumer = R.curry((resolve, reject, response) => {
    const raw = flyd.stream()
    const body = flyd.scan(R.concat, '', raw)

    response.setEncoding('utf8')
    response.on('data', raw)
    response.on('end', () =>
        succced(response.statusCode) ? resolve({ response: body(), headers: response.headers, status: response.statusCode }) : reject(body()))
})

const req = (options, resolve, reject) => {
    const r = https.request(options, consumer(resolve, reject))
    r.setTimeout(30000, r.abort)
    r.on('error', reject)
    r.end()
}

const parser = (fn, options, resolve, reject) => {
    const parse = (o) => {
        try {
            o = JSON.parse(o)
        } catch (e) {
            console.error('An error occured while converting the response to JSON', e)
        }
        return o
    }
    return fn(options, R.compose(resolve, ({ response, headers, status }) => ({ response: parse(response), headers, status })), R.compose(reject, parse))
}

const cache = (fn, options, resolve, reject) => {
    cache.ETags = R.or(cache.ETags, {})

    const ETagKey = hash(JSON.stringify(options))
    const ETagPair = cache.ETags[ETagKey] || []

    options.headers['If-None-Match'] = R.or(R.head(ETagPair), '')

    const cached = ({ response, headers, status }) => {
        status === 304 ? response = R.last(ETagPair) : cache.ETags[ETagKey] = R.pair(headers.etag, response)
        return ({ response, headers, status })
    }
    return fn(options, R.compose(resolve, cached), reject)
}

const middlewares = R.apply(R.compose)(R.map(R.curryN(3), [parser, cache]))
const request = R.curryN(2, (url, path) => {
    const defaults = {
        host: url,
        path: path,
        headers: {
            'User-Agent': `${pkg.name}/${pkg.version}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    }

    return {
        get: (options) =>
            new Promise(middlewares(req)(R.assoc('method', 'GET', R.merge(defaults, options)))).then(R.prop('response'))
    }
})

module.exports = request