
const colorCycleMs = 60000;
const luminance = [56, 64, 72];
const chroma = [23, 33, 43]
const hue = [-30, 0, 30];

export default ({hueIndex = 0, luminanceIndex = 0, chromaIndex = 0} = {}) => {
	const primaryHue = (Date.now() % colorCycleMs) / colorCycleMs * 360;
	const primaryColor = new Color();
	primaryColor.lchuv = [luminance[luminanceIndex + 1], chroma[chromaIndex + 1], (primaryHue + hue[hueIndex + 1] + 360) % 360];

	return primaryColor.hex;
};