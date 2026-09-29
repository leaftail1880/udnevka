import { AsyncStore } from '@/models/async.store'
import { XSettings } from '@/models/settings'
import { scheduleClient } from '@/services/mgik/store'
import { nhmtScheduleClient } from '@/services/nhmt/nhmt-api'
import { autorun, makeAutoObservable, runInAction } from 'mobx'
import type { DropdownData, Group, ScheduleItem, ScheduleParams } from 'services/abstract-api-types'
import { parseDataSourceId, parseGroupId } from './group-id'

export interface DataSourceGroup extends Omit<Group, 'id'> {
	id: string
}

export interface DataSourceDropdownData extends Omit<DropdownData, 'groups'> {
	groups: DataSourceGroup[]
}

export interface DataSourceDefinition {
	id: string
	name: string
	getGroupList: () => Promise<DataSourceDropdownData>
	getSchedule: (params: ScheduleParams) => Promise<ScheduleItem[]>
}

class DataSourceRegistry {
	private sources = new Map<string, DataSourceDefinition>()

	add(id: string, definition: Omit<DataSourceDefinition, 'id'>) {
		this.sources.set(id, { id, ...definition })
	}

	get(id: string) {
		const source = this.sources.get(id)
		if (!source) throw new Error(`Unknown data source: ${id}`)
		return source
	}

	all() {
		return [...this.sources.values()]
	}
}

export class DataSourceInstance {
	readonly groups: AsyncStore<() => Promise<DataSourceDropdownData>>

	readonly schedule: AsyncStore<
		(params: ScheduleParams) => Promise<ScheduleItem[]>
	>

	constructor(
		readonly id: string,
		readonly definition: DataSourceDefinition,
	) {
		const groupsApi = {
			getGroupList: () => definition.getGroupList(),
		}

		this.groups = new AsyncStore(
			definition.id + '-' + 'groups',
			() => groupsApi.getGroupList(),
			`групп ${definition.name}`,
			{},
			false,
			true,
		)

		const scheduleApi = {
			getSchedule: (params: ScheduleParams) => definition.getSchedule(params),
		}

		this.schedule = new AsyncStore(
			definition.id + '-' + 'schedule',
			params => scheduleApi.getSchedule(params),
			`расписания ${definition.name}`,
			undefined,
			true,
			false,
		)
	}

	bindGroup(groupId: string) {
		this.schedule.withParams({ groupId: parseGroupId(groupId) })
	}
}

class DataSourceStore {
	readonly registry = new DataSourceRegistry()
	private readonly instances = new Map<string, DataSourceInstance>()

	currentId = XSettings.dataSourceId
	otherIds: string[] = []

	constructor() {
		makeAutoObservable<this, 'instances' | 'registry' | 'sync'>(this, {
			instances: false,
			registry: false,
			sync: false,
		})

		this.registry.add('mgik', {
			name: 'МГИК',
			getGroupList: async () => {
				const data = await scheduleClient.getDropdownData()
				return {
					...data,
					groups: data.groups.map(g => ({ ...g, id: String(g.id) })),
				}
			},
			getSchedule: params => scheduleClient.getSchedule(params),
		})

		this.registry.add('nhmt', {
			name: 'НХМТ',
			getGroupList: async () => {
				const data = await nhmtScheduleClient.getDropdownData()
				return {
					...data,
					groups: data.groups.map(g => ({ ...g, id: g.name })),
				}
			},
			getSchedule: params => nhmtScheduleClient.getSchedule(params),
		})

		for (const definition of this.registry.all()) {
			this.instances.set(
				definition.id,
				new DataSourceInstance(definition.id, definition),
			)
		}

		autorun(() => {
			const currentGroupId = XSettings.currentGroupId
			const nextCurrentId = currentGroupId
				? parseDataSourceId(currentGroupId)
				: XSettings.dataSourceId

			if (currentGroupId) {
				this.get(parseDataSourceId(currentGroupId)).bindGroup(currentGroupId)
			}

			const otherIds = [
				...new Set(
					XSettings.selectedGroupIds
						.map(parseDataSourceId)
						.filter(id => id !== nextCurrentId),
				),
			]

			runInAction(() => {
				this.currentId = nextCurrentId
				this.otherIds = otherIds
			})
		})
	}

	get current(): DataSourceInstance {
		return this.get(this.currentId)
	}

	get selected(): DataSourceInstance {
		return this.get(XSettings.dataSourceId)
	}

	get other(): DataSourceInstance[] {
		return this.otherIds.map(id => this.get(id))
	}

	get(id: string): DataSourceInstance {
		const instance = this.instances.get(id)
		if (!instance) throw new Error(`Data source "${id}" is not registered`)
		return instance
	}
}

export const DataSource = new DataSourceStore()
