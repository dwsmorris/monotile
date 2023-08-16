import React, {useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";

const timeToSync = 200; //ms

const multiplyMatrix = ([a1, b1, c1, d1, e1, f1, g1, h1, i1], [a2, b2, c2, d2, e2, f2, g2, h2, i2]) => {
	return [
		a1*a2 + b1*d2 + c1*g2, a1*b2 + b1*e2 + c1*h2, a1*c2 + b1*f2 + c1*i2,
		d1*a2 + e1*d2 + f1*g2, d1*b2 + e1*e2 + f1*h2, d1*c2 + e1*f2 + f1*i2,
		g1*a2 + h1*d2 + i1*g2, g1*b2 + h1*e2 + i1*h2, g1*c2 + h1*f2 + i1*i2,
	];
};
const transformVector = ([a, b, c, d, e, f, g, h, i]) => ([x, y, w = 1]) => [a*x + b*y + c*w, d*x + e*y + f*w];

const getMetrics = windowSize => {
	const maxX = windowSize.width / windowSize.height;
	const maxCellLineX = Math.floor(maxX);
	const halfWidth = windowSize.width / 2;
	const halfHeight = windowSize.height / 2;
	const getEquivalents = ({X, Y}) => {
		const toCoordinates = multiplyMatrix([
			1 / halfHeight, 0, 0,
			0, 1 / halfHeight, 0,
			0, 0, 1,
		], [
			1, 0, -halfWidth,
			0, 1, -halfHeight,
			0, 0, 1,
		]);
		const fromCoordinates = multiplyMatrix([
			1, 0, halfWidth,
			0, 1, halfHeight,
			0, 0, 1,
		], [
			halfHeight, 0, 0,
			0, halfHeight, 0,
			0, 0, 1,
		]);
		const [x, y] = transformVector(toCoordinates)([X, Y]).map(coordinate => {
			while (coordinate < 0) coordinate += 1;
			while (coordinate > 1) coordinate -= 1;

			return coordinate;
		});
		const symmetryEquivalents = [[x, y]]; // TODO: for other symmetry groups
		const equivalents = Array.from({length: maxCellLineX * 2 + 2}, (_, index) => index - maxCellLineX - 1).flatMap(xOffset => [0, -1].flatMap(
			yOffset => symmetryEquivalents.map(([x, y]) => [x + xOffset, y + yOffset])
		)).map(transformVector(fromCoordinates));

		return equivalents;
	};

	return {windowSize, maxCellLineX, getEquivalents};
};
const generateEquivalents = state => {
	const {locus, getEquivalents} = state;

	return {
		...state,
		equivalents: getEquivalents(locus),
	};
};

export default () => {
	const [{windowSize, maxCellLineX, equivalents, locus}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return generateEquivalents({...state, ...getMetrics(action.payload)});
			case "LOCUS": return generateEquivalents({...state, locus: action.payload});
		}

		return state;
	}, generateEquivalents({
		...getMetrics({
			width: window.innerWidth,
			height: window.innerHeight,
		}),
		locus: {
			X: window.innerWidth / 2,
			Y: window.innerHeight / 2,
			time: Date.now(),
		},
	}));
	const targetRef = useRef({X: windowSize.width / 2, Y: windowSize.height / 2, time: Date.now()});
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

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []); // Empty dependency array to ensure this effect only runs once

	useEffect(() => {
		const animateLocus = () => {
			const currentTime = Date.now();
			const delta = Math.min((currentTime - locus.time) / timeToSync, 1);

			// calculate the current position based on the progress
			dispatch({
				type: "LOCUS",
				payload: {
					X: (locus.X * (1 - delta)) + targetRef.current.X * delta,
					Y: (locus.Y * (1 - delta)) + targetRef.current.Y * delta,
					time: currentTime,
				},
			});
		};

		animationFrameRef.current = requestAnimationFrame(animateLocus);

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus]); // run every time we set a new locus

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
