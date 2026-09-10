const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.build = 'vinext build && node patch-db.js';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

const patchCode = `const fs = require('fs');
const file = 'dist/server/wrangler.json';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/00000000-0000-4000-8000-000000000000/g, '92d656ef-b539-4904-8331-37cda3a8dbc1');
  fs.writeFileSync(file, content);
  console.log('Successfully patched D1 database ID!');
}
`;
fs.writeFileSync('patch-db.js', patchCode);
