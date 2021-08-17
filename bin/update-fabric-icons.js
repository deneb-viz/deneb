const _ = require('lodash'),
    axios = require('axios'),
    AdmZip = require('adm-zip'),
    icons = require('../config/fabric-icons.json'),
    fabricUrl = 'https://uifabricicons.azurewebsites.net',
    cssFileName = 'fabric-icons-inline.css',
    cssLocalPath = './style';

console.log('Processing icons from config...');
const subset = _.values(icons).map((icon) => {
    var result = '';
    for (var i = 0; i < icon.length; i++) {
        result += icon.charCodeAt(i).toString(16);
    }
    return result.toUpperCase();
});
console.log(`${subset.length} icon(s) will be requested.`);

const reqData = {
    fontName: 'fabric-icons',
    fontFamilyName: 'FabricMDL2Icons',
    glyphs: subset,
    chunkSubsets: false,
    excludeGlyphs: false,
    excludeThirdPartyIcons: false,
    hashFontFileName: false,
    isExternal: true
};

console.log('Making request...');
axios
    .post(`${fabricUrl}/get-subset`, reqData)
    .then((pRes) => {
        console.log(`statusCode: ${pRes.status}`);
        const zipLoc = pRes.data;
        console.log('Getting generated .zip:', zipLoc);
        axios
            .get(`${fabricUrl}${zipLoc}`, { responseType: 'arraybuffer' })
            .then((gRes) => {
                console.log(`statusCode: ${gRes.status}`);
                console.log('Successfully obtained .zip file :)');
                console.log('Extracting inline CSS...');
                const zip = new AdmZip(gRes.data),
                    cssFile = zip.getEntry(`css/${cssFileName}`);
                console.log('Updating local CSS...');
                zip.extractEntryTo(cssFile, cssLocalPath, false, true);
                console.log('Done!');
            })
            .catch((error) => {
                console.log('Error!', error);
            });
    })
    .catch((error) => {
        console.log('Error!', error);
    });
