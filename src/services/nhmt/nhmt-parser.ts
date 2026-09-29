// Pure parsing logic for the NHMT timetable sheet. No network / library imports,
// so it can be tested directly against rows produced by read-excel-file.

import { CellValue, SheetData } from 'read-excel-file/universal'

// ========== Output types (same shape as the edu.mgik.org client) ==========

export interface ClientType {
	type: number
}

export interface FormOfEducation {
	id: number
	/** e.g. "Дневное отделение". */
	name: string
}

export interface Course {
	course: number
}

/** In the NHMT sheet a "faculty" is a specialty suffix of the group name (e.g. "ИС"). */
export interface Faculty {
	id: number
	name: string
}

export interface Group {
	/** Column index of the group in the sheet (stable for a given file). */
	id: number
	/** Full group code (e.g. "26-ИО-129"); falls back to the short name if the sheet has none. */
	name: string
	/** Short name from the "Группа" row (e.g. "1-ИС"). */
	shortName: string
	course: number
	facultyId: number
}

export interface DropdownData {
	clientTypes: ClientType[]
	formsOfEducation: FormOfEducation[]
	courses: Course[]
	faculties: Faculty[]
	groups: Group[]
}

export interface ScheduleItem {
	id: number
	discipline: string
	teacherName: string
	auditoriumName: string
	auditoriumShortName: string
	building: string
	/** Not present in the NHMT sheet, always ''. Kept for shape compatibility. */
	lessonType: string
	week: number
	date: Date
	dayOfWeek: number
	lessonNumber: number
	startTime: Date
	endTime: Date
	groupId: number
	/** 0 = whole group, 1/2 = left/right half of a split cell. */
	subgroup: number
}

export interface ScheduleParams {
	idGroup: number | string
	/** Inclusive range start. Default: Monday of the current week. */
	from?: Date
	/** Inclusive range end. Default: Sunday of the week of `from`. */
	to?: Date
}

// ========== Parsed template (weekly recurring timetable) ==========

export interface TemplateEntry {
	groupId: number
	dayOfWeek: number
	lessonNumber: number
	/** "HH:MM" */
	start: string
	/** "HH:MM" */
	end: string
	subgroup: number
	discipline: string
	teacherName: string
	auditoriumName: string
	auditoriumShortName: string
	building: string
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
	return /^[УП]$/i.test(room) ? '' : room
}

function roomParts(room: string): { short: string; building: string } {
	const corp = room.match(/корп\.?\s*(\d+)/i)
	if (corp) {
		return { short: room.match(/\d+/)?.[0] ?? room, building: `корп${corp[1]}` }
	}
	const letter = room.match(/^([УП])\s*-?\s*\d/i)
	return {
		short: room.match(/\d+/)?.[0] ?? room,
		building: letter ? letter[1].toUpperCase() : '',
	}
}

export interface CellEntry {
	discipline: string
	teacherName: string
	auditoriumName: string
	auditoriumShortName: string
	building: string
}

function buildEntry(lines: string[]): CellEntry | null {
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
	}
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
	if (l) result.push(l)
	if (r) result.push(r)
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
			const split = parsed.length > 1
			parsed.forEach((e, idx) => {
				entries.push({
					groupId: group.id,
					dayOfWeek,
					lessonNumber,
					start: time.start,
					end: time.end,
					subgroup: split ? idx + 1 : 0,
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

export function expandSchedule(
	parsed: ParsedTimetable,
	groupId: number,
	from?: Date,
	to?: Date,
): ScheduleItem[] {
	const start = startOfDay(from ?? mondayOf(new Date()))
	const end = startOfDay(
		to ?? new Date(mondayOf(start).getTime() + 6 * 86400000),
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
			Math.round((mondayOf(date).getTime() - semMonday) / (7 * 86400000)) + 1
		const ymd =
			date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()

		for (const e of byDow.get(dow) ?? []) {
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
