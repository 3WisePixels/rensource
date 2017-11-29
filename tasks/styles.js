import gulp from 'gulp';
import sass from 'gulp-sass';
import postcss from 'gulp-postcss';
import plumber from 'gulp-plumber';
import csso from 'gulp-csso';

// import eyeglass from 'eyeglass';
import autoprefixer from 'autoprefixer';
import { join } from 'path';
import { src, dest } from './config';

gulp.task('styles', () => {
  gulp.src(join(src, 'styles', 'main.scss'))
    .pipe(plumber())
    .pipe(sass({
      includePaths: [
        join(__dirname, '..', 'node_modules', 'bootstrap', 'scss'),
      ],
    }).on('error', sass.logError))
    .pipe(postcss([autoprefixer({ browsers: ['last 2 versions'] })]))
    .pipe(gulp.dest(join(dest, 'styles')));
});

gulp.task('styles:build', () => {
  gulp.src(join(src, 'styles', 'main.scss'))
    .pipe(plumber())
    .pipe(sass({
      includePaths: [
        join(__dirname, '..', 'node_modules', 'bootstrap', 'scss'),
      ],
    }))
    .pipe(postcss([autoprefixer({ browsers: ['last 2 versions'] })]))
    .pipe(csso())
    .pipe(gulp.dest(join(dest, 'styles')));
});
