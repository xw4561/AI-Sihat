// This wrapper exists to avoid "require is not defined in ES module scope" errors.
// The actual server entry point is server.js (ESM). Importing it here ensures
// running `node index.js` behaves the same as `node server.js`.
import "./server.js";
