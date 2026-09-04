import { XSettings, getLessonKey } from '@/models/settings'
import { ScheduleItem } from '@/services/mgik/api'
import { ScheduleStore } from '@/services/mgik/store'
import {
	clearBackgroundInterval,
	setBackgroundInterval,
} from '@/utils/backgroundIntervals'
import notifee, {
	AndroidImportance,
	AndroidVisibility,
} from '@notifee/react-native'
import { autorun, makeAutoObservable, runInAction } from 'mobx'

let foregroundServiceRegistered = false

export const LessonNotifStore = new (class {
	constructor() {
		makeAutoObservable(this)
	}

	lessonChannelId = ''
	id: undefined | string = undefined
	currentLesson: undefined | string = undefined
	day = new Date().getDate()

	async remove(id = LessonNotifStore.id) {
		if (!id) return

		if (foregroundServiceRegistered) {
			await notifee.stopForegroundService()
		} else await notifee.cancelDisplayedNotification(id)

		runInAction(() => {
			if (LessonNotifStore.id) LessonNotifStore.id = undefined
		})
	}
})()

function enabled() {
	const { notificationsEnabled, lessonNotifications } = XSettings
	return notificationsEnabled && lessonNotifications
}

export async function setupLessonChannel() {
	const lessonChannelId = await notifee.createChannel({
		id: 'lessons',
		name: 'Уроки',
		importance: AndroidImportance.HIGH,
		visibility: AndroidVisibility.PUBLIC,
		description: 'Уведомления о текущих уроках',
	})

	const oldNotification = (await notifee.getDisplayedNotifications()).find(
		e => e.notification.android?.channelId === lessonChannelId,
	)

	if (!enabled()) {
		return runInAction(() => {
			LessonNotifStore.remove(LessonNotifStore.id || oldNotification?.id)
		})
	}

	runInAction(() => {
		LessonNotifStore.lessonChannelId = lessonChannelId
		if (oldNotification?.id) LessonNotifStore.id = oldNotification.id
	})
}

let currentLessonInterval: ReturnType<typeof setBackgroundInterval>
autorun(function notificationFromSchedule() {
	if (currentLessonInterval) clearBackgroundInterval(currentLessonInterval)
	if (!enabled() || !LessonNotifStore.lessonChannelId) {
		return LessonNotifStore.remove()
	}

	const { currentGroupId } = XSettings
	if (!currentGroupId) return

	const { overrideTimeD, useOverrideTime } = XSettings
	const date = new Date(useOverrideTime ? overrideTimeD : Date.now())

	ScheduleStore.withParams({
		idGroup: currentGroupId,
		isDo: undefined,
	})

	const { result } = ScheduleStore
	if (!result) return

	const dayLessons = result.filter(
		item => item.date.toYYYYMMDD() === date.toYYYYMMDD(),
	)

	const inter = setBackgroundInterval(
		() =>
			runInAction(async () => {
				if (inter !== currentLessonInterval) return

				const now = useOverrideTime ? overrideTimeD : Date.now()
				LessonNotifStore.day = new Date().getDate()

				for (const [i, lesson] of dayLessons.entries()) {
					const end = lesson.endTime.getTime()
					if (end < now) continue

					const previous = dayLessons[i - 1]
					const { date: notifyDate, period } = getLessonPeriod(previous, lesson)
					if (notifyDate.getTime() > now) continue

					return await showNotification(lesson, now, period)
				}

				LessonNotifStore.remove()
			}),
		1000,
	)
	currentLessonInterval = inter
})

const second = 1000

function getLessonPeriod(
	previous: ScheduleItem | undefined,
	current: ScheduleItem,
) {
	let period: Date | undefined
	let date: Date
	const notifyBeforeSeconds = 15 * 60

	if (
		previous &&
		current.startTime.toYYYYMMDD() === previous.startTime.toYYYYMMDD() &&
		(current.startTime.getTime() - previous.endTime.getTime()) / second <=
			notifyBeforeSeconds
	) {
		date = new Date(previous.endTime.getTime())
		period = new Date(current.startTime.getTime() - previous.endTime.getTime())
	} else {
		date = new Date(current.startTime.getTime())
		date.setMinutes(date.getMinutes() - ~~(notifyBeforeSeconds / 60))
	}
	return { date, period }
}

