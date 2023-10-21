
const hexagonalAspect = Math.sqrt(Math.cos(Math.PI / 6));

// ASPECT = sqrt(H/W) - it is this because it is multiplied by the width and the height is divided by it
export default planeGroup => {
	switch(planeGroup) {
		case "p1":
		case "p2":
			// vary between 0.5 and 2 - choose a side and equal probability along length
			return (() => {
				const isWide = Math.random() < 0.5;

				if (isWide) return Math.sqrt((Math.random() * 0.5) + 0.5);

				return Math.sqrt(Math.random() + 1);
			})();

		case "p3":
		case "p6":
			return hexagonalAspect;
	}

	return 1;
};