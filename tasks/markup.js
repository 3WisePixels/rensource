import gulp from 'gulp';
// import ejs from 'gulp-ejs';
// import plumber from 'gulp-plumber';
// import rename from 'gulp-rename';
// import htmlmin from 'gulp-htmlmin'
// import { join } from 'path';
//
// import browserSync from './connect';
// import { src, dest } from './config';

gulp.task('markup', () => {
  // const mainPath = join(src, 'html', '**/*.ejs');
  // const includesPath = join('!.', src, 'html', 'partials', '**/*.ejs');
  //
  // gulp.src([mainPath, includesPath])
  //   .pipe(plumber())
  //   .pipe(ejs())
  //   .pipe(rename({ extname: '.html' }))
  //   .pipe(gulp.dest(dest))
  //   .pipe(browserSync.stream());
});

gulp.task('markup:build', () => {
  // const mainPath = join(src, 'html', '**/*.ejs');
  // const includesPath = join('!.', src, 'html', 'partials', '**/*.ejs');
  //
  // gulp.src([mainPath, includesPath])
  //   .pipe(plumber())
  //   .pipe(ejs())
  //   .pipe(htmlmin({ collapseWhitespace: true }))
  //   .pipe(rename({ extname: '.html' }))
  //   .pipe(gulp.dest(dest))
  //   .pipe(browserSync.stream());
});
