import transformVector from "./transform-vector.js";
import planeGroups from "./plane-groups.js";

const multiplyMatrix = ([a1, b1, c1, d1, e1, f1, g1, h1, i1], [a2, b2, c2, d2, e2, f2, g2, h2, i2]) => {
	return [
		a1*a2 + b1*d2 + c1*g2, a1*b2 + b1*e2 + c1*h2, a1*c2 + b1*f2 + c1*i2,
		d1*a2 + e1*d2 + f1*g2, d1*b2 + e1*e2 + f1*h2, d1*c2 + e1*f2 + f1*i2,
		g1*a2 + h1*d2 + i1*g2, g1*b2 + h1*e2 + i1*h2, g1*c2 + h1*f2 + i1*i2,
	];
};
const rebaseCoordinate = coordinate => {
	while (coordinate < 0) coordinate += 1;
	while (coordinate > 1) coordinate -= 1;

	return coordinate;
};


export default ({width, height, theta}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const sinTheta = Math.sin(theta);
	const cosTheta = Math.cos(theta);
	const tanTheta = Math.tan(theta);
	const toCoordinates = multiplyMatrix([ // convert to x and y coordinates (x now vertical, y horizontal)
		0, cosTheta / halfHeight, 0,
		1 / halfHeight, 0, 0,
		0, 0, 1,
	], multiplyMatrix([ // convert to X' and Y' along coordinate axes
		1, tanTheta, 0,
		0, 1 / cosTheta, 0,
		0, 0, 1,
	], [ // absolute XY to centered XY
		1, 0, -halfWidth,
		0, 1, -halfHeight,
		0, 0, 1,
	]));
	const fromCoordinates = multiplyMatrix([
		1, 0, halfWidth,
		0, 1, halfHeight,
		0, 0, 1,
	], multiplyMatrix([ // [X', Y'] => [X, Y] orthogonal, origin centred
		1, -sinTheta, 0,
		0, cosTheta, 0,
		0, 0, 1,
	], [ // (x, y) => [X', Y'] aligned with plane group axes
		0, halfHeight, 0,
		halfHeight / cosTheta, 0, 0,
		0, 0, 1,
	]));
	const topLeft = transformVector(toCoordinates)([0, 0]);
	const maxCellLineX = -Math.floor(topLeft[1]) - 1;
	const getEquivalents = ({locus: {X, Y}, planeGroup}) => {
		const [x, y] = transformVector(toCoordinates)([X, Y]).map(rebaseCoordinate);
		const symmetryEquivalents = planeGroups[planeGroup].equivalents.map(transform => transformVector(transform)([x, y]).map(rebaseCoordinate));
		const translations = Array.from({length: maxCellLineX * 2 + 2}, (_, index) => index - maxCellLineX - 1).flatMap(yOffset => [0, -1].flatMap(
			xOffset => symmetryEquivalents.map(([x, y]) => [x + xOffset, y + yOffset])
		)).map(transformVector(fromCoordinates));

		return translations;
	};
	const getCells = ({locus, planeGroup}) => {
		const bbox = {xl: 0, xr: width, yt: 0, yb: height};
		const equivalentPoints = getEquivalents({locus, planeGroup}).map(([x, y]) => ({x, y}));
		const cellDetails = new Voronoi().compute(equivalentPoints, bbox).cells;
		const cells = equivalentPoints.map(({voronoiId}) => {
			const {halfedges} = cellDetails[voronoiId];

			return halfedges && (halfedges.length > 2) && halfedges.flatMap(halfedge => (({x, y}) => [x, y])(halfedge.getEndpoint()));
		});

		return cells;
	};

	return {windowSize: {width, height}, theta, maxCellLineX, getEquivalents, getCells, toCoordinates, fromCoordinates};
};