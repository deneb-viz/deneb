# `@deneb-viz/worker-common`

Utilities for packaging and encapsulation of web workers, for easier user where they are needed.

Because workers are bundled .js files (to ensure that all dependencies are present at execution time), this package has a custom loader for the imported .js output from each worker package. This will:

1. Import the .js file as raw text.
2. Convert the text into a blob and object URL.
3. Load this URL as a new Worker and expose an importable object.

Anywhere you need a worker, you can import the fully assembled output of the one you want from this package rather than the specific package that defines it (or you can repeat the above in your own implementation).

# Available Workers

-   `datasetViewerWorker`: Used for the calculation of display widths and formatted values for the dataset viewer in the debug table.
