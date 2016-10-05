const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const child_process = require('child_process');
const StringDecoder = require('string_decoder').StringDecoder;
const Converter = require("csvtojson").Converter;
const Mocha = require("mocha");
const joi = require("joi");
const chai = require("chai");
const expect = chai.expect;
const assert = chai.assert;

module.exports = function(file) {
    return new Promise((resolve, reject) => {
        var testsDir = 'tests/jmeter';
        var testsOutputDir = 'tests/_output/jmeter';
        var cmdBase = 'node_modules/.bin/jmeter';

        var filter = '.jmx';
        var subPath = file.replace(path.join(testsDir)+'/', '');
        var fileName = path.basename(file, filter);
        var subPathDirName = path.dirname(subPath);
        var nestedTestName = (subPathDirName == "." ? '' : subPathDirName + '/') + fileName;
        var logFile = path.join(testsOutputDir, nestedTestName + '.log');
        var resultsFile = path.join(testsOutputDir, nestedTestName + '.jtl');

        var propertiesFile = path.join(testsDir, 'jmeter.properties');
        var csvHeader = [ 'timestamp', 'time', 'label', 'thread_group', 'passed', 'message', 'url' ];

        var cmd = cmdBase + ' ' + [
          '-n',
          '-p', propertiesFile,
          '-j', logFile,
          '-l', resultsFile,
          '-t', file
        ].join(' ');
        var opts = {
          //stdio: [0,1,2] // TODO: make this optional to enable
          //stdio: [ 'ignore', 'ignore', 'ignore' ]
        };

        console.log('Pre-Executing jmeter test: ' + file);
        child_process.exec( cmd, opts, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            var converter = new Converter({
                headers: [ 'timestamp', 'time', 'label', 'thread_group', 'passed', 'message', 'url' ],
                noheader: true
            });
            converter.on("end_parsed", (jsonArray) => {
                var mocha = new Mocha();

                var druation = 0;
                _.each(jsonArray, (jmTestData) => {
                    var test = new Mocha.Test(jmTestData.label, () => {
                        assert.isTrue(jmTestData.passed, jmTestData.message);
                    });
                    test.duration = jmTestData.time;
                    test.jmeterData = jmTestData;
                    mocha.suite.addTest(test);
                });

                mocha.suite.title = 'jmeter';

                console.log('Running jmeter to mocha translation.');
                var runner = mocha.run((failures) => {
                    process.on('exit', function () {
                        if (failures) {
                            reject(failures);
                        } else {
                            resolve();
                        }
                    });
                });
            });
            fs.createReadStream(resultsFile).pipe(converter);

            // parse results file
            /*var csvConverter = new Converter({
                noheader: true,
                headers: csvHeader
            });*/
            /*csvConverter.fromFile(resultsFile, function(err, jsonArray) {
                if (err) {
                    callback(err, false);
                    return;
                }

                // build the suite based on the results
                var returnSuite = {
                    name: 'jmeter - ' + nestedTestName
                };
                for(var jmTestName in jsonArray) {
                    var testKey = jsonArray[jmTestName].label;
                    var index = 1;
                    while(returnSuite[testKey]) {
                        testKey = jsonArray[jmTestName].label + ' - ' + index++;
                    }
                    returnSuite[testKey] = (function(jmTestData) {
                        return function() {
                            assert.isTrue(jmTestData.passed, jmTestData.message);
                          };
                    })(jsonArray[jmTestName]);
                }

                // register the result with intern
                registerSuite(returnSuite);
                callback(null, true);
            });*/
        });
    });
}