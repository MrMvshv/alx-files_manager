const express = require('express');
const routes = require('./routes/index');

// Create an Express application
const app = express();

// Define the port to listen on (default: 5000)
const port = process.env.PORT || 5000;

app.use(express.json());
// Load routes from the routes/index.js file
app.use('/', routes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
