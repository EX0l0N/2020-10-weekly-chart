const fs   = require('fs');
const http = require('http');

const endpoint_url = 'http://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/ccccb57f-a2f9-4183-ae88-5710d3afaefd/W/measurements.json?';

const createDates = (start, end) => {
	const d1 = new Date(start + ' UTC');
	const d2 = new Date(end + ' UTC');
	const a_day_in_unix = Date.UTC(1970,0,2);

	const date_pairs = [];

	for (let year=d1.getUTCFullYear(); year <= d2.getUTCFullYear(); year++) {
		for (let month = 1; month <= 12; month++) {
			// make sure we do not overshot our limits
			if ((year == d1.getUTCFullYear()) && (month - 1 < d1.getUTCMonth()))
				continue;
			if ((year == d2.getUTCFullYear()) && (month - 1 > d2.getUTCMonth()))
				continue;
			//ok, we still ignore the day part, though

			let td1 = new Date(year + '-' + month + '-1 UTC');

			// just create the variable
			let td2 = new Date();

			// this is not december, take next month and substract one day
			// let date handle the last day of month
			if (month < 12) {
				td2 = new Date(year + '-' + (month + 1) + '-1 UTC');
				td2 = new Date(td2 - a_day_in_unix);
			// this is december, it has 31 days
			} else
				td2 = new Date(year + '-' + (month) + '-31 UTC');

			if (td1 < d1)
				td1 = d1;
			if (td2 > d2)
				td2 = d2;
			date_pairs.push([td1, td2]); 
		}
	}

	return date_pairs;
};

const dummy = (url, path, callback) => {
	console.log('url:', url);
	console.log('path:', path);

	callback();
};

const getFile = (url, path, callback) => {

	const file = fs.createWriteStream(path);

	// copied from https://nodejs.org/docs/latest/api/http.html#http_http_get_url_options_callback
	// modified to write files
	http.get(url, (res) => {
		const { statusCode } = res;
		const contentType = res.headers['content-type'];

		let error;
		// Any 2xx status code signals a successful response but
		// here we're only checking for 200.
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`);
		}
		if (error) {
			console.error(error.message);
			// Consume response data to free up memory
			res.resume();
			return;
		}

		res.setEncoding('utf8');
		res.on('data', (chunk) => file.write(chunk));
		res.on('end', () => {
			file.end();
			callback();
		});
	}).on('error', (e) => {
		console.error(`Got error: ${e.message}`);
	});
};

const wrapper = (idx) => {
	const url  = endpoint_url + 'start=' + time_slices[idx][0].toISOString() + '&end=' + time_slices[idx][1].toISOString();
	const path = './dataset/' + time_slices[idx][0].toISOString().split('T',1)[0] + '.json';
	const callback = (idx < time_slices.length - 1) ? () => wrapper(idx + 1) : () => console.log('done'); 

	dummy(url, path, () => setTimeout(callback, 500));
};

const time_slices = createDates('2006-1-1', '2019-12-31');
wrapper(0);
