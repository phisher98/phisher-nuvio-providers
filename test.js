const { getStreams } = require('./src/providers/dudefilms.js');

getStreams('1291608', 'movie',1,1).then(streams => {
  console.log('Found', streams.length, 'streams');
  streams.forEach(stream => console.log(`${stream.name}: ${stream.quality} - ${stream.url}`));
}).catch(console.error);