import Header from '@/components/Header'
import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { ModalAlert } from '@/utils/Toast'
import { useStyles } from '@/utils/useStyles'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { Spacings } from '../../utils/Spacings'

function logOut() {
	ModalAlert.close()
	runInAction(() => {
		XSettings.save({
			selectedGroupIds: [],
			currentGroupId: undefined,
		})
	})
}

function ensureLogin() {
	ModalAlert.show(
		'Вы уверены?',
		<Text>Вы сбросите выбранные группы и сможете выбрать другую.</Text>,
		true,
		[{ label: 'Сбросить', callback: logOut }],
	)
}

export const LogoutButton = observer(function LogoutButton() {
	return (
		<Button
			mode="outlined"
			onPress={ensureLogin}
			{...Theme.destructiveButton}
			style={[{ marginHorizontal: Spacings.s2, marginVertical: Spacings.s1 }]}
		>
			Сбросить группы
		</Button>
	)
})

export default observer(function LogoutScreen() {
	const viewStyle = useStyles(() => ({
		flex: 1,
		backgroundColor: Theme.colors.background,
	}))

	return (
		<View style={viewStyle}>
			<Header title="Сброс групп"></Header>
			<View style={styles.container}>
				<LogoutButton />
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	container: { alignContent: 'center', padding: Spacings.s3 },
})
