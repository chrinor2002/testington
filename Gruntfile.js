module.exports = function(grunt) {

    const execSync = require('child_process').execSync;

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });

    grunt.registerTask('test', function() {
        const jmeter = require('./lib/jmeter.js');
        var done = this.async();
        jmeter('./tests/jmeter/example.jmx')
            .then(done, done)
            .catch((err) => {
                throw err;
            });
    });

    grunt.registerTask('init', function() {
        // install jmeter
        execSync('node_modules/.bin/jmeter-manager install', {
            stdio: [0,1,2]
        });
    });

    // Default task(s).
    grunt.registerTask('default', ['test']);

};

