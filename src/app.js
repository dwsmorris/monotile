import React, {useState, useEffect, useRef} from 'react';
import styled from "styled-components";
import {Stage, Layer, Circle, Line} from "react-konva";

const StyledSvg = styled.svg`
	> circle {
		fill: red;
	}
	> line.axis {
		stroke: black;
		stroke-width: 0.3;
	}
`;
const maxY = 1;

export default () => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});
	const halfHeight = windowSize.height / 2;
	const halfWidth = windowSize.width / 2;
	const [locus, setLocus] = useState({
		x: halfWidth,
		y: halfHeight,
	});
	const [isMouseDown, setIsMouseDown] = useState(false);
	const maxX = windowSize.width / windowSize.height;
	const maxCellLineX = Math.floor(maxX);
	const animationStartTimeRef = useRef(0);
	const targetRef = useRef({x: halfWidth, y: halfHeight});

	useEffect(() => {
		const handleResize = () => {
			// Use requestAnimationFrame to schedule the update
			requestAnimationFrame(() => {
				setWindowSize({
					width: window.innerWidth,
					height: window.innerHeight,
				});
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
		let animationFrameId;

		const animateLocus = () => {
			const currentTime = Date.now();
			const deltaTime = currentTime - animationStartTimeRef.current;
			const duration = 500; // 0.5secs

			if (deltaTime < duration) {
				// calculate the progress from 0 to 1
				const progress = deltaTime / duration;

				// calculate the current position based on the progress
				setLocus({
					x: locus.x + (targetRef.current.x - locus.x) * progress,
					y: locus.y + (targetRef.current.y - locus.y) * progress,
				});

				// continue animation
				animationFrameId = requestAnimationFrame(animateLocus);
			} else {
				setLocus({
					x: targetRef.current.x,
					y: targetRef.current.y,
				});
			}
		};

		if (isMouseDown) {
			animationStartTimeRef.current = Date.now();
			animationFrameId = requestAnimationFrame(animateLocus);
		}

		return () => cancelAnimationFrame(animationFrameId);
	}, [isMouseDown]);

	return <Stage
		width={windowSize.width}
		height={windowSize.height}
		onMouseDown={e => {targetRef.current = {x: e.evt.clientX, y: e.evt.clientY}; setIsMouseDown(true);}}
		onMouseUp={() => setIsMouseDown(false)}
		onMouseMove={e => {if (isMouseDown) {targetRef.current = {x: e.evt.clientX, y: e.evt.clientY};}}}
	>
		<Layer>
			{/* horizontal axis */}
			<Line points={[0, halfHeight, windowSize.width, halfHeight]} stroke="black" strokeWidth={0.3}/>

			{/* vertical axes */}
			{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line  stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x, 0, x, windowSize.height]}/>)(halfWidth + (offset * halfHeight)))}

			<Circle x={locus.x} y={locus.y} radius={10} fill="red"/>
		</Layer>
	</Stage>
};
