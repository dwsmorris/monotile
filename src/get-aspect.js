
// ASPECT = H/W
export default planeGroup => {
	switch(planeGroup) {
		case "p1":
		case "p2":
			// vary between 0.5 and 2 - choose a side and equal probability along length
			return (() => {
				const isWide = Math.random() < 0.5;

				if (isWide) return (Math.random() * 0.5) + 0.5;

				return Math.random() + 1;
			})();
	}

	return 1;
};