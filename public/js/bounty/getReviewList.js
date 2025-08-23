// Stores the selected star rating (1–5)
let selectedRating = 0;

// Fetch all reviews for a report and render them
function fetchReviewsWithUserId(userId, reportId, token, containerSelector = '#inlineReviewList') {
	const callback = (status, payload) => {
		const reviews =
			status === 200
				? (Array.isArray(payload?.reviewList) ? payload.reviewList
				: Array.isArray(payload?.reviewData) ? payload.reviewData
				: [])
				: [];
		renderReviewCards(document.querySelector(containerSelector), reviews, userId, containerSelector, reportId, token);
	};
	fetchMethod(`${currentUrl}/api/review/reports/${reportId}`, callback, 'GET', null, token);
}

// Load current user data then their reviews
function loadInitialReviewData(reportId, token) {
	const callback = (status, userData) => {
		if (status !== 200 || !userData?.user_data?.[0]?.id) return console.error('Failed to load user data.');
		const userId = userData.user_data[0].id;
		fetchReviewsWithUserId(userId, reportId, token);
	};
	fetchMethod(`${currentUrl}/api/users/userData`, callback, 'GET', null, token);
}

// Reload reviews and re-render
function reloadReviews(containerSelector, reportId, token) {
	const callback = (status, userData) => {
		if (status !== 200 || !userData?.user_data?.[0]?.id) return;
		const userId = userData.user_data[0].id;
		fetchReviewsWithUserId(userId, reportId, token, containerSelector);
	};
	fetchMethod(`${currentUrl}/api/users/userData`, callback, 'GET', null, token);
}

// Handle review submit/update response
const handleSubmitReviewResponse = (reportId, token) => (resStatus, resData) => {
	const submitBtn = document.getElementById('submitReviewBtn');

	if (resStatus === 201) {
		const newReviewId = resData.results?.insertId || resData.insertId || resData.id || resData.createdReview.insertId;
		if (!submitBtn.dataset.reviewId && newReviewId) {
			submitBtn.dataset.reviewId = newReviewId;
		}
		submitBtn.textContent = 'Update Review';
		submitBtn.classList.replace('btn-primary', 'btn-warning');
		submitBtn.dataset.mode = 'update';
	}

	if (resStatus === 200 || resStatus === 201) {
		reloadReviews('#inlineReviewList', reportId, token);
		showNotif({ status: resStatus, message: resData.message });
	} else {
		showNotif({ status: resStatus, message: resData.message || 'Server error' });
	}
};

// Submit or update review
function submitReview(reportId, token, selectedRating, comment, mode, reviewId) {
	const payload = { rating: selectedRating, response: comment };
	const method = mode === 'update' ? 'PUT' : 'POST';
	const url = mode === 'update'
		? `${currentUrl}/api/review/${reviewId}`
		: `${currentUrl}/api/review/reports/${reportId}`;
	fetchMethod(url, handleSubmitReviewResponse(reportId, token), method, payload, token);
}

// Handle response when checking existing review
const handleCheckReviewResponse = () => (status, result) => {
	if (status !== 200 || !result.reviewedStatus || !result.review) return;

	const { rating, response, id: reviewId } = result.review;

	// Update stars
	const stars = document.querySelectorAll('#reviewStars .review-star');
	stars.forEach((s) => {
		const value = parseInt(s.dataset.value);
		s.classList.toggle('bi-star-fill', value <= rating);
		s.classList.toggle('bi-star', value > rating);
	});
	selectedRating = rating;

	// Fill comment box
	document.getElementById('reviewComment').value = response;

	// Switch to update mode
	const btn = document.getElementById('submitReviewBtn');
	btn.textContent = 'Update Review';
	btn.classList.replace('btn-primary', 'btn-warning');
	btn.dataset.mode = 'update';
	btn.dataset.reviewId = reviewId;

	setupReviewStars();
};

