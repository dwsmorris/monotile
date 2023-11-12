
const interpolate = ({value1, value2, proportion}) => {
	const linear = /*Math.sqrt(*/proportion/*)*/;

	return (linear * value2) + ((1 - linear) * value1);
};
const interpolateBeforeTransition = ({value1, value2, progress}) => {
	if (progress >= 0) return value2;

	const proportion = Math.sqrt(progress + 1); // ease in

	return interpolate({value1, value2, proportion});
};
const interpolateAfterTransition = ({value1, value2, progress}) => {
	if (progress < 0) return value1;

	const proportion = progress * progress; // east out

	return interpolate({value1, value2, proportion});
};
const interpolateAcrossTransition = ({value1, value2, progress}) => {
	const proportion = (progress < 0) ? (Math.sqrt(progress + 1) * 0.5) : (progress * progress * 0.5 + 0.5); // ease in out

	return interpolate({value1, value2, proportion});
};
const noTransition = ({value1}) => value1;

export default {
	p1: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p2",
			getPositions: aspect => (aspect < 1) ? [[0, 0.5], [0.5, 0.5]] : [[0.5, 0], [0.5, 0.5]],
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
		}, {
			planeGroup: "p3",
			getPositions: () => [[1/3, 2/3], [2/3, 1/3]],
			getTheta: interpolateBeforeTransition,
			getAspect: interpolateBeforeTransition,
		}],
	},
	p2: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[-1, 0, 0, 0, -1, 0, 0, 0, 1],
		],
		transitions: [{
			planeGroup: "p1",
			getPositions: aspect => (aspect < 1) ? [[0.25, 0], [0.25, 0.5], [0.75, 0], [0.75, 0.5]] : [[0, 0.25], [0, 0.75], [0.5, 0.25], [0.5, 0.75]],
			getTheta: interpolateAcrossTransition,
			getAspect: ({value1, value2, progress}) => {
				const midValue = (value1 + value2) / 2;

				if (value2 < 1) { // flat cells on top of each other
					if (progress < 0) { // joined cell
						return interpolate({value1, value2: midValue, proportion: progress + 1});
					} else {
						const startValue = midValue / Math.SQRT2;

						return interpolate({value1: startValue, value2, proportion: progress});
					}
				} else { // cells side-by-side
					if (progress < 0) {
						return interpolate({value1, value2: midValue, proportion: progress + 1});
					} else {
						const startValue = midValue * Math.SQRT2;

						return interpolate({value1: startValue, value2, proportion: progress});
					}
				}
			},
		}, {
			planeGroup: "p6",
			getPositions: () => [[1/3, 2/3], [2/3, 1/3]],
			getTheta: interpolateBeforeTransition,
			getAspect: interpolateBeforeTransition,
		}],
	},
	p3: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[0, -1, 0, 1, -1, 0, 0, 0, 1],
			[-1, 1, 0, -1, 0, 0, 0, 0, 1],
		],
		flipped: true,
		transitions: [{
			planeGroup: "p1",
			getPositions: () => [[1/3, 0], [2/3, 0], [0, 1/3], [0, 2/3], [1/3, 1/3], [2/3, 2/3]],
			getTheta: interpolateAfterTransition,
			getAspect: interpolateAfterTransition,
		}],
	},
	p6: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[0, -1, 0, 1, -1, 0, 0, 0, 1],
			[-1, 1, 0, -1, 0, 0, 0, 0, 1],
			[-1, 0, 0, 0, -1, 0, 0, 0, 1],
			[0, 1, 0, -1, 1, 0, 0, 0, 1],
			[1, -1, 0, 1, 0, 0, 0, 0, 1],
		],
		flipped: true,
		transitions: [{
			planeGroup: "p2",
			getPositions: () => [[1/3, 0], [2/3, 0], [0, 1/3], [0, 2/3], [1/3, 1/3], [2/3, 2/3]],
			getTheta: interpolateAfterTransition,
			getAspect: interpolateAfterTransition,
		}, {
			planeGroup: "p31m",
			getPositions: () => [[0.5, 0.25], [0.75, 0.25], [0.75, 0.5], [0.25, 0.5], [0.25, 0.75], [0.5, 0.75]],
			getTheta: noTransition,
			getAspect: noTransition,
		}],
	},
	p31m: {
		equivalents: [
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[0, -1, 0, 1, -1, 0, 0, 0, 1],
			[-1, 1, 0, -1, 0, 0, 0, 0, 1],
			[0, 1, 0, 1, 0, 0, 0, 0, 1],
			[1, -1, 0, 0, -1, 0, 0, 0, 1],
			[-1, 0, 0, -1, 1, 0, 0, 0, 1],
		],
		mirrors: [
			[[1, 0], [0, 0]],
			[[1, 0], [1, 1]],
			[[0, 1], [0, 0]],
			[[0, 1], [1, 1]],
			[[1, 1], [0, 0]],
		],
		flipped: true,
		transitions: [{
			planeGroup: "p6",
			getPositions: () => [[0.5, 0.25], [0.75, 0.25], [0.75, 0.5], [0.25, 0.5], [0.25, 0.75], [0.5, 0.75]],
			getTheta: noTransition,
			getAspect: noTransition,
		}],
	},
};