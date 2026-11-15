require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.get('/config.js', (_req, res) => {
  const cfg = {
    DRONE_ID: process.env.DRONE_ID,
    API_URL: (process.env.API_URL || '').replace(/\/+$/, ''),
  };
  res.type('js').send(`window.APP_CONFIG=${JSON.stringify(cfg)};`);
});
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 8080, () => console.log('Frontend running'));
