import readXlsxFile from 'read-excel-file/universal'
import { XSettings } from '../../models/settings'
import { abortSignalTimeout } from '../../utils/network'
import { DropdownData, ScheduleItem, ScheduleParams } from '../abstract-api-types'
import {
	ParsedTimetable,
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
	constructor(private readonly url: string = DEFAULT_URL) {}

	/** Groups, courses, faculties (specialties) and forms of education. */
	async getDropdownData(): Promise<DropdownData> {
		return (await this.download()).dropdown
	}

	/**
	 * Schedule for one group.
	 * Defaults to the current week (Mon-Sun); pass `from`/`to` for another range.
	 */
	async getSchedule(params: ScheduleParams): Promise<ScheduleItem[]> {
		const parsed = await this.download()
		const rawId = String(params.groupId)

		const group = parsed.dropdown.groups.find(
			g => g.name === rawId || g.shortName === rawId || String(g.id) === rawId,
		)

		if (!group) {
			throw new Error(`Unknown group id: ${rawId}`)
		}

		return expandSchedule(parsed, group.id, params.from, params.to)
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
		console.log("RTPE", readXlsxFile)
		const result = (await readXlsxFile(buffer as any))[0]

		return parseTimetable(result.data)
	}
}

export const nhmtScheduleClient = new NhmtScheduleClient()
