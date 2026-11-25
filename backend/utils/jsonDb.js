const fs = require('fs');

const readJSON = (filePath, fallback = []) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`[DB READ ERROR] ${filePath}:`, e);
    return fallback;
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[DB WRITE ERROR] ${filePath}:`, e);
    return false;
  }
};

module.exports = {
  readJSON,
  writeJSON
};
