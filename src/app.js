import React, {useState, useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";

const timeToSync = 200; //ms

const getMetrics = windowSize => {
	const maxX = windowSize.width / windowSize.height;
	const maxCellLineX = Math.floor(maxX);
	const halfWidth = windowSize.width / 2;
	const halfHeight = windowSize.height / 2;
	const getEquivalents = ([x, y]) => {
		const toCoordinates = multiplyMatrix([
			[1 / halfHeight, 0, 0],
			[0, 1 / halfHeight, 0],
			[0, 0, 1],
		], [
			[1, 0, -halfWidth],
			[0, 1, -halfHeight],
			[0, 0, 1],
		]);
	};

	return {windowSize, maxCellLineX};
};

export default () => {
	const [{windowSize, maxCellLineX, X2x}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return {...state, ...getMetrics(action.payload)};
		}

		return state;
	}, getMetrics({
		width: window.innerWidth,
		height: window.innerHeight,
	}));
	const [locus, setLocus] = useState({
		X: windowSize.width / 2,
		Y: windowSize.height / 2,
		time: Date.now(),
	});
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
			setLocus({
				X: (locus.X * (1 - delta)) + targetRef.current.X * delta,
				Y: (locus.Y * (1 - delta)) + targetRef.current.Y * delta,
				time: currentTime,
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

			<Circle x={locus.X} y={locus.Y} radius={10} fill="red"/>
		</Layer>
	</Stage>
};
