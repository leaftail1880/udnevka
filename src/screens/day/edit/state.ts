import { GroupSettings } from '@/models/settings'
import { makeAutoObservable } from 'mobx'

export enum EditDiaryScreen {
	ReorderLessons,
	AddLesson,
	EditLesson,
}

export const EditDiaryState = new (class {
	constructor() {
		makeAutoObservable(this)
	}

	currentScreen?: EditDiaryScreen
})()

export function setLessonTimeOffset(
	lessonId: number,
	offset: number,
	groupSettings: GroupSettings,
) {
	if (offset) {
		groupSettings.lessonOrder[lessonId] = offset
	} else {
		delete groupSettings.lessonOrder[lessonId]
	}
}
