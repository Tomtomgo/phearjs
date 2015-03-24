var gulp = require("gulp");
var $ = require("gulp-load-plugins")({lazy: false});
var $run = require('run-sequence');
var $logger = $.util.log;

var paths = {
  phear: ['./src/phear.coffee' ],
  scripts: ['./src/*.coffee', '!./src/phear.coffee' ]
}

gulp.task('coffee', function(done) {

  gulp.src(paths.scripts)
    .pipe($.coffee({bare: false}).on('error', $logger))
    .pipe(gulp.dest('./lib'))
    .pipe($.size({showFiles: true}));

  gulp.src(paths.phear)
    .pipe($.coffee({bare: false}).on('error', $logger))
    .pipe($.insert.prepend("#! /usr/bin/env node\n"))
    .pipe($.chmod(755))
    .pipe(gulp.dest('./'))
    .pipe($.size({showFiles: true}));

});

gulp.task('build', function(callback) {
  $run("coffee", callback);
});

gulp.task('default', ['build']);