// Check if current user already reviewed
function checkExistingReview(reportId, token) {
	fetchMethod(`${currentUrl}/api/review/check/${reportId}`, handleCheckReviewResponse(reportId, token), 'GET', null, token);
}

// Handle delete review result
const handleDeleteReview = (containerSelector, reportId, token) => (status) => {
	if (status === 204) {
		resetReviewFormToSubmitMode();
		reloadReviews(containerSelector, reportId, token);
		showNotif({ status, message: 'Successfully deleted review' });
	} else {
		showNotif({ status, message: 'Failed to delete review' });
	}
};

// Bind review form buttons and tab switch
function attachEventListeners(reportId, token) {
	document.getElementById('submitReviewBtn')?.addEventListener('click', (event) => {
		const comment = document.getElementById('reviewComment').value.trim();
		const mode = event.target.dataset.mode;
		const reviewId = event.target.dataset.reviewId;
		if (selectedRating === 0 || comment === '') return showNotif({ message: "Please select a rating and write a comment" });
		submitReview(reportId, token, selectedRating, comment, mode, reviewId);
	});

	document.querySelector('#reviews-tab-inner')?.addEventListener('shown.bs.tab', () => {
		reloadReviews('#inlineReviewList', reportId, token);
		setupReviewStars();
	});
}

// Make stars clickable for rating selection
function setupReviewStars() {
	const stars = document.querySelectorAll('#reviewStars .review-star');
	if (!stars.length) return;
	stars.forEach((star) => {
		star.classList.remove('locked');
		star.style.cursor = 'pointer';
		star.addEventListener('click', () => {
			if (star.classList.contains('locked')) return;
			selectedRating = parseInt(star.dataset.value);
			stars.forEach((s) => {
				const value = parseInt(s.dataset.value);
				s.classList.toggle('bi-star-fill', value <= selectedRating);
				s.classList.toggle('bi-star', value > selectedRating);
			});
		});
	});
}

// Reset form to "Submit Review" state
function resetReviewFormToSubmitMode() {
	const submitBtn = document.getElementById('submitReviewBtn');
	if (submitBtn) {
		submitBtn.textContent = 'Submit Review';
		submitBtn.classList.replace('btn-warning', 'btn-primary');
		submitBtn.dataset.mode = 'create';
		delete submitBtn.dataset.reviewId;
	}
}

// Clear comment and reset stars
function resetReviewForm() {
	document.getElementById('reviewComment').value = '';
	document.querySelectorAll('#reviewStars .review-star').forEach((s) => {
		s.classList.remove('bi-star-fill');
		s.classList.add('bi-star');
	});
	selectedRating = 0;
	setupReviewStars();
}

// Render all review cards into the container
function renderReviewCards(container, reviews, userId, containerSelector, reportId, token) {
	if (!container) return;
	container.innerHTML = reviews.length === 0 ? `<div class="text-muted">No reviews yet.</div>` : '';

	reviews.forEach((review) => {
		const card = document.createElement('div');
		card.className = 'card mb-3 review-card-horizontal';
		const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
		const canDelete = review.user_id === userId;

		card.innerHTML = `
			<div class="row g-0">
				<div class="col-md-2 d-flex flex-column justify-content-center align-items-center bg-dark text-light">
					<h6 class="text-center m-0">User: ${review.username}</h6>
					<div class="text-warning fs-5">${stars}</div>
				</div>
				<div class="col-md-10">
					<div class="card-body">
						<p class="card-text mb-2">Response: ${review.response}</p>
						${canDelete ? `<button class="btn btn-sm btn-danger mt-2" data-review-id="${review.id}">Delete</button>` : ''}
					</div>
				</div>
			</div>
		`;

		if (canDelete) {
			card.querySelector('button').addEventListener('click', () => {
				const callback = handleDeleteReview(containerSelector, reportId, token);
				fetchMethod(`${currentUrl}/api/review/${review.id}`, callback, 'DELETE', null, token);
			});
		}

		container.appendChild(card);
	});
}
