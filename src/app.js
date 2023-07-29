import React, {useState, useEffect} from 'react';
import styled from "styled-components";

const StyledSvg = styled.svg`
	> circle {
		fill: red;
	}
`;
const maxY = 200;

export default () => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});
	const aspect = windowSize.width / windowSize.height;
	const maxX = aspect * maxY;

	useEffect(() => {
		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
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
		<circle cx="0" cy="0" r="5"/>
	</StyledSvg>;
};
