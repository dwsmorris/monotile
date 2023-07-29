import React, {useState, useEffect} from 'react';
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
	const maxX = windowSize.width / windowSize.height;
	const maxCellLineX = Math.floor(maxX);
	const halfHeight = windowSize.height / 2;
	const halfWidth = windowSize.width / 2;

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

	return <Stage width={windowSize.width} height={windowSize.height}>
		<Layer>
			{/* horizontal axis */}
			<Line points={[0, halfHeight, windowSize.width, halfHeight]} stroke="black" strokeWidth={0.3}/>

			{/* vertical axes */}
			{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => (x => <Line  stroke="black" strokeWidth={0.3} key={`vertical-${offset}`} points={[x, 0, x, windowSize.height]}/>)(halfWidth + (offset * halfHeight)))}

			<Circle x={windowSize.width / 2} y={windowSize.height / 2} radius={10} fill="red"/>
		</Layer>
	</Stage>
};
