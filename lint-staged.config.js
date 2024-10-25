/**
 * @type {import('lint-staged').Config}
 */
module.exports = {
    '*.{js,ts}': 'eslint --fix',
};
