const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const BACKEND_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'frontend');

module.exports = {
  PORT,
  FRONTEND_DIR
};
