const fs = require('fs');
const content = fs.readFileSync('C:/Users/pc/Downloads/Activities (5).csv', 'utf8');
const lines = content.split('\n');
const headers = lines[0].split('\",\"').map(s => s.replace(/\"/g, ''));
headers.forEach((h, i) => console.log(`${i}: ${h}`));
