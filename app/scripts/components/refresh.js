'use strict'

import R from 'ramda'
import flyd from 'flyd'
import m from 'mithril'
import { checkPaths } from './util'
import dispatcher from '../dispatcher'
import { ipc } from '../services/ipc'
import { calcBuildDuration } from '../views/joblist'
import { dropRepeatsWith } from 'flyd/module/droprepeats'
import filter from 'flyd/module/filter'
import afterSilence from 'flyd/module/aftersilence'

const call = (...fns) => R.apply(R.pipeP, R.prepend(() => Promise.resolve(m.redraw()), R.map((fn) => () => dispatcher.dispatch(fn), fns)))()

export const refreshImmediate = () => call('updateQueue', 'checkBuilding')
export const refresh = (model, route) => {
    const eq = p => R.equals(route().name, p)

    const scanned = flyd.scan(R.compose(R.takeLast(2), R.flip(R.append)), [], dropRepeatsWith(R.equals, model.building))
    const finished = filter(R.complement(R.isEmpty), scanned.map(R.ifElse(R.compose(R.equals(2), R.length), R.apply(R.difference), R.always([]))))

    const localRoute    = afterSilence(2000, filter(R.flip(checkPaths)(['jobs', 'job']), route))
    const localQueue    = filter(R.complement(R.isEmpty), afterSilence(1000, model.queue).map(R.flatten))
    const localBuilding = filter(R.complement(R.isEmpty), afterSilence(5000, model.building).map(R.flatten))

    finished.map(() => {
        if (eq('jobs')) call('updateView')
        if (eq('job')) call('updateJob')
    })

    localRoute.map(() => call('updateQueue', 'checkBuilding'))
    localQueue.map(() => call('updateQueue', 'checkBuilding'))
    localBuilding.map((jobs) => {
        const inBuilding = build => R.any(R.pathEq(['number'], build.number), jobs)
        if (eq('job')) {
            R.any(inBuilding, model.job().builds) ? call('checkBuilding') : call('updateJob', 'checkBuilding')
        }
        if (eq('jobs')) {
            const wasUpdated = R.propSatisfies(inBuilding, 'lastBuild')
            R.any(wasUpdated, model.jobs()) ? call('checkBuilding') : call('updateView', 'checkBuilding')
        }
    })
    return [localRoute, localQueue, localBuilding]
}