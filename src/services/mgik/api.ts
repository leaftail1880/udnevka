// ========== Output type definitions (transformed data) ==========

/**
 * Client type (usually determines whether the schedule is for a specific group or an individual).
 */
export interface ClientType {
	/** Numeric type identifier (e.g., 0 for group, 1 for individual). */
	type: number
}

/**
 * Form of education (e.g., full-time, part-time).
 */
export interface FormOfEducation {
	/** Unique identifier. */
	id: number
	/** Display name in Russian (e.g., "Очная форма"). */
	name: string
}

/**
 * Course (year of study).
 */
export interface Course {
	/** Course number (1-6). */
	course: number
}

/**
 * Faculty (institute/department).
 */
export interface Faculty {
	/** Unique identifier. */
	id: number
	/** Display name. */
	name: string
}

/**
 * Academic group.
 */
export interface Group {
	/** Unique group identifier. */
	id: number
	/** Group name (e.g., "1-2501"). */
	name: string
}

/**
 * Aggregated dropdown data returned by {@link ScheduleClient.getDropdownData}.
 */
export interface DropdownData {
	/** Possible client types. */
	clientTypes: ClientType[]
	/** List of forms of education. */
	formsOfEducation: FormOfEducation[]
	/** List of courses. */
	courses: Course[]
	/** List of faculties. */
	faculties: Faculty[]
	/** List of groups (initial unfiltered list). */
	groups: Group[]
}

/**
 * A single schedule entry (lesson).
 */
export interface ScheduleItem {
	/** Unique record identifier. */
	id: number
	/** Discipline (subject) name. */
	discipline: string
	/** Teacher's full name (including any title). */
	teacherName: string
	/** Full auditorium name (e.g., "ауд.421-К3"). */
	auditoriumName: string
	/** Short auditorium name (e.g., "ауд.421"). */
	auditoriumShortName: string
	/** Building/corps name (e.g., "К3"). */
	building: string
	/** Type of lesson (lecture, practice, etc.). */
	lessonType: string
	/** Week number (1-based). */
	week: number
	/** Date of the lesson (midnight local time). */
	date: Date
	/** Day of week (1=Monday ... 7=Sunday). */
	dayOfWeek: number
	/** Lesson number within the day (1-8). */
	lessonNumber: number
	/** Exact start date and time of the lesson (Date object). */
	startTime: Date
	/** Exact end date and time of the lesson (Date object). */
	endTime: Date
	/** Group identifier (same as requested). */
	groupId: number
	/** Subgroup number (0 = no subdivision). */
	subgroup: number
	/** Additional comment for the teacher (e.g., replacement). */
	teacherComment: string
	/** Additional comment for the lesson (e.g., online). */
	lessonComment: string
}

/**
 * Parameters for fetching the schedule.
 */
export interface ScheduleParams {
	/** Group identifier (required). */
	idGroup: number | string
	/** Flag for distance learning? 0 or 1 (optional). */
	isDo?: number
}

// ========== Internal raw API types ==========

interface RawTpItem {
	type: string
}
interface RawFoItem {
	nameFO: string
	idFO: string
}
interface RawKursItem {
	Kurs: string
}
interface RawFacultItem {
	idFac: string
	nameFac: string
}
interface RawGroupItem {
	idGroup: string
	nameGroup: string
	[key: string]: any
}
interface RawScheduleItem {
	idRasp: string
	Disciplina: string
	namePrep: string
	nameAud: string
	nameShort: string
	nameCorp: string
	nameDiscVid: string
	Nedel: string
	date: string
	Day: string
	Para: string
	TimeInPara: string | null
	TimeOutPara: string | null
	idGroup: string
	partGroup: string
	commentPrep: string
	commentData: string
	[key: string]: any
}

// ========== Lesson time table ==========

/**
 * Fixed time slots for lessons (1-based lesson number -> start/end time).
 * Index 0 corresponds to lesson 1.
 */
const LESSON_TIME_SLOTS: { start: string; end: string }[] = [
	{ start: '08:20', end: '09:50' }, // lesson 1
	{ start: '10:00', end: '11:30' }, // lesson 2
	{ start: '11:40', end: '13:10' }, // lesson 3
	{ start: '13:40', end: '15:10' }, // lesson 4
	{ start: '15:20', end: '16:50' }, // lesson 5
	{ start: '17:00', end: '18:30' }, // lesson 6
	{ start: '18:40', end: '20:10' }, // lesson 7
	{ start: '20:20', end: '21:50' }, // lesson 8
]

// ========== Client class ==========

export class ScheduleClient {
	private readonly baseURL: string
	private readonly idClient: string

	/**
	 * Creates a new ScheduleClient.
	 * @param idClient - Client identifier used in every request (default: '74').
	 * @param baseURL   - Base URL of the API (default: 'https://edu.mgik.org/getrasp/').
	 */
	constructor(
		idClient: string = '74',
		baseURL: string = 'https://edu.mgik.org/getrasp/',
	) {
		this.idClient = idClient
		this.baseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
	}

