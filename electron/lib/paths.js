'use strict'

/* jshint node: true */

const path = require('path')
const root = process.cwd()
const join = (c, s, r) => path.resolve(r || root, c, s || '')
const dirs = {
    app: 'app/',
    styles: 'app/styles/',
    build: './electron/build/',
    cwd: './',
    pkg: path.resolve(path.dirname(__filename), '../'),
    electron: './electron',
    release: './release',
    resources: './electron/resources/'
}

let ex = {}

for (let i in dirs) {
    if (dirs.hasOwnProperty(i)) {
        ex[i] = join.bind(null, dirs[i])
    }
}

ex.assets = (env) => {
    const assets = {
        js: [
            './bootstrap.js',
            './build.js'
        ],
        css: ['./styles/main.css']
    }
    if (env.dev()) {
        assets.js.concat('http://localhost:35729/livereload.js')
    }
    return assets
}

module.exports = ex