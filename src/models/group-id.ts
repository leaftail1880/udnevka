export function createGroupId(
	dataSourceId: string,
	groupId: string | number,
): string {
	return `${dataSourceId}-${groupId}`
}

export function parseDataSourceId(groupId: string): string {
	const dash = groupId.indexOf('-')
	if (dash === -1) return 'mgik'
	return groupId.slice(0, dash)
}

export function parseGroupId(groupId: string): string {
	const dash = groupId.indexOf('-')
	if (dash === -1) return groupId
	return groupId.slice(dash + 1)
}