const fs = require('fs');
const readline = require('readline');

const base_path = './dataset/';
// I'm too lazy to parse the directory here
const inputfiles = [
	'pegel_11.csv',
	'pegel_12.csv',
	'pegel_13.csv',
	'pegel_14.csv',
	'pegel_15.csv'
];
const out_file = base_path + 'transformed.json';

// transformed data goes here
const dates_with_values = [];

const parseFile = file_name => {
	return new Promise((res) => {
		const inputstream = fs.createReadStream(file_name);

		const rl = readline.createInterface({
			input: inputstream,
			crlfDelay: Infinity
		});

		// start at -1 to make the third row first of month
		let linecount = -1;
		let year = NaN;

		rl.on('line', (line) => {
			const fields = line.split(',',12);

			if (linecount < 0) {
				year = fields[0];
			} else if (linecount > 0) {
				for (const fidx in fields) {
					const val = parseInt(fields[fidx]);
					//eliminate empty fields
					if (isNaN(val))
						continue;
					dates_with_values.push({
						timestamp: new Date(Date.UTC(year, fidx, linecount)),
						value: val
					});
				}
			}
			linecount++;
		});

		inputstream.on('end', res);
	});
};

const files_to_wait_for = [];

inputfiles.forEach(name => {
	files_to_wait_for.push(parseFile(base_path + name));
});

Promise.all(files_to_wait_for).then(() => {
	fs.writeFileSync(out_file, JSON.stringify(dates_with_values, null, '\t'));
});
