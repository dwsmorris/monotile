import React, {useState, useEffect} from 'react';
import styled from "styled-components";

const StyledSvg = styled.svg`
	> circle {
		fill: red;
	}
	> line.axis {
		stroke: black;
		stroke-width: 0.3;
	}
`;
const maxY = 100;

export default () => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});
	const aspect = windowSize.width / windowSize.height;
	const maxX = aspect * maxY;
	const maxCellLineX = Math.floor(maxX / 100);

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


	return <StyledSvg
		className="svg"
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100vh"
		viewBox={`${-maxX} ${-maxY} ${2 * maxX} ${2 * maxY}`}>

		{/* horizontal axes */}
		{[0].map(offset => <line className="axis" key={`horizontal-${offset}`} x1={-maxX} y1={offset * 100} x2={maxX} y2={offset * 100}/>)}

		{/* vertical axes */}
		{Array.from({length: maxCellLineX * 2 + 1}, (_, index) => index - maxCellLineX).map(offset => <line className="axis" key={`vertical-${offset}`} x1={offset * 100} y1={-maxY} x2={offset * 100} y2={maxY}/>)}

		<circle cx="0" cy="0" r="3"/>
	</StyledSvg>;
};
