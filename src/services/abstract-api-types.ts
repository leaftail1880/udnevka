/**
 * Client type (usually determines whether the schedule is for a specific group or an individual).
 */

export interface ClientType {
	/** Numeric type identifier (e.g., 0 for group, 1 for individual). */
	type: number;
}
/**
 * Form of education (e.g., full-time, part-time).
 */

export interface FormOfEducation {
	/** Unique identifier. */
	id: number;
	/** Display name in Russian (e.g., "Очная форма"). */
	name: string;
}
/**
 * Course (year of study).
 */

export interface Course {
	/** Course number (1-6). */
	course: number;
}
/**
 * Faculty (institute/department).
 */

export interface Faculty {
	/** Unique identifier. */
	id: number;
	/** Display name. */
	name: string;
}
/**
 * Academic group.
 */

export interface Group {
	/** Unique group identifier. */
	id: number;
	/** Group name (e.g., "1-2501"). */
	name: string;
	shortName?: string
	course?: number
	facultyId?: number
}
/**
 * Aggregated dropdown data returned by {@link ScheduleClient.getDropdownData}.
 */

export interface DropdownData {
	/** Possible client types. */
	clientTypes: ClientType[];
	/** List of forms of education. */
	formsOfEducation: FormOfEducation[];
	/** List of courses. */
	courses: Course[];
	/** List of faculties. */
	faculties: Faculty[];
	/** List of groups (initial unfiltered list). */
	groups: Group[];
}
/**
 * A single schedule entry (lesson).
 */

export interface ScheduleItem {
	/** Unique record identifier. */
	id: number;
	/** Discipline (subject) name. */
	discipline: string;
	/** Teacher's full name (including any title). */
	teacherName: string;
	/** Full auditorium name (e.g., "ауд.421-К3"). */
	auditoriumName: string;
	/** Short auditorium name (e.g., "ауд.421"). */
	auditoriumShortName: string;
	/** Building/corps name (e.g., "К3"). */
	building: string;
	/** Type of lesson (lecture, practice, etc.). */
	lessonType: string;
	/** Week number (1-based). */
	week: number;
	/** Date of the lesson (midnight local time). */
	date: Date;
	/** Day of week (1=Monday ... 7=Sunday). */
	dayOfWeek: number;
	/** Lesson number within the day (1-8). */
	lessonNumber: number;
	/** Exact start date and time of the lesson (Date object). */
	startTime: Date;
	/** Exact end date and time of the lesson (Date object). */
	endTime: Date;
	/** Group identifier (same as requested). */
	groupId: number;
	/** Subgroup number (0 = no subdivision). */
	subgroup: number;
	/** Additional comment for the teacher (e.g., replacement). */
	teacherComment: string;
	/** Additional comment for the lesson (e.g., online). */
	lessonComment: string;
}
/**
 * Parameters for fetching the schedule.
 */

export interface ScheduleParams {
	/** Group identifier (required). */
	groupId: number | string;
	/** Inclusive range start. Default: Monday of the current week. */
	from?: Date
	/** Inclusive range end. Default: Sunday of the week of `from`. */
	to?: Date
}
