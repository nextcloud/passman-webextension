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
            all: ['js/*', '!js/vendor']
        },
        mkdir: {
            dist: {
                options: {
                    mode: 0700,
                    create: ['dist']
                }
            }
        },
        copy: {
            dist: {
                src: [
                    '**',
                    '!style/*/**/*',
                    '!style/*',
                    '!style',
                    '!node_modules/*',
                    '!node_modules/**',
                    '!dist/**',
                    '!dist/*',
                    '!.drone.yml',
                    '!.gitignore',
                    '!.jshintrc',
                    '!.scrutinizer.yml',
                    '!.travis.yml',
                    '!Gruntfile.js',
                    '!karma.conf.js',
                    '!launch_phpunit.sh',
                    '!Makefile',
                    '!package.json',
                    '!phpunit.*',
                    '!Dockerfile',
                    '!*.md',
                    '!*.zip',
                    '!swagger.yaml',
                    '!.tx'
                ],
                dest: 'dist/'
            }
        },
        karma: {
            unit: {
                configFile: './karma.conf.js',
                background: false
            }
        },
        compress: {
            dist: {
                options: {
                    archive: 'extension.zip'
                },
                files: [
                    {src: ['**'], dest: '.', cwd: 'dist/'}, // includes files in path
                ]
            }
        },
        clean: {
            dist: ['dist']
        },
        execute: {
            fixLocale: {
                src: ['fixLocale.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-mkdir');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-karma');
    // Default task(s).

    grunt.registerTask('test', ['karma', 'jshint']);
    grunt.registerTask('build', ['execute:fixLocale','jshint', 'clean:dist', 'mkdir:dist', 'copy:dist', 'compress:dist']);
    grunt.registerTask('dist', ['']);

};