import ErrorHandler from '@/components/ErrorHandler'
import Loading from '@/components/Loading'
import { Toast } from '@/utils/Toast'
import { makeReloadPersistable } from '@/utils/makePersistable'
import {
	action,
	autorun,
	flow,
	makeAutoObservable,
	observable,
	toJS,
} from 'mobx'
import { RefreshControl } from 'react-native'
import { Logger } from '../constants'
import { stringifyNetworkErrorLike } from '../utils/network'

export type AsyncMethod = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	arg: any,
) => Promise<unknown>

/**
 * Return type of the useAPI hook
 */
export type AsyncState<Result> = (
	| { result: Result; fallback: undefined }
	| { result: undefined; fallback: React.JSX.Element }
) & {
	reload: () => void
	refreshControl: React.JSX.Element
	updateDate: string
}

// ==================== Disk-backed cache ====================

interface CacheEntry {
	/** When the value was written (epoch ms). */
	date: number
	value: unknown
}

/** Cache entries older than this are dropped on read. */
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 1 week

/**
 * JSON.stringify turns Dates into ISO strings. When reading cache back from
 * disk we need to convert them into Date instances again, otherwise
 * e.g. ScheduleItem.startTime would be a string.
 */
function reviveDates<T>(value: T): T {
	if (value === null || value === undefined) return value
	if (typeof value === 'string') {
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
			const date = new Date(value)
			if (!Number.isNaN(date.getTime())) return date as unknown as T
		}
		return value
	}
	if (Array.isArray(value)) return value.map(reviveDates) as unknown as T
	if (typeof value === 'object') {
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(value as object)) {
			out[key] = reviveDates((value as Record<string, unknown>)[key])
		}
		return out as unknown as T
	}
	return value
}

/**
 * Single process-wide cache. Shared between all AsyncStore instances, keyed by
 * `method + JSON.stringify(params)`. Persisted to disk via makeReloadPersistable.
 */
export class AsyncCacheStore {
	cache: Record<string, CacheEntry> = {}

	constructor() {
		makeAutoObservable(this, {}, { autoBind: true })
		makeReloadPersistable(this, {
			name: 'async-cache-v3',
			properties: [
				{
					key: 'cache',
					serialize: e => e,
					deserialize: e => reviveDates(e ?? {}),
				},
			],
		})
	}

	get(key: string): CacheEntry | undefined {
		const entry = this.cache[key]
		if (!entry) return undefined
		if (Date.now() - entry.date > CACHE_TTL) {
			delete this.cache[key]
			return undefined
		}
		return entry
	}

	set(key: string, value: unknown) {
		this.cache[key] = { date: Date.now(), value }
	}
}

export const asyncCache = new AsyncCacheStore()

/**
 * Global set of cache keys for which we have already performed the initial
 * "show cached data, then refresh in background" dance at least once per
 * process lifetime.
 */
const firstTimeCacheUsedFor = new Set<string>()

// ==================== AsyncStore ====================

export class AsyncStore<
	Fn extends AsyncMethod,
	FnReturn = Awaited<ReturnType<Fn>>,
	FnParams = Parameters<Fn>[0],
	DefaultParams = Record<never, never>,
