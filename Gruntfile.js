module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		uglify: {
			my_target: {
				files: {
					'js/app.js': 'beautified/js/app.js',
					'js/bootstrap.js': 'beautified/js/bootstrap.js',
					'js/jasny-bootstrap.js': 'beautified/js/jasny-bootstrap.js',
					'js/knockout.js': 'beautified/js/knockout.js'
				}
			}
		},
		cssmin: {
			options: {
				shorthandCompacting: false,
				roundingPrecision: -1
			},
			target: {
				files: {
					'css/bootstrap.css': 'beautified/css/bootstrap.css',
					'css/bootstrap-theme.css': 'beautified/css/bootstrap-theme.css',
					'css/jasny-bootstrap.css': 'beautified/css/jasny-bootstrap.css',
					'css/jasny-offcanvas.css': 'beautified/css/jasny-offcanvas.css',
					'css/map.css': 'beautified/css/map.css',
					'css/style.css': 'beautified/css/style.css',
					'css/mobile.css': 'beautified/css/mobile.css'
				}
			}
		},
		htmlmin: {
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {
					'index.html': 'beautified/index.html'
				}
			}
		}
	});
	grunt.registerTask('default', [
		'uglify',
		'cssmin',
		'htmlmin'
		]);	
};