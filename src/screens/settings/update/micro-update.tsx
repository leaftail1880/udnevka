import { Theme } from '@/models/theme'
import { Spacings } from '@/utils/Spacings'
import { ModalAlert } from '@/utils/Toast'
import * as Updates from 'expo-updates'
import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, HelperText, Text, TouchableRipple } from 'react-native-paper'
import { stringifyNetworkErrorLike } from '../../../utils/network'

export default observer(function MicroUpdateId() {
	const updateId = Updates.updateId?.slice(-6) ?? 'из сборки'
	const { isUpdateAvailable } = Updates.useUpdates()
	const update = isUpdateAvailable

	const openModal = () =>
		ModalAlert.show('Микрообновления', <MicroUpdateModal />)

	if (update) {
		return (
			<TouchableRipple
				onPress={openModal}
				style={{
					backgroundColor: Theme.colors.errorContainer,
					paddingVertical: 2,
					paddingHorizontal: 8,
					borderRadius: Theme.roundness,
				}}
			>
				<Text
					style={{
						color: Theme.colors.error,
						fontWeight: 'bold',
					}}
				>
					Обновление: {updateId}
				</Text>
			</TouchableRipple>
		)
	}

	return (
		<Text
			onPress={openModal}
			style={{
				color: Theme.colors.onSecondaryContainer,
			}}
		>
			{updateId}
		</Text>
	)
})

const MicroUpdateModal = observer(function MicroUpdateModal() {
	const { currentlyRunning, isUpdateAvailable, isUpdatePending } =
		Updates.useUpdates()

	const [loading, setLoading] = useState(false)
	const [info, setInfo] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const runTypeMessage = currentlyRunning.isEmbeddedLaunch
		? 'Запущено из сборки'
		: 'Запущено из микрообновления'

	const run = async (action: () => Promise<void>) => {
		if (loading) return

		setLoading(true)
		setInfo(null)
		setError(null)

		try {
			await action()
		} catch (e) {
			setError(stringifyNetworkErrorLike(e))
		} finally {
			setLoading(false)
		}
	}

	const handleCheck = () =>
		run(async () => {
			const result = await Updates.checkForUpdateAsync()
			setInfo(result.isAvailable ? 'Доступно обновление' : 'Нет обновлений')
		})

	const handleDownload = () =>
		run(async () => {
			const result = await Updates.fetchUpdateAsync()

			if (result.isNew || result.isRollBackToEmbedded) {
				setInfo('Обновление загружено, перезапускаем…')
				await Updates.reloadAsync()
			} else {
				setInfo('Нет обновлений')
			}
		})

	const handleReload = () =>
		run(async () => {
			setInfo('Перезапускаем…')
			await Updates.reloadAsync()
		})

	const action = isUpdatePending
		? { text: 'Перезапустить', onPress: handleReload }
		: isUpdateAvailable
			? { text: 'Скачать и запустить микрообнову', onPress: handleDownload }
			: { text: 'Проверить наличие обновлений', onPress: handleCheck }

	return (
		<View style={{ gap: Spacings.s2 }}>
			<Text>{runTypeMessage}</Text>

			<Button
				mode="contained"
				loading={loading}
				disabled={loading}
				onPress={action.onPress}
			>
				{action.text}
			</Button>

			{!!info && <HelperText type="info">{info}</HelperText>}
			{!!error && <HelperText type="error">{error}</HelperText>}
			<HelperText type="info">Микрообновления - обновления, не требующие переустановки приложения. Микрообновления применяются сами при перезапуске приложения, в этом меню их наличие можно проверить самостоятельно. Чаще всего микрообновления - это незначительные изменения вроде починки багов.</HelperText>
		</View>
	)
})
