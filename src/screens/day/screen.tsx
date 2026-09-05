import SelectModal from '@/components/SelectModal'
import UpdateDate from '@/components/UpdateDate'
import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'
import { ScheduleStore } from '@/services/mgik/store'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import {
	CalendarProvider,
	DateData,
	ExpandableCalendar,
} from 'react-native-calendars'
import { Positions } from 'react-native-calendars/src/expandableCalendar'
import { ScrollView } from 'react-native-gesture-handler'
import { XBottomTabScreenProps } from '../../../App'
import { Spacings } from '../../utils/Spacings'
import Day from './Day'
import { EditDiaryDayScreen } from './edit/Screen'
import { EditDiaryFAB } from './edit/Select'
import { DiaryState } from './state'

// @ts-expect-error fix for defaultProps warning
ExpandableCalendar.defaultProps = undefined

import { LocaleConfig } from 'react-native-calendars'
import { DayProps } from 'react-native-calendars/src/calendar/day/index'
import { MarkingProps } from 'react-native-calendars/src/calendar/day/marking/index'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { calculateColorFromNumber } from '../../utils/colorFromNumber'

// localization for react-native-calendars
LocaleConfig.locales['ru-RU'] = {
	monthNames: [
		'Январь',
		'Февраль',
		'Март',
		'Апрель',
		'Май',
		'Июнь',
		'Июль',
		'Август',
		'Сентябрь',
		'Октябрь',
		'Ноябрь',
		'Декабрь',
	],
	monthNamesShort: [
		'Янв',
		'Фев',
		'Мар',
		'Апр',
		'Май',
		'Июн',
		'Июл',
		'Авг',
		'Сен',
		'Окт',
		'Ноя',
		'Дек',
	],
	dayNames: [
		'воскресенье',
		'понедельник',
		'вторник',
		'среда',
		'четверг',
		'пятница',
		'суббота',
	],
	dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
	today: 'Сегодня',
}
LocaleConfig.defaultLocale = 'ru-RU'

export default observer(function DiaryScreen(props: XBottomTabScreenProps) {
	const insets = useSafeAreaInsets()
	return (
		<View style={styles.flex}>
			<View
				style={{
					height: insets.top,
					backgroundColor: Theme.colors.navigationBar,
				}}
			/>
			{/* <Header title="Расписание" /> */}
			<EditDiaryFAB />
			{!DiaryState.edit ? (
				<ScrollView
					contentContainerStyle={styles.scrollContentContainer}
					refreshControl={ScheduleStore.refreshControl}
				>
					<View style={styles.selectDayView}>
						<SelectDay />
					</View>
					<View style={styles.day}>
						{ScheduleStore.fallback || <Day {...props} />}
					</View>
					<UpdateDate store={ScheduleStore} />
				</ScrollView>
			) : (
				ScheduleStore.fallback || <EditDiaryDayScreen />
			)}
		</View>
	)
})

const styles = StyleSheet.create({
	flex: { flex: 1 },
	scrollContentContainer: {
		justifyContent: 'center',
		alignContent: 'center',
	},
	selectDayView: { flex: 1, zIndex: 30 },
	day: { padding: Spacings.s1 },
})

function toCalendar(yyyymmdd: string) {
	return yyyymmdd.split('.').reverse().join('-')
}

function fromCalendar(calendar: string) {
	return calendar.split('-').reverse().join('.')
}

