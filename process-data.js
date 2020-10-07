// we do not connect to an API, so just get the data from plain json 
const data = require('./dataset/transformed.json');

// ok, here goes the charts CSV data … later
const fs = require('fs');
const out_file = fs.createWriteStream('./chart.csv');

// time could also be kept in a date object,
// but using seperate fields makes our live a lot easier 
class LevelDataRow {
	constructor(level_at_time) {
		const tmp_date = new Date(level_at_time.timestamp);

		this.level = level_at_time.value;
		this.year  = tmp_date.getFullYear();
		this.month = tmp_date.getMonth();
		this.third = LevelDataRow.getThird(tmp_date);
	}

	static getThird(d) {
		const day = d.getDate();

		if (day < 11) return 0;
		if (day < 21) return 1;
		return 2;
	}
}

class MiniDB {
	// data will be kept in a hirachical stucture
	// the order is month → year → third-of-month
	// we do that because we want to stack months above each other,
	// so months are more important than years

	constructor() {
		this.months = [];
		// keep track of years, so we don't have to iterate on the structure
		this.known_years = [];
		this.avgs_generated = false;
	}

	insert(data) {
		// all the ifs here are needed to prevent you from putting data into structures
		// that do not exis yet.
		if (!this.known_years.includes(data.year)) this.known_years.push(data.year);

		if (typeof this.months[data.month] === 'undefined') {
			// not using an array for years here, because some thousands of fields would be empty
			this.months[data.month] = {};
		}
		// special handling for year objects
		if(!Object.keys(this.months[data.month]).includes(data.year.toString())) {
			this.months[data.month][data.year] = [];
		}
		// thirds is an array of ojects that have multiple levels and an average to compute
		if(typeof this.months[data.month][data.year][data.third] === 'undefined') {
			this.months[data.month][data.year][data.third] = { levels: [], avg: NaN};
		}

		// and this is what we do to add another value
		this.months[data.month][data.year][data.third].levels.push(data.level);
	}

	// after all levels have been entered we iterate over the thirds of month
	// to calculate an average
	genAverages() {
		if (this.avgs_generated === true) return;

		this.months.forEach(month => {
			Object.keys(month).forEach(year => {
				month[year].forEach(third => {
					third.avg = third.levels.reduce((acc, cur) => acc + cur) / third.levels.length;
					// chop to one digit behind the comma
					third.avg = Math.round(third.avg * 10) / 10; 
				});
			});
		});
		this.avgs_generated = true;
	}

	// return the CSV header which lists the years
	getHeader() {
		return this.known_years.reduce((acc, cur) => acc += '\t' + cur.toString(), 'Date');
	}

	// this prepares an array of lines for the CSV
	// we need to iterate over it to write the lines out in the end
	getThirdsOfMonths() {
		// a quick and dirty way to break any localization down to english names
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		const lines = [];

		// iterate over the months
		months.forEach((month_name, midx) => {
			// silently sneak out if the requested month does not exist in the dataset
			if (typeof this.months[midx] === 'undefined') return;
			// iterate over the thirds
			for (let third=0; third < 3; third++) {
				// …and prepare something that looks like a date
				let line = month_name + ' ' + (third * 10 + 1) + ', 1970';
				// finally iterate over the years
				this.known_years.forEach(year => {
					// there is still a possibility that a year, or a third of month does not exist
					// fill the field with NaN as a placeholder
					if ((typeof this.months[midx][year] === 'undefined') || (typeof this.months[midx][year][third] === 'undefined')) {
						line += '\t' + NaN;
						return;
					}

					// everythings fine, write out one average value per year
					line += '\t' + this.months[midx][year][third].avg; 
				});

				lines.push(line);
			}
		});

		return lines;
	}
}

// normaly I would do all this transform stuff in an sqlite DB, but I didn't want to bother you with another language
// we just use our own pseudo DB here
const mini_db = new MiniDB();

// insert all the things
for (const dataset of data) {
	mini_db.insert(new LevelDataRow(dataset));
}

// create the averages
mini_db.genAverages();

// write out the CSV header
out_file.write(mini_db.getHeader());

// write out all the lines (while manually creating new lines)
for (const line of mini_db.getThirdsOfMonths()) {
	out_file.write('\n');
	out_file.write(line);
}
out_file.write('\n');
