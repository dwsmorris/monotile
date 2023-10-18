
export default state => {
	const {locus, getEquivalents, getCells, currentPlaneGroup: {planeGroup}, showCircles} = state;
	const equivalents = showCircles ? getEquivalents({locus, planeGroup}) : [];
	const cells = showCircles ? [] : getCells({locus, planeGroup});

	return {
		...state,
		equivalents,
		cells,
	};
};