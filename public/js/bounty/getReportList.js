// Load reports into cards with search
function loadReportList(data) {
	const reportList = document.getElementById('reportList');
	const searchBar = document.getElementById('searchBarReport');

	// Guard: bad/empty data
	if (!Array.isArray(data)) {
		reportList.innerHTML = `<div class="text-danger text-center">Failed to load reports.</div>`;
		return;
	}
	if (data.length === 0) {
		reportList.innerHTML = `<div class="text-muted text-center">No reports submitted yet.</div>`;
		return;
	}

	// Render report cards (newest first)
	createCardList(reportList, [...data].reverse(), {
		datasetFields: ['id', 'details', 'vulnType', 'reporter_username', 'solution'],
		cardClass: 'report-card',
		innerCardClass: 'bounty-card clickable-card',
		enableClick: true,
		displayFn: (report) => `
			<div class="card-body" role="button" tabindex="0">
				<h5 class="card-title">Report #${report.id} - ${report.vulnType}</h5>
				<p class="card-text mb-1">Submitter: ${report.username}</p>
				<p class="card-text mb-1">Status: ${report.status ? 'Closed' : 'Open'}</p>
			</div>`,
		onClickFn: (report) => loadReportForm(report.id, token),
	});

	// Wire search
	enableSearch(searchBar, '.report-card', ['id', 'details', 'vulnType', 'reporter_username', 'solution']);
}

// Submit a new report for a vulnerability
function handleSubmitNewReport(vulnId) {
	return function (e) {
		e.preventDefault();

		const payload = {
			vulnerability_id: vulnId,
			details: document.getElementById('details').value,
		};

		const callback = (status, data) => {
			showNotif({ status, message: data.report.message });

			// Close overlay and refresh list, then switch to Reports tab
			if (status === 201) {
				setTimeout(() => {
					closeOverlay('vulnOverlay', '.vul-overlay-content', 'vulnContent');
					reloadReportList();
					const tabTrigger = document.querySelector('[data-bs-target="#report"]');
					if (tabTrigger) bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
					history.replaceState(null, null, '#report');
				}, 0);
			}
		};

		fetchMethod(`${currentUrl}/api/reports`, callback, 'POST', payload, token);
	};
}

// Open report overlay (and reviews if closed)
function loadReportForm(reportId, token) {
	const callback = (status, reportData) => {
		if (status !== 200) {
			return showErrorOverlay('reportOverlay', '.report-overlay-content', 'reportContent', 'Failed to load report info.');
		}

		const data = Array.isArray(reportData.reportData) ? reportData.reportData[0] : reportData;
		const isClosed = data.status === 1;
		const reportContent = document.getElementById('reportContent');
		reportContent.innerHTML = '';

		// Add tabs for closed reports
		if (isClosed) {
			insertTabs(reportContent);
			initReviewLogic(reportId, token);
		}

		// Build dynamic form
		const fields = getReportFields(data, isClosed);
		const buttons = getReportButtons(isClosed);
		const clearTargetId = isClosed ? setupTempContainer(reportContent) : 'reportContent';

		renderDynamicForm({
			overlayId: 'reportOverlay',
			contentSelector: '.report-overlay-content',
			clearTargetId,
			animationSelector: '#reportOverlay .report-overlay-content',
			formTitle: `Manage Report #${data.id}`,
			formId: 'manageReportForm',
			fields,
			buttons,
			submitCallback: handleSubmitReportUpdate(data),
		});

		addCloseButton('reportOverlay', '.report-overlay-content', clearTargetId);

		// Move the form inside the Report tab pane (when tabs exist)
		setTimeout(() => {
			const formBlock = document.querySelector('#reportContent form');
			const tabTarget = document.getElementById('reportFormContainer');
			if (formBlock && tabTarget) tabTarget.appendChild(formBlock);
		}, 50);
	};

	fetchMethod(`${currentUrl}/api/reports/${reportId}`, callback, 'GET', null, token);
}

