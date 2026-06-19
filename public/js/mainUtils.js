// Adds client-side search filtering for card elements
function enableSearch(searchBar, cardSelector, datasetFields) {
	searchBar.addEventListener('input', function () {
		const query = this.value.trim().toLowerCase();

		document.querySelectorAll(cardSelector).forEach((card) => {
			const match = datasetFields.some((field) => {
				const value = card.dataset[field] || '';
				return value.includes(query);
			});

			card.classList.toggle('d-none', !match); // Hide or show based on search match
		});
	});
}

// Renders a dynamic form into an overlay with customizable fields, buttons, and animations
function renderDynamicForm({
	overlayId,
	contentSelector,
	clearTargetId,
	animationSelector,
	formTitle,
	descriptionText = '',
	formId,
	fields = [],
	buttons = [],
	submitCallback,
}) {
	// Grab overlay and content container
	const overlay = document.getElementById(overlayId);
	const contentDiv = document.getElementById(clearTargetId);
	if (!overlay || !contentDiv) {
		console.error('Missing overlay elements');
		return;
	}

	// Build form HTML dynamically
	contentDiv.innerHTML = `
        <h4 class="mb-2">${formTitle}</h4>
        ${descriptionText ? `<p>Description: ${descriptionText}</p>` : ''}
        <form id="${formId}" class="mt-3">
        ${fields
					.map((field) => {
						if (field.type === 'static') {
							// For static text lines
							return `<p>${field.label} ${field.value}</p>`;
						} else if (field.type === 'static text') {
							// For large static blocks
							return `
                <p>${field.label}</p>
                <div class="scrollable-block">${field.value}</div>
            `;
						} else if (field.type === 'textarea') {
							// For multi-line text input
							return `
                <label for="${field.name}" class="form-label">${field.label}</label>
                <textarea id="${field.name}" name="${field.name}" class="form-control mb-3" rows="${field.rows || 4}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>
            `;
						} else {
							// For standard input fields
							return `
                <label for="${field.name}" class="form-label">${field.label}</label>
                <input type="${field.type}" id="${field.name}" name="${field.name}" class="form-control mb-3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />
            `;
						}
					})
					.join('')}
        <div class="d-flex justify-content-between align-items-center">
            ${buttons
							.map(
								(btn) => `
            <button type="${btn.type}" id="${btn.id}" class="${btn.className}">${btn.text}</button>
            `
							)
							.join('')}
        </div>
        </form>
    `;

	// Bind button events (especially overlay close buttons)
	buttons.forEach((btn) => {
		if (btn.closeOverlay) {
			document.getElementById(btn.id)?.addEventListener('click', () => {
				closeOverlay(overlayId, contentSelector, clearTargetId);
			});
		}
	});

	// Bind form submit callback if provided
	if (submitCallback) {
		document.getElementById(formId)?.addEventListener('submit', submitCallback);
	}

	// Show overlay and trigger animation
	overlay.classList.remove('d-none');
	triggerPaperAnimation(animationSelector);
}

// Creates a list of cards in a given container using the provided configuration
function createCardList(container, data, config) {
	if (!container) {
		console.error('createCardList error: container is null or missing');
		return;
	}

	const {
		datasetFields,
		displayFn,
		onClickFn,
		cardClass,
		innerCardClass = '',
		enableClick = true,
	} = config;

	// Clear container before rendering
	container.innerHTML = '';

	// Build card elements
	data.forEach((item) => {
		const wrapper = document.createElement('div');
		wrapper.className =
			`col-xl-4 col-lg-4 col-md-6 col-sm-12 col-xs-12 p-3 ${cardClass || ''}`.trim();
		datasetFields.forEach((field) => {
			wrapper.dataset[field] = String(item[field] || '').toLowerCase();
		});

		const card = document.createElement('div');
		card.className = `card ${innerCardClass}`.trim();
		card.innerHTML = displayFn(item);

		// Attach click event if enabled
		if (enableClick && onClickFn) {
			card.addEventListener('click', () => onClickFn(item));
		}

		wrapper.appendChild(card);
		container.appendChild(wrapper);
	});
}

