'use strict'
const R = require('ramda')

let ex = {
    set: (env) => process.env.NODE_ENV = env,
    get: () => process.env.NODE_ENV
}

const modes = { dev: Symbol('development'), prod: Symbol('production') }
const env = () => process.env.NODE_ENV === 'production' ? modes.production : modes.dev
const platforms = ['darwin', 'linux', 'win32']
const capitalize = R.compose(
    R.join(''),
    R.juxt([R.compose(R.toUpper, R.head), R.tail])
)

Object.keys(modes).forEach((k) => ex[k] = () => R.equals(env(), modes[k]))
R.forEach((k) => ex[k] = R.always(R.equals(process.platform, k)), platforms)
R.forEach((logic) =>
    R.forEach(([m, p]) => ex[m] = (v) => R[logic](ex[p], R.is(Function, v) ? v : R.always(v))(R.F)
        , R.map((p) => [R.concat(logic, capitalize(p)), p], platforms)),
    ['unless', 'when'])
module.exports = ex