// Close a report (PUT status/solution)
function handleSubmitReportUpdate(data) {
	return function (e) {
		e.preventDefault();

		const solution = document.getElementById('solution')?.value || '';
		const payload = { status: 1, solution };

		const callback = (status, res) => {
			showNotif({ status, message: res.report.message });
			if (status === 200 || status === 201) {
				closeOverlay('reportOverlay', '.report-overlay-content', 'reportContent');
				reloadReportList();
			}
		};

		fetchMethod(`${currentUrl}/api/reports/${data.id}`, callback, 'PUT', payload, token);
	};
}

// Inject inner tabs (Report / Reviews)
function insertTabs(container) {
	const tabsHTML = `
    <ul class="nav nav-tabs justify-content-center" id="reportInnerTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="report-tab-inner" data-bs-toggle="tab" data-bs-target="#report-pane-inner" type="button" role="tab">Report</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="reviews-tab-inner" data-bs-toggle="tab" data-bs-target="#reviews-pane-inner" type="button" role="tab">Reviews</button>
      </li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="report-pane-inner" role="tabpanel">
        <div id="reportFormContainer" class="overflow-auto" style="max-height: 60vh;"></div>
      </div>
      <div class="tab-pane fade" id="reviews-pane-inner" role="tabpanel">
        <div class="overflow-auto" style="max-height: 60vh;">
          <div class="px-3">
            <h6 class="mt-2">Leave Your Review:</h6>
            <div id="reviewFormSection" class="mb-3">
              <div class="d-flex align-items-center mb-2">
                <span class="me-2">Rating:</span>
                <div id="reviewStars">
                  ${[1,2,3,4,5].map(i => `<i class="bi bi-star review-star" data-value="${i}" style="cursor: pointer;"></i>`).join('')}
                </div>
              </div>
              <textarea id="reviewComment" class="form-control mb-2" placeholder="Write your review..." rows="3"></textarea>
              <button id="submitReviewBtn" class="btn btn-primary btn-sm">Submit Review</button>
            </div>
            <hr />
            <div id="inlineReviewList" class="row"></div>
          </div>
        </div>
      </div>
    </div>
  `;
	container.insertAdjacentHTML('beforeend', tabsHTML);
}

// Build form fields for open/closed states
function getReportFields(data, isClosed) {
	const fields = [
		{ type: 'static', label: 'Vulnerability Type:', value: data.vulnType },
		{ type: 'static', label: 'Submitted By:', value: data.reporter_username },
		{ type: 'static', label: 'Status:', value: isClosed ? 'Closed' : 'Open' },
		{ type: 'static text', label: 'Details:', value: data.details },
	];

	if (isClosed) {
		fields.push({ type: 'static text', label: 'Solution:', value: data.solution || '(No solution provided)' });
		fields.push({ type: 'static', label: 'Closed By:', value: data.closer_username });
	} else {
		fields.push({
			name: 'solution',
			label: 'Modify Solution:',
			type: 'textarea',
			required: false,
			rows: 6,
			placeholder: 'Write your fix or solution here...',
		});
	}

	return fields;
}

// Build form buttons for open state
function getReportButtons(isClosed) {
	return isClosed ? [] : [{ id: 'updateReportBtn', type: 'submit', text: 'Update', className: 'btn btn-success' }];
}

// Ensure a hidden container exists for moving the form under tabs
function setupTempContainer(container) {
	const tempContainerId = 'reportTempContainer';
	if (!document.getElementById(tempContainerId)) {
		const tempDiv = document.createElement('div');
		tempDiv.id = tempContainerId;
		tempDiv.classList.add('d-none');
		container.appendChild(tempDiv);
	}
	return tempContainerId;
}

// Refresh the list after changes
function reloadReportList() {
	const callback = (status, data) => {
		if (status === 200 && data?.reportList) {
			loadReportList(data.reportList);
		} else {
			console.error('Failed to reload reports.', data);
			reportList.innerHTML = `<div class="text-danger text-center">Failed to load reports.</div>`;
		}
	};
	fetchMethod(`${currentUrl}/api/reports`, callback, 'GET', null, token);
}
