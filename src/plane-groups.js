export default {
	p1: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p2",
			positions: [[0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5]],
		}],
	},
	p2: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[-1, 0, 0, 0, -1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p1",
			positions: [[0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5]],
		}],
	},
};