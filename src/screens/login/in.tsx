import Header from '@/components/Header'
import SelectModal from '@/components/SelectModal'
import { DataSource } from '@/models/data-source.store'
import { createGroupId } from '@/models/group-id'
import { XSettings } from '@/models/settings'
import { useNavigation } from '@react-navigation/native'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { Button, List, TextInput } from 'react-native-paper'
import { Theme } from '../../models/theme'
import { Spacings } from '../../utils/Spacings'

type LoginMode = 'initial' | 'add'

export default observer(function LoginScreen({
	mode = 'initial',
}: {
	mode?: LoginMode
}) {
	return (
		<View style={{ height: '100%' }}>
			{mode === 'initial' && <Header title="Выбор группы" />}
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

	const dataSourceId = XSettings.dataSourceId
	const groupsStore = DataSource.get(dataSourceId).groups
	const data = groupsStore.result

	const selectedGroups = XSettings.selectedGroupIds

	const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
		undefined,
	)
	const [search, setSearch] = useState('')

	useEffect(() => {
		setSelectedGroupId(undefined)
		setSearch('')
	}, [dataSourceId])

	const filteredGroups = useMemo(() => {
		if (!data?.groups) return []
		if (!search.trim()) return data.groups

		const lower = search.toLowerCase()
		return data.groups.filter(g => g.name.toLowerCase().includes(lower))
	}, [data?.groups, search])

	const selectedCompositeId = selectedGroupId
		? createGroupId(dataSourceId, selectedGroupId)
		: undefined

	const canSave = !!selectedCompositeId

	const saveSelection = () => {
		if (!selectedCompositeId) return

		runInAction(() => {
			if (mode === 'initial') {
				XSettings.save({
					selectedGroupIds: [selectedCompositeId],
					currentGroupId: selectedCompositeId,
					dataSourceId,
				})
			} else {
				if (!XSettings.selectedGroupIds.includes(selectedCompositeId)) {
					XSettings.save({
						selectedGroupIds: [
							...XSettings.selectedGroupIds,
							selectedCompositeId,
						],
						currentGroupId: selectedCompositeId,
						dataSourceId,
					})
				} else {
					XSettings.save({
						currentGroupId: selectedCompositeId,
						dataSourceId,
					})
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
				<SelectModal
					label="Учебное заведение"
					mode="button"
					data={DataSource.registry.all().map(ds => ({
						value: ds.id,
						label: ds.name,
					}))}
					value={dataSourceId}
					onSelect={item =>
						runInAction(() => XSettings.save({ dataSourceId: item.value }))
					}
				/>

				<TextInput
					placeholder="Поиск группы"
					value={search}
					onChangeText={setSearch}
					style={{ marginTop: Spacings.s2, marginBottom: Spacings.s2 }}
				/>
			</View>

			{groupsStore.fallback || (
				<FlatList
					data={filteredGroups}
					keyExtractor={item => item.id}
					renderItem={({ item }) => {
						const compositeId = createGroupId(dataSourceId, item.id)

						return (
							<List.Item
								title={item.name}
								onPress={() => setSelectedGroupId(item.id)}
								titleStyle={
									compositeId === selectedCompositeId
										? { color: Theme.colors.primary }
										: {}
								}
								left={props => (
									<List.Icon
										{...props}
										icon={
											compositeId === selectedCompositeId ||
											selectedGroups.includes(compositeId)
												? 'check'
												: 'blank'
										}
										color={
											compositeId === selectedCompositeId
												? Theme.colors.primary
												: undefined
										}
									/>
								)}
							/>
						)
					}}
					contentContainerStyle={{ paddingHorizontal: Spacings.s2 }}
				/>
			)}

			<View style={{ padding: Spacings.s2 }}>
				<Button mode="contained" onPress={saveSelection} disabled={!canSave}>
					{mode === 'add' ? 'Добавить' : 'Сохранить'}
				</Button>
			</View>
		</View>
	)
})
