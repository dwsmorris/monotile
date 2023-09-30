
const colorCycleMs = 60000;
const luminance = [56, 64, 72];
const chroma = [23, 33, 43]
const hue = [-30, 0, 30];

export default ({h = 0, l = 0, c = 0} = {}) => {
	const primaryHue = (Date.now() % colorCycleMs) / colorCycleMs * 360;
	const primaryColor = new Color();
	primaryColor.lchuv = [luminance[l + 1], chroma[c + 1], (primaryHue + hue[h + 1] + 360) % 360];

	return primaryColor.hex;
};