> {
	constructor(
		private readonly id: string,
		private readonly method: Fn,
		public readonly name: string,
		private readonly defaultParams?: DefaultParams,
		public debug = false,
		private readonly backgroundStoreWithoutErrorMessages = false,
	) {
		this.log('Store created')

		makeAutoObservable<
			this,
			| 'reload'
			| 'reloadTimes'
			| 'resultCache'
			| 'update'
			| 'error'
			| 'loading'
			| 'params'
			| 'method'
			| 'id'
			| 'log'
			| 'refreshControlLoadingOverride'
		>(
			this,
			{
				reload: true,
				reloadTimes: true,
				resultCache: true,
				result: true,
				updateDate: true,
				refreshControl: true,
				fallback: true,
				update: flow,
				error: observable.ref,
				params: observable.struct,
				withParams: action,
				loading: true,
				refreshControlLoadingOverride: true,
				log: false,
				debug: false,
				name: false,
				method: false,
				id: false,
			},
			{ autoBind: true, name: this.name },
		)

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const store = this

		// Reload on reload request
		autorun(function apiStoreReload() {
			store.log('Params changed, reloading...')
			store.update(toJS(store.params))
		})
	}

	private log(...data: unknown[]) {
		if (this.debug) {
			Logger.debug('\u001b[36mДля ' + this.name + '\u001b[0m', ...data)
		}
	}

	private reload() {
		this.log('Reloading')
		this.reloadTimes++
		this.update(this.params)
	}

	private error: Error | undefined = undefined
	private loading = true
	private reloadTimes: number = 0
	private params: FnParams | undefined = undefined

	private resultCache: FnReturn | undefined = undefined
	get result() {
		if (this.loading) return undefined
		return this.resultCache
	}
	set result(v) {
		this.resultCache = v
	}

	updateDate = 'Загрузка...'

	private refreshControlLoadingOverride = true
	get refreshControl() {
		return (
			<RefreshControl
				refreshing={this.refreshControlLoadingOverride || this.loading}
				onRefresh={this.reload}
			/>
		)
	}

	get fallback() {
		const noResult = typeof this.result === 'undefined'
		if (this.loading || noResult) {
			return this.error && noResult ? (
				<ErrorHandler
					error={[this.reloadTimes, this.error]}
					reload={this.reload}
					name={this.name}
				/>
			) : (
				<Loading text={`Загрузка ${this.name}...`} />
			)
		}
	}

	withParams(params: Omit<FnParams, keyof DefaultParams>) {
		this.log('Changing params from', this.params, 'to', params)
		// @ts-expect-error Type infering
		this.params = params
	}

	private *update(params: FnParams | undefined) {
		const request = this.method
		if (typeof request !== 'function') {
			Logger.warn(
				'Request update, method ' + this.id + ' of api is not a function!',
			)
			return
		}

		if (this.defaultParams)
			params = { ...this.defaultParams, ...params } as FnParams

		if (!params) return this.log('Request update, params are falsy')
		this.log('Request update, params:', params)

		const key = String(this.id) + '-' + JSON.stringify(params)
		const firstTime = !firstTimeCacheUsedFor.has(key)
		const cachedEntry = asyncCache.get(key)

		// First request ever for this key + we have something on disk:
		// show it immediately, then refresh in the background.
		if (firstTime && cachedEntry) {
			this.log('Using cache on first request, scheduling refresh')
			this.result = cachedEntry.value as FnReturn
			this.updateDate = `Дата обновления: ${new Date(
				cachedEntry.date,
			).toLocaleTimeString()} (первичный кэш)`
			this.error = undefined
			this.loading = false
			this.refreshControlLoadingOverride = true
			firstTimeCacheUsedFor.add(key)
			this.reload()
			return
		}

		try {
			const data: FnReturn = yield request(params)
			asyncCache.set(key, data)
			this.result = data
			this.updateDate = `Дата обновления: ${new Date().toLocaleTimeString()}`
			this.log('Loaded fresh data for', key)
		} catch (error) {
			// Request failed. If we still have something in cache, fall back to it
			// (and let the user know something is wrong unless silenced).
			if (cachedEntry) {
				if (!this.backgroundStoreWithoutErrorMessages) {
					Toast.show({
						error: true,
						title: `Ошибка ${this.name}`,
						body: stringifyNetworkErrorLike(error),
					})
				}
				Logger.debug('Using cache for', String(this.method), error)
				this.result = cachedEntry.value as FnReturn
				this.updateDate = `Дата обновления: ${new Date(
					cachedEntry.date,
				).toLocaleTimeString()} (кэш, ошибка: ${stringifyNetworkErrorLike(error)})`
			} else {
				Logger.error('Failed to update для', this.name, error)
				if (typeof error === 'object' && error && 'stack' in error)
					Logger.error(error.stack)
				this.error = error as Error
			}
		} finally {
			this.loading = false
			this.refreshControlLoadingOverride = false
			firstTimeCacheUsedFor.add(key)
		}
	}
}
