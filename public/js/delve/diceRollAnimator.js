/**
 * 3D dice roll animation from ThomasGRBT/dice-roll (GPL-3.0)
 * https://github.com/ThomasGRBT/dice-roll
 */
(function () {
	const FACE_ROTATIONS = {
		1: { x: 90, y: 0 },
		2: { x: 0, y: -90 },
		3: { x: 0, y: 0 },
		4: { x: 0, y: 180 },
		5: { x: 0, y: 90 },
		6: { x: -90, y: 0 },
	};

	const ARBITRARY_MAX_X_TURN_NUMBER = 4;
	const ARBITRARY_MAX_Y_TURN_NUMBER = 4;
	const ARBITRARY_MAX_NULL_TURN_NUMBER = 3;
	const ROLL_DURATION_MS = 1000;

	function randomMinMax(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	function clampFace(face) {
		return Math.min(6, Math.max(1, Number(face) || 1));
	}

	function getFaceRotation(face) {
		return FACE_ROTATIONS[clampFace(face)] || FACE_ROTATIONS[3];
	}

	function getInitialState() {
		return {
			lastNumber: 1,
			lastXRotation: 90,
			lastYRotation: 0,
		};
	}

	function buildTransform(x, y) {
		return `translateZ(calc(var(--dice-half) * -1)) rotateX(${x}deg) rotateY(${y}deg)`;
	}

	function computeThomasRotation(targetFace, state) {
		const randomNumber = clampFace(targetFace);
		let { lastNumber, lastXRotation, lastYRotation } = state;

		const rotationDirection = randomMinMax(0, 1) === 0 ? '-' : '';
		const randomXTurnsDegree = randomMinMax(1, ARBITRARY_MAX_X_TURN_NUMBER) * 360;
		const randomYTurnsDegree = randomMinMax(1, ARBITRARY_MAX_Y_TURN_NUMBER) * 360;

		let quarterXDegree = 90 + randomXTurnsDegree;
		let quarterYDegree = 90 + randomYTurnsDegree;
		const randomNullTurns = randomMinMax(0, ARBITRARY_MAX_NULL_TURN_NUMBER);
		const rotateFullTurnsOrNothing = randomNullTurns * 360;
		let halfYDegree = 180 + randomYTurnsDegree;

		let x = 0;
		let y = 0;

		switch (randomNumber) {
			case 1:
				if (randomNumber === lastNumber) {
					quarterXDegree = lastXRotation + 360;
				}
				x = quarterXDegree;
				y = rotationDirection === '-' ? -rotateFullTurnsOrNothing : rotateFullTurnsOrNothing;
				lastXRotation = quarterXDegree;
				lastYRotation = 0;
				break;
			case 2:
				if (randomNumber === lastNumber) {
					quarterYDegree = lastYRotation + 360;
				}
				x = rotationDirection === '-' ? -rotateFullTurnsOrNothing : rotateFullTurnsOrNothing;
				y = -quarterYDegree;
				lastXRotation = 0;
				lastYRotation = quarterYDegree;
				break;
			case 3:
				if (randomNumber === lastNumber) {
					quarterXDegree = lastXRotation + randomXTurnsDegree;
					quarterYDegree = lastYRotation + randomYTurnsDegree;
					x = quarterXDegree;
					y = quarterYDegree;
					lastXRotation = quarterXDegree;
					lastYRotation = quarterYDegree;
				} else {
					x = rotationDirection === '-' ? -rotateFullTurnsOrNothing : rotateFullTurnsOrNothing;
					y = rotationDirection === '-' ? -rotateFullTurnsOrNothing : rotateFullTurnsOrNothing;
					lastXRotation = 0;
					lastYRotation = 0;
				}
				break;
			case 4:
				if (randomNumber === lastNumber) {
					halfYDegree = lastYRotation + 360;
				}
				x = rotationDirection === '-' ? -rotateFullTurnsOrNothing : rotateFullTurnsOrNothing;
				y = halfYDegree;
				lastXRotation = 0;
				lastYRotation = halfYDegree;
				break;
			case 5:
				if (randomNumber === lastNumber) {
					quarterYDegree = lastYRotation + 360;
				}
				x = rotateFullTurnsOrNothing;
				y = quarterYDegree;
				lastXRotation = 0;
				lastYRotation = quarterYDegree;
				break;
			case 6:
				if (randomNumber === lastNumber) {
					quarterXDegree = lastXRotation + 360;
				}
				x = -quarterXDegree;
				y = rotateFullTurnsOrNothing;
				lastXRotation = quarterXDegree;
				lastYRotation = 0;
				break;
			default:
				break;
		}

		lastNumber = randomNumber;

		return {
			x,
			y,
			state: { lastNumber, lastXRotation, lastYRotation },
		};
	}

	function applyRotation(cubeElement, x, y, animate) {
		if (!cubeElement) return;
		cubeElement.classList.toggle('is-rolling', animate);
		cubeElement.style.transform = buildTransform(x, y);
	}

	let activeRollFinish = null;

	function rollToFace(cubeElement, gameFace, state, options = {}) {
		const speedMultiplier = Math.max(1, Number(options.speedMultiplier) || 1);
		const durationMs = ROLL_DURATION_MS / speedMultiplier;
		const { x, y, state: nextState } = computeThomasRotation(gameFace, { ...state });

		return new Promise((resolve) => {
			if (!cubeElement) {
				resolve({ x, y, state: nextState });
				return;
			}

			let completed = false;
			let timeoutId = null;

			const finishRoll = () => {
				if (completed) return;
				completed = true;
				if (activeRollFinish === finishRoll) {
					activeRollFinish = null;
				}
				if (timeoutId) window.clearTimeout(timeoutId);
				cubeElement.removeEventListener('transitionend', onEnd);
				cubeElement.classList.remove('is-rolling');
				cubeElement.style.transitionDuration = '';
				applyRotation(cubeElement, x, y, false);
				resolve({ x, y, state: nextState });
			};

			const onEnd = (event) => {
				if (event.propertyName !== 'transform') return;
				finishRoll();
			};

			activeRollFinish = finishRoll;
			cubeElement.style.transitionDuration = `${durationMs}ms`;
			cubeElement.addEventListener('transitionend', onEnd);
			applyRotation(cubeElement, x, y, true);

			timeoutId = window.setTimeout(finishRoll, durationMs + 150 / speedMultiplier);
		});
	}

	function snapToFace(cubeElement, gameFace, state) {
		const face = clampFace(gameFace);
		const { x, y } = getFaceRotation(face);
		applyRotation(cubeElement, x, y, false);
		return {
			x,
			y,
			state: {
				...state,
				lastNumber: face,
				lastXRotation: x,
				lastYRotation: y,
			},
		};
	}

	function skipActiveRoll() {
		if (typeof activeRollFinish === 'function') {
			activeRollFinish();
		}
	}

	window.DiceRollAnimator = {
		ROLL_DURATION_MS,
		getInitialState,
		getFaceRotation,
		applyRotation,
		rollToFace,
		snapToFace,
		skipActiveRoll,
	};
})();
