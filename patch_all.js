const fs = require('fs');
const path = require('path');

const providers = [
    'anime-dekho.js', 'animecloud.js', 'animedubhindi.js', 'coflix.js', 'desicinemas.js',
    'donghuastream.js', 'layarkaca.js', 'megakino.js', 'netcinez.js', 'onepace.js',
    'pelisplushd.js', 'pencurimovie.js', 'pinoymoviepedia.js', 'piratexplay.js', 'pmsm.js',
    'tokusatsu.js', 'tokuzilla.js', 'toonstream.js', 'topstreamfilm.js'
];

const wrapper = `
const { extract } = require('../utils/extractors.js');
async function wrappedGetStreams(...args) {
    const streams = await getStreams(...args);
    const finalStreams = [];
    for (const s of streams) {
        if (!s.url) continue;
        const ext = await extract(s.url);
        if (ext) {
            s.url = ext.url;
            if (ext.quality !== 'Unknown') s.quality = ext.quality;
            finalStreams.push(s);
        } else if (s.url.includes('.mp4') || s.url.includes('.m3u8') || s.url.startsWith('magnet:')) {
            finalStreams.push(s);
        }
    }
    return finalStreams;
}
module.exports = { getStreams: wrappedGetStreams };
`;

for (const f of providers) {
    const p = path.join(__dirname, 'src/providers', f);
    if (!fs.existsSync(p)) continue;
    let code = fs.readFileSync(p, 'utf8');
    
    // clean previous patch if any
    code = code.replace(/const { extract } = require\('\.\.\/utils\/extractors\.js'\);[\s\S]*module\.exports = { getStreams: wrappedGetStreams };/, 'module.exports = { getStreams };');
    
    if (code.includes('module.exports = { getStreams };')) {
        code = code.replace('module.exports = { getStreams };', wrapper);
        fs.writeFileSync(p, code);
        console.log('Patched ' + f);
    }
}
