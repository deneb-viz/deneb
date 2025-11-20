import {
    Caption1,
    makeStyles,
    TableCell,
    tokens
} from '@fluentui/react-components';

type DataDescriptionColumnCellProps = {
    text: string;
};

const useTemplateStyles = makeStyles({
    datasetDescriptionField: {
        padding: tokens.spacingVerticalXS
    }
});

/**
 * Displays the name of a template dataset field.
 */
export const DataDescriptionColumnCell = ({
    text
}: DataDescriptionColumnCellProps) => {
    const classes = useTemplateStyles();
    return (
        <TableCell>
            <div className={classes.datasetDescriptionField}>
                <Caption1>{text}</Caption1>
            </div>
        </TableCell>
    );
};
