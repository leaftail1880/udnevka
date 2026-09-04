import Header from '@/components/Header'
import { XSettings } from '@/models/settings'
import { DropdownDataStore } from '@/services/mgik/store'
import { useNavigation } from '@react-navigation/native'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button, Card, List, SegmentedButtons, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'

type LoginMode = 'initial' | 'add'

export default observer(function LoginScreen({
	mode = 'initial',
}: {
	mode?: LoginMode
}) {
	return (
		<View style={{ height: '100%' }}>
			<Header title={mode === 'initial' ? 'Выбор группы' : 'Добавить группу'} />
			<LoginContent mode={mode} />
		</View>
	)
})

const LoginContent = observer(function LoginContent({
	mode,
}: {
	mode: LoginMode
}) {
	const navigation = useNavigation()
	if (DropdownDataStore.fallback) return DropdownDataStore.fallback

	const data = DropdownDataStore.result!
	const [step, setStep] = useState(1)
	const [clientType, setClientType] = useState<number | undefined>(undefined)
	const [form, setForm] = useState<number | undefined>(undefined)
	const [course, setCourse] = useState<number | undefined>(undefined)
	const [faculty, setFaculty] = useState<number | undefined>(undefined)
	const [group, setGroup] = useState<number | undefined>(undefined)

	const canProceed = () => {
		switch (step) {
			case 1:
				return clientType !== undefined
			case 2:
				return form !== undefined
			case 3:
				return course !== undefined
			case 4:
				return faculty !== undefined
			case 5:
				return group !== undefined
		}
	}

	const saveSelection = () => {
		runInAction(() => {
			if (mode === 'initial' || XSettings.selectedGroupIds.length === 0) {
				XSettings.save({
					selectedGroupIds: [group!],
					currentGroupId: group!,
				})
			} else {
				if (!XSettings.selectedGroupIds.includes(group!)) {
					XSettings.save({
						selectedGroupIds: [...XSettings.selectedGroupIds, group!],
						currentGroupId: group!,
					})
				} else {
					XSettings.save({ currentGroupId: group! })
				}
			}
		})
		// After saving, go back if in add mode
		if (mode === 'add') {
			navigation.goBack()
		}
	}

	const nextStep = () => {
		if (step < 5) setStep(step + 1)
		else {
			saveSelection()
		}
	}

	return (
		<ScrollView
			contentContainerStyle={{ padding: Spacings.s2, gap: Spacings.s2 }}
		>
			<Text variant="titleMedium">Шаг {step} из 5</Text>

			{step === 1 && (
				<Card>
					<Card.Title title="Тип клиента" />
					<Card.Content>
						<SegmentedButtons
							buttons={data.clientTypes.map(ct => ({
								label: ct.type === 0 ? 'Группа' : 'Индивидуально',
								value: ct.type.toString(),
							}))}
							value={clientType?.toString() ?? ''}
							onValueChange={v => setClientType(parseInt(v))}
						/>
					</Card.Content>
				</Card>
			)}

			{step === 2 && (
				<Card>
					<Card.Title title="Форма обучения" />
					<Card.Content>
						{data.formsOfEducation.map(fo => (
							<List.Item
								key={fo.id}
								title={fo.name}
								onPress={() => setForm(fo.id)}
								left={props => (
									<List.Icon
										{...props}
										icon={form === fo.id ? 'check' : 'blank'}
									/>
								)}
							/>
						))}
					</Card.Content>
				</Card>
			)}

			{step === 3 && (
				<Card>
					<Card.Title title="Курс" />
					<Card.Content>
						{data.courses.map(c => (
							<List.Item
								key={c.course}
								title={`${c.course} курс`}
								onPress={() => setCourse(c.course)}
								left={props => (
									<List.Icon
										{...props}
										icon={course === c.course ? 'check' : 'blank'}
									/>
								)}
							/>
						))}
					</Card.Content>
				</Card>
			)}

			{step === 4 && (
				<Card>
					<Card.Title title="Факультет" />
					<Card.Content>
						<ScrollView style={{ maxHeight: 300 }}>
							{data.faculties.map(f => (
								<List.Item
									key={f.id}
									title={f.name}
									onPress={() => setFaculty(f.id)}
									left={props => (
										<List.Icon
											{...props}
											icon={faculty === f.id ? 'check' : 'blank'}
										/>
									)}
								/>
							))}
						</ScrollView>
					</Card.Content>
				</Card>
			)}

			{step === 5 && (
				<Card>
					<Card.Title title="Группа" />
					<Card.Content>
						<ScrollView style={{ maxHeight: 300 }}>
							{data.groups.map(g => (
								<List.Item
									key={g.id}
									title={g.name}
									onPress={() => setGroup(g.id)}
									left={props => (
										<List.Icon
											{...props}
											icon={group === g.id ? 'check' : 'blank'}
										/>
									)}
								/>
							))}
						</ScrollView>
					</Card.Content>
				</Card>
			)}

			<Button mode="contained" onPress={nextStep} disabled={!canProceed()}>
				{step < 5 ? 'Далее' : mode === 'add' ? 'Добавить' : 'Сохранить'}
			</Button>
		</ScrollView>
	)
})
