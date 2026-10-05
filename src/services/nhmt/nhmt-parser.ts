// Pure parsing logic for the NHMT timetable sheet. No network / library imports,
// so it can be tested directly against rows produced by `xlsx`.

import {
	DropdownData,
	Faculty,
	Group,
	ScheduleItem,
} from '../abstract-api-types'

// ========== Cell / sheet types (replacing read-excel-file/universal) ==========

/** Values produced by `XLSX.utils.sheet_to_json({ header: 1, defval: null })`. */
export type CellValue = string | number | boolean | Date | null | undefined
export type SheetData = CellValue[][]

// ========== Parsed template (weekly recurring timetable) ==========

export type TemplateEntry = Omit<ScheduleItem, "date" | "week" | "id" | "lessonType" | "startTime" | "endTime" | "teacherComment" | "lessonComment"> & {
	start: string
	end: string
}

export interface ParsedTimetable {
	dropdown: DropdownData
	entries: TemplateEntry[]
	/** First day of the semester (used for week numbering). */
	semesterStart: Date
}

// ========== Constants ==========

const DAY_NAMES: Record<string, number> = {
	понедельник: 1,
	вторник: 2,
	среда: 3,
	четверг: 4,
	пятница: 5,
	суббота: 6,
	воскресенье: 7,
}

/** Fallback when the time cell can't be parsed. */
const LESSON_TIME_SLOTS: { start: string; end: string }[] = [
	{ start: '08:00', end: '09:40' },
	{ start: '10:00', end: '11:40' },
	{ start: '12:00', end: '13:40' },
	{ start: '14:00', end: '15:40' },
	{ start: '16:00', end: '17:40' },
	{ start: '18:00', end: '19:40' },
]

/** Min run of spaces that separates two side-by-side entries in one cell. */
const SPLIT_GAP = 8

// ========== Helpers ==========

const str = (c: CellValue | null): string =>
	c === null || c === undefined ? '' : String(c)

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "8.00-8.45\r\n8.55-9.40" (also "18.00-18-45") -> { start: "08:00", end: "09:40" } */
export function parseTimeRange(
	text: string,
): { start: string; end: string } | null {
	const matches = [...text.matchAll(/(\d{1,2})\s*[.:\-]\s*(\d{2})/g)]
	if (matches.length < 2) return null
	const fmt = (m: RegExpMatchArray) => `${pad2(Number(m[1]))}:${m[2]}`
	return { start: fmt(matches[0]), end: fmt(matches[matches.length - 1]) }
}

const TEACHER_RE = /^[А-ЯЁ][а-яё\-]+\s+[А-ЯЁа-яё]\.?\s*[А-ЯЁа-яё]?\.?$/

