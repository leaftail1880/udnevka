import * as XLSX from 'xlsx'
import { XSettings } from '../../models/settings'
import { abortSignalTimeout } from '../../utils/network'
import {
	DropdownData,
	ScheduleItem,
	ScheduleParams,
} from '../abstract-api-types'
import {
	ParsedTimetable,
	SheetData,
	expandSchedule,
	parseTimetable,
} from './nhmt-parser'

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
		return (await this.cachedDownload()).dropdown
	}

	/**
	 * Schedule for one group.
	 * Defaults to the current week (Mon-Sun); pass `from`/`to` for another range.
	 */
	async getSchedule(params: ScheduleParams): Promise<ScheduleItem[]> {
		const parsed = await this.cachedDownload()
		const rawId = String(params.groupId)

		const group = parsed.dropdown.groups.find(
			g => g.name === rawId || g.shortName === rawId || String(g.id) === rawId,
		)

		if (!group) {
			throw new Error(`Unknown group id: ${rawId}`)
		}
		return expandSchedule(parsed, group.id, params.from, params.to)
	}

	// ---- private ----

	private async cachedDownload(): Promise<ParsedTimetable> {
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

		const buffer = await response.arrayBuffer()
		const workbook = XLSX.read(new Uint8Array(buffer), {
			type: 'array',
			cellDates: true,
		})

		const sheetName = workbook.SheetNames[0]
		if (!sheetName) {
			throw new Error('Workbook contains no sheets')
		}

		// `header: 1` produces an array-of-arrays, matching the old `sheet.data`.
		// `defval: null` keeps holes filled so column indices stay stable.
		const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
			header: 1,
			raw: true,
			defval: null,
			blankrows: true,
		}) as SheetData

		return parseTimetable(rows)
	}
}

export const nhmtScheduleClient = new NhmtScheduleClient()
