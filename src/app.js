import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";
import getColor from "./get-color.js";
import getMetrics from './get-metrics.js';
import generateEquivalents from './generate-equivalents.js';
import chooseNextPlaneGroup from './choose-next-plane-group.js';
import getTheta from './get-theta.js';
import getAspect from "./get-aspect.js";
import planeGroups from "./plane-groups.js";
import {useDebouncedCallback} from "use-debounce";
import calculateTransition from "./calculate-transition.js";
import animate from "./animate.js";

const screensaverWait = 3000;
const cycleDuration = 7000;

// eslint-disable-next-line react/display-name
export default () => {
	const targetRef = useRef({X: Math.random() * window.innerWidth, Y: Math.random() * window.innerHeight}); // start towards a random point
	const locusVelocityRef = useRef();
	const resetScreensaverTimer = useDebouncedCallback(() => locusVelocityRef.current = [0, 0], screensaverWait);
	const showCirclesRef = useRef(false);
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
		aspect, // sqrt(0.5-2)
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
			case "WINDOW_SIZE": return generateEquivalents({...getMetrics({...state, ...action.payload}), showCircles: showCirclesRef.current});
			case "CALCULATE_TRANSITION": return calculateTransition(state);
			case "ANIMATE": return animate({state, showCirclesRef, locusVelocityRef, targetRef});
		}

		return state;
	}, undefined, () => {
		const currentPlaneGroup = {planeGroup: "p1", theta: getTheta("p1"), aspect: getAspect("p1"), lchs: [{}]}; // dummy mappings to check cell arity
		// const currentPlaneGroup = {planeGroup: "p3", theta: getTheta("p3"), aspect: getAspect("p3"), lchs: [{h: -1}, {h : 0}, {h : 1}], flipped: true};
		// const currentPlaneGroup = {planeGroup: "p6", theta: getTheta("p6"), aspect: getAspect("p6"), lchs: [{l: -1, h: -1}, {l: -1, h: 0}, {l: -1, h: 1}, {l: 1, h: -1}, {l: 1, h: 0}, {l: 1, h: 1}], flipped: true}
		// const currentPlaneGroup = {planeGroup: "p31m", theta: getTheta("p31m"), aspect: getAspect("p31m"), lchs: [{l: -1, h: -1}, {l: -1, h: 0}, {l: -1, h: 1}, {l: 1, h: -1}, {l: 1, h: 0}, {l: 1, h: 1}], flipped: true};

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
		const transitionInterval = setInterval(() => dispatch({type: "CALCULATE_TRANSITION"}), cycleDuration); // 7sec transition period

		// keypress toggle of view
		const handleKeyPress = () => showCirclesRef.current = !showCirclesRef.current;

		window.addEventListener("keydown", handleKeyPress);

		// initialize screensaver timeout
		resetScreensaverTimer();

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener("keydown", handleKeyPress);
			clearInterval(transitionInterval);
		};
	}, []); // Empty dependency array to ensure this effect only runs once

	useEffect(() => {
		animationFrameRef.current = requestAnimationFrame(() => dispatch({type: "ANIMATE"}));

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus, transitionPoint]); // run every time we set a new locus or apply transition

	const delta = windowSize[flipped ? "width" : "height"] / 2 * Math.tan(theta);
	const cellArity = planeGroups[currentPlaneGroup.planeGroup].equivalents.length;

	return <>
		<Stage
			width={windowSize.width}
			height={windowSize.height}
			onPointerMove={e => {
				targetRef.current = {X: e.evt.clientX, Y: e.evt.clientY};
				locusVelocityRef.current = undefined;
				resetScreensaverTimer();
			}}
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

		{/* plane group label */}
		<div className="plane-group-label">{currentPlaneGroup.planeGroup}</div>
	</>;
};
