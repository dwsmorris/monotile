import React, {useReducer, useEffect, useRef, useState} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import getColor from "./get-color.js";
import getMetrics from './get-metrics.js';
import transformVector from './transform-vector.js';
import generateEquivalents from './generate-equivalents.js';
import chooseNextPlaneGroup from './choose-next-plane-group.js';
import getTheta from './get-theta.js';
import getAspect from "./get-aspect.js";
import applyAnimation from './apply-animation.js';
import getTransitionDetails from "./get-transition-details.js";
import planeGroups from "./plane-groups.js";

const transitionDuration = 10000; // ms

export default () => {
	const targetRef = useRef({X: window.innerWidth / 2, Y: window.innerHeight / 2});
	const showCirclesRef = useRef(true);
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
		flipped, // B
		cellHeight,
		cellWidth,
	}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics({...state, ...action.payload}), showCircles: showCirclesRef.current});
			case "CALCULATE_TRANSITION": return (() => {
				const {X, Y} = state.locus;
				const [x, y] = transformVector(state.toCoordinates)([X, Y]);
				const cell = [Math.floor(x), Math.floor(y)];
				const {fromCoordinates} = getMetrics({
					...state,
					...getTransitionDetails({planeGroup1: state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup, progress: 0}),
				});
				// generate transition points in this cell and those at +1 along each axis
				const transitionPoints = state.nextPlaneGroup.positions.map(([a, b]) => {
					const [x, y] = transformVector(fromCoordinates)([cell[0] + a, cell[1] + b]);
					const diffX = X - x;
					const diffY = Y - y;

					return [(diffX * diffX) + (diffY * diffY), [x, y]];
				}).sort(([a], [b]) => a - b);

				return {...state, transitionPoint: transitionPoints[0][1], transitionStart: {ms: Date.now(), locus: state.locus}};
			})();
			case "ANIMATE": return (() => {
				const ms = Date.now();

				if (state.transitionStart) {
					const offset = ms - state.transitionStart.ms;
					const progress = Math.min((offset / transitionDuration) * 2 - 1, 1);
					const magProgress = Math.abs(progress);
					const locus = {
						X: (state.transitionStart.locus.X * magProgress) + (state.transitionPoint[0] * (1 - magProgress)),
						Y: (state.transitionStart.locus.Y * magProgress) + (state.transitionPoint[1] * (1 - magProgress)),
					};
					const transitionDetails = getTransitionDetails({planeGroup1: state.previousPlaneGroup || state.currentPlaneGroup, planeGroup2: state.nextPlaneGroup || state.currentPlaneGroup, progress});
					const updatedState = {
						...state,
						locus,
						lastLocusUpdate: ms,
						...transitionDetails,
						...(((progress > 0) && !state.previousPlaneGroup) ? {
							previousPlaneGroups: {
								...state.previousPlaneGroups,
								[state.currentPlaneGroup.planeGroup]: (state.previousPlaneGroups[state.currentPlaneGroup.planeGroup] || 0) + 1,
							},
							previousPlaneGroup: state.currentPlaneGroup,
							currentPlaneGroup: state.nextPlaneGroup,
							flipped: state.nextPlaneGroup.flipped,
							nextPlaneGroup: undefined,
						} : {}),
						...((progress === 1) ? (() => {
							const currentPlaneGroup = {
								...state.currentPlaneGroup,
								lchs: transitionDetails.lchs,
							};

							return {
								transitionStart: undefined,
								previousPlaneGroup: undefined,
								nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: state.previousPlaneGroups}),
								currentPlaneGroup,
							};
						})() : {}),
					};
					const metrics = getMetrics(updatedState);

					return generateEquivalents({...metrics, showCircles: showCirclesRef.current});
				} else {
					return applyAnimation({state, attractor: targetRef.current, ms, showCircles: showCirclesRef.current});
				}
			})();
		}

		return state;
	}, undefined, () => {
		//const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1"), aspect: getAspect("p1"), lchs: [{}]}; // dummy mappings to check cell arity
		// const currentPlaneGroup = {planeGroup: "p3", theta: getTheta("p3"), aspect: getAspect("p3"), lchs: [{h: -1}, {h : 0}, {h : 1}], flipped: true};
		const currentPlaneGroup = {planeGroup: "p6", theta: getTheta("p6"), aspect: getAspect("p6"), lchs: [{l: -1, h: -1}, {l: -1, h: 0}, {l: -1, h: 1}, {l: 1, h: -1}, {l: 1, h: 0}, {l: 1, h: 1}], flipped: true}

		return generateEquivalents({
			...getMetrics({
				width: window.innerWidth,
				height: window.innerHeight,
				theta: currentPlaneGroup.theta,
				aspect: currentPlaneGroup.aspect,
				flipped: currentPlaneGroup.flipped,
				locus: {
					X: window.innerWidth / 2,
					Y: window.innerHeight / 2,
				},
				currentPlaneGroup,
				nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: {}}),
				previousPlaneGroups: {},
				transitionPoint: undefined,
				lastLocusUpdate: Date.now(),
				transitionStartTime: undefined,
				previousPlaneGroup: undefined,
				lchs: [{}],
			}),
			showCircles: showCirclesRef.current,
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
		const transitionInterval = setInterval(() => dispatch({type: "CALCULATE_TRANSITION"}), 17000); // 7sec transition period

		// keypress toggle of view
		const handleKeyPress = e => showCirclesRef.current = !showCirclesRef.current;

		window.addEventListener("keydown", handleKeyPress);

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
			window,removeEventListener("keydown", handleKeyPress);
			clearInterval(transitionInterval);
		};
	}, []); // Empty dependency array to ensure this effect only runs once

	useEffect(() => {
		animationFrameRef.current = requestAnimationFrame(() => dispatch({type: "ANIMATE"}));

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus, transitionPoint]); // run every time we set a new locus or apply transition

	const delta = windowSize[flipped ? "width" : "height"] / 2 * Math.tan(theta);
	const cellArity = planeGroups[currentPlaneGroup.planeGroup].equivalents.length;

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			{(() => {  // circles mode
				if (!showCirclesRef.current) return null;

				if (flipped) return Array.from({length: maxCellLineY * 2 + 1}, (_, index) => index - maxCellLineY).map(offset => (y => <Line stroke="black" strokeWidth={0.3} key={`horizontal-${offset}`} points={[y, 0, y, windowSize.height]}/>)((windowSize.width / 2) + (offset * cellHeight)));

				return Array.from({length: maxCellLineY * 2 + 1}, (_, index) => index - maxCellLineY).map(offset => (y => <Line stroke="black" strokeWidth={0.3} key={`horizontal-${offset}`} points={[0, y, windowSize.width, y]}/>)((windowSize.height / 2) + (offset * cellHeight)));
			})()}

			{/* vertical axes */}
			{(() => {
				if (!showCirclesRef.current) return null;

				if (flipped) return Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[0, x - delta, windowSize.width, x + delta]}/>)((windowSize.height / 2) + (offset * cellWidth)));

				return Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x + delta, 0, x - delta, windowSize.height]}/>)((windowSize.width / 2) + (offset * cellWidth)));
			})()}

			{/* cells */}
			{showCirclesRef.current ? null : cells.map((points, index) => points ? <Line key={`line-${index}`} points={points} closed fill={getColor(lchs[index % cellArity])} stroke="black"/> : null)}

			{/* symmetry equivalent points of locus */}
			{showCirclesRef.current ? equivalents.map(([X, Y], index) => <Circle key={`circle-${index}`} x={X} y={Y} radius={10} fill={getColor(lchs[index % cellArity])}/>) : null}
		</Layer>
	</Stage>
};
