import getLchs from "./get-lchs";

const interpolate = ({value1, value2, proportion}) => {
	// linear
	return (proportion * value2) + ((1 - proportion) * value1);
};
const interpolateBeforeTransition = ({value1, value2, progress}) => {
	if (progress >= 0) return value2;

	return interpolate({value1, value2, proportion: progress + 1});
};
const interpolateAfterTransition = ({value1, value2, progress}) => {
	if (progress <= 0) return value1;

	return interpolate({value1, value2, proportion: progress});
};
const interpolateAcrossTransition = ({value1, value2, progress}) => {
	return interpolate({value1, value2, proportion: (progress + 1) / 2});
};

export default {
	p1: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
		],
		axes: [1, 0, 0, 1],
		transitions: [{
			planeGroup: "p2",
			mappings: [0, 0],
			getPositions: aspect => (aspect < 1) ? [[0, 0.5], [0.5, 0.5]] : [[0.5, 0], [0.5, 0.5]],
			getAxes: ({aspect, progress}) => {
				if (aspect < 1) return [1, 0, 0, 2];

				return [2, 0, 0, 1];
			},
			getTheta: interpolateAcrossTransition,
			getAspect: ({value1, value2, progress}) => {
				const midValue = (value1 + value2) / 2;

				if (value2 < 1) { // flat - side-by-side subcells
					if (progress < 0) { // each subcell
						const terminalValue = midValue * Math.SQRT2;

						return interpolate({value1, value2: terminalValue, proportion: progress + 1});
					} else { // combined
						return interpolate({value1: midValue, value2, proportion: progress});
					}
				} else { // tall - one-upon-the-other subcells
					if (progress < 0) { // each subcell
						const terminalValue = midValue / Math.SQRT2;

						return interpolate({value1, value2: terminalValue, proportion: progress + 1});
					} else { // combined
						return interpolate({value1: midValue, value2, proportion: progress});
					}
				}
			},
			getLchs: getLchs,
			type: "DIVERGING",
		}],
	},
	p2: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[-1, 0, 0, 0, -1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p1",
			mappings: [[0, 1]],
			positions: [[0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5]],
		}],
	},
};