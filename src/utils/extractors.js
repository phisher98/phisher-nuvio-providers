const cheerio = require('cheerio-without-node-native');

// Basic Unpacker
function unpack(packed) {
    const regex = new RegExp('eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\"(.*?)\\"\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\"(.*?)\\"\\.split\\(\\"\\|\\"\\)', 's');
    let match = packed.match(regex);
    if (!match) {
        const regexSq = new RegExp("eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\'(.*?)\\'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\'(.*?)\\'\\.split\\(\\'\\|\\'\\)", "s");
        match = packed.match(regexSq);
    }
    if (!match) return null;

    let p = match[1];
    const a = parseInt(match[2], 10);
    let c = parseInt(match[3], 10);
    const k = match[4].split('|');

    function e(c) {
        return (c < a ? '' : e(Math.floor(c / a))) + ((c % a) > 35 ? String.fromCharCode((c % a) + 29) : (c % a).toString(36));
    }

    while (c--) {
        if (k[c]) {
            const pattern = new RegExp('\\b' + e(c) + '\\b', 'g');
            p = p.replace(pattern, k[c]);
        }
    }
    return p;
}

async function extractVidmoly(url) {
    try {
        const res = await fetch(url, { headers: { 'Referer': url } });
        const html = await res.text();
        const m = html.match(/file:\s*["'](.*?m3u8.*?)["']/);
        if (m) return { url: m[1], quality: 'Unknown', source: 'Vidmoly' };
    } catch(e) {}
    return null;
}

async function extractFilemoon(url) {
    try {
        const res = await fetch(url, { headers: { 'Referer': url } });
        const html = await res.text();
        const unpacked = unpack(html);
        if (unpacked) {
            const m = unpacked.match(/file:\s*["'](.*?m3u8.*?)["']/);
            if (m) return { url: m[1], quality: 'Unknown', source: 'Filemoon' };
        }
    } catch (e) {}
    return null;
}

async function extractStreamhide(url) {
    try {
        const res = await fetch(url, { headers: { 'Referer': url } });
        const html = await res.text();
        const unpacked = unpack(html);
        if (unpacked) {
            const m = unpacked.match(/sources:\s*\[\s*{\s*file:\s*["'](.*?m3u8.*?)["']/);
            if (m) return { url: m[1], quality: 'Unknown', source: 'Streamhide' };
        }
    } catch (e) {}
    return null;
}

async function extractVoe(url) {
    try {
        const res = await fetch(url);
        const html = await res.text();
        const m = html.match(/hls':\s*'(.*?)'/);
        if (m) return { url: m[1], quality: 'Unknown', source: 'Voe' };
    } catch(e) {}
    return null;
}


async function extractPixeldrain(url) {
    const m = url.match(/\/u\/([^/?]+)/);
    if (m) {
        let domain = 'pixeldrain.com';
        if (url.includes('fuckingfast')) domain = 'fuckingfast.co';
        if (url.includes('pd.zidi.cfd')) domain = 'pd.zidi.cfd';
        return { url: 'https://' + domain + '/api/file/' + m[1], quality: 'Unknown', source: 'Pixeldrain' };
    }
    return null;
}

async function extractVdplay(url) {
    try {
        const urlObj = new URL(url);
        const u = urlObj.searchParams.get('u');
        if (u) {
            const decoded = Buffer.from(u, 'base64').toString('utf8');
            if (decoded.startsWith('http')) {
                return { url: decoded, quality: 'Unknown', source: 'Direct' };
            }
        }
    } catch (e) {}
    return null;
}

async function extract(url) {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('vidmoly')) {
        return await extractVidmoly(url);
    } else if (lowerUrl.includes('filemoon') || lowerUrl.includes('abyssplayer') || lowerUrl.includes('rubystm')) {
        return await extractFilemoon(url);
    } else if (lowerUrl.includes('streamhide') || lowerUrl.includes('cloudy.upns') || lowerUrl.includes('gdmirrorbot') || lowerUrl.includes('emturbovid')) {
        return await extractStreamhide(url);
    } else if (lowerUrl.includes('voe.sx') || lowerUrl.includes('voe.network')) {
        return await extractVoe(url);
    }
    
    return null;
}

module.exports = { extract };
