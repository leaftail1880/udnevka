import { ScheduleClient } from './api'

async function main() {
	const client = new ScheduleClient('74') // default idClient

	// 1. Fetch all dropdown data
	const dropdowns = await client.getDropdownData()
	console.log('Faculties:', dropdowns.facult)
	console.log('Forms:', dropdowns.fo)
	console.log('Courses:', dropdowns.kurs)
	console.log('Initial groups:', dropdowns.groups)

	const schedule = await client.getSchedule({ idGroup: '', isDo: 0 })
	console.log('Schedule entries:', schedule)
}

main().catch(console.error)
