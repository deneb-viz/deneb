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
            .ace_gutter-cell.ace_error {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTVtbSIKICAgaGVpZ2h0PSIxNW1tIgogICB2aWV3Qm94PSIwIDAgMTUgMTUiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMS4xICgzYmY1YWUwZDI1LCAyMDIxLTA5LTIwKSIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZXJyb3JfaW5kaWNhdG9yX2Rhcmsuc3ZnIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3NyIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMS4wIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJweCIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iNi4yMjE3MTcyIgogICAgIGlua3NjYXBlOmN4PSI0Mi43NTM0NyIKICAgICBpbmtzY2FwZTpjeT0iMjUuOTU3NDY0IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkxMSIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDE3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSIxOTE1IgogICAgIGlua3NjYXBlOndpbmRvdy15PSI1IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjAiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIxIiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMyIiAvPgogIDxnCiAgICAgaW5rc2NhcGU6bGFiZWw9IkxheWVyIDEiCiAgICAgaW5rc2NhcGU6Z3JvdXBtb2RlPSJsYXllciIKICAgICBpZD0ibGF5ZXIxIj4KICAgIDxlbGxpcHNlCiAgICAgICBzdHlsZT0iZmlsbDojZjE0YzRjO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDowLjI2NDU4MztmaWxsLW9wYWNpdHk6MSIKICAgICAgIGlkPSJwYXRoMzEiCiAgICAgICBjeD0iNy41OTA4NTA0IgogICAgICAgY3k9IjcuNTA1Nzk4OCIKICAgICAgIHJ4PSI2Ljk5NTQ4OTYiCiAgICAgICByeT0iNy4wMzgwMTU0IiAvPgogIDwvZz4KPC9zdmc+Cg==") !important;\
                background-size: 15px;\
            }\
            .ace_gutter-cell.ace_warning {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTVtbSIKICAgaGVpZ2h0PSIxNW1tIgogICB2aWV3Qm94PSIwIDAgMTUgMTUiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMS4xICgzYmY1YWUwZDI1LCAyMDIxLTA5LTIwKSIKICAgc29kaXBvZGk6ZG9jbmFtZT0id2FybmluZ19pbmRpY2F0b3JfZGFyay5zdmciCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc3IgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZG9jdW1lbnQtdW5pdHM9InB4IgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSI2LjIyMTcxNzIiCiAgICAgaW5rc2NhcGU6Y3g9IjQyLjc1MzQ3IgogICAgIGlua3NjYXBlOmN5PSIyNS45NTc0NjQiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTExIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjEwMTciCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjE5MTUiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjUiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczIiIC8+CiAgPGcKICAgICBpbmtzY2FwZTpsYWJlbD0iTGF5ZXIgMSIKICAgICBpbmtzY2FwZTpncm91cG1vZGU9ImxheWVyIgogICAgIGlkPSJsYXllcjEiPgogICAgPGVsbGlwc2UKICAgICAgIHN0eWxlPSJmaWxsOiNjY2E3MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLXdpZHRoOjAuMjY0NTgzO2ZpbGwtb3BhY2l0eToxIgogICAgICAgaWQ9InBhdGgzMSIKICAgICAgIGN4PSI3LjU5MDg1MDQiCiAgICAgICBjeT0iNy41MDU3OTg4IgogICAgICAgcng9IjYuOTk1NDg5NiIKICAgICAgIHJ5PSI3LjAzODAxNTQiIC8+CiAgPC9nPgo8L3N2Zz4K") !important;\
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
