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
	DefaultTheme,
	NavigationContainer,
	NavigationContainerRef,
} from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useRef } from 'react'
import { Easing, Pressable, useWindowDimensions, View } from 'react-native'
import { Icon, PaperProvider } from 'react-native-paper'
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
import { StyleSheet } from 'react-native' // Ensure these are imported
// Note: You can still use TouchableRipple if you prefer, but ensure style={{flex:1, justifyContent:'center'}}

const CustomTabBar = observer(function CustomTabBar({
	navigation,
	state,
	insets,
}: BottomTabBarProps) {
	return (
		<View
			style={{
				flexDirection: 'row',
				backgroundColor: Theme.colors.navigationBar,
				height: 80 + (insets.bottom ?? 0),
				paddingBottom: insets.bottom ?? 0,
			}}
		>
			{state.routes.map((route, index) => {
				const isFocused = state.index === index
				const iconName = ScreenIcons[route.name as keyof typeof ScreenIcons]

				const color = isFocused
					? Theme.colors.onPrimaryContainer
					: Theme.colors.onSurfaceVariant

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					})

					if (!isFocused && !event.defaultPrevented) {
						navigation.navigate(route.name, route.params)
					}
				}

				const onLongPress = () => {
					navigation.emit({
						type: 'tabLongPress',
						target: route.key,
					})
				}

				return (
					<Pressable
						key={route.key}
						onPress={onPress}
						onLongPress={onLongPress}
						style={styles.tabItem} // Defined below
					>
						<>
							{isFocused && (
								<View
									style={[
										styles.activeIndicator,
										{ backgroundColor: Theme.colors.secondaryContainer },
									]}
								/>
							)}
							<Icon source={iconName} color={color} size={24} />
							<View style={{ height: 12 }} />
							<Text
								style={{
									color,
									fontSize: 12,
									fontWeight: 'bold',
								}}
							>
								{route.name}
							</Text>
						</>
					</Pressable>
				)
			})}
		</View>
	)
})

// Add these styles outside the component
const styles = StyleSheet.create({
	tabItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	activeIndicator: {
		position: 'absolute',
		top: 8,
		bottom: 34, // Adjust to center relative to icon
		width: 70,
		borderRadius: 35,
	},
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
				// animation: 'shift',
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
