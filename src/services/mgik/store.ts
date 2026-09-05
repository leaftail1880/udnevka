import { AsyncStore } from '@/models/async.store'
import { autorun } from 'mobx'
import { XSettings } from '../../models/settings'
import { ScheduleClient } from './api'

export const scheduleClient = new ScheduleClient()

// Store for dropdown data
export const DropdownDataStore = new AsyncStore(
	scheduleClient,
	'getDropdownData',
	'данных для выбора группы',
	{},
	() => [], // no additional deps
	false,
	true, // skip error messages
)

// Store for schedule
export const ScheduleStore = new AsyncStore(
	scheduleClient,
	'getSchedule',
	'расписания',
	{},
	() => [],
	false,
	false,
)

autorun(() => {
	const { currentGroupId } = XSettings

	console.log(
		'Current group changed',
		currentGroupId,
		'updating schedule store...',
	)
	ScheduleStore.withParams({
		idGroup: currentGroupId,
	})
})
