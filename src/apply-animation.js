import generateEquivalents from "./generate-equivalents.js";

const timeToSync = 200; //ms

export default ({state, attractor, ms}) => {
	const delta = Math.min((ms - state.lastLocusUpdate) / timeToSync, 1);
	const locus = {
		X: (state.locus.X * (1 - delta)) + (attractor.X * delta),
		Y: (state.locus.Y * (1 - delta)) + (attractor.Y * delta),
	};

	return generateEquivalents({
		...state,
		locus,
		lastLocusUpdate: ms,
	});
};