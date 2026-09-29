import { observer } from 'mobx-react-lite'
import { StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { XBottomTabScreenProps } from '../../../App'
import { DataSource } from '../../models/data-source.store'
import { Spacings } from '../../utils/Spacings'
import DiaryLesson from './Lesson'
import { DiaryState } from './state'

export default observer(function DiaryDay(props: XBottomTabScreenProps) {
	if (DataSource.current.schedule.fallback) return DataSource.current.schedule.fallback

	const schedule = DataSource.current.schedule.result!
	const dayLessons = schedule.filter(
		item => item.date.toYYYYMMDD() === DiaryState.day,
	)

	if (dayLessons.length === 0) {
		return <Text style={styles.text}>Занятий нет, свобода!</Text>
	}

	return dayLessons.map((lesson, i) => (
		<DiaryLesson i={i} key={lesson.id.toString()} lesson={lesson} {...props} />
	))
})

const styles = StyleSheet.create({
	text: { textAlign: 'center', margin: Spacings.s4 },
})
