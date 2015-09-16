var gulp = require("gulp");
var $ = require("gulp-load-plugins")({lazy: false});
var $run = require('run-sequence');
var $logger = $.util.log;

var paths = {
  phear: ['./src/phear.coffee' ],
  scripts: ['./src/*.coffee', '!./src/phear.coffee' ],
  views: ['./src/views/*']
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

gulp.task('views', function(done) {

  gulp.src(paths.views)
    .pipe(gulp.dest('./lib/views'))
    .pipe($.size({showFiles: true}));

});

gulp.task('build', function(callback) {
  $run("coffee", callback);
  $run("views", callback);
});

gulp.task('default', ['build']);
