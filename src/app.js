import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import getColor from "./get-color.js";
import getMetrics from './get-metrics.js';
import transformVector from './transform-vector.js';
import generateEquivalents from './generate-equivalents.js';
import getLchs from "./get-lchs.js";
import chooseNextPlaneGroup from './choose-next-plane-group.js';
import getTheta from './get-theta.js';
import getAspect from "./get-aspect.js";
import applyAnimation from './apply-animation.js';
import constants from "./constants.js";

const {showCircles} = constants;
const transitionDuration = 1000; // ms

const isConvergingTransition = ({previousPlaneGroup, currentPlaneGroup, nextPlaneGroup}) => Array.isArray(previousPlaneGroup ? currentPlaneGroup.mappings[0] : nextPlaneGroup.mappings[0]);

export default () => {
	const targetRef = useRef({X: window.innerWidth / 2, Y: window.innerHeight / 2});
	const [{
		windowSize, // {width: I, height: I}
		maxCellLineX, // I
		maxCellLineY, // I
		equivalents, // [[I, I]]
		locus, // {X: I, Y: I}
		currentPlaneGroup, // {planeGroup: S, theta: R}
		previousPlaneGroup, // {planeGroup: S, theta: R}?
		previousPlaneGroups, // {[planeGroup]: I}
		nextPlaneGroup, // {planeGroup: S, positions: [[R, R]], theta: R}
		theta, // R
		aspect, // srt(0.5-2)
		transitionPoint, // {X: R, Y: R}?
		lastLocusUpdate, // I
		transitionStart, // {ms: I, locus: {X: I, Y: I}}?
		lchs, // [{l: -1|0|1, c: -1|0|1, h: -1|0|1}]
		cells, // [{x, y}]
	}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics({...action.payload, theta: state.theta, aspect: state.aspect})});
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
								...(isConvergingTransition(state) ? {lchs: getLchs({planeGroup1: state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup, proportion: delta})} : {}), // if converging lchs, we apply this during attraction to transition pointer
							});
						} else { // during restoration to original point
							const delta = (offset - halfDuration) / halfDuration;
							const updatedState = (() => {
								// if transitioning and we've reached the transition point, change plane group
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
										nextPlaneGroup: undefined,
										previousPlaneGroups,
										lchs: currentPlaneGroup.lchs,
									};
								}

								return state;
							})();
							const theta = (updatedState.previousPlaneGroup.theta * (1 - delta)) + (updatedState.currentPlaneGroup.theta * delta);
							const aspect = (updatedState.previousPlaneGroup.aspect * (1 - delta)) + (updatedState.currentPlaneGroup.aspect * delta);
							const locus = {
								X: (state.transitionPoint.X * (1 - delta)) + (state.transitionStart.locus.X * delta),
								Y: (state.transitionPoint.Y * (1 - delta)) + (state.transitionStart.locus.Y * delta),
							};

							return generateEquivalents({
								...updatedState,
								...(((updatedState.previousPlaneGroup.theta !== updatedState.currentPlaneGroup.theta) ||
									(updatedState.previousPlaneGroup.aspect !== updatedState.currentPlaneGroup.aspect)) ? getMetrics({...state.windowSize, theta, aspect}) : {}),
								locus,
								lastLocusUpdate: ms,
								...(isConvergingTransition(state) ? {} : {lchs: getLchs({planeGroup1: updatedState.previousPlaneGroup, planeGroup2: updatedState.currentPlaneGroup, proportion: delta})}), // if diverging lchs, we apply this during restoration back to transition start point
							});
						}
					} else { // just attract to mouse pointer as normal now
						return applyAnimation({
							state: {
								...state,
								...((state.previousPlaneGroup?.theta !== state.currentPlaneGroup.theta) ? getMetrics({...state.windowSize, theta: state.currentPlaneGroup.theta, aspect: state.currentPlaneGroup.aspect}) : {}),
								transitionStart: undefined,
								previousPlaneGroup: undefined,
								nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup: state.currentPlaneGroup, previousPlaneGroups: state.previousPlaneGroups}),
								lchs: state.currentPlaneGroup.lchs,
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
		const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1"), aspect: getAspect("p1"), lchs: [{}], mappings: [0]}; // dummy mappings to check cell arity

		return generateEquivalents({
			...getMetrics({
				width: window.innerWidth,
				height: window.innerHeight,
				theta: currentPlaneGroup.theta,
				aspect: currentPlaneGroup.aspect,
			}),
			locus: {
				X: window.innerWidth / 2,
				Y: window.innerHeight / 2,
			},
			currentPlaneGroup,
			theta: currentPlaneGroup.theta,
			aspect: currentPlaneGroup.aspect,
			nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: {}}),
			previousPlaneGroups: {},
			transitionPoint: undefined,
			lastLocusUpdate: Date.now(),
			transitionStartTime: undefined,
			previousPlaneGroup: undefined,
			lchs: [{}],
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
	const cellArity = currentPlaneGroup.mappings.length;

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			{showCircles ? Array.from({length: maxCellLineY * 2 + 1}, (_, index) => index - maxCellLineY).map(offset => (y => <Line stroke="black" strokeWidth={0.3} key={`horizontal-${offset}`} points={[0, y, windowSize.width, y]}/>)((windowSize.height / 2) + (offset * windowSize.height * aspect / 4))) : null}

			{/* vertical axes */}
			{showCircles ? Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x + deltaX, 0, x - deltaX, windowSize.height]}/>)((windowSize.width / 2) + (offset * windowSize.height / aspect / 4))) : null}

			{/* cells */}
			{showCircles ? null : cells.map((points, index) => points ? <Line key={`line-${index}`} points={points} closed fill={getColor(lchs[index % cellArity])} stroke="black"/> : null)}

			{/* symmetry equivalent points of locus */}
			{showCircles ? equivalents.map(([X, Y], index) => <Circle key={`circle-${index}`} x={X} y={Y} radius={10} fill={getColor(lchs[index % cellArity])}/>) : null}
		</Layer>
	</Stage>
};