// Dynamically generates Bootstrap tabs and content panels from configuration
function generateTabs(tabsConfig, containerSelector, options = {}) {
	const container = document.querySelector(containerSelector);
	if (!container) return;

	// Clear target container
	container.innerHTML = '';

	// Build tab navigation
	const tabNav = document.createElement('ul');
	tabNav.className = 'nav nav-tabs justify-content-center';
	tabNav.setAttribute('role', 'tablist');
	if (options.tabNavId) {
		tabNav.id = options.tabNavId;
	}

	const tabContent = document.createElement('div');
	tabContent.className = 'tab-content';

	// Loop through each tab config
	tabsConfig.forEach((tab, index) => {
		const li = document.createElement('li');
		li.className = 'nav-item';
		li.setAttribute('role', 'presentation');

		const button = document.createElement('button');
		button.className = `nav-link ${index === 0 ? 'active' : ''}`;
		button.id = `${tab.id}-tab`;
		button.setAttribute('data-bs-toggle', 'tab');
		button.setAttribute('data-bs-target', `#${tab.id}`);
		button.setAttribute('type', 'button');
		button.setAttribute('role', 'tab');
		button.setAttribute('aria-controls', tab.id);
		button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
		button.textContent = tab.title;

		li.appendChild(button);
		tabNav.appendChild(li);

		const tabPane = document.createElement('div');
		tabPane.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
		tabPane.id = tab.id;
		tabPane.setAttribute('role', 'tabpanel');
		tabPane.setAttribute('aria-labelledby', button.id);

		// Optional search bar
		const searchBarHTML =
			tab.searchId && tab.searchPlaceholder
				? `
      <div class="row justify-content-center mb-3">
        <input type="text" id="${tab.searchId}" class="form-control text-center col-12 col-md-6 mt-2" placeholder="${tab.searchPlaceholder}" />
      </div>`
				: '';

		// Optional overlay
		const overlayHTML = tab.overlayId
			? `
      <div id="${tab.overlayId}" class="report-overlay d-none">
        <div class="${tab.overlayContentClass}">
          <div id="${tab.contentId}"></div>
        </div>
      </div>`
			: '';

		// Populate tab content
		tabPane.innerHTML = `
      ${searchBarHTML}
      <div class="row" id="${tab.listId}"></div>
      ${overlayHTML}
    `;

		tabContent.appendChild(tabPane);
	});

	container.appendChild(tabNav);
	container.appendChild(tabContent);
}

// Triggers an animated confetti overlay with a message
function showConfettiOverlay(message = 'Action Complete!') {
	const overlay = document.getElementById('confettiOverlay');
	const canvas = document.getElementById('confettiCanvas');
	const text = document.getElementById('confettiMessage');

	if (!overlay || !canvas || !text) return;

	const ctx = canvas.getContext('2d');

	// Fixed canvas size for confetti effect
	const canvasW = 800;
	const canvasH = 600;
	canvas.width = canvasW;
	canvas.height = canvasH;

	text.textContent = message;

	// Trigger pop animation on text
	text.classList.remove('animate-pop');
	void text.offsetWidth; // Force reflow to restart animation
	text.classList.add('animate-pop');

	// Show overlay
	overlay.classList.remove('d-none');

	// Generate confetti particles
	const confetti = [];
	const colors = ['#fce94f', '#fc5c65', '#58b19f', '#9c88ff', '#f8c291'];

	for (let i = 0; i < 100; i++) {
		const fromLeft = i < 50;
		confetti.push({
			x: fromLeft ? 0 : canvasW,
			y: canvasH,
			vx: fromLeft ? Math.random() * 6 + 2 : -Math.random() * 6 - 2,
			vy: -Math.random() * 10 - 6,
			r: Math.random() * 3 + 2,
			c: colors[Math.floor(Math.random() * colors.length)],
			rot: Math.random() * 360,
			spin: Math.random() * 10 - 5,
		});
	}

	let animationFrameId;

	// Draw confetti animation loop
	function drawConfetti() {
		ctx.clearRect(0, 0, canvasW, canvasH);
		confetti.forEach((p) => {
			p.x += p.vx;
			p.y += p.vy;
			p.vy += 0.3;
			p.rot += p.spin;

			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate((p.rot * Math.PI) / 180);
			ctx.fillStyle = p.c;
			ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
			ctx.restore();
		});
		animationFrameId = requestAnimationFrame(drawConfetti);
	}

	drawConfetti();

	// Auto-hide overlay and clean up after 2 seconds
	setTimeout(() => {
		cancelAnimationFrame(animationFrameId);
		overlay.classList.add('d-none');
		ctx.clearRect(0, 0, canvasW, canvasH);
	}, 2000);
}

function getCachedUserId() {
	const id = Number(sessionStorage.getItem('currentUserId'));
	return Number.isFinite(id) && id > 0 ? id : null;
}

function fetchCurrentUserId(callback) {
	const cachedId = getCachedUserId();
	if (cachedId) {
		callback(cachedId);
		return;
	}

	if (!token) return;

	fetchMethod(`${currentUrl}/api/users/userData`, (status, data) => {
		const id = status === 200 ? Number(data?.user_data?.[0]?.id) : NaN;
		if (Number.isFinite(id) && id > 0) {
			sessionStorage.setItem('currentUserId', String(id));
			callback(id);
		}
	}, 'GET', null, token);
}