	/**
	 * Fetches all data needed to populate dropdown lists.
	 * All fields are transformed to camelCase, numbers are parsed from strings.
	 *
	 * @returns A promise resolving to {@link DropdownData}.
	 */
	async getDropdownData(): Promise<DropdownData> {
		const [rawTp, rawFo, rawKurs, rawFacult, rawGroups] = await Promise.all([
			this.fetchTp(),
			this.fetchFo(),
			this.fetchKurs(),
			this.fetchFacult(),
			this.fetchGroups('0', '0', '0'),
		])

		return {
			clientTypes: rawTp.map(item => ({ type: parseInt(item.type, 10) })),
			formsOfEducation: rawFo.map(item => ({
				id: parseInt(item.idFO, 10),
				name: item.nameFO,
			})),
			courses: rawKurs.map(item => ({ course: parseInt(item.Kurs, 10) })),
			faculties: rawFacult.map(item => ({
				id: parseInt(item.idFac, 10),
				name: item.nameFac,
			})),
			groups: rawGroups.map(item => ({
				id: parseInt(item.idGroup, 10),
				name: item.nameGroup,
			})),
		}
	}

	/**
	 * Fetches the schedule for a specific group.
	 * All fields are transformed to camelCase, numbers and dates are parsed,
	 * and start/end times are returned as Date objects (combining lesson date and time).
	 * Missing time slots are filled from the standard lesson table.
	 *
	 * @param params - Parameters containing at least `idGroup` and optional `isDo`.
	 * @returns A promise resolving to an array of {@link ScheduleItem}.
	 */
	async getSchedule(params: ScheduleParams): Promise<ScheduleItem[]> {
		const query: Record<string, string> = {
			method: 'getRasp',
			idClient: this.idClient,
			idGroup: String(params.idGroup),
		}
		if (params.isDo !== undefined) {
			query.isDo = String(params.isDo)
		}

		const raw = await this.getJson<RawScheduleItem[]>(query)
		return raw.map(item => this.transformScheduleItem(item))
	}

	// ---- Private helper methods ----

	/**
	 * Generic GET request returning parsed JSON.
	 */
	private async getJson<T>(params: Record<string, string>): Promise<T> {
		const url = new URL('ajax-dropdown-style', this.baseURL)
		url.search = new URLSearchParams(params).toString()

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: { Accept: 'application/json' },
		})

		if (!response.ok) {
			throw new Error(
				`Request failed with status ${response.status}: ${response.statusText}`,
			)
		}

		return response.json() as Promise<T>
	}

	private fetchTp(): Promise<RawTpItem[]> {
		return this.getJson<RawTpItem[]>({
			method: 'getTp',
			idClient: this.idClient,
		})
	}

	private fetchFo(): Promise<RawFoItem[]> {
		return this.getJson<RawFoItem[]>({
			method: 'getFo',
			idClient: this.idClient,
		})
	}

	private fetchKurs(): Promise<RawKursItem[]> {
		return this.getJson<RawKursItem[]>({
			method: 'getKurs',
			idClient: this.idClient,
		})
	}

	private fetchFacult(): Promise<RawFacultItem[]> {
		return this.getJson<RawFacultItem[]>({
			method: 'getFacult',
			idClient: this.idClient,
		})
	}

	private fetchGroups(
		idFac: string,
		FO: string,
		idKurs: string,
	): Promise<RawGroupItem[]> {
		return this.getJson<RawGroupItem[]>({
			method: 'getGroups',
			idClient: this.idClient,
			idFac,
			FO,
			idKurs,
		})
	}

	/**
	 * Transforms a raw schedule item into the clean output format.
	 * Calculates start/end time if they are missing, and converts everything to proper types.
	 */
	private transformScheduleItem(raw: RawScheduleItem): ScheduleItem {
		const lessonNumber = parseInt(raw.Para, 10)
		const timeSlot = LESSON_TIME_SLOTS[lessonNumber - 1] ?? {
			start: '',
			end: '',
		}

		// Use API-provided time if present, otherwise fall back to the table.
		const startTimeStr = raw.TimeInPara || timeSlot.start
		const endTimeStr = raw.TimeOutPara || timeSlot.end

		// Combine date and time strings into Date objects (local timezone).
		const startTime = this.combineDateAndTime(raw.date, startTimeStr)
		const endTime = this.combineDateAndTime(raw.date, endTimeStr)

		return {
			id: parseInt(raw.idRasp, 10),
			discipline: raw.Disciplina,
			teacherName: raw.namePrep,
			auditoriumName: raw.nameAud,
			auditoriumShortName: raw.nameShort,
			building: raw.nameCorp || '',
			lessonType: raw.nameDiscVid,
			week: parseInt(raw.Nedel, 10),
			date: new Date(raw.date + 'T00:00:00'), // keep date at midnight local time
			dayOfWeek: parseInt(raw.Day, 10),
			lessonNumber,
			startTime,
			endTime,
			groupId: parseInt(raw.idGroup, 10),
			subgroup: parseInt(raw.partGroup, 10) || 0,
			teacherComment: raw.commentPrep || '',
			lessonComment: raw.commentData || '',
		}
	}

	/**
	 * Combines a date string (YYYY-MM-DD) with a time string (HH:MM) into a Date object.
	 * Uses local timezone.
	 */
	private combineDateAndTime(dateStr: string, timeStr: string): Date {
		if (!timeStr) {
			// If time is missing, fallback to midnight of that day.
			return new Date(dateStr + 'T00:00:00')
		}
		return new Date(`${dateStr}T${timeStr}:00`)
	}
}
