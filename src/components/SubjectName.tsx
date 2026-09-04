import { GroupSettings, XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useCallback, useState } from 'react'
import {
	ColorValue,
	StyleProp,
	StyleSheet,
	TextStyle,
	TouchableOpacity,
	ViewStyle,
} from 'react-native'
import {
	Button,
	Dialog,
	Portal,
	Text,
	TextInput,
	TextProps,
} from 'react-native-paper'

type SubjectNameOptions = {
	discipline: string
	offsetDayId?: string
}

export function getSubjectName(from: SubjectNameOptions) {
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	if (from.offsetDayId) {
		const dayOverriden = groupSettings.subjectNamesDay[from.offsetDayId]
		if (dayOverriden) return dayOverriden
	}

	return getOverridenOrOfficalName(from, groupSettings)
}

export function getOverridenOrOfficalName(
	from: SubjectNameOptions,
	groupSettings: GroupSettings,
) {
	const overriden = groupSettings.subjectNames[from.discipline]
	if (overriden) return overriden

	return from.discipline
}

type SubjectNameProps = {
	viewStyle?: StyleProp<ViewStyle>
	editDisabled?: boolean
} & SubjectNameOptions &
	Omit<
		TextProps<string>,
		'textAlign' | 'style' | 'selectionColor' | 'children'
	> & {
		style?: Omit<TextStyle, 'color'> & { color?: ColorValue }
	}

const styles = StyleSheet.create({
	touchable: { margin: 0, padding: 0 },
})

export default observer(function SubjectName({
	viewStyle,
	editDisabled,
	...props
}: SubjectNameProps) {
	const [isEditing, setIsEditing] = useState(false)
	const name = getSubjectName(props)
	const onPress = useCallback(() => setIsEditing(true), [setIsEditing])

	return (
		<TouchableOpacity
			style={[styles.touchable, viewStyle]}
			onPress={editDisabled ? undefined : onPress}
		>
			<Text {...props}>{name}</Text>
			{isEditing && <EditSubjectName setIsEditing={setIsEditing} {...props} />}
		</TouchableOpacity>
	)
})

const EditSubjectName = observer(function EditSubjectName({
	setIsEditing,
	...props
}: { setIsEditing: (v: boolean) => void } & SubjectNameProps) {
	const groupSettings = XSettings.forCurrentGroupOrThrow()
	const [name, setName] = useState('')
	const onCancelPress = useCallback(() => {
		setName('')
		setIsEditing(false)
	}, [setName, setIsEditing])

	const onSavePress = useCallback(() => {
		runInAction(() => {
			if (name) groupSettings.subjectNames[props.discipline] = name
			else delete groupSettings.subjectNames[props.discipline]
		})
		setIsEditing(false)
	}, [setIsEditing, name, groupSettings.subjectNames, props.discipline])

	return (
		<Portal>
			<Dialog visible onDismiss={() => setIsEditing(false)}>
				<Dialog.Title style={Theme.fonts.titleMedium}>
					Изменить имя
				</Dialog.Title>
				<Dialog.Content style={{ gap: 10 }}>
					<Text>
						Имя в журнале:{' '}
						<Text style={{ fontWeight: 'bold' }} selectable>
							{props.discipline}
						</Text>
					</Text>
					<TextInput
						mode="outlined"
						defaultValue={props.discipline}
						onChangeText={setName}
						placeholder="Как в журнале"
					/>
				</Dialog.Content>
				<Dialog.Actions>
					<Button icon="cancel" onPress={onCancelPress} style={props.style}>
						Отмена
					</Button>
					<Button
						icon={'content-save'}
						style={props.style}
						onPress={onSavePress}
					>
						Сохранить
					</Button>
				</Dialog.Actions>
			</Dialog>
		</Portal>
	)
})
