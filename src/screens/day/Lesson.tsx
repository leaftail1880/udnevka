import { Theme } from '@/models/theme'
import { observer } from 'mobx-react-lite'
import { StyleSheet, View } from 'react-native'
import { Card, Divider, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'
import { DiaryState } from './state'

import { ChipLike } from '@/components/ChipLike'
import { ScrollTextCopyable } from '@/components/ScrollTextCopyable'
import { ScheduleItem } from '@/services/mgik/api'
import { ModalAlert } from '@/utils/Toast'
import { useStyles } from '@/utils/useStyles'
import { useCallback, useMemo } from 'react'
import { XBottomTabScreenProps } from '../../../App'
import { globalStyles } from '../../constants'
import { EditSingleLesson } from './edit/EditSingleLesson'
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

	const onLongPress = useCallback(
		() =>
			ModalAlert.show('Редактировать', <EditSingleLesson lesson={lesson} />),
		[lesson],
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
		<Card style={cardStyle} onLongPress={onLongPress}>
			<View style={globalStyles.row}>
				<View
					style={{ flex: 1, alignItems: 'center', marginRight: Spacings.s1 }}
				>
					<LessonTimeChip lesson={lesson} />
				</View>
				<View style={{ flex: 5 }}>
					<TopRow {...newProps} />
					<MiddleRow {...newProps} />
				</View>
			</View>
			<Divider bold style={{ margin: Spacings.s1, marginTop: Spacings.s2 }} />

			<View style={{ padding: Spacings.s1 }}>
				<LessonProgress lesson={lesson} />
			</View>
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
		<View style={[styles.name, { flexWrap: 'nowrap' }]}>
			<ChipLike>{i + 1}</ChipLike>
			<Text style={Theme.fonts.titleMedium}>{lesson.discipline}</Text>
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
		<View
			style={[
				{
					backgroundColor: Theme.colors.secondaryContainer,
					borderRadius: Theme.roundness,
					padding: Spacings.s1,
				},
			]}
		>
			<Text
				style={{
					color: Theme.colors.onSecondaryContainer,
					fontWeight: 'bold',
					fontSize: 16,
				}}
			>
				{lesson.startTime.toHHMM()}
			</Text>

			<Text
				style={{
					color: Theme.colors.onSecondaryContainer,
					fontWeight: 'bold',
					fontSize: 16,
					paddingLeft: Spacings.s1,
				}}
			>
				{lesson.endTime.toHHMM()}
			</Text>
		</View>
	)
})

const MiddleRow = observer(function MiddleRow({
	lesson,
}: {
	lesson: ScheduleItem
}) {
	return (
		<>
			<View style={globalStyles.stretch}>
				<ChipLike>{lesson.auditoriumShortName || '?'}</ChipLike>

				{DiaryState.showLessonTheme && (
					<ScrollTextCopyable>
						{lesson.teacherName || 'Нет преподавателя'}
					</ScrollTextCopyable>
				)}
			</View>
			{lesson.lessonComment && (
				<ScrollTextCopyable>{lesson.lessonComment}</ScrollTextCopyable>
			)}
		</>
	)
})
