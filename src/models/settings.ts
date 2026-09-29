import { HoursMinutes } from '@/components/SelectTime'
import { makeAutoObservable, runInAction } from 'mobx'
import { Platform } from 'react-native'
import { makeReloadPersistable } from '../utils/makePersistable'
import { createGroupId, parseDataSourceId } from './group-id'

export interface CustomSubjectMeeting {
	dayIndex: number
	startTime: HoursMinutes
	time: number
	sendNotificationBeforeMins: number
}

export interface CustomSubject {
	name: string
	meetings: CustomSubjectMeeting[]
}

export interface GroupSettings {
	customSubjects: CustomSubject[]
	// Key: lesson composite key (id_discipline)
	lessonOrder: Record<string, number>
	// Key: discipline name (global override)
	subjectNames: Record<string, string | undefined>
	// Key: lesson composite key (day-specific override)
	subjectNamesDay: Record<string, string | undefined>
	// Array of lesson composite keys to hide
	ignoreLessons?: string[]
}

export function getLessonKey(lesson: {
	id: number
	discipline: string
}): string {
	return `${lesson.id}_${lesson.discipline}`
}

class SettingsStore {
	notificationsEnabled = Platform.select({
		android: true,
		default: false,
	})

	lessonNotifications = true

	nameFormat: 'fio' | 'ifo' = 'ifo'
	collapseLongAssignmentText = false
	newDatePicker = true

	// Group selection
	selectedGroupIds: string[] = []
	currentGroupId?: string = undefined

	// Remembered university selection
	dataSourceId = 'mgik'

	groupOverrides: Record<string, GroupSettings> = {}

	// Time override for debugging
	overrideTimeD = Date.now()
	useOverrideTime = false

	networkTimeout = 10000

	constructor() {
		makeAutoObservable(this, {
			fullname: false,
			forGroup: false,
			forCurrentGroupOrThrow: false,
		})

		makeReloadPersistable(this, {
			name: 'settings',
			properties: [
				'notificationsEnabled',
				'lessonNotifications',
				'nameFormat',
				'collapseLongAssignmentText',
				'newDatePicker',
				'selectedGroupIds',
				'currentGroupId',
				'dataSourceId',
				'groupOverrides',
				'overrideTimeD',
				'useOverrideTime',
				'networkTimeout',
			],
		}).then(() =>
			runInAction(() => {
				this.migrateLegacyGroupIds()
			}),
		)
	}

	private migrateLegacyGroupIds() {
		const legacySelected = this.selectedGroupIds as unknown as (
			| string
			| number
		)[]
		this.selectedGroupIds = legacySelected.map(id =>
			typeof id === 'number' ? createGroupId('mgik', id) : id,
		)

		const legacyCurrent = this.currentGroupId as unknown as
			| string
			| number
			| undefined

		if (typeof legacyCurrent === 'number') {
			this.currentGroupId = createGroupId('mgik', legacyCurrent)
		}

		if (this.currentGroupId) {
			this.dataSourceId = parseDataSourceId(this.currentGroupId)
		}

		const migratedOverrides: Record<string, GroupSettings> = {}
		for (const [key, value] of Object.entries(this.groupOverrides)) {
			const normalizedKey = key.includes('-') ? key : createGroupId('mgik', key)
			migratedOverrides[normalizedKey] = value
		}
		this.groupOverrides = migratedOverrides
	}

	save(value: Partial<Omit<this, 'save'>>) {
		Object.assign(this, value)
	}

	fullname(name: string) {
		if (this.nameFormat === 'ifo') {
			const parts = name.split(' ')
			return [parts[1], parts[2], parts[0]].join(' ')
		} else {
			return name
		}
	}

	forGroup(groupId: string): GroupSettings {
		const defaultSettings: GroupSettings = {
			customSubjects: [],
			lessonOrder: {},
			subjectNames: {},
			subjectNamesDay: {},
			ignoreLessons: [],
		}

		let group = this.groupOverrides[groupId]
		if (!group) {
			runInAction(() => {
				this.groupOverrides[groupId] = defaultSettings
			})
			group = this.groupOverrides[groupId]
		}
		return group
	}

	forCurrentGroupOrThrow(): GroupSettings {
		if (!this.currentGroupId) {
			throw new Error('No current group selected')
		}
		return this.forGroup(this.currentGroupId)
	}
}

export const XSettings = new SettingsStore() as Readonly<SettingsStore>
