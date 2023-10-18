import getLchs from "./get-lchs.js";

export default ({planeGroup1, planeGroup2, progress}) => {
	return {
		theta: planeGroup2.getTheta({value1: planeGroup1.theta, value2: planeGroup2.theta, progress}),
		aspect: planeGroup2.getAspect({value1: planeGroup1.aspect, value2: planeGroup2.aspect, progress}),
		lchs: getLchs({planeGroup1, planeGroup2, progress}),
	};
};