const fs = require('fs');
const file = 'dist/server/wrangler.json';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/00000000-0000-4000-8000-000000000000/g, '92d656ef-b539-4904-8331-37cda3a8dbc1');
  fs.writeFileSync(file, content);
  console.log('Successfully patched D1 database ID!');
}
