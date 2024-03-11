function activate(context) {
    require('process').chdir(`${__dirname}/../`)
    require('ts-node').register({});
    require('./extension').activate(context);
}
function deactivate() {
    require('./extension').deactivate();
}
module.exports = { activate, deactivate };