import React from 'react';
import styled from "styled-components";

const StyledSvg = styled.svg`
	> circle {
		fill: red;
	}
`;

export default () => {
	return <StyledSvg
		className="svg"
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100vh"
		viewBox="0 0 100 100">
		<circle cx="50" cy="50" r="1"/>
	</StyledSvg>;
};
