import planeGroups from "./plane-groups.js";
import getTheta from "./get-theta.js";
import getAspect from "./get-aspect.js";

const getProperty = ({currentPlaneGroup, nextPlaneGroup}) => {
	if (nextPlaneGroup.mappings.length <= currentPlaneGroup.mappings.length) { // converging or same number of asymmetric units
		return currentPlaneGroup.property;
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

		if (i === leastVisited.length) break;
	}

	const nextPlaneGroup = leastVisited[Math.floor(Math.random() * leastVisited.length)];
	nextPlaneGroup.property = getProperty({currentPlaneGroup, nextPlaneGroup});
	const aspect = getAspect(nextPlaneGroup.planeGroup);
	const result = {
		...nextPlaneGroup,
		theta: getTheta(nextPlaneGroup.planeGroup),
		aspect,
		positions: generateAllPositions(nextPlaneGroup.getPositions(aspect)),
		flipped: planeGroups[nextPlaneGroup.planeGroup].flipped,
	};

	return result;
};