import transformVector from "./transform-vector.js";
import planeGroups from "./plane-groups.js";
import rebaseCoordinate from "./rebase-coordinate.js";

const multiplyMatrix = ([a1, b1, c1, d1, e1, f1, g1, h1, i1], [a2, b2, c2, d2, e2, f2, g2, h2, i2]) => {
	return [
		a1*a2 + b1*d2 + c1*g2, a1*b2 + b1*e2 + c1*h2, a1*c2 + b1*f2 + c1*i2,
		d1*a2 + e1*d2 + f1*g2, d1*b2 + e1*e2 + f1*h2, d1*c2 + e1*f2 + f1*i2,
		g1*a2 + h1*d2 + i1*g2, g1*b2 + h1*e2 + i1*h2, g1*c2 + h1*f2 + i1*i2,
	];
};

export default state => {
	const {width, height, theta, aspect, flipped, currentPlaneGroup} = state;
	const sinTheta = Math.sin(theta);
	const cosTheta = Math.cos(theta);
	const tanTheta = Math.tan(theta);
	const multiplicityFactor = Math.sqrt(planeGroups[currentPlaneGroup.planeGroup].equivalents.length);
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const cellHeight = height / 4 * aspect * multiplicityFactor;
	const cellWidth = height / 4 / aspect * multiplicityFactor; // aspect takes into account height differential in hexagonal system
	const toCoordinates = multiplyMatrix([ // convert to x and y coordinates (x now vertical, y horizontal)
		0, cosTheta / cellHeight, 0,
		1 / cellWidth, 0, 0,
		0, 0, 1,
	], multiplyMatrix(flipped ? [ // X' coincident with -Y, Y' theta degrees from X
		tanTheta, -1, 0,
		1 / cosTheta, 0, 0,
		0, 0, 1,
	] : [ // X' coincident with X, Y' theta degrees from Y
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
	], multiplyMatrix(flipped ? [
		0, cosTheta, 0,
		-1, sinTheta,  0,
		0, 0, 1,
	] : [ // [X', Y'] => [X, Y] orthogonal, origin centred
		1, -sinTheta, 0,
		0, cosTheta, 0,
		0, 0, 1,
	], [ // (x, y) => [X', Y'] aligned with plane group axes
		0, cellWidth, 0,
		cellHeight / cosTheta, 0, 0,
		0, 0, 1,
	]));
	const corner = transformVector(toCoordinates)([0, flipped ? height : 0]);
	const maxCellLineX = -Math.floor(corner[1]) - 1;
	const maxCellLineY = -Math.floor(corner[0]) - 1;
	const getEquivalents = ({locus: {X, Y}, planeGroup}) => {
		const [x, y] = transformVector(toCoordinates)([X, Y]).map(rebaseCoordinate);
		const symmetryEquivalents = planeGroups[planeGroup].equivalents.map(transform => transformVector(transform)([x, y]).map(rebaseCoordinate));
		const translations = Array.from({length: maxCellLineX * 2 + 2}, (_, index) => index - maxCellLineX - 1).flatMap(yOffset => Array.from({length: maxCellLineY * 2 + 2}, (_, index) => index - maxCellLineY - 1).flatMap(
			xOffset => symmetryEquivalents.map(([x, y]) => [x + xOffset, y + yOffset])
		)).map(transformVector(fromCoordinates));

		return translations;
	};
	const getCells = ({locus: {X, Y}, planeGroup}) => {
		const origin = transformVector(fromCoordinates)([0, 0]);
		const point10 = transformVector(fromCoordinates)([1, 0]);
		const point01 = transformVector(fromCoordinates)([0, 1]);
		const xVector = [point10[0] - origin[0], point10[1] - origin[1]];
		const yVector = [point01[0] - origin[0], point01[1] - origin[1]];
		const bbox = (() => {
			if (planeGroups[planeGroup].flipped) {
				const topLeft = transformVector(fromCoordinates)([-1, 2]);
				const bottomRight = transformVector(fromCoordinates)([2, -1]);

				return {xl: topLeft[0], xr: bottomRight[0], yt: topLeft[1], yb: bottomRight[1]};
			} else {
				const topRight = transformVector(fromCoordinates)([-1, 2]);
				const bottomLeft = transformVector(fromCoordinates)([2, -1]);

				return {xl: bottomLeft[0], xr: topRight[0], yt: topRight[1], yb: bottomLeft[1]};
			}
		})();
		const [x, y] = transformVector(toCoordinates)([X, Y]).map(rebaseCoordinate);
		const symmetryEquivalents = planeGroups[planeGroup].equivalents.map(transform => transformVector(transform)([x, y]).map(rebaseCoordinate));
		const surroundingPoints = [0, -1, 1, -2, 2].flatMap(yOffset => [0, -1, 1, -2, 2].flatMap( // to avoid artifacts check 2 cells on every side
			xOffset => symmetryEquivalents.map(([x, y]) => [x + xOffset, y + yOffset])
		)).map(transformVector(fromCoordinates));

		const delaunay = d3.Delaunay.from(surroundingPoints);
		const d3bb = [bbox.xl, bbox.yt, bbox.xr, bbox.yb];
		const voronoi = delaunay.voronoi(d3bb);
		const d3CellDetails = [...voronoi.cellPolygons()];
		const d3Cells = [...Array(symmetryEquivalents.length).keys()].map(id => {
			const details = d3CellDetails.find(({index}) => id === index);

			if (!details) {
				console.log("not found");
			}

			return details;
		});

		const points = Array.from({length: maxCellLineX * 2 + 4}, (_, index) => index - maxCellLineX - 2).flatMap(yOffset => Array.from({length: maxCellLineY * 2 + 4}, (_, index) => index - maxCellLineY - 2).flatMap(
			xOffset => d3Cells.map(vertices => vertices && vertices.flatMap(([x, y]) => [x + (xOffset * xVector[0]) + (yOffset * yVector[0]), y + (xOffset * xVector[1]) + (yOffset * yVector[1])]))
		));

		return points;
	};
	const getUnitCellBoundingBox = () => {
		if (flipped) {
			const topLeft = transformVector(fromCoordinates)([0, 1]);
			const bottomRight = transformVector(fromCoordinates)([1, 0]);

			return {xl: topLeft[0], xr: bottomRight[0], yt: topLeft[1], yb: bottomRight[1]};
		} else {
			const topRight = transformVector(fromCoordinates)([0, 1]);
			const bottomLeft = transformVector(fromCoordinates)([1, 0]);

			return {xl: bottomLeft[0], xr: topRight[0], yt: topRight[1], yb: bottomLeft[1]};
		}
	};

	return {
		...state,
		windowSize: {width, height},
		maxCellLineX,
		maxCellLineY,
		getEquivalents,
		getCells,
		toCoordinates,
		fromCoordinates,
		cellHeight,
		cellWidth,
		getUnitCellBoundingBox,
	};
};