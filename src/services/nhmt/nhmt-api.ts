import readXlsxFile from 'read-excel-file'
import { XSettings } from '../../models/settings'
import { abortSignalTimeout } from '../../utils/network'
import {
	DropdownData,
	ParsedTimetable,
	Row,
	ScheduleItem,
	ScheduleParams,
	expandSchedule,
	parseTimetable,
} from './nhmtParser'

export * from './nhmtParser'

const DEFAULT_URL = 'https://nhmt.ru/documents/1_2026-2027.xlsx'

/**
 * Client for the NHMT timetable workbook. Same public surface as the
 * edu.mgik.org `ScheduleClient`: `getDropdownData()` and `getSchedule()`.
 *
 * The workbook holds a weekly recurring timetable (weekday + pair number, no
 * dates), so `getSchedule` expands it into dated items for a requested range.
 */
export class NhmtScheduleClient {
	private cache: { at: number; data: ParsedTimetable } | null = null
	private inflight: Promise<ParsedTimetable> | null = null

	/**
	 * @param url        - Workbook URL (default: 1_2026-2027.xlsx).
	 * @param cacheTtlMs - How long the parsed workbook is reused (default: 10 min).
	 */
	constructor(
		private readonly url: string = DEFAULT_URL,
		private readonly cacheTtlMs: number = 10 * 60 * 1000,
	) {}

	/** Groups, courses, faculties (specialties) and forms of education. */
	async getDropdownData(): Promise<DropdownData> {
		return (await this.load()).dropdown
	}

	/**
	 * Schedule for one group.
	 * Defaults to the current week (Mon-Sun); pass `from`/`to` for another range.
	 */
	async getSchedule(params: ScheduleParams): Promise<ScheduleItem[]> {
		const groupId = Number(params.idGroup)
		if (!Number.isInteger(groupId)) {
			throw new Error(`Invalid group id: ${params.idGroup}`)
		}
		const parsed = await this.load()
		if (!parsed.dropdown.groups.some(g => g.id === groupId)) {
			throw new Error(`Unknown group id: ${groupId}`)
		}
		return expandSchedule(parsed, groupId, params.from, params.to)
	}

	/** Drops the cached workbook so the next call re-downloads it. */
	clearCache(): void {
		this.cache = null
	}

	// ---- private ----

	private async load(): Promise<ParsedTimetable> {
		if (this.cache && Date.now() - this.cache.at < this.cacheTtlMs) {
			return this.cache.data
		}
		// Share one download between concurrent callers.
		this.inflight ??= this.download().finally(() => {
			this.inflight = null
		})
		const data = await this.inflight
		this.cache = { at: Date.now(), data }
		return data
	}

	private async download(): Promise<ParsedTimetable> {
		const signal = abortSignalTimeout(XSettings.networkTimeout)
		const response = await fetch(this.url, {
			method: 'GET',
			// @ts-expect-error nodejs vs react types conflict
			signal,
		})
		if (!response.ok) {
			throw new Error(
				`Request failed with status ${response.status}: ${response.statusText}`,
			)
		}

		// Pass an ArrayBuffer: React Native's Blob can't be built from binary data.
		const buffer = await response.arrayBuffer()
		const result: any = await readXlsxFile(buffer as any)

		// Older versions return rows of the first sheet, newer ones may return
		// [{ sheet, data }]; accept both.
		const rows: Row[] =
			Array.isArray(result) && result[0]?.data && !Array.isArray(result[0])
				? result[0].data
				: result

		return parseTimetable(rows)
	}
}

export const nhmtScheduleClient = new NhmtScheduleClient()
