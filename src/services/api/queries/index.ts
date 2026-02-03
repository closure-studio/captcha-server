/**
 * Query exports
 */

export {
    listTasksQuery,
    getTaskQuery,
    createTaskStatement,
    updateTaskResultStatement,
    insertRecognitionStatement,
    insertBypassStatement,
    insertAssetStatement,
} from './tasks';

export {
    overviewStatsQuery,
    byTypeStatsQuery,
    byRecognizerStatsQuery,
    trendStatsQuery,
} from './stats';
