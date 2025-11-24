import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import {
    Label,
    makeStyles,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Subtitle2,
    useId
} from '@fluentui/react-components';

import {
    getIncludedTemplates,
    getTemplateByProviderAndName
} from '../../../catalog';
import {
    getTemplateMetadata,
    getTemplateResolvedForPlaceholderAssignment
} from '@deneb-viz/json-processing';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';
import { getVegaProviderI18n } from '../../../lib/vega';
import { useDenebState } from '../../../state';

type SelectIncludedTemplateProps = {
    createMode: SpecProvider;
};

const useSelectIncludedTemplateStyles = makeStyles({
    radioButton: {
        marginLeft: '2px'
    }
});

/**
 * Handles the selection of included templates for the specified create mode
 * (provider), and the dispatch of the correct information to the store for
 * subsequent components that rely upon it.
 */
export const SelectIncludedTemplate = ({
    createMode
}: SelectIncludedTemplateProps) => {
    const setTemplate = useDenebState((state) => state.create.setTemplate);
    const classes = useSelectIncludedTemplateStyles();
    const templates = useMemo(() => getIncludedTemplates(), []);
    const templateList = templates[createMode];
    const templateMetadata = templateList.map(
        (t: Spec | TopLevelSpec) => t.usermeta as UsermetaTemplate
    );
    const templateOptions = useMemo(
        () =>
            templateMetadata.map(({ information }) => (
                <Radio
                    key={information.uuid}
                    value={information.name}
                    label={information.name}
                    className={classes.radioButton}
                />
            )),
        [createMode]
    );
    const [selectedTemplate, setSelectedTemplate] = useState(
        templateMetadata[0]
    );
    const labelId = useId('label');
    const [radioValue, setRadioValue] = useState(
        selectedTemplate?.information?.name
    );
    const onTemplateSelect = (name: string) => {
        dispatchSelectedTemplate(createMode, name);
    };
    /**
     * Ensure that the selected template is pre-processed into candiate string
     * representations of their content, so that they can work with the JSONC APIs
     * downstream.
     */
    const dispatchSelectedTemplate = (
        createMode: SpecProvider,
        name: string
    ) => {
        const template = getTemplateByProviderAndName(createMode, name);
        const templateContent = JSON.stringify(template);
        const candidates = getTemplateResolvedForPlaceholderAssignment(
            templateContent,
            DEFAULTS.editor.tabSize
        );
        setTemplate({
            metadata: getTemplateMetadata(templateContent),
            candidates
        });
    };
    const onChange = (
        ev: FormEvent<HTMLDivElement>,
        data: RadioGroupOnChangeData
    ) => {
        setRadioValue(data.value);
        onTemplateSelect(data.value);
    };
    useEffect(() => {
        onTemplateSelect(radioValue);
    }, []);
    useEffect(() => {
        setSelectedTemplate(templateMetadata[0]);
        const { name } = selectedTemplate?.information ?? { name: null };
        setRadioValue(name);
        onTemplateSelect(name);
    }, [createMode]);
    const subtitle = useMemo(
        () =>
            getI18nValue('Text_Radio_Group_Select_Template', [
                getVegaProviderI18n(createMode)
            ]),
        [createMode]
    );
    logRender('SelectIncludedTemplate', createMode);
    return (
        <div
            style={{
                display: 'grid',
                gridRowGap: 'var(--spacingVerticalS)'
            }}
        >
            <Label id={labelId}>
                <Subtitle2>{subtitle}</Subtitle2>
            </Label>
            <RadioGroup
                aria-labelledby={labelId}
                value={radioValue}
                onChange={onChange}
            >
                {templateOptions}
            </RadioGroup>
        </div>
    );
};
