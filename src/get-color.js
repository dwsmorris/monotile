
const colorCycleMs = /*60000*/1000000000;
const luminance = [56, 72];
const chroma = [23, 43]
const hue = [-30, 30];

const getValue = ({range, index}) => {
	const proportion = (index + 1 / 2);

	return (proportion * range[1]) + ((1 - proportion) * range[0]);
};

export default ({h = 0, l = 0, c = 0} = {}) => {
	const primaryHue = (Date.now() % colorCycleMs) / colorCycleMs * 360;
	const primaryColor = new Color();
	primaryColor.lchuv = [getValue({range: luminance, index: l}), getValue({range: chroma, index: c}), (primaryHue + getValue({range: hue, index: h}) + 360) % 360];

	return primaryColor.hex;
};