function cleanRoom(raw: string): string {
	const room = raw
		.replace(/каб\.?/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	// A lone building letter ("У", "П") means the room number was never filled in.
	return /^[А-ЯЁ]$/i.test(room) ? '' : room
}

function roomParts(room: string): { short: string; building: string } {
	const corp = room.match(/корп\.?\s*(\d+)/i)
	if (corp) {
		return { short: room.match(/\d+/)?.[0] ?? room, building: `корп${corp[1]}` }
	}
	const letter = room.match(/^([А-ЯЁ])\s*-?\s*\d/i)
	return {
		short: room.match(/\d+/)?.[0] ?? room,
		building: letter ? letter[1].toUpperCase() : '',
	}
}

export type CellEntry = NonNullable<ReturnType<typeof buildEntry>>

function buildEntry(lines: string[]) {
	const clean = lines.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
	if (clean.length === 0) return null

	const [discipline, ...rest] = clean
	const teachers: string[] = []
	const rooms: string[] = []
	for (const line of rest) {
		if (TEACHER_RE.test(line)) teachers.push(line)
		else rooms.push(line)
	}
	const auditoriumName = cleanRoom(rooms.join(' '))
	const { short, building } = roomParts(auditoriumName)
	return {
		discipline,
		teacherName: teachers.join(', '),
		auditoriumName,
		auditoriumShortName: short,
		building,
		subgroup: 0,
	} satisfies Partial<ScheduleItem>
}

/**
 * A cell is "Subject\r\nRoom\r\nTeacher". When a class is split into subgroups,
 * two such blocks are laid out side by side, separated by a wide run of spaces:
 *
 *   Литература\r\n
 *   У 202 каб                 Иностр.яз\r\n
 *   Инкина СН                 У406 каб\r\n
 *                             Данилкина ЕГ
 */
export function parseCell(cell: CellValue): CellEntry[] {
	const text = str(cell)
	if (!text.trim()) return []

	const gap = new RegExp(`\\s{${SPLIT_GAP},}`)
	const lines = text.split(/\r?\n/).filter(l => l.trim())
	// Without at least one line holding two blocks, indentation is just cosmetic
	// (some cells indent the room/teacher lines) -> a single entry.
	const isSplit = lines.some(l => gap.test(l.trim()))
	if (!isSplit) {
		const single = buildEntry(lines)
		return single ? [single] : []
	}

	const left: string[] = []
	const right: string[] = []
	for (const line of lines) {
		const trimmed = line.trim()
		const leading = line.length - line.trimStart().length
		const parts = trimmed.split(gap)
		if (parts.length >= 2) {
			left.push(parts[0])
			right.push(parts.slice(1).join(' '))
		} else if (leading >= SPLIT_GAP) {
			right.push(trimmed)
		} else {
			left.push(trimmed)
		}
	}

	const result: CellEntry[] = []
	const l = buildEntry(left)
	const r = buildEntry(right)
	if (l) {
		l.subgroup = 1
		result.push(l)
	}
	if (r) {
		r.subgroup = 2
		result.push(r)
	}
	return result
}

// ========== Main parser ==========

export function parseTimetable(rows: SheetData): ParsedTimetable {
	const timeHeaderIdx = rows.findIndex(r => /^время/i.test(str(r?.[2]).trim()))
	const groupRowIdx = rows.findIndex(r => str(r?.[2]).trim() === 'Группа')
	if (timeHeaderIdx < 0 || groupRowIdx < 0) {
		throw new Error('Unexpected NHMT sheet layout: header rows not found')
	}

	const shortRow = rows[groupRowIdx]
	const codeRow = rows[timeHeaderIdx]

	// --- title: form of education, academic year, semester ---
	let formName = ''
	let year1 = new Date().getFullYear()
	let semester = 1
	for (let i = 0; i < groupRowIdx; i++) {
		for (const c of rows[i] ?? []) {
			const t = str(c).trim()
			if (!t) continue
			if (/отделение|форма/i.test(t)) formName = t
			const y = t.match(/(\d{4})\s*-\s*(\d{4})/)
			if (y) {
				year1 = Number(y[1])
				semester = /^\s*II\b/.test(t) ? 2 : 1
			}
		}
	}
	const semesterStart =
		semester === 1 ? new Date(year1, 8, 1) : new Date(year1 + 1, 1, 1)

	// --- groups ---
	const faculties: Faculty[] = []
	const facultyIdByName = new Map<string, number>()
	const groups: Group[] = []
	const courses = new Set<number>()

	for (let col = 3; col < shortRow.length; col++) {
		const shortName = str(shortRow[col]).replace(/\s+/g, '').trim()
		if (!shortName) continue
		const code = str(codeRow[col]).trim()

		const course = Number(shortName.match(/^\d/)?.[0] ?? 0)
		const facultyName = shortName.replace(/^\d+-/, '')
		let facultyId = facultyIdByName.get(facultyName)
		if (facultyId === undefined) {
			facultyId = faculties.length + 1
			facultyIdByName.set(facultyName, facultyId)
			faculties.push({ id: facultyId, name: facultyName })
		}
		if (course) courses.add(course)
		groups.push({
			id: col,
			name: code || shortName,
			shortName,
			course,
			facultyId,
		})
	}

	const dropdown: DropdownData = {
		clientTypes: [{ type: 0 }],
		formsOfEducation: formName ? [{ id: 1, name: formName }] : [],
		courses: [...courses].sort((a, b) => a - b).map(course => ({ course })),
		faculties,
		groups,
	}

	// --- lessons ---
	const entries: TemplateEntry[] = []
	let dayOfWeek = 0
	for (let i = timeHeaderIdx + 1; i < rows.length; i++) {
		const row = rows[i] ?? []
		const dayName = str(row[0]).trim().toLowerCase()
		if (dayName && DAY_NAMES[dayName]) dayOfWeek = DAY_NAMES[dayName]

		const lessonNumber = Number(row[1])
		if (!dayOfWeek || !Number.isInteger(lessonNumber) || lessonNumber < 1)
			continue

		const time = parseTimeRange(str(row[2])) ??
			LESSON_TIME_SLOTS[lessonNumber - 1] ?? { start: '', end: '' }

		for (const group of groups) {
			const cell = row[group.id]
			if (!cell) {
				continue
			}
			const parsed = parseCell(cell)
			parsed.forEach((e) => {
				entries.push({
					groupId: group.id,
					dayOfWeek,
					lessonNumber,
					start: time.start,
					end: time.end,
					...e,
				})
			})
		}
	}

	return { dropdown, entries, semesterStart }
}

// ========== Expanding the weekly template into dated items ==========

const startOfDay = (d: Date) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** 1 = Monday ... 7 = Sunday */
const isoDow = (d: Date) => ((d.getDay() + 6) % 7) + 1

export function mondayOf(d: Date): Date {
	const s = startOfDay(d)
	s.setDate(s.getDate() - (isoDow(s) - 1))
	return s
}

function combine(date: Date, hhmm: string): Date {
	const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
	if (!m) return startOfDay(date)
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		Number(m[1]),
		Number(m[2]),
	)
}

