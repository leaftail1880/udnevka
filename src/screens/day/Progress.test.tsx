import { scheduleStatus } from './Progress'

function pick(obj: object, keys: string[]) {
	const result = {}
	for (const key of keys) {
		// @ts-expect-error
		result[key] = obj[key]
	}
	return result
}

describe('scheduleStatus', () => {
	it('should calculate schedule status', () => {
		expect(
			pick(
				scheduleStatus(
					new Date(2026, 1, 1, 10).getTime(),
					new Date(2026, 1, 1, 11, 30).getTime(),
					new Date(2026, 1, 1, 11, 10).getTime(),
				),
				['progress', 'remaining', 'elapsed'],
			),
		).toMatchInlineSnapshot(`
		{
		  "elapsed": "01:10:00/01:30:00",
		  "progress": 77,
		  "remaining": "00:20:00",
		}
	`)
	})

	it('should calculate schedule status with seconds', () => {
		expect(
			pick(
				scheduleStatus(
					new Date(2026, 1, 1, 10).getTime(),
					new Date(2026, 1, 1, 11, 30).getTime(),
					new Date(2026, 1, 1, 11, 10, 10).getTime(),
				),
				['progress', 'remaining', 'elapsed'],
			),
		).toMatchInlineSnapshot(`
		{
		  "elapsed": "01:10:10/01:30:00",
		  "progress": 77,
		  "remaining": "00:19:50",
		}
	`)
	})

	it('should calculate schedule status', () => {
		expect(
			pick(
				scheduleStatus(
					new Date(2026, 1, 1, 10).getTime(),
					new Date(2026, 1, 1, 11, 30).getTime(),
					new Date(2026, 1, 1, 10, 10).getTime(),
				),
				['progress', 'remaining', 'elapsed'],
			),
		).toMatchInlineSnapshot(`
		{
		  "elapsed": "00:10:00/01:30:00",
		  "progress": 11,
		  "remaining": "01:20:00",
		}
	`)
	})

	it('should calculate schedule status', () => {
		expect(
			pick(
				scheduleStatus(
					new Date(2026, 1, 1, 10).getTime(),
					new Date(2026, 1, 1, 11, 30).getTime(),
					new Date(2026, 1, 1, 10, 30).getTime(),
				),
				['progress', 'remaining', 'elapsed'],
			),
		).toMatchInlineSnapshot(`
		{
		  "elapsed": "00:30:00/01:30:00",
		  "progress": 33,
		  "remaining": "01:00:00",
		}
	`)
	})

	it('should calculate schedule status before starts', () => {
		expect(
			pick(
				scheduleStatus(
					new Date(2026, 1, 1, 10).getTime(),
					new Date(2026, 1, 1, 11, 30).getTime(),
					new Date(2026, 1, 1, 9, 55, 10).getTime(),
				),
				['beforeStartMs', 'startsAfter', 'state'],
			),
		).toMatchInlineSnapshot(`
		{
		  "beforeStartMs": 290000,
		  "startsAfter": "Начнется через 00:04:50",
		  "state": 0,
		}
	`)
	})
})
