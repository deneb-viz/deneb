// We'll try to refine this later to tie to the theme (he says, optimistically...)
const colors = {
    neutralStroke2: '#e0e0e0',
    error: '#e51400',
    warning: '#bf8803',
    background: '#fff',
    boolean: '#0000ff',
    numeric: '#098658',
    paren: '#319331',
    string: '#a31515',
    text: '#000',
    text_gutter: '#237893',
    text_gutter_current_line: '#000',
    variable: '#0451a5',
    comment: '#008000'
};

ace.define(
    'ace/theme/deneb-light',
    ['require', 'exports', 'module', 'ace/lib/dom'],
    function (require, exports) {
        exports.isDark = false;
        exports.cssClass = 'ace-deneb-light';
        exports.cssText = `\
            .ace-deneb-light .ace_gutter {\
                background: ${colors.background};\
                color: ${colors.text_gutter};\
            }\
            .ace-deneb-light  {\
                background: ${colors.background};\
                color: ${colors.text};\
            }\
            .ace-deneb-light .ace_keyword {\
                font-weight: bold;\
            }\
            .ace-deneb-light .ace_string {\
                color: #D14;\
            }\
            .ace-deneb-light .ace_variable.ace_class {\
                color: teal;\
            }\
            .ace-deneb-light .ace_constant.ace_numeric {\
                color: #099;\
            }\
            .ace-deneb-light .ace_constant.ace_buildin {\
                color: #0086B3;\
            }\
            .ace-deneb-light .ace_support.ace_function {\
                color: #0086B3;\
            }\
            .ace-deneb-light .ace_comment {\
                color: ${colors.comment};\
            }\
            .ace-deneb-light .ace_variable.ace_language  {\
                color: #0086B3;\
            }\
            .ace-deneb-light .ace_string.ace_regexp {\
                color: #009926;\
                font-weight: normal;\
            }\
            .ace-deneb-light .ace_variable.ace_instance {\
                color: teal;\
            }\
            .ace-deneb-light .ace_cursor {\
                color: black;\
            }\
            .ace-deneb-light.ace_focus .ace_marker-layer .ace_active-line {\
                border-top: 1px solid ${colors.neutralStroke2};\
                border-bottom: 1px solid ${colors.neutralStroke2};\
                background: rgba(0, 0, 0, 0.00);\
            }\
            .ace-deneb-light .ace_marker-layer .ace_active-line {\
                border-top: 1px solid ${colors.neutralStroke2};\
                border-bottom: 1px solid ${colors.neutralStroke2};\
                background: rgba(0, 0, 0, 0.00);\
            }\
            .ace-deneb-light .ace_gutter-active-line {\
                font-weight: 900;\
                color: ${colors.text_gutter_current_line};\
                background-color : rgba(0, 0, 0, 0.00);\
            }\
            .ace-deneb-light .ace_marker-layer .ace_selection {\
                background: rgb(181, 213, 255, 0.35);\
            }\
            .ace-deneb-light.ace_multiselect .ace_selection.ace_start {\
                box-shadow: 0 0 3px 0px white;\
            }\
            .ace-deneb-light.ace_nobold .ace_line > span {\
                font-weight: normal !important;\
            }\
            .ace-deneb-light .ace_marker-layer .ace_step {\
                background: rgb(252, 255, 0);\
            }\
            .ace-deneb-light .ace_marker-layer .ace_stack {\
                background: rgb(164, 229, 101);\
            }\
            .ace-deneb-light .ace_marker-layer .ace_bracket {\
                margin: -1px 0 0 -1px;\
                border: 1px solid rgb(192, 192, 192);\
            }\
            .ace-deneb-light .ace_marker-layer .ace_selected-word {\
                background: rgb(250, 250, 255);\
                border: 1px solid rgb(200, 200, 250);\
            }\
            .ace-deneb-light .ace_invisible {\
                color: #BFBFBF\
            }\
            .ace-deneb-light .ace_print-margin {\
                width: 1px;\
                background: #e8e8e8;\
            }\
            .ace-deneb-light .ace_string {\
                color: ${colors.string}\
            }\
            .ace-deneb-light .ace_variable {\
                color: ${colors.variable}\
            }\
            .ace-deneb-light .ace_boolean {\
                color: ${colors.boolean}\
            }\
            .ace-deneb-light .ace_numeric {\
                color: ${colors.numeric}\
            }\
            .ace-deneb-light .ace_paren {\
                color: ${colors.paren}\
            }\
            .ace-deneb-light .ace_indent-guide {\
                background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") right repeat-y;\
            }\
            .error_marker {\
                border-bottom: 2px solid ${colors.error};\
                position: absolute;\
                z-index: 100;\
            }\
            .warning_marker {\
                border-bottom: 2px solid ${colors.warning};\
                position: absolute;\
                z-index: 100;\
            }\
            .ace_gutter-cell.ace_error, .ace_tooltip .ace_error {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBDcmVhdGVkIHdpdGggSW5rc2NhcGUgKGh0dHA6Ly93d3cuaW5rc2NhcGUub3JnLykgLS0+Cjxzdmcgd2lkdGg9IjE1bW0iIGhlaWdodD0iMTVtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTUgMTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiA8ZWxsaXBzZSBjeD0iNy41OTA5IiBjeT0iNy41MDU4IiByeD0iNi45OTU1IiByeT0iNy4wMzgiIGZpbGw9IiNlNTE0MDAiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIuMjY0NTgiLz4KPC9zdmc+Cg==") !important;\
                background-size: 15px;\
            }\
            .ace_gutter-cell.ace_warning, .ace_tooltip .ace_warning {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBDcmVhdGVkIHdpdGggSW5rc2NhcGUgKGh0dHA6Ly93d3cuaW5rc2NhcGUub3JnLykgLS0+Cjxzdmcgd2lkdGg9IjE1bW0iIGhlaWdodD0iMTVtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTUgMTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiA8cGF0aCB0cmFuc2Zvcm09Im1hdHJpeCgyLjA3NjQgMCAwIDIuMjY2OSAtMi45MzU1IC0zLjc3MTIpIiBkPSJtOC4zMzUxIDcuNjEyMWMtMC4zMzE0NiAwLjU3NDUyLTYuMzAxIDAuNTc2NDQtNi42MzI4IDAuMDAyMTI1NS0wLjMzMTgyLTAuNTc0MzEgMi42NTEzLTUuNzQ1IDMuMzE0Ni01Ljc0NTIgMC42NjMyOC0yLjEyNmUtNCAzLjY0OTcgNS4xNjg2IDMuMzE4MiA1Ljc0MzF6IiBmaWxsPSIjYmY4ODAzIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZS13aWR0aD0iLjI2NDU4Ii8+Cjwvc3ZnPgo=") !important\
                background-size: 15px;\
            }`;
        var dom = require('../lib/dom');
        dom.importCssString(exports.cssText, exports.cssClass, false);
    }
);
(function () {
    ace.require(['ace/theme/deneb-light'], function (m) {
        if (typeof module == 'object' && typeof exports == 'object' && module) {
            module.exports = m;
        }
    });
})();
