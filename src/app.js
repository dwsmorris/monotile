import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import planeGroups from "./plane-groups.js";

const timeToSync = 200; //ms

const multiplyMatrix = ([a1, b1, c1, d1, e1, f1, g1, h1, i1], [a2, b2, c2, d2, e2, f2, g2, h2, i2]) => {
	return [
		a1*a2 + b1*d2 + c1*g2, a1*b2 + b1*e2 + c1*h2, a1*c2 + b1*f2 + c1*i2,
		d1*a2 + e1*d2 + f1*g2, d1*b2 + e1*e2 + f1*h2, d1*c2 + e1*f2 + f1*i2,
		g1*a2 + h1*d2 + i1*g2, g1*b2 + h1*e2 + i1*h2, g1*c2 + h1*f2 + i1*i2,
	];
};
const transformVector = ([a, b, c, d, e, f, g, h, i]) => ([x, y, w = 1]) => [a*x + b*y + c*w, d*x + e*y + f*w];
const rebaseCoordinate = coordinate => {
	while (coordinate < 0) coordinate += 1;
	while (coordinate > 1) coordinate -= 1;

	return coordinate;
};
const getTheta = planeGroup => {
	switch(planeGroup) {
		case "p1":
		case "p2":
			return Math.random() * Math.PI / 4; // 0 to 45 degrees
	}

	return 0; // right angles (theta = gamma - pi/2)
};

const getMetrics = ({width, height, theta}) => {
	const maxX = width / height;
	const maxCellLineX = Math.floor(maxX);
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
	const getEquivalents = ({locus: {X, Y}, planeGroup}) => {
		const [x, y] = transformVector(toCoordinates)([X, Y]).map(rebaseCoordinate);
		const symmetryEquivalents = planeGroups[planeGroup].equivalents.map(transform => transformVector(transform)([x, y]).map(rebaseCoordinate));
		const translations = Array.from({length: maxCellLineX * 2 + 2}, (_, index) => index - maxCellLineX - 1).flatMap(yOffset => [0, -1].flatMap(
			xOffset => symmetryEquivalents.map(([x, y]) => [x + xOffset, y + yOffset])
		)).map(transformVector(fromCoordinates));

		return translations;
	};

	return {windowSize: {width, height}, theta, maxCellLineX, getEquivalents, toCoordinates, fromCoordinates};
};
const generateEquivalents = state => {
	const {locus, getEquivalents, currentPlaneGroup: {planeGroup}} = state;

	return {
		...state,
		equivalents: getEquivalents({locus, planeGroup}),
	};
};
const arePointsCoincident = ({X: X1, Y: Y1}, {X: X2, Y: Y2}) => (Math.round(X1) === Math.round(X2)) && (Math.round(Y1) === Math.round(Y2));
const chooseNextPlaneGroup = ({planeGroup, previousPlaneGroups}) => {
	const transitions = planeGroups[planeGroup].transitions;
	const sortedTransitions = transitions.map(x => [previousPlaneGroups[x.planegroup] || 0, x]).sort(([a], [b]) => a - b);
	const leastVisited = [];
	let i = 0;

	while (sortedTransitions[i][0] === sortedTransitions[0][0]) {
		leastVisited.push(sortedTransitions[i][1]);
		i += 1;

		if (i === leastVisited.length) break;
	}

	const nextPlaneGroup = leastVisited[Math.floor(Math.random() * leastVisited.length)];

	return {
		...nextPlaneGroup,
		theta: getTheta(nextPlaneGroup.planegroup),
	};
};

