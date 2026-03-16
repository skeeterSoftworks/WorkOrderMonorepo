const path = require('path');
const express = require('express');
const app = express();

const workOrderCentralBuildPath = path.join( __dirname, 'dist' );

// 2) Serve static assets
app.use(express.static(workOrderCentralBuildPath));

// 3) SPA fallback: any unknown route returns index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(workOrderCentralBuildPath, 'index.html'));
});

// 4) Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Work-order-central served at http://localhost:${PORT}`);
});