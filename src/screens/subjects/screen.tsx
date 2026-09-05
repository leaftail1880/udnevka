import { observer } from 'mobx-react-lite'
import { ScrollView, View } from 'react-native'
import { DataTable, Text } from 'react-native-paper'
import Header from '../../components/Header'
import { Screens } from '../../constants'
import { ScheduleStore } from '../../services/mgik/store'
import { Spacings } from '../../utils/Spacings'

export default observer(function SubjectsScreen() {
	return (
		<>
			<Header title={Screens.Subjects} />
			{ScheduleStore.result ? (
				<ScrollView>
					<DataTable>
						<DataTable.Row style={{ flex: 5 }}>
							<DataTable.Title style={{ flex: 2 }}>
								<Text>Преподаватель</Text>
							</DataTable.Title>
							<DataTable.Title style={{ flex: 3 }}>
								<Text>Предмет</Text>
							</DataTable.Title>
						</DataTable.Row>
						{[
							...ScheduleStore.result
								.reduce((acc, p) => {
									acc
										.getOrInsertComputed(p.teacherName, () => new Map())
										.getOrInsertComputed(p.discipline, () => new Set())
										.add(p.auditoriumName)
									return acc
								}, new Map<string, Map<string, Set<string>>>())
								.entries(),
						].map(e => (
							<DataTable.Row key={e[0]} style={{ flex: 5 }}>
								<DataTable.Cell style={{ flex: 2 }}>
									<View>
										<Text>{e[0]}</Text>
									</View>
								</DataTable.Cell>
								<DataTable.Cell
									style={{ flex: 3, paddingVertical: Spacings.s3 }}
								>
									<View style={{ gap: Spacings.s2 }}>
										{[...e[1].entries()].map(e => (
											<Text key={e[0]}>
												{e[0]} {[...e[1]].join(', ')}
											</Text>
										))}
									</View>
								</DataTable.Cell>
							</DataTable.Row>
						))}
					</DataTable>
				</ScrollView>
			) : (
				ScheduleStore.fallback
			)}
		</>
	)
})
