import { HoursMinutes } from '@/components/SelectTime'
import { makeAutoObservable } from 'mobx'
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

// Settings are now global, no per-student overrides
class SettingsStore {
	notificationsEnabled = Platform.select({
		android: true,
		default: false,
	})

	lessonNotifications = true

	nameFormat: 'fio' | 'ifo' = 'ifo'
	collapseLongAssignmentText = false
	newDatePicker = true

	// Group selection (from mgik dropdown)
	selectedClientType?: number
	selectedFormOfEducation?: number
	selectedCourse?: number
	selectedFaculty?: number
	selectedGroup?: number

	// Custom subjects (user-defined, independent of API)
	customSubjects: CustomSubject[] = []

	// Lesson overrides (still possible? we may simplify)
	subjectNames: Record<string, string | undefined> = {}
	subjectNamesDay: Record<string, string | undefined> = {}
	lessonOrder: Record<number, Record<string, number> | undefined> = {}
	ignoreLessons?: string[]

	// Time override for debugging
	overrideTimeD = Date.now()
	useOverrideTime = false

	constructor() {
		makeAutoObservable(this, {
			fullname: false,
		})

		makeReloadPersistable(this, {
			name: 'settings',
			properties: [
				'notificationsEnabled',
				'lessonNotifications',
				'nameFormat',
				'collapseLongAssignmentText',
				'newDatePicker',
				'selectedClientType',
				'selectedFormOfEducation',
				'selectedCourse',
				'selectedFaculty',
				'selectedGroup',
				'customSubjects',
				'subjectNames',
				'subjectNamesDay',
				'lessonOrder',
				'ignoreLessons',
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
}

export const XSettings = new SettingsStore() as Readonly<SettingsStore>
