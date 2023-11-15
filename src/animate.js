import getTransitionDetails from "./get-transition-details.js";
import getLchs from "./get-lchs.js";
import chooseNextPlaneGroup from "./choose-next-plane-group.js";
import getMetrics from "./get-metrics.js";
import generateEquivalents from "./generate-equivalents.js";
import getAngleBetweenPoints from "./get-angle-between-points.js";
import applyAnimation from "./apply-animation.js";

const slow = false;

const transitionDuration = slow ? 10000 : 1000; // ms

export default ({state, showCirclesRef, locusVelocityRef, targetRef}) => {
	const ms = Date.now();

	if (state.transitionStart) {
		const offset = ms - state.transitionStart.ms;
		const progress = Math.min((offset / transitionDuration) * 2 - 1, 1);
		const magProgress = Math.abs(progress);
		const locus = {
			X: (state.transitionStart.locus.X * magProgress) + (state.transitionPoint[0] * (1 - magProgress)),
			Y: (state.transitionStart.locus.Y * magProgress) + (state.transitionPoint[1] * (1 - magProgress)),
		};
		const planeGroup1 = state.previousPlaneGroup || state.currentPlaneGroup;
		const planeGroup2 = state.nextPlaneGroup || state.currentPlaneGroup;
		const transitionDetails = getTransitionDetails({planeGroup1,  planeGroup2, progress});
		const lchs = getLchs({planeGroup1, planeGroup2, progress});
		const updatedState = {
			...state,
			locus,
			lastLocusUpdate: ms,
			...transitionDetails,
			lchs,
			...(((progress > 0) && !state.previousPlaneGroup) ? {
				previousPlaneGroups: {
					...state.previousPlaneGroups,
					[state.currentPlaneGroup.planeGroup]: (state.previousPlaneGroups[state.currentPlaneGroup.planeGroup] || 0) + 1,
				},
				previousPlaneGroup: state.currentPlaneGroup,
				currentPlaneGroup: state.nextPlaneGroup,
				flipped: state.nextPlaneGroup.flipped,
				mirrors: state.nextPlaneGroup.mirrors,
				mirrorConfiguration: state.nextPlaneGroup.mirrorConfiguration,
				nextPlaneGroup: undefined,
			} : {}),
			...((progress === 1) ? (() => {
				const currentPlaneGroup = {
					...state.currentPlaneGroup,
					lchs,
				};

				return {
					transitionStart: undefined,
					previousPlaneGroup: undefined,
					nextPlaneGroup: chooseNextPlaneGroup({currentPlaneGroup, previousPlaneGroups: state.previousPlaneGroups}),
					currentPlaneGroup,
				};
			})() : {}),
		};
		const metrics = getMetrics(updatedState);

		return generateEquivalents({...metrics, showCircles: showCirclesRef.current});
	} else {
		// if in screensaver mode, perturb the target
		if (locusVelocityRef.current) (() => {
			const newVelocity = locusVelocityRef.current.map(velocity => velocity + 0.2 * (Math.random() - 0.5) - 0.01 * velocity);
			const newTarget = {X: targetRef.current.X + locusVelocityRef.current[0], Y: targetRef.current.Y + locusVelocityRef.current[1]};

			// if there are mirrors in operation, check if we've crossed a mirror - and if so, clear screensaver velocity and don't apply it
			const {activeMirrors, mirrorConfiguration} = state.currentPlaneGroup;

			if (activeMirrors) {
				const newMirrorConfiguration = activeMirrors.map(getAngleBetweenPoints([newTarget.X, newTarget.Y]));

				if (!mirrorConfiguration.every((config, index) => config === newMirrorConfiguration[index])) {
					locusVelocityRef.current = [0, 0];
					return;
				}
			}

			locusVelocityRef.current = newVelocity;
			targetRef.current = newTarget;
		})();

		return applyAnimation({state, attractor: targetRef.current, ms, showCircles: showCirclesRef.current});
	}
};