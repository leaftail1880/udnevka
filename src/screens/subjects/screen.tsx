import { observer } from 'mobx-react-lite'
import { ScrollView } from 'react-native'
import { Text } from 'react-native-paper'
import Header from '../../components/Header'
import { Screens } from '../../constants'
import { ScheduleStore } from '../../services/mgik/store'

export default observer(function SubjectsScreen() {
	return (
		<>
			<Header title={Screens.Subjects} />
			{ScheduleStore.result ? (
				<ScrollView>
					{Object.entries(
						ScheduleStore.result.reduce(
							(acc, p) => {
								acc[p.teacherName] ??= new Set()
								acc[p.teacherName].add(p.discipline)
								return acc
							},
							{} as Record<string, Set<string>>,
						),
					).map(e => (
						<Text key={e[0]}>
							{e[0]} {[...e[1]].join(', ')}
						</Text>
					))}
				</ScrollView>
			) : (
				ScheduleStore.fallback
			)}
		</>
	)
})
