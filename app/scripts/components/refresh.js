'use strict'

import R from 'ramda'
import Task from './task'
import flyd from 'flyd'
import m from 'mithril'
import { checkPaths } from './util'
import dispatcher from '../dispatcher'

const inBuilding = R.pathEq(['lastBuild', 'building'], true)
const inQueue = R.pathEq(['inQueue'], true)

const checkBuildingJobs = R.ifElse(R.isArrayLike, R.any(inBuilding), inBuilding)
const checkQueueJobs = R.ifElse(R.isArrayLike, R.any(inQueue), inQueue)

const refresh = (model) => {
    const pairs = {
        jobs : R.pair(model.jobs, 'updateView'),
        job  : R.pair(model.job, 'updateJob')
    }
    return R.ifElse(R.flip(checkPaths)(R.keys(pairs)), R.uncurryN(1, (route, queue, force) => {
        let [dep, fn] = R.prop(R.prop('name', route()), pairs)

        let inBuilding = checkBuildingJobs(dep())
        let inQueue = R.or(checkQueueJobs(dep()), !R.isEmpty(queue()))
        let dispatch = dispatcher.dispatch

        console.log(`[rtask] check task with fn ${fn}`, R.or(inBuilding, inQueue))
        if (R.or(inBuilding, inQueue) || R.equals(force, true)) {
            return (inQueue || R.equals(force, true) ? dispatch('updateQueue').then(() => dispatch(fn)) : dispatch(fn)).then(m.redraw)
        }
    }), R.identity)
}

export const refreshAppImmidiately = (model, route) => refresh(model)(route, model.queue, true)
export const refreshApp = (model, route) => flyd.immediate(flyd.combine(Task(R.binary(refresh(model)), 4000).run, [route, model.queue]))