export enum NetworkErrorReason {
	noConnection = 'Нет сети',
	timeout = 'Сервер не отвечает. Плохое соединение или техработы',
}

export function stringifyNetworkErrorLike(errorLike: unknown): string | NetworkErrorReason {
		let result: string

		if (errorLike instanceof Error) {
			if (errorLike.name === 'AbortError') {
				result = NetworkErrorReason.timeout
			}
		}

		if (errorLike instanceof TypeError) {
			if (errorLike.message.includes('Network request failed')) {
				result = NetworkErrorReason.noConnection
			}
		}

		result ??= errorLike + ''
		result = result.replace(/^Error: /, '')

		return result
	}

export function abortSignalTimeout(ms: number) {
	const controller = new AbortController()

	setTimeout(() => {
		if (!controller.signal.aborted) controller.abort()
	}, ms)

	return controller.signal
}
