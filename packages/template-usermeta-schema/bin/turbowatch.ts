import path from 'path';
import { watch } from 'turbowatch';

void watch({
    project: path.resolve(__dirname, '../..'),
    triggers: [
        {
            expression: [
                'anyof',
                [
                    'allof',
                    ['dirname', 'node_modules'],
                    ['dirname', 'dist'],
                    ['match', '*', 'basename']
                ],
                [
                    'allof',
                    ['not', ['dirname', 'node_modules']],
                    ['dirname', 'src'],
                    ['match', '*', 'basename']
                ]
            ],
            name: 'build',
            onChange: async ({ spawn }) => {
                return spawn`npm run build`;
            }
        }
    ]
});
