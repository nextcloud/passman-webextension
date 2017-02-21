module.exports = function (grunt) {
    var jsResources = [];
    // Project configuration.
    grunt.initConfig({
        jsResources: [],
        cssResources: [],
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                reporter: require('jshint-stylish'),
                curly: false,
                eqeqeq: true,
                eqnull: true,
                browser: true,
                globals: {
                    "angular": true,
                    "PassmanImporter": true,
                    "PassmanExporter": true,
                    "OC": true,
                    "window": true,
                    "console": true,
                    "CRYPTO": true,
                    "C_Promise": true,
                    "forge": true,
                    "sjcl": true,
                    "jQuery": true,
                    "$": true,
                    "_": true,
                    "oc_requesttoken": true
                }
            },
            all: ['js/*','!js/vendor']
        }

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');


    // Default task(s).

    grunt.registerTask('hint', ['jshint']);

};