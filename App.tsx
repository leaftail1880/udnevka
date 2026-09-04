// Initial setup & polyfills & monitoring
import '@/utils/polyfill'
import { GestureHandlerRootView, Text } from 'react-native-gesture-handler'

import '@/services/sentry'

import '@/utils/configure'

import { Logger, Screens } from '@/constants'

// External dependencies
import {
	BottomTabBarProps,
	BottomTabScreenProps,
	createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import {
	CommonActions,
	DefaultTheme,
	NavigationContainer,
	NavigationContainerRef,
} from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useRef } from 'react'
import { Easing, useWindowDimensions, View } from 'react-native'
import {
	BottomNavigation,
	Icon,
	PaperProvider,
	TouchableRipple,
} from 'react-native-paper'
import {
	SafeAreaProvider,
	useSafeAreaInsets,
} from 'react-native-safe-area-context'

// Components
import Header from '@/components/Header'
import Loading from '@/components/Loading'
import Toast from '@/components/Modal'

// Services
import { ScheduleStore } from '@/services/mgik/store'
import '@/services/notifications/setup'
import { SENTRY_ROUTING } from '@/services/sentry'

// State
import { XSettings } from '@/models/settings'
import { Theme } from '@/models/theme'

// Screens
import DiaryScreen from '@/screens/day/screen'
import LoginScreen from '@/screens/login/in'
import SettingsScreen from '@/screens/settings/screen'

type BottomTabsParams = Record<
	Screens.LogIn | Screens.LogOut | Screens.Diary | Screens.Settings,
	undefined
>

export type XBottomTabScreenProps = BottomTabScreenProps<BottomTabsParams>

const ScreenIcons = {
	[Screens.LogIn]: 'login',
	[Screens.LogOut]: 'logout',
	[Screens.Diary]: 'book',
	[Screens.Settings]: 'cog',
}

// Refactored route configuration
const AppRoutes = [
	{
		name: Screens.LogIn,
		component: () => <LoginScreen />,
		hideCondition: () => XSettings.currentGroupId !== undefined,
	},
	{
		name: Screens.Diary,
		component: DiaryScreen,
		fallback: true,
	},
	{
		name: Screens.Settings,
		component: SettingsScreen,
	},
].map(e => ({
	...e,
	component: Sentry.withErrorBoundary(e.component, {
		fallback: (
			<View>
				<Text>Error occured</Text>
			</View>
		),
		showDialog: true,
	}),
}))

const Tab = createBottomTabNavigator<BottomTabsParams>()

// Custom Tab Bar Component using BottomNavigation.Bar
const CustomTabBar = observer(function CustomTabBar({
	navigation,
	state,
	insets,
}: BottomTabBarProps) {
	return (
		<BottomNavigation.Bar
			navigationState={state}
			safeAreaInsets={insets}
			onTabPress={({ route, preventDefault }) => {
				const event = navigation.emit({
					type: 'tabPress',
					target: route.key,
					canPreventDefault: true,
				})

				if (event.defaultPrevented) {
					preventDefault()
				} else {
					navigation.dispatch({
						...CommonActions.navigate(route.name, route.params),
						target: state.key,
					})
				}
			}}
			renderIcon={({ route, color }) => {
				const iconName = ScreenIcons[route.name as keyof typeof ScreenIcons]
				return <Icon source={iconName} color={color} size={23} />
			}}
			getLabelText={({ route }) => route.name}
			activeColor={Theme.colors.onPrimaryContainer}
			inactiveColor={Theme.colors.onSurfaceVariant}
			style={{
				backgroundColor: Theme.colors.navigationBar,
			}}
			renderTouchable={props => <TouchableRipple {...props} key={props.key} />}
		/>
	)
})

export default Sentry.wrap(
	observer(function App() {
		const navigation = useRef<NavigationContainerRef<BottomTabsParams>>(null)

		Logger.info('APP LOAD THEME IS LOADING ' + Theme.manage.isLoading())

		if (Theme.manage.isLoading()) return <Loading text="Загрузка темы" />

		const ProvidedTheme = toJS(Theme.manage.getTheme())
		return (
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaProvider>
					<PaperProvider theme={ProvidedTheme}>
						<NavigationContainer
							theme={{
								...ProvidedTheme,
								fonts: DefaultTheme.fonts,
							}}
							ref={navigation}
							onReady={() =>
								SENTRY_ROUTING.registerNavigationContainer(navigation)
							}
						>
							<Navigation />
						</NavigationContainer>
						<Toast />
					</PaperProvider>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		)
	}),
)

const Navigation = observer(function Navigation() {
	Logger.info('NAVIGATION RENDER')

	// Determine if we need a fallback screen (loading schedule)
	let innerFallback: React.ReactNode | undefined
	if (XSettings.currentGroupId !== undefined) {
		if (ScheduleStore.fallback) {
			innerFallback = ScheduleStore.fallback
		}
	}

	let FallbackScreen: React.FC | undefined
	if (innerFallback) {
		FallbackScreen = () => (
			<View>
				<Header title="Загрузка..." />
				{innerFallback}
			</View>
		)
	}

	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()

	return (
		<Tab.Navigator
			tabBar={props => <CustomTabBar {...props} />}
			safeAreaInsets={insets}
			screenOptions={{
				headerShown: false,
				tabBarHideOnKeyboard: true,
				animation: 'shift',
				transitionSpec: {
					animation: 'timing',
					config: {
						duration: 300,
						easing: Easing.out(Easing.exp),
					},
				},
				sceneStyleInterpolator: ({ current }) => ({
					sceneStyle: {
						opacity: current.progress.interpolate({
							inputRange: [-1, 0, 1],
							outputRange: [1, 1, 1],
						}),
						transform: [
							{
								translateX: current.progress.interpolate({
									inputRange: [-1, 0, 1],
									outputRange: [-width, 0, width],
								}),
							},
						],
					},
				}),
			}}
		>
			{AppRoutes.map(route => {
				if (route.hideCondition?.()) return null

				return (
					<Tab.Screen
						key={route.name}
						name={route.name as keyof BottomTabsParams}
						component={
							route.fallback && FallbackScreen
								? FallbackScreen
								: route.component
						}
					/>
				)
			})}
		</Tab.Navigator>
	)
})
