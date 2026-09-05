export const MarkColorsBG = {
	1: '#007000',
	2: '#946C00',
	3: '#8D4B00',
	4: '#BF0000',
}
export const MarkColorsText = {
	1: '#00C500',
	2: '#C7A200',
	3: '#C07300',
	4: '#C00000',
}

export function calculateColorFromNumber(number: number) {
	const bg = true
	const colors = bg ? MarkColorsBG : MarkColorsText

	let backgroundColor = ''
	if (typeof number === 'number' && !isNaN(number)) {
		const rounded = Math.round(number)
		if (rounded in colors)
			backgroundColor = colors[rounded as keyof typeof colors]
		else {
			const keys = Object.keys(colors).map(Number)
			const min = Math.min(...keys)
			const max = Math.max(...keys)

			if (rounded > max) backgroundColor = colors[max as keyof typeof colors]
			if (rounded < min) backgroundColor = colors[min as keyof typeof colors]
		}
	}

	const textColor = bg ? 'white' : backgroundColor

	return { backgroundColor: backgroundColor, textColor }
}
