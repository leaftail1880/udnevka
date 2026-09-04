import { AsyncStore } from '@/models/async.store'
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
