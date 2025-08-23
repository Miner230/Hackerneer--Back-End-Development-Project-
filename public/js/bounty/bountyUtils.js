// When the page loads, initialize the tabbed interface and listeners
document.addEventListener('DOMContentLoaded', () => {
	generateTabs(tabConfig, '#bountyTabContainer', {
		tabNavId: 'bountyTabs',
	});

	loadData(); // use unified loader
});

function loadData() {
	const callback = (status, data) => {
		if (status === 200) {
			loadVulnerabilityList(data.vulnerabilityList); // Adjust if needed
			loadReportList(data.reportList); // Adjust if needed
		}
	};

	fetchMethod(`${currentUrl}/api/reports/bounty`, callback);
}

// Configuration for each tab in the bounty section
const tabConfig = [
	{
		id: 'vuln', // HTML id for tab and content pane
		title: 'Vulnerabilities', // Display title
		searchPlaceholder: 'Search for vulnerabilities...', // Placeholder for search input
		searchId: 'searchBarVuln', // ID of search input element
		listId: 'vulnerabilityList', // ID of list container
		overlayId: 'vulnOverlay', // ID of overlay element
		overlayContentClass: 'vul-overlay-content', // Class of overlay content (for animation)
		contentId: 'vulnContent', // ID of content box inside overlay
	}, // format is the same for the rest
	{
		id: 'report',
		title: 'Reports',
		searchPlaceholder: 'Search for reports...',
		searchId: 'searchBarReport',
		listId: 'reportList',
		overlayId: 'reportOverlay',
		overlayContentClass: 'report-overlay-content',
		contentId: 'reportContent',
	},
];
