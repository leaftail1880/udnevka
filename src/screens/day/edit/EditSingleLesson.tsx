import { HoursMinutes, SelectTime } from '@/components/SelectTime'
import { LANG } from '@/constants'
import { XSettings, getLessonKey } from '@/models/settings'
import { ScheduleItem } from '@/services/mgik/api'
import { Spacings } from '@/utils/Spacings'
import { ModalAlert } from '@/utils/Toast'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { setLessonTimeOffset } from './state'

export const EditSingleLesson = observer(function EditSingleLesson({
	lesson,
}: {
	lesson: ScheduleItem
}) {
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	const lessonKey = getLessonKey(lesson)
	const [startTime, setStartTime] = useState(
		dateToHoursMinutes(lesson.startTime),
	)
	const [name, setName] = useState(lesson.discipline)

	const showLesson = () => {
		runInAction(() => {
			groupSettings.ignoreLessons = groupSettings.ignoreLessons?.filter(
				e => e !== lessonKey,
			)
		})
	}
	return (
		<View style={{ gap: Spacings.s2 }}>
			<Text>
				Это изменит только конкретный урок во{' '}
				{LANG.days[lesson.startTime.getDayFromMonday()].toLowerCase()}, если вам
				нужно переименовать предмет для всех дней, нажмите на его название на
				странице дневника
			</Text>
			<Text>
				Время в журнале: {lesson.startTime.toHHMM()} - {lesson.endTime.toHHMM()}
			</Text>
			<Text>Название предмета в журнале: {lesson.discipline}</Text>
			<TextInput
				mode="outlined"
				value={name}
				defaultValue={lesson.discipline}
				onChangeText={t => {
					setName(t)
					if (t !== lesson.discipline) {
						groupSettings.subjectNamesDay[lessonKey] = t
					}
				}}
			/>
			<SelectTime
				label="Начало"
				value={startTime}
				onSelect={startTime => {
					setStartTime(startTime)
					runInAction(() => {
						const offset = getOffset(lesson.startTime, startTime)
						setLessonTimeOffset(lessonKey, offset, groupSettings)
					})
				}}
			/>

			{!groupSettings.ignoreLessons?.includes(lessonKey) ? (
				<Button
					mode="outlined"
					onPress={() => {
						runInAction(() => {
							groupSettings.ignoreLessons ??= []
							groupSettings.ignoreLessons.push(lessonKey)
						})
					}}
				>
					Скрыть
				</Button>
			) : (
				<Button mode="outlined" onPress={showLesson}>
					Показать
				</Button>
			)}
			<Button
				mode="outlined"
				onPress={() => {
					runInAction(() => {
						delete groupSettings.subjectNamesDay[lessonKey]
						setLessonTimeOffset(lessonKey, 0, groupSettings)
						showLesson()
					})
					ModalAlert.close()
				}}
			>
				Сбросить до официального
			</Button>
		</View>
	)
})

function getOffset(startDate: ReadonlyDate, startTime: HoursMinutes) {
	const start = new Date(startDate.getTime())
	start.setHours(startTime.hours)
	start.setMinutes(startTime.minutes)
	return start.getTime() - startDate.getTime()
}

function dateToHoursMinutes(date: ReadonlyDate): HoursMinutes {
	const hours = date.getHours()
	const minutes = date.getMinutes()
	return { hours, minutes }
}
