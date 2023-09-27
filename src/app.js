import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import planeGroups from "./plane-groups.js";
import getColor from "./get-color.js";

const timeToSync = 200; //ms
const transitionDuration = 500; // ms

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

	return {windowSize: {width, height}, theta, maxCellLineX, getEquivalents, toCoordinates, fromCoordinates};
};
const generateEquivalents = state => {
	const {locus, getEquivalents, currentPlaneGroup: {planeGroup}} = state;

	return {
		...state,
		equivalents: getEquivalents({locus, planeGroup}),
	};
};
const chooseNextPlaneGroup = ({currentPlaneGroup, previousPlaneGroups}) => {
	const transitions = planeGroups[currentPlaneGroup.planeGroup].transitions;
	const sortedTransitions = transitions.map(x => [previousPlaneGroups[x.planeGroup] || 0, x]).sort(([a], [b]) => a - b);
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
		theta: getTheta(nextPlaneGroup.planeGroup),
	};
};
const applyAnimation = ({state, attractor, ms}) => {
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

export default () => {
	const targetRef = useRef({X: window.innerWidth / 2, Y: window.innerHeight / 2});
	const [{
		windowSize, // {width: I, height: I}
		maxCellLineX, // I
		equivalents, // [[I, I]]
		locus, // {X: I, Y: I}
		currentPlaneGroup, // {planeGroup: S, theta: R}
		previousPlaneGroup, // {planeGroup: S, theta: R}?
		previousPlaneGroups, // {[planeGroup]: I}
		nextPlaneGroup, // {planeGroup: S, positions: [[R, R]], theta: R}
		theta, // R
		transitionPoint, // {X: R, Y: R}?
		lastLocusUpdate, // I
		transitionStart, // {ms: I, locus: {X: I, Y: I}}?
	}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics({...action.payload, theta: state.theta})});
			case "CALCULATE_TRANSITION": return (() => {
				const {X, Y} = state.locus;
				const [x, y] = transformVector(state.toCoordinates)([X, Y]);
				const cell = [Math.floor(x), Math.floor(y)];
				// generate transition points in this cell and those at +1 along each axis
				const transitionPoints = state.nextPlaneGroup.positions.flatMap(([x, y], position) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => 
					[transformVector(state.fromCoordinates)([a + cell[0] + x, b + cell[1] + y]), {position, translation: [a + cell[0], b + cell[1]]}])).map(([[x, y], indices]) => {
						const diffX = X - x;
						const diffY = Y - y;

						return [(diffX * diffX) + (diffY * diffY), indices, [x, y]];
					}).sort(([a], [b]) => a - b);
				const closest = transitionPoints[0][2];

				return {...state, transitionPoint: {X: closest[0], Y: closest[1], ...transitionPoints[0][1]}, transitionStart: {ms: Date.now(), locus: state.locus}};
			})();
			case "ANIMATE": return (() => {
				const ms = Date.now();

				// if transitioning and we've reached the transition point, change plane group
				if (state.transitionStart) {
					const offset = ms - state.transitionStart.ms;

					if (offset < transitionDuration) { // during transition
						const halfDuration = transitionDuration / 2;

						if (offset < halfDuration) { // during attraction to transition pointer
							const delta = offset / halfDuration;
							const locus = {
								X: (state.transitionStart.locus.X * (1 - delta)) + (state.transitionPoint.X * delta),
								Y: (state.transitionStart.locus.Y * (1 - delta)) + (state.transitionPoint.Y * delta),
							};

							return generateEquivalents({
								...state,
								locus,
								lastLocusUpdate: ms,
							});
						} else { // during restoration to original point
							const delta = (offset - halfDuration) / halfDuration;
							const updatedState = (() => {
								if (!state.previousPlaneGroup) {
									const previousPlaneGroups = {
										...state.previousPlaneGroups,
										[state.currentPlaneGroup.planeGroup]: (state.previousPlaneGroups[state.currentPlaneGroup.planeGroup] || 0) + 1
									};
									const currentPlaneGroup = state.nextPlaneGroup;

									return {
										...state,
										previousPlaneGroup: state.currentPlaneGroup,
										currentPlaneGroup,
										nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups}),
										previousPlaneGroups,
									};
								}

								return state;
							})();
							const theta = (updatedState.previousPlaneGroup.theta * (1 - delta)) + (updatedState.currentPlaneGroup.theta * delta);
							const locus = {
								X: (state.transitionPoint.X * (1 - delta)) + (state.transitionStart.locus.X * delta),
								Y: (state.transitionPoint.Y * (1 - delta)) + (state.transitionStart.locus.Y * delta),
							};

							return generateEquivalents({
								...updatedState,
								...((updatedState.previousPlaneGroup.theta !== updatedState.currentPlaneGroup.theta) ? getMetrics({...state.windowSize, theta}) : {}),
								locus,
								lastLocusUpdate: ms,
							});
						}
					} else { // just attract to mouse pointer as normal now
						return applyAnimation({
							state: {
								...state,
								...((state.previousPlaneGroup?.theta !== state.currentPlaneGroup.theta) ? getMetrics({...state.windowSize, theta: state.currentPlaneGroup.theta}) : {}),
								transitionStart: undefined,
								previousPlaneGroup: undefined,
							},
							attractor: targetRef.current,
							ms,
						});
					}
				} else {
					return applyAnimation({state, attractor: targetRef.current, ms});
				}
			})();
		}

		return state;
	}, undefined, () => {
		const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1"), lchs: [[0, 0, 0]]};

		return generateEquivalents({
			...getMetrics({
				width: window.innerWidth,
				height: window.innerHeight,
				theta: currentPlaneGroup.theta,
			}),
			locus: {
				X: window.innerWidth / 2,
				Y: window.innerHeight / 2,
			},
			currentPlaneGroup,
			theta: currentPlaneGroup.theta,
			nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: {}}),
			previousPlaneGroups: {},
			transitionPoint: undefined,
			lastLocusUpdate: Date.now(),
			transitionStartTime: undefined,
			previousPlaneGroup: undefined,
		});
	});
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
		animationFrameRef.current = requestAnimationFrame(() => dispatch({type: "ANIMATE"}));

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus, transitionPoint]); // run every time we set a new locus or apply transition

	const deltaX = windowSize.height / 2 * Math.tan(theta);
	const color = getColor();

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			<Line points={[0, windowSize.height / 2, windowSize.width, windowSize.height / 2]} stroke="black" strokeWidth={0.3}/>

			{/* vertical axes */}
			{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x + deltaX, 0, x - deltaX, windowSize.height]}/>)((windowSize.width / 2) + (offset * windowSize.height / 2)))}

			{/* symmetry equivalent points of locus */}
			{equivalents.map(([X, Y], index) => <Circle key={index} x={X} y={Y} radius={10} fill={color}/>)}
		</Layer>
	</Stage>
};
