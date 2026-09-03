// ========== Type definitions ==========

export interface TpItem {
	type: string
}

export interface FoItem {
	nameFO: string
	idFO: string
}

export interface KursItem {
	Kurs: string
}

export interface FacultItem {
	idFac: string
	nameFac: string
}

export interface GroupItem {
	idGroup: string
	nameGroup: string
	[key: string]: any // additional fields from API
}

export interface ScheduleItem {
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
	[key: string]: any // allow extra fields
}

export interface DropdownData {
	tp: TpItem[]
	fo: FoItem[]
	kurs: KursItem[]
	facult: FacultItem[]
	groups: GroupItem[]
}

export interface ScheduleParams {
	idGroup: string
	isDo?: number // 0 or 1, optional
	// The following fields are accepted but not used for the schedule request.
	idFac?: string
	FO?: string
	idKurs?: string
}

// ========== Client class ==========

export class ScheduleClient {
	private readonly baseURL: string
	private readonly idClient: string

	/**
	 * @param idClient - client identifier used in every request (default: '74')
	 * @param baseURL   - base URL for the API (default: 'https://edu.mgik.org/getrasp/')
	 */
	constructor(
		idClient: string = '74',
		baseURL: string = 'https://edu.mgik.org/getrasp/',
	) {
		this.idClient = idClient
		// Ensure the base URL ends with a slash for easy concatenation
		this.baseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
	}

	/**
	 * Fetches all data needed for dropdowns:
	 *   - client type (`tp`)
	 *   - forms of education (`fo`)
	 *   - courses (`kurs`)
	 *   - faculties (`facult`)
	 *   - initial group list (with idFac=0, FO=0, idKurs=0)
	 */
	async getDropdownData(): Promise<DropdownData> {
		const [tp, fo, kurs, facult, groups] = await Promise.all([
			this.fetchTp(),
			this.fetchFo(),
			this.fetchKurs(),
			this.fetchFacult(),
			this.fetchGroups('0', '0', '0'),
		])

		return { tp, fo, kurs, facult, groups }
	}

	/**
	 * Fetches the schedule for a given group.
	 *
	 * @param params - object containing at least `idGroup`, and optionally `isDo`.
	 *                 Other dropdown selections (`idFac`, `FO`, `idKurs`) are accepted
	 *                 for completeness but are not required by the API.
	 */
	async getSchedule(params: ScheduleParams): Promise<ScheduleItem[]> {
		const query: Record<string, string> = {
			method: 'getRasp',
			idClient: this.idClient,
			idGroup: params.idGroup,
		}
		if (params.isDo !== undefined) {
			query.isDo = String(params.isDo)
		}

		return this.getJson<ScheduleItem[]>(query)
	}

	// ---- Private helper methods ----

	/**
	 * Generic method to perform a GET request and parse JSON response.
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

	private fetchTp(): Promise<TpItem[]> {
		return this.getJson<TpItem[]>({ method: 'getTp', idClient: this.idClient })
	}

	private fetchFo(): Promise<FoItem[]> {
		return this.getJson<FoItem[]>({ method: 'getFo', idClient: this.idClient })
	}

	private fetchKurs(): Promise<KursItem[]> {
		return this.getJson<KursItem[]>({
			method: 'getKurs',
			idClient: this.idClient,
		})
	}

	private fetchFacult(): Promise<FacultItem[]> {
		return this.getJson<FacultItem[]>({
			method: 'getFacult',
			idClient: this.idClient,
		})
	}

	private fetchGroups(
		idFac: string,
		FO: string,
		idKurs: string,
	): Promise<GroupItem[]> {
		return this.getJson<GroupItem[]>({
			method: 'getGroups',
			idClient: this.idClient,
			idFac,
			FO,
			idKurs,
		})
	}
}
