import { ChipLike } from '@/components/ChipLike'
import { getSubjectName } from '@/components/SubjectName'
import { globalStyles } from '@/constants'
import { GroupSettings, XSettings, getLessonKey } from '@/models/settings'
import { Theme } from '@/models/theme'
import { ScheduleItem } from '@/services/mgik/api'
import { ScheduleStore } from '@/services/mgik/store'
import { Spacings } from '@/utils/Spacings'
import { makeAutoObservable, runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import {
	ListRenderItem,
	StyleSheet,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from 'react-native'
import { Button, Text } from 'react-native-paper'
import ReorderableList, {
	ReorderableListReorderEvent,
	useReorderableDrag,
} from 'react-native-reorderable-list'
import { LessonTimeChip } from '../Lesson'
import { DAY_NAMES_SHORT, DiaryState } from '../state'
import { setLessonTimeOffset } from './state'

const reorderState = new (class {
	constructor() {
		makeAutoObservable(this, {}, { autoBind: true })
	}

	key = 0
	lessons: ScheduleItem[] = []

	reset() {
		const groupSettings = XSettings.forCurrentGroupOrThrow()
		groupSettings.lessonOrder = {}

		this.key++
		this.lessons = []
	}
})()

function replaceItems<T>(array: T[], from: number, to: number): T[] {
	array = array.slice()
	;[array[from], array[to]] = [array[to], array[from]]
	return array
}

export const EditDiaryReorderLessons = observer(function DiaryEditDay() {
	const schedule = ScheduleStore.result!
	const dayLessons = schedule.filter(
		item => item.date.toYYYYMMDD() === DiaryState.day,
	)
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	const lessonsSorted =
		reorderState.lessons.length === 0
			? sortByDate(dayLessons.slice(), groupSettings)
			: reorderState.lessons

	const onReorder = useCallback(
		(args: ReorderableListReorderEvent) => {
			runInAction(() => {
				reorderState.lessons = replaceItems(lessonsSorted, args.from, args.to)
				reorderState.key++
				const { to, offset, from } = getOffset(
					lessonsSorted,
					args.from,
					args.to,
				)

				setLessonTimeOffset(getLessonKey(to), offset, groupSettings)
				setLessonTimeOffset(getLessonKey(from), -offset, groupSettings)
			})
		},
		[lessonsSorted, groupSettings],
	)

	return (
		<View>
			<View style={localStyles.padding}>
				<Text>
					Для изменения порядка предметов удерживайте предмет и перетащите его
					на место того, который нужно заменить.
				</Text>
				<Button onPress={reorderState.reset}>Сбросить</Button>
			</View>
			<ReorderableList
				data={lessonsSorted}
				keyExtractor={keyExtractor}
				renderItem={RenderDiaryLessonDraggable}
				onReorder={onReorder}
				contentContainerStyle={localStyles.reordableList}
				key={reorderState.key.toString()}
			/>
		</View>
	)
})

const localStyles = StyleSheet.create({
	reordableList: {
		paddingHorizontal: Spacings.s1,
	},
	padding: { padding: Spacings.s2 },
})

function keyExtractor(lesson: ScheduleItem) {
	return getLessonKey(lesson)
}

function getOffset(
	lessonsSorted: ScheduleItem[],
	toIndex: number,
	fromIndex: number,
) {
	const to = lessonsSorted[toIndex]
	const from = lessonsSorted[fromIndex]
	const offset = from.startTime.getTime() - to.startTime.getTime()
	return { to, offset, from }
}

const DiaryLessonDraggable = observer(function DraggableLesson({
	item: lesson,
}: {
	item: ScheduleItem
}) {
	const drag = useReorderableDrag()

	return <DiaryLessonShort onLongPress={drag} lesson={lesson} />
})

export const DiaryLessonShort = observer(function DraggableLesson({
	lesson,
	isEdited,
	...props
}: {
	lesson: ScheduleItem
	isEdited?: boolean
} & TouchableOpacityProps) {
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	const lessonKey = getLessonKey(lesson)
	const isMoved = !!groupSettings.lessonOrder[lessonKey]
	const isIgnored = groupSettings.ignoreLessons?.includes(lessonKey)

	return (
		<TouchableOpacity
			style={[
				{
					backgroundColor: isEdited
						? Theme.colors.primaryContainer
						: isMoved
							? Theme.colors.elevation.level3
							: isIgnored
								? Theme.colors.surfaceDisabled
								: Theme.colors.elevation.level1,
				},
				globalStyles.row,
				{
					gap: Spacings.s1,
					alignItems: 'center',
					paddingLeft: Spacings.s2,
					flexWrap: 'nowrap',
					padding: Spacings.s1 / 2,
				},
			]}
			{...props}
		>
			<ChipLike>
				{DAY_NAMES_SHORT[lesson.startTime.getDayFromMonday()]}
			</ChipLike>
			<LessonTimeChip lesson={lesson} />
			<Text style={Theme.fonts.titleSmall}>
				{getSubjectName({
					discipline: lesson.discipline,
					offsetDayId: lessonKey,
				})}
			</Text>
		</TouchableOpacity>
	)
})

// eslint-disable-next-line mobx/missing-observer
export const RenderDiaryLessonDraggable: ListRenderItem<
	ScheduleItem
> = args => <DiaryLessonDraggable {...args} />

export function sortByDate(
	lessons: ScheduleItem[],
	groupSettings: GroupSettings,
	realTime = false,
) {
	return lessons.sort((a, b) => {
		const aDate = realTime
			? a.startTime
			: new Date(
					a.startTime.getTime() +
						(groupSettings.lessonOrder[getLessonKey(a)] ?? 0),
				)
		const bDate = realTime
			? b.startTime
			: new Date(
					b.startTime.getTime() +
						(groupSettings.lessonOrder[getLessonKey(b)] ?? 0),
				)
		return aDate.getTime() - bDate.getTime()
	})
}
