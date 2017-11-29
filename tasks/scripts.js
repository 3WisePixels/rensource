import gulp from 'gulp';
import gutil from 'gulp-util';
import uglify from 'gulp-uglify';
import rev from 'gulp-rev';

import browserify from 'browserify';
import watchify from 'watchify';
import babelify from 'babelify';
import debowerify from 'debowerify';
import assign from 'object-assign';

import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';

import { join } from 'path';
import { src, dest } from './config';

const customOpts = {
  entries: join(src, 'scripts', 'main.js'),
  extensions: ['.jsx', '.js'],
  debug: true,
  transform: [
    babelify,
    debowerify,
  ],
};

const config = assign({}, watchify.args, customOpts);
const bundler = watchify(browserify(config));
const buildBundler = browserify(config);

function bundle() {
  return bundler.bundle()
    .on('error', err => gutil.log.call(this, err))
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(gulp.dest(dest));
}

function buildBundle() {
  return buildBundler.bundle()
    .on('error', err => gutil.log.call(this, err))
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(dest));
}

gulp.task('scripts', ['scripts:dev', 'scripts:lib'])
gulp.task('scripts:dev', bundle);
gulp.task('scripts:build', ['scripts:build_bundle', 'scripts:lib'])
gulp.task('scripts:build_bundle', buildBundle);
gulp.task('scripts:lib', () => {
  gulp.src(join(src, 'scripts', 'lib/**/*.js'))
    .pipe(gulp.dest(join(dest, 'lib')));
});
bundler.on('update', bundle);
bundler.on('log', gutil.log);
