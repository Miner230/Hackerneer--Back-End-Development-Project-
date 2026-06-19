//=====================================================================================
// FETCH METHOD
// This function uses the fetch API to make a request to the server.
//=====================================================================================
const inflightGetRequests = new Map();

function fetchMethod(url, callback, method = 'GET', data = null, token = null) {
	const headers = {};
	const normalizedMethod = method.toUpperCase();

	if (data) {
		headers['Content-Type'] = 'application/json';
	}

	if (token) {
		headers['Authorization'] = 'Bearer ' + token;
	}

	const options = {
		method: normalizedMethod,
		headers,
	};

	if (normalizedMethod !== 'GET' && data !== null) {
		options.body = JSON.stringify(data);
	}

	const executeRequest = () =>
		fetch(url, options)
			.then((response) => {
				if (response.status === 204) {
					return { status: response.status, data: {} };
				}
				return response.json().then((responseData) => ({
					status: response.status,
					data: responseData,
				}));
			})
			.catch((error) => {
				console.error(`Error from ${normalizedMethod} ${url}:`, error);
				return { status: 0, data: { error: error.message } };
			});

	if (normalizedMethod === 'GET') {
		const cacheKey = `${url}::${token || ''}`;
		if (inflightGetRequests.has(cacheKey)) {
			return inflightGetRequests
				.get(cacheKey)
				.then(({ status, data: responseData }) => callback(status, responseData));
		}

		const requestPromise = executeRequest().finally(() => {
			inflightGetRequests.delete(cacheKey);
		});
		inflightGetRequests.set(cacheKey, requestPromise);
		return requestPromise.then(({ status, data: responseData }) => callback(status, responseData));
	}

	return executeRequest().then(({ status, data: responseData }) => callback(status, responseData));
}
