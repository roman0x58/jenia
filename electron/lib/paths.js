'use strict'

/* jshint node: true */

let path = require('path'),
    R = require('ramda'),
    env = require('./env')

const root = process.cwd()
// const pkg   = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

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

let ex = {},
    joint = (c, s, r) => {
        r = r || root
        return path.resolve(r, c, s || '')
    }

for (let i in dirs) {
    if (dirs.hasOwnProperty(i)) {
        ex[i] = joint.bind(null, dirs[i])
    }
}

ex.assets = {
    js: [
        R.when(env.dev, () => 'http://localhost:35729/livereload.js')(R.T),
        './bootstrap.js',
        './build.js'
    ],
    css: ['./styles/main.css']
}

module.exports = ex