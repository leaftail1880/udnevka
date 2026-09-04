import { HoursMinutes } from '@/components/SelectTime'
import { makeAutoObservable, runInAction } from 'mobx'
import { Platform } from 'react-native'
import { makeReloadPersistable } from '../utils/makePersistable'

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
	lessonOrder: Record<number, Record<string, number> | undefined>
	subjectNames: Record<string, string | undefined>
	subjectNamesDay: Record<string, string | undefined>
	ignoreLessons?: string[]
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
	selectedGroupIds: number[] = []
	currentGroupId?: number

	// Per-group overrides
	groupOverrides: Record<number, GroupSettings> = {}

	// Time override for debugging
	overrideTimeD = Date.now()
	useOverrideTime = false

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
				'groupOverrides',
				'overrideTimeD',
				'useOverrideTime',
			],
		})
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

	forGroup(groupId: number): GroupSettings {
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
