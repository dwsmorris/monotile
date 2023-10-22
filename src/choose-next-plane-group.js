import planeGroups from "./plane-groups.js";
import getTheta from "./get-theta.js";
import getAspect from "./get-aspect.js";

const getProperty = ({currentPlaneGroup, nextPlaneGroup}) => {
	const currentMultiplicity = planeGroups[currentPlaneGroup.planeGroup].equivalents.length;
	const nextMultiplicity = planeGroups[nextPlaneGroup.planeGroup].equivalents.length;
	if (nextMultiplicity < currentMultiplicity) { // converging
		const factor = currentMultiplicity / nextMultiplicity;

		if (factor === 3) {
			const {l, c, h} = currentPlaneGroup.lchs.find(({l, c, h}) => [l, c, h].some(value => value === 0)); // find the 0 field representing the triple value

			return (l === 0) ? "l" : (c === 0) ? "c" : "h";
		}

		// 1 and -1 values
		const {l, c, h} = currentPlaneGroup.lchs.find(({l, c, h}) => [l, c, h].some(value => Math.abs(value) === 1));

		return (Math.abs(l) === 1) ? "l" : (Math.abs(c) === 1) ? "c" : "h";
	} else if (nextMultiplicity === currentMultiplicity) { // same number of asymmetric units
		return "";
	} else { // diverging - select an absent property
		const lch = currentPlaneGroup.lchs[0];
		const options = [
			...((lch.l == null) ? ["l"] : []),
			...((lch.c == null) ? ["c"] : []),
			...((lch.h == null) ? ["h"] : []),
		];

		return options[Math.floor(Math.random() * options.length)];
	}
};
// any points on cell boundaries should be duplicated on the other side
const generateAllPositions = positions => positions.flatMap(([x, y]) => [
	[x, y],
	...(!x ? [[1, y]] : []),
	...(!y ? [[x, 1]] : []),
	...((!x && !y) ? [[1, 1]] : []),
]);

export default ({currentPlaneGroup, previousPlaneGroups}) => {
	const transitions = planeGroups[currentPlaneGroup.planeGroup].transitions;
	const sortedTransitions = transitions.map(x => [previousPlaneGroups[x.planeGroup] || 0, x]).sort(([a], [b]) => a - b);
	const leastVisited = [];
	let i = 0;

	while (sortedTransitions[i][0] === sortedTransitions[0][0]) {
		leastVisited.push(sortedTransitions[i][1]);
		i += 1;

		if (i === sortedTransitions.length) break;
	}

	const nextPlaneGroup = leastVisited[Math.floor(Math.random() * leastVisited.length)];
	nextPlaneGroup.property = getProperty({currentPlaneGroup, nextPlaneGroup});
	const aspect = getAspect(nextPlaneGroup.planeGroup);
	const currentMultiplicity = planeGroups[currentPlaneGroup.planeGroup].equivalents.length;
	const nextMultiplicity = nextPlaneGroup.mappings.length;

	if (currentMultiplicity === nextMultiplicity) nextPlaneGroup.lchs = nextPlaneGroup.mappings.map(index => currentPlaneGroup.lchs[index]);

	const result = {
		...nextPlaneGroup,
		theta: getTheta(nextPlaneGroup.planeGroup),
		aspect,
		positions: generateAllPositions(nextPlaneGroup.getPositions(aspect)),
		flipped: planeGroups[nextPlaneGroup.planeGroup].flipped,
	};

	return result;
};