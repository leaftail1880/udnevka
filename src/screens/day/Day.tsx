import { observer } from 'mobx-react-lite'
import { StyleSheet, View } from 'react-native'
import { Chip, Text } from 'react-native-paper'
import { XBottomTabScreenProps } from '../../../App'
import { DataSource } from '../../models/data-source.store'
import { ScheduleItem } from '../../services/abstract-api-types'
import { Spacings } from '../../utils/Spacings'
import DiaryLesson from './Lesson'
import { DiaryState } from './state'

export default observer(function DiaryDay(props: XBottomTabScreenProps) {
	if (DataSource.current.schedule.fallback)
		return DataSource.current.schedule.fallback

	const schedule = DataSource.current.schedule.result!
	const dayLessons = schedule.filter(
		item => item.date.toYYYYMMDD() === DiaryState.day,
	)

	if (dayLessons.length === 0) {
		return <Text style={styles.text}>Занятий нет, свобода!</Text>
	}

	const subgroups: ScheduleItem[][] = []

	for (const lesson of dayLessons) {
		if (lesson.subgroup === 0 || lesson.subgroup === 1) {
			subgroups.push([lesson])
		} else {
			let subgroup = subgroups.at(-1)
			if (!subgroup) subgroups.push((subgroup = []))

			subgroup.push(lesson)
		}
	}

	return subgroups.map((lessons, i) =>
		lessons.length === 1 ? (
			<DiaryLesson
				i={i}
				key={lessons[0].id.toString()}
				lesson={lessons[0]}
				{...props}
			/>
		) : (
			<View key={lessons[0].id.toString()} style={{marginVertical: Spacings.s2}}>
				{<Chip style={{marginHorizontal: Spacings.s1}}>Подгруппы</Chip>}
				{lessons.map((e, innerI) => (
					<View key={innerI.toString()}>
						{innerI !== 0 && <Text style={{width: '100%', textAlign:'center'}}>Или</Text>}
						<DiaryLesson i={i} lesson={e} {...props} />
					</View>
				))}
			</View>
		),
	)
})

const styles = StyleSheet.create({
	text: { textAlign: 'center', margin: Spacings.s4 },
})
