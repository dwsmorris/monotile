
export default state => {
	const {locus, getEquivalents, currentPlaneGroup: {planeGroup}} = state;
	const equivalents = getEquivalents({locus, planeGroup});
	const bbox = {xl: 0, xr: state.windowSize.width, yt: 0, yb: state.windowSize.height};
	const equivalentPoints = equivalents.map(([x, y]) => ({x, y}));
	const cells = new Voronoi().compute(equivalentPoints, bbox).cells;

	return {
		...state,
		equivalents,
		cells,
		equivalentPoints,
	};
};