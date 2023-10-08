import constants from "./constants.js";

const {showCircles} = constants;

export default state => {
	const {locus, getEquivalents, getCells, currentPlaneGroup: {planeGroup}} = state;
	const equivalents = showCircles ? getEquivalents({locus, planeGroup}) : [];
	const cells = showCircles ? [] : getCells({locus, planeGroup});

	return {
		...state,
		equivalents,
		cells,
	};
};