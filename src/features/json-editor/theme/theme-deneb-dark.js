// We'll try to refine this later to tie to the theme (he says, optimistically...)
const colors = {
    neutralStroke2: '#525252',
    error: '#f14c4c',
    warning: '#cca700',
    background: '#292929',
    boolean: '#569cd6',
    numeric: '#b5cea8',
    paren: '#179fff',
    string: '#c39178',
    text: '#F8F8F8',
    text_gutter: '#adadad',
    text_gutter_current_line: '#fff',
    variable: '#9cdcfe',
    comment: '#608b4e'
};

ace.define(
    'ace/theme/deneb-dark',
    ['require', 'exports', 'module', 'ace/lib/dom'],
    function (require, exports) {
        exports.isDark = true;
        exports.cssClass = 'ace-deneb-dark';
        exports.cssText = `\
            .ace-deneb-dark .ace_gutter {\
                background: ${colors.background};\
                color: ${colors.text_gutter}\
            }\
            .ace-deneb-dark {\
                background-color: ${colors.background};\
                color: ${colors.text}\
            }\
            .ace-deneb-dark .ace_cursor {\
                color: #A7A7A7\
            }\
            .ace-deneb-dark .ace_marker-layer .ace_selection {\
                background: rgba(173, 214, 255, 0.15)\
            }\
            .ace-deneb-dark.ace_multiselect .ace_selection.ace_start {\
                box-shadow: 0 0 3px 0px #141414;\
            }\
            .ace-deneb-dark .ace_marker-layer .ace_step {\
                background: rgb(102, 82, 0)\
            }\
            .ace-deneb-dark .ace_marker-layer .ace_bracket {\
                margin: -1px 0 0 -1px;\
                border: 1px solid rgba(255, 255, 255, 0.25)\
            }\
            .ace-deneb-dark .ace_marker-layer .ace_active-line {\
                border-top: 1px solid ${colors.neutralStroke2};\
                border-bottom: 1px solid ${colors.neutralStroke2};\
                background: rgba(255, 255, 255, 0.0)\
            }\
            .ace-deneb-dark .ace_gutter-active-line {\
                font-weight: 900;\
                color: ${colors.text_gutter_current_line};\
                background-color: rgba(255, 255, 255, 0.00)\
            }\
            .ace-deneb-dark .ace_marker-layer .ace_selected-word {\
                border: 1px solid rgba(221, 240, 255, 0.20)\
            }\
            .ace-deneb-dark .ace_invisible {\
                color: rgba(255, 255, 255, 0.25)\
            }\
            .ace-deneb-dark .ace_keyword,\
            .ace-deneb-dark .ace_meta {\
                color: #CDA869\
            }\
            .ace-deneb-dark .ace_constant,\
            .ace-deneb-dark .ace_constant.ace_character,\
            .ace-deneb-dark .ace_constant.ace_character.ace_escape,\
            .ace-deneb-dark .ace_constant.ace_other,\
            .ace-deneb-dark .ace_heading,\
            .ace-deneb-dark .ace_markup.ace_heading,\
            .ace-deneb-dark .ace_support.ace_constant {\
                color: #CF6A4C\
            }\
            .ace-deneb-dark .ace_invalid.ace_illegal {\
                color: #F8F8F8;\
                background-color: rgba(86, 45, 86, 0.75)\
            }\
            .ace-deneb-dark .ace_invalid.ace_deprecated {\
                text-decoration: underline;\
                font-style: italic;\
                color: #D2A8A1\
            }\
            .ace-deneb-dark .ace_support {\
                color: #9B859D\
            }\
            .ace-deneb-dark .ace_fold {\
                background-color: #AC885B;\
                border-color: #F8F8F8\
            }\
            .ace-deneb-dark .ace_entity.ace_name.ace_function,\
            .ace-deneb-dark .ace_meta.ace_tag {\
                color: #AC885B\
            }\
            .ace-deneb-dark .ace_string {\
                color: ${colors.string}\
            }\
            .ace-deneb-dark .ace_variable {\
                color: ${colors.variable}\
            }\
            .ace-deneb-dark .ace_boolean {\
                color: ${colors.boolean}\
            }\
            .ace-deneb-dark .ace_numeric {\
                color: ${colors.numeric}\
            }\
            .ace-deneb-dark .ace_paren {\
                color: ${colors.paren}\
            }\
            .ace-deneb-dark .ace_comment {\
                color: ${colors.comment};\
            }\
            .ace-deneb-dark .ace_indent-guide {\
                background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQYlWNwcHD4z8TAwMAAAAwOAcLIp400AAAAAElFTkSuQmCC) right repeat-y\
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
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBDcmVhdGVkIHdpdGggSW5rc2NhcGUgKGh0dHA6Ly93d3cuaW5rc2NhcGUub3JnLykgLS0+Cjxzdmcgd2lkdGg9IjE1bW0iIGhlaWdodD0iMTVtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTUgMTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiA8ZWxsaXBzZSBjeD0iNy41OTA5IiBjeT0iNy41MDU4IiByeD0iNi45OTU1IiByeT0iNy4wMzgiIGZpbGw9IiNmMTRjNGMiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIuMjY0NTgiLz4KPC9zdmc+Cg==") !important;\
                background-size: 15px;\
            }\
            .ace_gutter-cell.ace_warning, .ace_tooltip .ace_warning {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBDcmVhdGVkIHdpdGggSW5rc2NhcGUgKGh0dHA6Ly93d3cuaW5rc2NhcGUub3JnLykgLS0+Cjxzdmcgd2lkdGg9IjE1bW0iIGhlaWdodD0iMTVtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMTUgMTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiA8cGF0aCB0cmFuc2Zvcm09Im1hdHJpeCgyLjA3NjQgMCAwIDIuMjY2OSAtMi45MzU1IC0zLjc3MTIpIiBkPSJtOC4zMzUxIDcuNjEyMWMtMC4zMzE0NiAwLjU3NDUyLTYuMzAxIDAuNTc2NDQtNi42MzI4IDAuMDAyMTI1NS0wLjMzMTgyLTAuNTc0MzEgMi42NTEzLTUuNzQ1IDMuMzE0Ni01Ljc0NTIgMC42NjMyOC0yLjEyNmUtNCAzLjY0OTcgNS4xNjg2IDMuMzE4MiA1Ljc0MzF6IiBmaWxsPSIjY2NhNzAwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZS13aWR0aD0iLjI2NDU4Ii8+Cjwvc3ZnPgo=") !important;\
                background-size: 15px;\
            }`;
        var dom = require('../lib/dom');
        dom.importCssString(exports.cssText, exports.cssClass, false);
    }
);
(function () {
    ace.require(['ace/theme/deneb-dark'], function (m) {
        if (typeof module == 'object' && typeof exports == 'object' && module) {
            module.exports = m;
        }
    });
})();
