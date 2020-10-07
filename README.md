# This is the codebase for my datawrapper weekly on 2020-10-08

## Everything to reproduce my chart is in here.

You don't need to run `npm` to install any dependencies.  
**There are none.**

Just run:

```
node transform_data.js
```

… to create the input `JSON` from the `CSV` files in the `dataset` folder.

and then run

```
node process-data.js
```

to create the `chart.csv` file, on which the chart is based upon.


`get-data.js` is an orphaned tool that I wanted to use to fetch the data. I keep it here for documentation.