async function showNotification(
	lesson: ScheduleItem,
	now: number,
	period: Date | undefined,
) {
	const lessonId = getLessonKey(lesson)
	const lessonName = lesson.discipline

	const status = scheduleStatus(
		lesson.startTime.getTime(),
		lesson.endTime.getTime(),
		now,
	)

	let title = ''
	title += lessonName
	if (status.state === ScheduleState.Going) {
		title += ' | '
		title += status.remaining
	}
	if (lesson.auditoriumShortName) {
		title += ' | '
		title += lesson.auditoriumShortName
	}

	let body = ''
	body += `${lesson.startTime.toHHMM()} - ${lesson.endTime.toHHMM()}. `
	if (status.state === ScheduleState.NotStarted) {
		body += status.startsAfter
		if (period) body += ` Перемена ${period.getMinutes()} мин. `
	} else if (status.state === ScheduleState.Going) {
		body += `Прошло ${status.elapsed}`
	}

	try {
		if (!foregroundServiceRegistered) {
			notifee.registerForegroundService(() => new Promise(() => {}))
			foregroundServiceRegistered = true
		}
	} catch {
		// ignore
	}

	const notificationId = await notifee.displayNotification({
		...(LessonNotifStore.id ? { id: LessonNotifStore.id } : {}),
		title,
		body,
		android: {
			channelId: LessonNotifStore.lessonChannelId,
			ongoing: true,
			smallIcon: 'notification_icon',
			onlyAlertOnce: LessonNotifStore.currentLesson === lessonId,
			asForegroundService: foregroundServiceRegistered,
			progress:
				status.state === ScheduleState.Going
					? { current: status.progress, max: 100 }
					: undefined,
			pressAction: { id: 'default' },
		},
		ios: {},
	})

	runInAction(() => {
		LessonNotifStore.id = notificationId
		LessonNotifStore.currentLesson = lessonId
	})
}

enum ScheduleState {
	NotStarted,
	Going,
	Ended,
}

function scheduleStatus(start: number, end: number, now = Date.now()) {
	const beforeStartMs = start - now
	const beforeStart = separateTime(beforeStartMs)
	const beforeEnd = separateTime(now - start)
	const total = separateTime(end - start)
	const progress = 100 - Math.ceil(((end - now) * 100) / (end - start))

	return {
		beforeStartMs,
		startsAfter: `Начнется через ${toTime(beforeStart.hours, beforeStart.minutes, beforeStart.seconds)}`,
		elapsed: `${total.hours >= 1 ? toTime(0, beforeEnd.hours, beforeEnd.minutes + 1) : toTime(beforeEnd.hours, beforeEnd.minutes + 1)}/${toTime(...(total.minutes + 1 >= 60 ? [total.hours + 1, 0] : [total.hours, total.minutes + 1]))}`,
		remaining: toTime(
			total.hours - beforeEnd.hours,
			total.minutes - beforeEnd.minutes,
			total.seconds - beforeEnd.seconds,
		),
		progress,
		state:
			now < start
				? ScheduleState.NotStarted
				: now <= end
					? ScheduleState.Going
					: ScheduleState.Ended,
	}
}

function separateTime(ms: number) {
	const hours = Math.floor(ms / (1000 * 60 * 60))
	const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
	const seconds = Math.floor((ms % (1000 * 60)) / 1000)
	return { hours, minutes, seconds }
}

function toTime(...args: number[]) {
	return args
		.filter((e, i) => (i === 0 ? e !== 0 : true))
		.map(e => e.toString().padStart(2, '0'))
		.join(':')
}
