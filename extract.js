const fs = require('fs');
const html = fs.readFileSync('../meet-our-team.html', 'utf8');

const regex = /<img[^>]+src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<h3[^>]*>(.*?)<\/h3>/gis;
let match;
const team = [];
while ((match = regex.exec(html)) !== null) {
    team.push({
        name: match[2].replace(/<[^>]+>/g, '').trim(),
        role: match[3].replace(/<[^>]+>/g, '').trim(),
        image: match[1]
    });
}
console.log(JSON.stringify(team, null, 2));
