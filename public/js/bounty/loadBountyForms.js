// Trigger overlay open animation
function triggerPaperAnimation(targetSelector) {
	const contentBox = document.querySelector(targetSelector);
	if (!contentBox) return;

	contentBox.classList.remove('paper-animate', 'paper-close'); // Reset previous animation
	contentBox.getBoundingClientRect(); // Force reflow
	contentBox.classList.add('paper-animate'); // Start animation
}

// Close overlay with animation
function closeOverlay(overlayId, contentSelector, clearTargetId) {
	const overlay = document.getElementById(overlayId);
	const content = overlay.querySelector(contentSelector);
	const clearTarget = document.getElementById(clearTargetId);

	if (!overlay || !content || !clearTarget) return;

	content.classList.remove('paper-animate');
	content.classList.add('paper-close');

	// Wait for animation before hiding
	setTimeout(() => {
		overlay.classList.add('d-none');
		content.classList.remove('paper-close');
		clearTarget.innerHTML = '';
	}, 500);
}

// Add close button to overlay
function addCloseButton(overlayId, contentSelector, clearTargetId) {
	const overlay = document.getElementById(overlayId);
	const content = overlay.querySelector(contentSelector);
	const clearTarget = document.getElementById(clearTargetId);

	if (!overlay || !content || !clearTarget) return;
	if (content.querySelector('.overlay-close-button')) return; // Avoid duplicates

	const btn = document.createElement('button');
	btn.className = 'overlay-close-button btn btn-danger btn-sm';
	btn.textContent = 'x';
	btn.style.position = 'absolute';
	btn.style.top = '10px';
	btn.style.right = '10px';
	btn.style.zIndex = '1001';
	btn.title = 'Close';

	btn.addEventListener('click', () => {
		closeOverlay(overlayId, contentSelector, clearTargetId);
	});

	content.appendChild(btn);
}

// Show error overlay with message
function showErrorOverlay(overlayId, contentSelector, clearTargetId, message) {
	const overlay = document.getElementById(overlayId);
	const content = document.getElementById(clearTargetId);
	if (!overlay || !content) return;

	content.innerHTML = `<div class="alert alert-danger text-center">${message}</div>`;
	overlay.classList.remove('d-none');
	triggerPaperAnimation(`${overlayId} ${contentSelector}`);
}

// Initialize review logic
function initReviewLogic(reportId, token) {
	loadInitialReviewData(reportId, token);
	checkExistingReview(reportId, token);
	setupReviewStars();
	attachEventListeners(reportId, token);
}