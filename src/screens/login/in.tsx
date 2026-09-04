import Header from '@/components/Header'
import { XSettings } from '@/models/settings'
import { DropdownDataStore } from '@/services/mgik/store'
import { useNavigation } from '@react-navigation/native'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { Button, List, TextInput } from 'react-native-paper'
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
			{DropdownDataStore.fallback || <LoginContent mode={mode} />}
		</View>
	)
})

const LoginContent = observer(function LoginContent({
	mode,
}: {
	mode: LoginMode
}) {
	const navigation = useNavigation()
	const data = DropdownDataStore.result!
	const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
		undefined,
	)
	const [search, setSearch] = useState('')

	const filteredGroups = useMemo(() => {
		if (!search.trim()) return data.groups
		const lower = search.toLowerCase()
		return data.groups.filter(g => g.name.toLowerCase().includes(lower))
	}, [data.groups, search])

	const canSave = !!selectedGroupId

	const saveSelection = () => {
		console.log({ selectedGroupId })
		if (!selectedGroupId) return
		runInAction(() => {
			if (mode === 'initial') {
				XSettings.save({
					selectedGroupIds: [selectedGroupId],
					currentGroupId: selectedGroupId,
				})
				console.log(XSettings.currentGroupId)
			} else {
				if (!XSettings.selectedGroupIds.includes(selectedGroupId)) {
					XSettings.save({
						selectedGroupIds: [...XSettings.selectedGroupIds, selectedGroupId],
						currentGroupId: selectedGroupId,
					})
				} else {
					XSettings.save({ currentGroupId: selectedGroupId })
				}
			}
		})
		if (mode === 'add') {
			navigation.goBack()
		}
	}

	return (
		<View style={{ flex: 1 }}>
			<View style={{ padding: Spacings.s2 }}>
				<TextInput
					placeholder="Поиск группы"
					value={search}
					onChangeText={setSearch}
					style={{ marginBottom: Spacings.s2 }}
				/>
			</View>
			<FlatList
				data={filteredGroups}
				keyExtractor={item => item.id.toString()}
				renderItem={({ item }) => (
					<List.Item
						title={item.name}
						onPress={() => setSelectedGroupId(item.id)}
						left={props => (
							<List.Icon
								{...props}
								icon={item.id === selectedGroupId ? 'check' : 'blank'}
							/>
						)}
					/>
				)}
				contentContainerStyle={{ paddingHorizontal: Spacings.s2 }}
			/>
			<View style={{ padding: Spacings.s2 }}>
				<Button mode="contained" onPress={saveSelection} disabled={!canSave}>
					{mode === 'add' ? 'Добавить' : 'Сохранить'}
				</Button>
			</View>
		</View>
	)
})
