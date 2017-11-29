import gulp from 'gulp';
import changed from 'gulp-changed';

import { join } from 'path';
import { src, dest } from './config';

gulp.task('images', () =>
  gulp.src(join(src, 'images', '**/*'))
    .pipe(changed(join(dest, 'images')))
    .pipe(gulp.dest(join(dest, 'images'))),
);

gulp.task('images:build', () =>
  gulp.src(join(src, 'images', '**/*'))
    .pipe(gulp.dest(join(dest, 'images'))),
);
