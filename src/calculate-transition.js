import transformVector from "./transform-vector.js";
import getMetrics from "./get-metrics.js";
import getTransitionDetails from "./get-transition-details.js";
import generateEquivalents from "./generate-equivalents.js";
import rebaseCoordinate from "./rebase-coordinate.js";
import getAngleBetweenPoints from "./get-angle-between-points.js";
import planeGroups from "./plane-groups.js";

export default state => {
	const {X, Y} = state.locus;
	const [x, y] = transformVector(state.toCoordinates)([X, Y]);
	const cell = [Math.floor(x), Math.floor(y)];
	const stateBeforeTransition = getMetrics({
		...state,
		...getTransitionDetails({planeGroup1: state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup, progress: -1E-10}), // theta and aspect
	});
	// generate transition points in this cell
	const transitionPoints = state.nextPlaneGroup.positions.map(([a, b]) => { // note positions is in the coordinate frame of currentPlaneGroup
		const [x, y] = transformVector(stateBeforeTransition.fromCoordinates)([cell[0] + a, cell[1] + b]);
		const diffX = X - x;
		const diffY = Y - y;

		return [(diffX * diffX) + (diffY * diffY), [x, y]];
	}).sort(([a], [b]) => a - b);
	const transitionPoint = transitionPoints[0][1];
	const stateAfterTransition = getMetrics({
		...state,
		...getTransitionDetails({planeGroup1: state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup, progress: 0}), // theta and aspect
		currentPlaneGroup: state.nextPlaneGroup,
		flipped: state.nextPlaneGroup.flipped,
	});
	// find all the points just before transition within bounding box of new unit cell
	const {equivalents} = generateEquivalents({...stateBeforeTransition, showCircles: true, locus: {X: transitionPoint[0], Y: transitionPoint[1]}});
	const currentMultiplicity = planeGroups[state.currentPlaneGroup.planeGroup].equivalents.length;
	const {xl, xr, yt, yb} = stateAfterTransition.getUnitCellBoundingBox();
	const pointsInNewCell = equivalents.map((position, index) => ({position, mapping: index % currentMultiplicity})).filter(({position: [X, Y]}) => (X > (xl - 1)) && (X < (xr + 1)) && (Y > (yt - 1)) && (Y < (yb + 1)));
	// find symmetry equivalents in new cell to calculate mappings
	const transitionCoordinate = transformVector(stateAfterTransition.toCoordinates)(transitionPoint).map(rebaseCoordinate);
	const symmetryEquivalents = planeGroups[state.nextPlaneGroup.planeGroup].equivalents.map(transform => transformVector(transform)(transitionCoordinate).map(rebaseCoordinate)).map(transformVector(stateAfterTransition.fromCoordinates));
	// match positions against currentPlaneGroup equivalents
	const mappings = symmetryEquivalents.map(([X, Y]) => {
		const equivalent = pointsInNewCell.find(({position}) => (Math.abs(position[0] - X) < 1) && (Math.abs(position[1] - Y) < 1));

		return equivalent.mapping;
	});
	// mirror configuration detection
	const {activeMirrors, mirrorConfiguration} = (() => {
		const mirrors = state.nextPlaneGroup.mirrors;

		if (!mirrors) return {};

		const stateAtEnd = getMetrics({
			...state,
			...getTransitionDetails({planeGroup1: state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup, progress: 1}), // theta and aspect
			currentPlaneGroup: state.nextPlaneGroup,
			flipped: state.nextPlaneGroup.flipped,
		});

		const activeMirrors = mirrors.map(points => points.map(([x, y]) => transformVector(stateAtEnd.fromCoordinates)([x + cell[0], y + cell[1]])));
		const mirrorConfiguration = activeMirrors.map(getAngleBetweenPoints([X, Y]));

		return {activeMirrors, mirrorConfiguration};
	})();
	const nextPlaneGroup = {
		...state.nextPlaneGroup,
		mappings,
		activeMirrors,
		mirrorConfiguration,
		...((currentMultiplicity === mappings.length) ? {lchs: mappings.map(index => state.currentPlaneGroup.lchs[index])} : {}),
	};

	return {...state, transitionPoint, transitionStart: {ms: Date.now(), locus: state.locus}, nextPlaneGroup};

};