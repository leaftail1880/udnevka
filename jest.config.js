/** @type {Record<string, import('jest').Config['transform']>} */
const transformers = {
	'default': {},
	['swc-tsx']: {
		'\\.tsx?$': '@swc/jest',
	},
	['swc-all']: {
		// Use Flow parser for .js/.jsx files
		'\\.jsx?$': [
			'@swc/jest',
			{
				jsc: {
					parser: {
						syntax: 'flow',
						jsx: true,
						components: true,
						decorators: true,
					},
					target: 'esnext',
					loose: true,
					externalHelpers: false,
					keepClassNames: false,
				},
				isModule: true,
			},
		],
	},
	// Use TypeScript parser for .ts/.tsx files
	'\\.tsx?$': [
		'@swc/jest',
		{
			jsc: {
				parser: {
					syntax: 'typescript',
					jsx: true,
					tsx: true,
					dynamicImport: false,
					privateMethod: false,
					functionBind: false,
					exportDefaultFrom: false,
					exportNamespaceFrom: false,
					decorators: false,
					decoratorsBeforeExport: false,
					topLevelAwait: false,
					importMeta: false,
					preserveAllComments: false,
				},
				target: 'esnext',
				loose: true,
				externalHelpers: false,
				keepClassNames: false,
			},
			isModule: true,
		},
	],
}

import module from 'module'
const require = module.createRequire(import.meta.url)

/** @type {import('jest').Config} */
export default {
	preset: 'jest-expo',
	transform:
		transformers[
			process.env.TRANSFORMER ??
				(process.platform === 'android' ? 'default' : 'swc-all')
		],
	transformIgnorePatterns: [
		'/node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@material)',
		'/node_modules/react-native-reanimated/plugin/',
	],
	setupFilesAfterEnv: [
		'./jest.setup.ts',
		'./src/utils/configure.ts',
		'./src/utils/polyfill.ts',
	],
	globals: {
		__DEV__: true,
	},
	cacheDirectory: '.jest',
	prettierPath: require.resolve('prettier-2'),
}
