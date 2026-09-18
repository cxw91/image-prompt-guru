// update-version.js
import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');
console.log(`htmlPath: ${htmlPath}`);

const version = Date.now().toString();

// 打印替换前的匹配结果，方便排查
console.log('替换前:', html.match(/[^"']*\.(?:css|js)[^"']*/g));

html = html.replace(/(\.(?:css|js))(\?v=\d+)?/g, `$1?v=${version}`);

// 打印替换后的结果
console.log('替换后:', html.match(/[^"']*\.(?:css|js)[^"']*/g));

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log(`✅ 已自动更新前端资源版本号至: ${version}`);