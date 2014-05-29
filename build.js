/* global rm, mkdir, cp, exec */
require('shelljs/global');
var _ = require('lodash');

var files = require('./files');

rm('-rf', 'build');
mkdir('-p', 'build');

_.forEach(files.vendor, function(filePath, fileName) {
  cp(filePath, 'build/' + fileName);
});

exec('webpack --progress --colors');
