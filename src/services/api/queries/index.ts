/**
 * Query exports
 */

export {
    listTasksQuery,
    getTaskQuery,
    createTaskStatement,
    updateTaskResultStatement,
    insertTaskWithResultStatement,
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
