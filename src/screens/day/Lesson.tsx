import { Theme } from '@/models/theme'
import { observer } from 'mobx-react-lite'
import { StyleSheet, View } from 'react-native'
import { Card, Divider, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'
import { DiaryState } from './state'

import { ChipLike } from '@/components/ChipLike'
import { ScrollTextCopyable } from '@/components/ScrollTextCopyable'
import SubjectName from '@/components/SubjectName'
import { XSettings } from '@/models/settings'
import { Lesson } from '@/services/net-school/lesson'
import { ModalAlert } from '@/utils/Toast'
import { useStyles } from '@/utils/useStyles'
import { useCallback, useMemo } from 'react'
import { XBottomTabScreenProps } from '../../../App'
import { globalStyles } from '../../constants'
import { EditSingleLesson } from './edit/EditSingleLesson'
import LessonProgress, { LessonProgressStore } from './Progress'
import { DiaryLessonProps } from './screen'

export default observer(function DiaryLesson({
	lesson,
	navigation,
	i,
	...props
}: Omit<DiaryLessonProps, 'navigateToLessonMarks'> & XBottomTabScreenProps) {
	const newProps: DiaryLessonProps = useMemo(
		() => ({
			i,
			lesson,
			...props,
		}),
		[props, i, lesson],
	)

	const onLongPress = useCallback(
		() =>
			ModalAlert.show('Редактировать', <EditSingleLesson lesson={lesson} />),
		[lesson],
	)

	const cardStyle = useStyles(
		() => ({
			margin: Spacings.s1,
			borderCurve: 'continuous',

			// Display border frame only when lesson is going
			borderWidth:
				LessonProgressStore.currentLesson === lesson.classmeetingId
					? Spacings.s1
					: 0,

			borderColor: Theme.colors.primary,
			padding: Spacings.s2,
			flex: 1,
			gap: Spacings.s2,
		}),
		[LessonProgressStore.currentLesson],
	)

	return (
		<Card
			style={cardStyle}
			onLongPress={!lesson.isCustom ? onLongPress : undefined}
		>
			<TopRow {...newProps} />
			<Divider bold style={{ marginBottom: Spacings.s1 }} />
			<MiddleRow {...newProps} />
			<LessonProgress lesson={lesson} />
		</Card>
	)
})

const TopRow = observer(function TopRow({ lesson, i }: DiaryLessonProps) {
	return <Name lesson={lesson} i={i}></Name>
})

const Name = observer(function Name({
	lesson,
	i,
}: Pick<DiaryLessonProps, 'lesson' | 'i'>) {
	return (
		<View
			style={[
				globalStyles.stretch,
				{ paddingBottom: Spacings.s1, flex: 2, width: '100%' },
			]}
		>
			<View style={[styles.name, { flexWrap: 'nowrap' }]}>
				<ChipLike>{i + 1}</ChipLike>
				<SubjectName
					editDisabled={lesson.isCustom}
					style={Theme.fonts.titleMedium}
					subjectId={lesson.subjectId}
					subjectName={lesson.subjectName}
					offsetDayId={lesson.offsetDayId}
				/>
			</View>
			<View
				style={[styles.name, { justifyContent: 'flex-end', height: '100%' }]}
			>
				<ChipLike>{lesson.roomName || '?'}</ChipLike>
				<LessonTimeChip lesson={lesson} />
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	name: {
		gap: Spacings.s1,
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'flex-start',
		// alignItems: 'center',
	},
})

export const LessonTimeChip = observer(function Time({
	lesson,
}: {
	lesson: Lesson
}) {
	const studentSettings = XSettings.forStudentOrThrow()
	return (
		<ChipLike>
			{lesson.start(studentSettings).toHHMM()} -{' '}
			{lesson.end(studentSettings).toHHMM()}
		</ChipLike>
	)
})

const MiddleRow = observer(function MiddleRow({ lesson }: DiaryLessonProps) {
	return (
		<>
			{DiaryState.showLessonTheme && (
				<ScrollTextCopyable>
					{lesson.lessonTheme ?? 'Темы нет'}
				</ScrollTextCopyable>
			)}

			{DiaryState.showAttachments && lesson.attachmentsExists && (
				<Text>Есть прикрепленные файлы</Text>
			)}
		</>
	)
})
