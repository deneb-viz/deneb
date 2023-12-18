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
            .ace-deneb-light .ace_paren {\
                font-weight: bold;\
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
            .ace_gutter-cell.ace_error {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTVtbSIKICAgaGVpZ2h0PSIxNW1tIgogICB2aWV3Qm94PSIwIDAgMTUgMTUiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMS4xICgzYmY1YWUwZDI1LCAyMDIxLTA5LTIwKSIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZXJyb3JfaW5kaWNhdG9yX2xpZ2h0LnN2ZyIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzciCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjYuMjIxNzE3MiIKICAgICBpbmtzY2FwZTpjeD0iNDIuNzUzNDciCiAgICAgaW5rc2NhcGU6Y3k9IjI1Ljk1NzQ2NCIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjE5MTEiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iMTAxNyIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iMTkxNSIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iNSIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIwIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImxheWVyMSIgLz4KICA8ZGVmcwogICAgIGlkPSJkZWZzMiIgLz4KICA8ZwogICAgIGlua3NjYXBlOmxhYmVsPSJMYXllciAxIgogICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiCiAgICAgaWQ9ImxheWVyMSI+CiAgICA8ZWxsaXBzZQogICAgICAgc3R5bGU9ImZpbGw6I2U1MTQwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MC4yNjQ1ODM7ZmlsbC1vcGFjaXR5OjEiCiAgICAgICBpZD0icGF0aDMxIgogICAgICAgY3g9IjcuNTkwODUwNCIKICAgICAgIGN5PSI3LjUwNTc5ODgiCiAgICAgICByeD0iNi45OTU0ODk2IgogICAgICAgcnk9IjcuMDM4MDE1NCIgLz4KICA8L2c+Cjwvc3ZnPgo=") !important;\
                background-size: 15px;\
            }\
            .ace_gutter-cell.ace_warning {\
                background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTVtbSIKICAgaGVpZ2h0PSIxNW1tIgogICB2aWV3Qm94PSIwIDAgMTUgMTUiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMS4xICgzYmY1YWUwZDI1LCAyMDIxLTA5LTIwKSIKICAgc29kaXBvZGk6ZG9jbmFtZT0id2FybmluZ19pbmRpY2F0b3JfbGlnaHQuc3ZnIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3NyIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMS4wIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJweCIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iNi4yMjE3MTcyIgogICAgIGlua3NjYXBlOmN4PSI0Mi43NTM0NyIKICAgICBpbmtzY2FwZTpjeT0iMjUuOTU3NDY0IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkxMSIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDE3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSIxOTE1IgogICAgIGlua3NjYXBlOndpbmRvdy15PSI1IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjAiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIxIiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMyIiAvPgogIDxnCiAgICAgaW5rc2NhcGU6bGFiZWw9IkxheWVyIDEiCiAgICAgaW5rc2NhcGU6Z3JvdXBtb2RlPSJsYXllciIKICAgICBpZD0ibGF5ZXIxIj4KICAgIDxlbGxpcHNlCiAgICAgICBzdHlsZT0iZmlsbDojYmY4ODAzO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDowLjI2NDU4MztmaWxsLW9wYWNpdHk6MSIKICAgICAgIGlkPSJwYXRoMzEiCiAgICAgICBjeD0iNy41OTA4NTA0IgogICAgICAgY3k9IjcuNTA1Nzk4OCIKICAgICAgIHJ4PSI2Ljk5NTQ4OTYiCiAgICAgICByeT0iNy4wMzgwMTU0IiAvPgogIDwvZz4KPC9zdmc+Cg==") !important\
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
