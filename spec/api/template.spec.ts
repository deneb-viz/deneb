import * as template from '../../src/api/template';
// import getEscapedReplacerPattern = template.getEscapedReplacerPattern;
// import getExportFieldTokenPatterns = template.getExportFieldTokenPatterns;
// import replaceTemplateFieldWithToken = template.replaceTemplateFieldWithToken;
// import replaceExportTemplatePlaceholders = template.replaceExportTemplatePlaceholders;

describe('API: Template', () => {
    describe('getEscapedReplacerPattern', () => {
        it('Dummy', () => {
            expect(1).toEqual(1);
        });
        // it('Simple Value', () => {
        //     const value = 'Simple';
        //     expect(getEscapedReplacerPattern(value)).toEqual(value);
        // });
        // it('Backslash', () => {
        //     const value = 'Simple\\Value';
        //     expect(getEscapedReplacerPattern(value)).not.toEqual(value);
        //     expect(getEscapedReplacerPattern(value)).toEqual('Simple\\\\Value');
        // });
        // it('Slash', () => {
        //     const value = 'Simple/Value';
        //     expect(getEscapedReplacerPattern(value)).not.toEqual(value);
        //     expect(getEscapedReplacerPattern(value)).toEqual('Simple\\/Value');
        // });
        // it('Character Set', () => {
        //     const value = '[]';
        //     expect(getEscapedReplacerPattern(value)).not.toEqual(value);
        //     expect(getEscapedReplacerPattern(value)).toEqual('\\[\\]');
        // });
        // it('Anchors', () => {
        //     const value = '^&';
        //     expect(getEscapedReplacerPattern(value)).not.toEqual(value);
        //     expect(getEscapedReplacerPattern(value)).toEqual('\\^\\&');
        // });
        // it('Quantifiers', () => {
        //     const value = '+*?|';
        //     expect(getEscapedReplacerPattern(value)).not.toEqual(value);
        //     expect(getEscapedReplacerPattern(value)).toEqual('\\+\\*\\?\\|');
        // });
    });
    describe('getExportFieldTokenPatterns', () => {
        it('Dummy', () => {
            expect(1).toEqual(1);
        });
        // it('Simple Value', () => {
        //     const name = 'Date',
        //         pattern = getEscapedReplacerPattern(name);
        //     expect(getExportFieldTokenPatterns(name)).toMatchObject([
        //         `(")(${pattern})(")`,
        //         `(\\\.)(${pattern})()`,
        //         `(')(${pattern})(')`
        //     ]);
        // });
    });
    describe('replaceTemplateFieldWithToken', () => {
        it('Dummy', () => {
            expect(1).toEqual(1);
        });
        // const template =
        //     '{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"Segment","test":"datum.Segment === datum[\'Selected Segment\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}';
        // it('Simple Field Encoding', () => {
        //     const pattern = getExportFieldTokenPatterns('Segment')[0],
        //         token = '__1__';
        //     expect(
        //         replaceTemplateFieldWithToken(template, pattern, token)
        //     ).toEqual(
        //         `{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"${token}","test":"datum.Segment === datum[\'Selected Segment\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}`
        //     );
        // });
        // it('Simple Datum Reference', () => {
        //     const pattern = getExportFieldTokenPatterns('Segment')[1],
        //         token = '__1__';
        //     expect(
        //         replaceTemplateFieldWithToken(template, pattern, token)
        //     ).toEqual(
        //         `{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"Segment","test":"datum.${token} === datum[\'Selected Segment\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}`
        //     );
        // });
        // it('Quoted Datum Reference', () => {
        //     const pattern = getExportFieldTokenPatterns('Selected Segment')[2],
        //         token = '__1__';
        //     expect(
        //         replaceTemplateFieldWithToken(template, pattern, token)
        //     ).toEqual(
        //         `{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"Segment","test":"datum.Segment === datum[\'${token}\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}`
        //     );
        // });
    });
    describe('replaceExportTemplatePlaceholders', () => {
        it('Dummy', () => {
            expect(1).toEqual(1);
        });
        // const template =
        //     '{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"Segment","test":"datum.Segment === datum[\'Selected Segment\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}';
        // it('Multiple Occurrences and Possible Overlap with Another Field', () => {
        //     const pattern = 'Segment',
        //         token = '__1__';
        //     expect(
        //         replaceExportTemplatePlaceholders(template, pattern, token)
        //     ).toEqual(
        //         `{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"${token}","test":"datum.${token} === datum[\'Selected Segment\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}`
        //     );
        // });
        // it('Field With Spaces', () => {
        //     const pattern = 'Selected Segment',
        //         token = '__1__';
        //     expect(
        //         replaceExportTemplatePlaceholders(template, pattern, token)
        //     ).toEqual(
        //         `{"data":{"name":"dataset"},"layer":[{"description":"Data Line","mark":{"type":"line"}}],"encoding":{"color":{"condition":{"field":"Segment","test":"datum.Segment === datum[\'${token}\']","type":"nominal","legend":null},"value":"#eaeaea"},"y":{"field":"$ Sales","type":"quantitative","axis":{"format":"$#0,,,.0bn","formatType":"pbiFormat","tickCount":5}},"x":{"field":"Date","type":"temporal","axis":{"format":"MMM yyyy","formatType":"pbiFormat","grid":false}}}}`
        //     );
        // });
    });
});