const DAY_MS = 86400000

export function expandSchedule(
	parsed: ParsedTimetable,
	groupId: number,
	from?: Date,
	to?: Date,
	overrides?: Map<string, TemplateEntry[]>,
): ScheduleItem[] {
	const start = startOfDay(from ?? mondayOf(new Date()))
	const end = startOfDay(
		to ?? new Date(mondayOf(start).getTime() + (7 + 7 + 6) * DAY_MS),
	)
	if (end < start) return []

	const byDow = new Map<number, TemplateEntry[]>()
	for (const e of parsed.entries) {
		if (e.groupId !== groupId) continue
		const list = byDow.get(e.dayOfWeek) ?? []
		list.push(e)
		byDow.set(e.dayOfWeek, list)
	}

	const semMonday = mondayOf(parsed.semesterStart).getTime()
	const items: ScheduleItem[] = []
	const MAX_DAYS = 400

	const cursor = new Date(start)
	for (let n = 0; cursor <= end && n < MAX_DAYS; n++) {
		const dow = isoDow(cursor)
		const date = startOfDay(cursor)
		const week =
			Math.round((mondayOf(date).getTime() - semMonday) / (7 * DAY_MS)) + 1
		const ymd =
			date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()

		// A replacement sheet lists only the pairs that differ for the day.
		// For each lesson number it mentions, use the replacement; for others,
		// keep the regular template entries.
		const replacement = overrides?.get(dateKey(date))
		let dayEntries: TemplateEntry[]
		if (replacement) {
			const replaced = new Set(replacement.map(e => e.lessonNumber))
			dayEntries = [
				...(byDow.get(dow) ?? []).filter(e => !replaced.has(e.lessonNumber)),
				...replacement,
			]
		} else {
			dayEntries = byDow.get(dow) ?? []
		}

		for (const e of dayEntries) {
			items.push({
				id: ymd * 100000 + e.groupId * 100 + e.lessonNumber * 10 + e.subgroup,
				discipline: e.discipline,
				teacherName: e.teacherName,
				auditoriumName: e.auditoriumName,
				auditoriumShortName: e.auditoriumShortName,
				building: e.building,
				lessonType: '',
				week,
				date,
				dayOfWeek: dow,
				lessonNumber: e.lessonNumber,
				startTime: combine(date, e.start),
				endTime: combine(date, e.end),
				groupId: e.groupId,
				subgroup: e.subgroup,
				teacherComment: '',
				lessonComment: '',
			})
		}
		cursor.setDate(cursor.getDate() + 1)
	}

	return items.sort(
		(a, b) =>
			a.date.getTime() - b.date.getTime() ||
			a.lessonNumber - b.lessonNumber ||
			a.subgroup - b.subgroup,
	)
}


// ========== Replacement schedule ==========

