import {
	getOverridenOrOfficalName,
	getSubjectName,
} from '@/components/SubjectName'
import UpdateDate from '@/components/UpdateDate'
import { XSettings, getLessonKey } from '@/models/settings'
import { ScheduleItem } from '@/services/mgik/api'
import { ScheduleStore } from '@/services/mgik/store'
import { Spacings } from '@/utils/Spacings'
import { ModalAlert } from '@/utils/Toast'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import {
	FlatList,
	ListRenderItem,
	ListRenderItemInfo,
	View,
} from 'react-native'
import { Button, Text } from 'react-native-paper'
import { DiaryState } from '../state'
import { EditSingleLesson } from './EditSingleLesson'
import { DiaryLessonShort } from './ReorderLessons'

export const EditDiaryEditLesson = observer(function EditDiaryEditLesson() {
	return <Screen />
})

const Screen = observer(function Screen() {
	const schedule = ScheduleStore.result!
	const dayLessons = schedule.filter(
		item => item.date.toYYYYMMDD() === DiaryState.day,
	)
	return (
		<FlatList
			data={dayLessons}
			renderItem={renderItem}
			ListHeaderComponent={
				<View style={{ padding: Spacings.s2 }}>
					<Text>
						Нажмите на предмет, чтобы переименовать или изменить его время для
						конкретного дня. Измененные предметы выделены цветом.
					</Text>
					<Button
						onPress={() => {
							runInAction(() => {
								const groupSettings = XSettings.forCurrentGroupOrThrow()
								groupSettings.subjectNamesDay = {}
								groupSettings.lessonOrder = {}
							})
						}}
					>
						Сбросить
					</Button>
				</View>
			}
			ListFooterComponent={
				<UpdateDate store={{ updateDate: 'Конец.' }}></UpdateDate>
			}
		/>
	)
})

const renderItem: ListRenderItem<ScheduleItem> = args => (
	<DiaryLessonItem {...args} />
)

const DiaryLessonItem = observer(function DiaryLessonItem(
	props: ListRenderItemInfo<ScheduleItem>,
) {
	const onPress = useCallback(() => {
		ModalAlert.show('Редактировать', <EditSingleLesson lesson={props.item} />)
	}, [props.item])
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	const lessonKey = getLessonKey(props.item)
	return (
		<DiaryLessonShort
			isEdited={
				getSubjectName({
					discipline: props.item.discipline,
					offsetDayId: lessonKey,
				}) !==
				getOverridenOrOfficalName(
					{ discipline: props.item.discipline },
					groupSettings,
				)
			}
			lesson={props.item}
			onPress={onPress}
		/>
	)
})
