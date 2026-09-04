import { Theme } from '@/models/theme'
import { observer } from 'mobx-react-lite'
import { StyleSheet, View } from 'react-native'
import { Card, Divider, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'
import { DiaryState } from './state'

import { ChipLike } from '@/components/ChipLike'
import { ScrollTextCopyable } from '@/components/ScrollTextCopyable'
import { ScheduleItem } from '@/services/mgik/api'
import { useStyles } from '@/utils/useStyles'
import { useMemo } from 'react'
import { XBottomTabScreenProps } from '../../../App'
import { globalStyles } from '../../constants'
import LessonProgress from './Progress'
import { DiaryLessonProps } from './screen'

export default observer(function DiaryLesson({
	lesson,
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

	const cardStyle = useStyles(
		() => ({
			margin: Spacings.s1,
			borderCurve: 'continuous',
			borderWidth: 0,
			borderColor: Theme.colors.primary,
			padding: Spacings.s2,
			flex: 1,
			gap: Spacings.s2,
		}),
		[],
	)

	return (
		<Card style={cardStyle}>
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
				<Text style={Theme.fonts.titleMedium}>{lesson.discipline}</Text>
			</View>
			<View
				style={[styles.name, { justifyContent: 'flex-end', height: '100%' }]}
			>
				<ChipLike>{lesson.auditoriumShortName || '?'}</ChipLike>
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
	},
})

export const LessonTimeChip = observer(function Time({
	lesson,
}: {
	lesson: ScheduleItem
}) {
	return (
		<ChipLike>
			{lesson.startTime.toHHMM()} - {lesson.endTime.toHHMM()}
		</ChipLike>
	)
})

const MiddleRow = observer(function MiddleRow({
	lesson,
}: {
	lesson: ScheduleItem
}) {
	return (
		<>
			{DiaryState.showLessonTheme && (
				<ScrollTextCopyable>
					{lesson.teacherName
						? `Преподаватель: ${lesson.teacherName}`
						: 'Нет преподавателя'}
				</ScrollTextCopyable>
			)}
			{lesson.lessonComment && (
				<ScrollTextCopyable>{lesson.lessonComment}</ScrollTextCopyable>
			)}
		</>
	)
})