/** "yyyy-mm-dd" key used to index overrides by date. */
export const dateKey = (date: Date): string => {
const d = new Date(
					date.getFullYear(),
					date.getMonth(),
					date.getDate(),
				)
return	`${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}

/**
 * Extract lesson numbers from a "ПАРЫ" cell.
 * Accepts: 3 | "3" | "3.4" | "1,2,3" | 3.4 (as a number).
 * Splitting on `.` and `,` handles every form seen in the wild, and stays
 * valid if the sheet later switches separators.
 */
function parsePairNumbers(cell: CellValue): number[] {
	if (typeof cell === 'number' && Number.isInteger(cell) && cell >= 1) {
		return [cell]
	}
	const text = str(cell).trim()
	if (!text) return []
	const parts = text.split(/[.,]/).map(s => Number(s.trim()))
	const valid = parts.filter(n => Number.isInteger(n) && n >= 1 && n <= 6)
	return [...new Set(valid)].sort((a, b) => a - b)
}

/**
 * Time slots live at the bottom of the sheet as: [null, pairNumber, timeRange].
 * We collect them up-front so lesson rows can be resolved in any order.
 */
function collectTimeSlots(
	rows: SheetData,
): Map<number, { start: string; end: string }> {
	const slots = new Map<number, { start: string; end: string }>()
	for (const row of rows) {
		if (!row) continue
		const n = Number(row[1])
		if (!Number.isInteger(n) || n < 1 || n > 6) continue
		const time = parseTimeRange(str(row[2]))
		if (time) slots.set(n, time)
	}
	return slots
}

/**
 * Match a "group cell" (e.g. "11 ССА\n(26-СО-130)") to one of the groups
 * produced by `parseTimetable`. We strip the parenthesised code and all
 * whitespace, so both `shortName` ("11ССА") and `name` ("26-СО-130") match
 * regardless of the exact spacing in the sheet.
 */
function matchGroup(cell: CellValue, groups: Group[]): Group | null {
	const text = str(cell).trim()
	if (!text) return null
	const codeMatch = text.match(/\(([^)]+)\)/)
	const code = codeMatch ? codeMatch[1].trim() : ''
	const short = text.replace(/\([^)]*\)/g, '').replace(/\s+/g, '').trim()
	return (
		groups.find(
			g =>
				(code && g.name === code) ||
				(code && g.shortName === code) ||
				(short && g.shortName === short) ||
				(short && g.name === short),
		) ?? null
	)
}

/**
 * Parse a replacement schedule sheet (замена занятий) into `TemplateEntry[]`.
 *
 * The date is supplied by the caller — the title is *not* parsed for it,
 * since its wording/format may change independently of the structure.
 *
 * Structure (positional — no reliance on header text):
 *   col 0: group name (filled only on the first row of a group's block)
 *   col 1: pair number(s)
 *   col 2: scheduled discipline
 *   col 3: replacement discipline ("не будет" means cancelled)
 *   col 4: teacher
 *   col 5: room
 *
 * Row classification is structural:
 *   - a row is a lesson row iff col 1 parses to a valid pair number;
 *   - col 0 is scanned for a group reference on every row, so group header
 *     rows that also carry a lesson are still picked up.
 */
export function parseReplacementSheet(
	rows: SheetData,
	date: Date,
	groups: Group[],
): TemplateEntry[] {
	const dayOfWeek = isoDow(date)
	const timeSlots = collectTimeSlots(rows)
	const entries: TemplateEntry[] = []
	let currentGroup: Group | null = null

	for (const row of rows) {
		if (!row) continue

		const pairs = parsePairNumbers(row[1])

		if (pairs.length === 0) {
			// Not a lesson row — maybe a group header that stands alone.
			const group = matchGroup(row[0], groups)
			if (group) currentGroup = group
			continue
		}

		const group = matchGroup(row[0], groups) ?? currentGroup
		if (!group) continue
		currentGroup = group

		const scheduled = str(row[2]).trim()
		const replacement = str(row[3]).trim()
		// When col 3 is empty the scheduled subject is kept as-is.
		const discipline = replacement || scheduled
		if (!discipline) continue

		const teacherName = str(row[4]).trim()
		const auditoriumName = cleanRoom(str(row[5]).trim())
		const { short, building } = roomParts(auditoriumName)

		for (const lessonNumber of pairs) {
			const slot =
				timeSlots.get(lessonNumber) ??
				LESSON_TIME_SLOTS[lessonNumber - 1] ?? { start: '', end: '' }
			entries.push({
				groupId: group.id,
				dayOfWeek,
				lessonNumber,
				start: slot.start,
				end: slot.end,
				subgroup: 0,
				discipline,
				teacherName,
				auditoriumName,
				auditoriumShortName: short,
				building,
			})
		}
	}

	return entries
}