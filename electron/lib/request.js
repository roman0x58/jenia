'use strict'

const R = require('ramda')
const flyd = require('flyd')
const https = require('https')
const crypto = require('crypto')
const pkg = require('../package.json')

const succced = R.either(R.both(R.gte(R.__, 200), R.lt(R.__, 300)), R.equals(304))
const hash = v => crypto.createHash('md5').update(v).digest('hex')

let etags = {}

const consumer = R.curry((resolve, reject, response) => {
    const raw = flyd.stream()
    const body = flyd.scan(R.concat, '', raw)

    response.setEncoding('utf8')
    response.on('data', raw)
    response.on('end', () =>
        succced(response.statusCode) ? resolve({ response: body(), headers: response.headers }) : reject(body())
    )
})

const req = R.curry((options, resolve, reject) => {
    const r = https.request(options, consumer(resolve, reject))
    r.setTimeout(30000, r.abort)
    r.on('error', reject)
    r.end()
})

const request = R.curryN(2, (url, path) => {
    const key  = hash(url + path)
    const etag = R.or(etags[key], '')
    const defaults = {
        host: url,
        path: path,
        headers: {
            'If-None-Match': etag,
            'User-Agent': `${pkg.name}/${pkg.version}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    }

    return {
        get: (options) =>
            new Promise(req(R.assoc('method', 'GET', R.merge(defaults, options))))
                .then(({ response, headers }) => {
                    etags[key] = headers.etag
                    if (response) {
                        response = JSON.parse(response)
                    }
                    return response
                })
    }
})

module.exports = request