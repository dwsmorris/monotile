
const getDivergingLchs = ({number, lch, proportion, property}) => {
	return Array.from({length: number}).map((_, i) => ({
		...lch,
		[property]: (() => {
			if (!i) return -proportion;
			if (i === 2) return proportion;

			return (number === 2) ? proportion : 0;
		})(),
	}));
};
const getConvergingLch = ({lchs, property}) => {
	return {
		...lchs[0],
		[property]: undefined,
	};
};

export default ({planeGroup1, planeGroup2, progress}) => {
	const type = planeGroup2.type;

	if (type === "CONVERGING") {
		const proportion = progress + 1;

		if (proportion >= 1) return planeGroup2.mappings.map(reference => getConvergingLch({lchs: reference.map(index => planeGroup1.lchs[index]), property: planeGroup2.property}));

		return planeGroup1.lchs.map(lch => ({
			...lch,
			[planeGroup2.property]: lch[planeGroup2.property] * (1 - proportion),
		}));
	} else if (type === "DIVERGING") {
		if (progress < 0) return planeGroup1.lchs;

		const proportion = progress;
		const mappings = planeGroup2.mappings;
		const result = Array.from({length: mappings.length}); //! MUTATION

		for (var j = 0; j < mappings.length; j++) {
			const reference = mappings[j];

			if (result[j]) continue; // already been calculated

			// find all the diverging equivalents of this position
			const divergingIndices = mappings.map((index, i) => [index, i]).filter(([index]) => reference === index).map(([, i]) => i);

			if (divergingIndices.length === 1) { // no new sections are generated - maintain lch
				result[divergingIndices[0]] = planeGroup1.lchs[reference];
			} else { // diverging
				const lchs = getDivergingLchs({number: divergingIndices.length, lch: planeGroup1.lchs[reference], proportion, property: planeGroup2.property});

				for (var k = 0; k < divergingIndices.length; k += 1) {
					result[divergingIndices[k]] = lchs[k];
				}
			}
		}

		return result;
	}
};