import SwitchSetting from '@/components/SwitchSetting'
import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { Spacings } from '@/utils/Spacings'
import notifee from 'react-native-notify-kit'
import { StackScreenProps } from '@react-navigation/stack'
import * as TaskManager from 'expo-task-manager'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { Button, HelperText, List } from 'react-native-paper'
import { SettingsRoutes } from '../navigation'

function usePromise<T>(promise: () => Promise<T>) {
	const [state, setState] = useState<T | undefined>(undefined)

	const interval = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	useEffect(() => {
		if (interval.current) clearInterval(interval.current)
		interval.current = setInterval(() => {
			promise().then(e => {
				if (state !== e) setState(e)
			})
		}, 2000)
	})

	return state
}

export default observer(function Notifications(
	props: StackScreenProps<SettingsRoutes>,
) {
	const batteryOptimizations = !!usePromise(() =>
		notifee.isBatteryOptimizationEnabled(),
	)
	const powerManager = !!usePromise(() =>
		notifee.getPowerManagerInfo().then(e => e.activity),
	)
	const taskManager = !usePromise(() => TaskManager.isAvailableAsync())

	return (
		<ScrollView>
			<List.Section title="Общие">
				<SwitchSetting
					title={'Включены ли уведомления'}
					setting="notificationsEnabled"
				/>

				<SwitchSetting
					title={'Расписание уроков'}
					description="Уведомления о текущих уроках"
					setting="lessonNotifications"
					disabled={!XSettings.notificationsEnabled}
				/>
			</List.Section>
			<View style={{ padding: Spacings.s2, gap: Spacings.s2 }}>
				{(batteryOptimizations || powerManager || taskManager) && (
					<HelperText type="error">Уведомления могут не работать</HelperText>
				)}
				<Warning
					enabled={batteryOptimizations}
					label="Оптимизация батареи"
					description="Включена оптимизация батареи. Система выключит приложение и уведомления перестанут работать"
					onPress={notifee.openBatteryOptimizationSettings}
				/>
				{powerManager && (
					<Warning
						enabled={true}
						label="Менеджер питания"
						description="Включен менеджер питания. Система выключит приложение и уведомления перестанут работать."
						onPress={notifee.openPowerManagerSettings}
					/>
				)}
				{taskManager && (
					<Warning
						enabled={true}
						label="Фоновые задачи выключены"
						description="Уведомления об уроках не будут работать"
						onPress={() => {}}
					/>
				)}
				<Button mode="elevated" onPress={Linking.openSettings}>
					Системные настройки приложения
				</Button>
			</View>
		</ScrollView>
	)
})

const Warning = observer(function Warning(props: {
	enabled: boolean
	onPress: VoidFunction
	description: string
	label: string
}) {
	return (
		<>
			<Button
				mode="elevated"
				{...(props.enabled ? Theme.destructiveButton : {})}
				onPress={props.onPress}
			>
				{props.label}
			</Button>
			{props.enabled && (
				<HelperText type="error">{props.description}</HelperText>
			)}
		</>
	)
})