const SelectDay = observer(function SelectDay() {
	if (XSettings.newDatePicker) {
		const theme: import('react-native-calendars').CalendarProps['theme'] & {
			expandableKnobColor: string
		} = {
			backgroundColor: Theme.colors.navigationBar,
			calendarBackground: Theme.colors.navigationBar,
			textSectionTitleColor: Theme.colors.primary,
			monthTextColor: Theme.colors.primary,
			arrowColor: Theme.colors.primary,
			selectedDayBackgroundColor: Theme.colors.secondaryContainer,
			selectedDayTextColor: Theme.colors.onSecondaryContainer,
			todayBackgroundColor: Theme.colors.surfaceDisabled,
			todayTextColor: Theme.colors.onSurfaceDisabled,
			textDisabledColor: Theme.colors.onSurfaceDisabled,
			dayTextColor: Theme.colors.onBackground,
			expandableKnobColor: Theme.colors.secondaryContainer,
			textDayHeaderFontWeight: 'bold',
			textMonthFontWeight: 'bold',
			textMonthFontSize: 14,
		}
		return (
			<CalendarProvider
				date={toCalendar(DiaryState.day)}
				onDateChanged={d => {
					setTimeout(() => {
						d = fromCalendar(d)
						runInAction(() => {
							DiaryState.day = d
							const [day, month, year] = d.split('.').map(e => parseInt(e))
							const weekDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
							DiaryState.week = weekDate
						})
					}, 100)
				}}
			>
				<ExpandableCalendar
					theme={theme}
					key={Theme.key + Object.values(theme).join(',')}
					firstDay={1}
					openThreshold={0}
					dayComponent={CustomDay}
					closeThreshold={0}
					markedDates={
						ScheduleStore.result
							? (ScheduleStore.result.reduce(
									(acc, e) => {
										const key = e.date
											.toYYYYMMDD()
											.split('.')
											.reverse()
											.join('-')
										acc[key] ??= { badgeText: 0 }
										acc[key].badgeText++
										return acc
									},
									{} as Record<string, { badgeText: number }>,
								) as unknown as Record<string, MarkingProps>)
							: {}
					}
					horizontal
					initialPosition={Positions.CLOSED}
					allowShadow
					closeOnDayPress={false}
				/>
			</CalendarProvider>
		)
	}

	return (
		<SelectModal
			label="День"
			mode="button"
			data={DiaryState.weekDaysDropdown}
			value={DiaryState.day}
			onSelect={item =>
				runInAction(() => {
					if ('week' in item) DiaryState.week = item.week
					DiaryState.day = item.value.replace('$TODAY', '')
				})
			}
		/>
	)
})

const CustomDay = ({ date, state, marking, onPress }: DayProps) => {
	// marking can contain your custom badge data passed via markedDates
	const number = (marking as unknown as { badgeText: number })?.badgeText
	const hasBadge = typeof number !== 'undefined'

	let colors
	if (hasBadge) {
		colors = calculateColorFromNumber(number)
	}

	// Determine background and text color based on calendar state
	let backgroundColor: string
	let textColor: string

	if (state === 'selected') {
		backgroundColor = Theme.colors.surfaceDisabled
		textColor = Theme.colors.onSurfaceDisabled
	} else if (state === 'today') {
		backgroundColor = Theme.colors.secondaryContainer
		textColor = Theme.colors.onSecondaryContainer
	} else if (state === 'disabled') {
		backgroundColor = 'transparent'
		textColor = Theme.colors.onSurfaceDisabled
	} else {
		backgroundColor = 'transparent'
		textColor = Theme.colors.onBackground
	}

	return (
		<TouchableOpacity
			onPress={() => onPress?.(date as unknown as DateData)}
			style={[dayStyles.container, { backgroundColor }]}
		>
			<Text style={[dayStyles.dayText, { color: textColor }]}>
				{(date as unknown as DateData).day}
			</Text>
			{hasBadge && (
				<View
					style={[
						dayStyles.badge,
						colors ? { backgroundColor: colors.backgroundColor } : {},
					]}
				>
					<Text
						style={[
							dayStyles.badgeText,
							colors ? { color: colors.textColor } : {},
						]}
					>
						{number}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}

const dayStyles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		height: 35,
		borderRadius: 20,
		width: 32,
	},
	dayText: {
		fontSize: 14,
		fontWeight: 'bold',
	},
	badge: {
		borderRadius: 4,
		paddingHorizontal: 3,
		paddingVertical: 1,
		marginTop: 1,
	},
	badgeText: {
		fontSize: 10,
	},
})

export type DiaryLessonProps = {
	i: number
	lesson: import('@/services/mgik/api').ScheduleItem
}
