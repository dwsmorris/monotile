import React, {useState, useReducer, useEffect, useRef} from 'react';
import {Stage, Layer, Circle, Line} from "react-konva";

const maxY = 1;

const timeToSync = 200; //ms
export default () => {
	const [{windowSize}, dispatch] = useReducer((state, action) => {
		switch (action.type) {
			case "WINDOW_SIZE": return {...state, windowSize: action.payload};
		}

		return state;
	}, {
		windowSize: {
			width: window.innerWidth,
			height: window.innerHeight,
		},
	});
	const halfHeight = windowSize.height / 2;
	const halfWidth = windowSize.width / 2;
	const [locus, setLocus] = useState({
		x: halfWidth,
		y: halfHeight,
		time: Date.now(),
	});
	const maxX = windowSize.width / windowSize.height;
	const maxCellLineX = Math.floor(maxX);
	const targetRef = useRef({x: halfWidth, y: halfHeight, time: Date.now()});
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
				x: (locus.x * (1 - delta)) + targetRef.current.x * delta,
				y: (locus.y * (1 - delta)) + targetRef.current.y * delta,
				time: currentTime,
			});
		};

		animationFrameRef.current = requestAnimationFrame(animateLocus);

		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [locus]); // run every time we set a new locus

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseMove={e => targetRef.current = {x: e.evt.clientX, y: e.evt.clientY}}
	>
		<Layer>
			{/* horizontal axis */}
			<Line points={[0, halfHeight, windowSize.width, halfHeight]} stroke="black" strokeWidth={0.3}/>

			{/* vertical axes */}
			{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line	stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x, 0, x, windowSize.height]}/>)(halfWidth + (offset * halfHeight)))}

			<Circle x={locus.x} y={locus.y} radius={10} fill="red"/>
		</Layer>
	</Stage>
};
