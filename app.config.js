// @ts-check
import {
	AndroidConfig,
	withAndroidManifest,
	withAndroidStyles,
	withGradleProperties,
} from 'expo/config-plugins'

const version = '0.27.0'
const slug = 'udnevka'
const name = 'Udnevka'
const projectId = '50974a14-e146-4aac-8aa5-265811d17456'

// eslint-disable-next-line no-undef
const IS_DEV = !!process.env.DEV

const id = IS_DEV ? 'com.leaftail1880.udnevka.dev' : 'com.leaftail1880.udnevka'

const sentry = {
	organization: 'leaftail1880',
	project: 'udnevka',
}

const splashBackgroundDark = '#252525'
const splashBackgroundLight = '#EBEAEA'

/** @type {{expo: import("@expo/config-types/build/ExpoConfig").ExpoConfig}} */
const Config = {
	expo: {
		name: IS_DEV ? name + ' Dev Client' : name,
		slug: slug,
		version: version,
		owner: 'leaftail1880',
		orientation: 'default',
		icon: './assets/icon.png',
		assetBundlePatterns: ['**/*'],
		userInterfaceStyle: 'automatic',

		ios: {
			bundleIdentifier: id,
			userInterfaceStyle: 'automatic',
			infoPlist: {
				UIBackgroundModes: ['processing'],
			},
		},

		android: {
			package: id,
			userInterfaceStyle: 'automatic',
			permissions: [
				'FOREGROUND_SERVICE',
				'REQUEST_INSTALL_PACKAGES',
				'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
			],
			softwareKeyboardLayoutMode: 'pan',
			adaptiveIcon: {
				foregroundImage: './assets/adaptive-icon.png',
				backgroundColor: splashBackgroundLight,
			},
		},

		plugins: [
			'expo-dev-client',
			'expo-updates',
			'expo-background-task',
			'expo-sharing',
			'expo-status-bar',
			'react-native-notify-kit',
			'@react-native-vector-icons/material-icons',
			// 'expo-build-properties',
			['@sentry/react-native', sentry],
			[
				'expo-splash-screen',
				{
					backgroundColor: splashBackgroundLight,
					image: './assets/icon.png',
					dark: {
						image: './assets/icon.png',
						backgroundColor: splashBackgroundDark,
					},
					imageWidth: 200,
				},
			],
			[
				'expo-notifications',
				{
					icon: './assets/notification_icon.png',
					color: splashBackgroundLight,
				},
			],
			[
				'expo-navigation-bar',
				{
					backgroundColor: '#FFFFFF00',
				},
			],
		],

		runtimeVersion: {
			policy: 'appVersion',
		},
		updates: {
			url: `https://u.expo.dev/${projectId}`,
		},
		extra: {
			eas: {
				projectId: projectId,
			},
		},
	},
}

Config.expo.plugins = Config.expo.plugins?.filter(Boolean)

// Config.expo = withBuildProperties(Config.expo, {
// 	android: {
// 		// enableMinifyInReleaseBuilds: true,
// 		// enableShrinkResourcesInReleaseBuilds: true,
// 	},
// })

Config.expo = withGradleProperties(Config.expo, config => {
	config.modResults.push(
		{
			type: 'property',
			key: 'reactNativeArchitectures',
			value: 'armeabi-v7a,arm64-v8a', //,x86,x86_64
		},
		{
			type: 'property',
			key: 'org.gradle.jvmargs',
			value: '-Xmx3096m -XX:MaxMetaspaceSize=512m',
		},
		{
			type: 'property',
			key: 'org.gradle.caching',
			value: 'true',
		},
	)

	return config
})

// Make dark theme properly work on Xiaomi devices
Config.expo = withAndroidStyles(Config.expo, config => {
	config.modResults = AndroidConfig.Styles.assignStylesValue(
		config.modResults,
		{
			add: true,
			parent: AndroidConfig.Styles.getAppThemeGroup(),
			name: `android:forceDarkAllowed`,
			value: 'false',
		},
	)

	// NEW: Fix splash screen contrast enforcement
	const splashScreenTheme = AndroidConfig.Styles.getStyleParent(
		config.modResults,
		{ name: 'Theme.App.SplashScreen' },
	)

	if (splashScreenTheme) {
		splashScreenTheme.item.push(
			{
				$: {
					'name': 'android:enforceNavigationBarContrast',
					'tools:targetApi': '29',
				},
				_: 'false',
			},
			{
				$: {
					'name': 'android:enforceStatusBarContrast',
					'tools:targetApi': '29',
				},
				_: 'false',
			},
		)
	}

	return config
})

Config.expo = withAndroidManifest(Config.expo, config => {
	const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
		config.modResults,
	)
	if (mainApplication && !mainApplication?.service) {
		mainApplication.service = []
	}
	mainApplication?.service?.push({
		$: {
			'android:name': 'app.notifee.core.ForegroundService',
			'android:foregroundServiceType': 'dataSync',
		},
	})
	return config
})

export default Config
