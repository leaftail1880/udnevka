import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { ScheduleItem } from '@/services/mgik/api'
import { useStyles } from '@/utils/useStyles'
import { makeAutoObservable, runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo } from 'react'
import { StyleSheet, TextStyle, View } from 'react-native'
import { ProgressBar, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'

export const LessonProgressStore = new (class {
	now = Date.now()
	currentLesson = 0
	constructor() {
		makeAutoObservable(this)
		if (!__TEST__)
			setInterval(() => runInAction(() => (this.now = Date.now())), 1000)
	}
})()
const store = LessonProgressStore

export default observer(function LessonProgress({
	lesson,
}: {
	lesson: ScheduleItem
}) {
	const { elapsed, startsAfter, beforeStartMs, progress, state, remaining } =
		useMemo(
			() =>
				scheduleStatus(
					lesson.startTime.getTime(),
					lesson.endTime.getTime(),
					XSettings.useOverrideTime ? XSettings.overrideTimeD : store.now,
				),
			[lesson, store.now, XSettings.overrideTimeD],
		)

	useEffect(() => {
		if (state === ScheduleState.Going)
			runInAction(() => (store.currentLesson = lesson.id))
		else if (store.currentLesson === lesson.id) {
			runInAction(() => (store.currentLesson = 0))
		}
	}, [state, lesson.id])

	const textStyle = useStyles<TextStyle>(() => ({
		color: Theme.colors.onSurfaceDisabled,
	}))

	const progressBarStyle = useStyles(() => ({
		height: 10,
		borderRadius: Theme.roundness,
	}))

	if (state === ScheduleState.NotStarted) {
		if (beforeStartMs < 1.5 * 60 * 60 * 1000) {
			return <Text style={textStyle}>{startsAfter}</Text>
		}
	} else if (state === ScheduleState.Going) {
		return (
			<View style={styles.row}>
				<View style={styles.progressView}>
					<ProgressBar style={progressBarStyle} progress={progress / 100} />
				</View>
				<Text>{elapsed}</Text>
				<Text>{remaining}</Text>
			</View>
		)
	} else {
		return <Text style={textStyle}>Закончился</Text>
	}
})

enum ScheduleState {
	NotStarted,
	Going,
	Ended,
}

export function scheduleStatus(start: number, end: number, now = Date.now()) {
	const beforeStartMs = start - now
	const beforeStart = separateTime(beforeStartMs)
	const beforeEnd = separateTime(now - start)
	const total = separateTime(end - start)
	const remaining = separateTime((end - start) - (now - start))
	const progress = 100 - Math.ceil(((end - now) * 100) / (end - start))

	const elapsed1 = toTime(
		total.hours,
		beforeEnd.hours,
		beforeEnd.minutes,
		beforeEnd.seconds,
	)
	const elapsed2 = toTime(
		total.hours,
		total.hours,
		total.minutes,
		total.seconds,
	)
	return {
		beforeStartMs,
		startsAfter: `Начнется через ${toTime(total.hours, beforeStart.hours, beforeStart.minutes, beforeStart.seconds)}`,
		elapsed: `${elapsed1}/${elapsed2}`,
		remaining: toTime(
			total.hours,
			remaining.hours,
			remaining.minutes,
			remaining.seconds,
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

function toTime(totalFirstHour: number, ...args: number[]) {
	// If the total time is less then 1 hour and first digit is 0, so skip it
	if (totalFirstHour === 0) args.shift()

	return args.map(e => e.toString().padStart(2, '0')).join(':')
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: Spacings.s2,
	},
	progressView: {
		flex: 4,
		justifyContent: 'center',
	},
})
