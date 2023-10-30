
export default coordinate => {
	while (coordinate < 0) coordinate += 1;
	while (coordinate > 1) coordinate -= 1;

	return coordinate;
};