export default () => {
	const targetRef = useRef({X: window.innerWidth / 2, Y: window.innerHeight / 2, time: Date.now()});
	const transitionRef = useRef();
	const [{
		windowSize, // {width: I, height: I}
		maxCellLineX, // I
		equivalents, // [[I, I]]
		locus, // {X: I, Y: I, time: I}
		currentPlaneGroup, // {planeGroup: S, theta: R}
		previousPlaneGroups, // {[planeGroup]: I}
		nextPlaneGroup, // {planeGroup: S, positions: [[R, R]], theta: R}
		theta, // R
	}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics({...action.payload, theta: state.theta})});
			case "LOCUS": return generateEquivalents({...state, locus: action.payload});
			case "CALCULATE_TRANSITION": return (() => {
				const {X, Y} = targetRef.current;
				const [x, y] = transformVector(state.toCoordinates)([X, Y]);
				const cell = [Math.floor(x), Math.floor(y)];
				// generate transition points in this cell and those at +1 along each axis
				const transitionPoints = state.nextPlaneGroup.positions.flatMap(([x, y]) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => 
					transformVector(state.fromCoordinates)([a + cell[0] + x, b + cell[1] + y]))).map(([x, y]) => {
						const diffX = X - x;
						const diffY = Y - y;

						return [[x, y], (diffX * diffX) + (diffY * diffY)];
					}).sort(([, a], [, b]) => a - b);
				const closest = transitionPoints[0][0];
				transitionRef.current = {X: closest[0], Y: closest[1]};

				return state;
			})();
			case "APPLY_TRANSITION": return (() => {
				transitionRef.current = undefined;
				const previousPlaneGroups = {
					...state.previousPlaneGroups,
					[state.currentPlaneGroup.planeGroup]: (state.previousPlaneGroups[state.currentPlaneGroup.planeGroup] || 0) + 1
				};
				const currentPlaneGroup = state.nextPlaneGroup;

				return {
					...state,
					currentPlaneGroup,
					previousPlaneGroups,
					nextPlaneGroup: chooseNextPlaneGroup({planeGroup: currentPlaneGroup.planeGroup, previousPlaneGroups}),
				};
			})();
		}

		return state;
	}, (() => {
		const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1")};

		return generateEquivalents({
			...getMetrics({
				width: window.innerWidth,
				height: window.innerHeight,
				theta: currentPlaneGroup.theta,
			}),
			locus: {
				X: window.innerWidth / 2,
				Y: window.innerHeight / 2,
				time: Date.now(),
			},
			currentPlaneGroup,
			theta: currentPlaneGroup.theta,
			nextPlaneGroup: chooseNextPlaneGroup({planeGroup: currentPlaneGroup.planeGroup, previousPlaneGroups: {}}),
			previousPlaneGroups: {},
		});
	})());
	const animationFrameRef = useRef();

	useEffect(() => {
		const handleResize = () => {
			// Use requestAnimationFrame to schedule the update
			requestAnimationFrame(() => {
				dispatch({
					type: "WINDOW_SIZE",
					payload: {
						width: window.innerWidth,
						height: window.innerHeight,
					},
				})
			});
		};

		// Attach the event listener
		window.addEventListener('resize', handleResize);

		// every period enact phase transition
		const transitionInterval = setInterval(() => dispatch({type: "CALCULATE_TRANSITION"}), 7000); // 7sec transition period

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
			clearInterval(transitionInterval);
		};
	}, []); // Empty dependency array to ensure this effect only runs once

	useEffect(() => {
		const animateLocus = () => {
			const currentTime = Date.now();
			const delta = Math.min((currentTime - locus.time) / timeToSync, 1);
			const attractor = transitionRef.current || targetRef.current;

			// if transitioning and we've reached the transition point, change plane group
			if (transitionRef.current && arePointsCoincident(locus, transitionRef.current)) {
				dispatch({type: "APPLY_TRANSITION"});
			} else {
				// calculate the current position based on the progress
				dispatch({
					type: "LOCUS",
					payload: {
						X: (locus.X * (1 - delta)) + attractor.X * delta,
						Y: (locus.Y * (1 - delta)) + attractor.Y * delta,
						time: currentTime,
					},
				});
			}
		};

		animationFrameRef.current = requestAnimationFrame(animateLocus);

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus, transitionRef.current]); // run every time we set a new locus or apply transition

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			<Line points={[0, windowSize.height / 2, windowSize.width, windowSize.height / 2]} stroke="black" strokeWidth={0.3}/>

			{/* vertical axes */}
			{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x, 0, x, windowSize.height]}/>)((windowSize.width / 2) + (offset * windowSize.height / 2)))}

			{/* symmetry equivalent points of locus */}
			{equivalents.map(([X, Y], index) => <Circle key={index} x={X} y={Y} radius={10} fill="red"/>)}
		</Layer>
	</Stage>
};
