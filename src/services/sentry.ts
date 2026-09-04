import * as Sentry from '@sentry/react-native'
import * as updates from 'expo-updates'

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
export const SENTRY_ROUTING = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: true,
})

const manifest = updates.manifest
const metadata =
	manifest && 'metadata' in manifest ? manifest.metadata : undefined
const extra = manifest && 'metadata' in manifest ? manifest.extra : undefined
const updateGroup =
	metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined
const owner = extra?.expoClient?.owner ?? '[account]'
const slug = extra?.expoClient?.slug ?? '[project]'

Sentry.setContext('expo', {
	'update-id': updates.updateId,
	'is-embeded-update': updates.isEmbeddedLaunch,
	'update-group': updateGroup,
	'debug-url': `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
})

if (!__TEST__) {
	Sentry.init({
		dsn: 'https://2b06d64944c9004d4b061f771865449a@o4506601427369984.ingest.us.sentry.io/4512028321644544',
		// Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
		tracesSampleRate: 0.9,
		profilesSampleRate: 0.9,
		ignoreErrors: [/Unable activate keep awake/g],
		integrations: [SENTRY_ROUTING, Sentry.hermesProfilingIntegration({})],

		enabled: !__DEV__,
	})
}
