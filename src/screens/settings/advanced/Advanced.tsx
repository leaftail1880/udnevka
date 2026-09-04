import { SelectTime } from '@/components/SelectTime'
import { Size } from '@/components/Size'
import SwitchSetting from '@/components/SwitchSetting'
import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { getStorageKeySize, getTotalStorageSize } from '@/utils/configure'
import { Spacings } from '@/utils/Spacings'
import { runInAction } from 'mobx'
import { PersistStoreMap } from 'mobx-persist-store'
import { observer } from 'mobx-react-lite'
import { ScrollView, View } from 'react-native'
import { List, Text } from 'react-native-paper'
import { DatePickerInput } from 'react-native-paper-dates'
import { ExportImportSettings } from './ExportSettings'

export default observer(function Appearance() {
	Theme.key

	const overrideTime = new Date(XSettings.overrideTimeD)
	return (
		<ScrollView>
			<List.Section title="Общие">
				<View style={{ gap: Spacings.s2 }}>
					<SwitchSetting
						setting="useOverrideTime"
						title="Использовать кастомное время"
						description="Полезно для демонстрации"
					/>
					<View style={{ paddingHorizontal: Spacings.s2 }}>
						<SelectTime
							label="Время в приложении"
							value={{
								minutes: overrideTime.getMinutes(),
								hours: overrideTime.getHours(),
							}}
							onSelect={({ hours, minutes }) =>
								runInAction(() => {
									overrideTime.setHours(hours, minutes)
									XSettings.save({ overrideTimeD: overrideTime.getTime() })
								})
							}
							key={overrideTime.getTime().toString()}
						/>
						<DatePickerInput
							locale="ru"
							value={overrideTime}
							onChange={d =>
								!!d && XSettings.save({ overrideTimeD: d.getTime() })
							}
							inputMode="start"
						/>
					</View>
				</View>
			</List.Section>
			<List.Section title="Хранилище">
				<ExportImportSettings />
				<SizeOfCache />
				<Stores />
			</List.Section>
		</ScrollView>
	)
})

const SizeOfCache = observer(function SizeOfCache() {
	return (
		<List.Item
			title={
				<Text>
					Занятое место: <Size t={getTotalStorageSize()} />
				</Text>
			}
		/>
	)
})

// eslint-disable-next-line mobx/missing-observer
function Stores() {
	return [...PersistStoreMap.values()].map(e => (
		<List.Item
			key={e.storageName}
			title={
				<Text>
					{e.storageName}: <Size t={getStorageKeySize(e.storageName)} />
				</Text>
			}
		/>
	))
}
