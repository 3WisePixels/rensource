import gulp from 'gulp';
import sequence from 'run-sequence';
import { join } from 'path';
import { src } from './config';

gulp.task('default', ['clean'], () => {
  sequence('clean', ['scripts', 'fonts', 'images', 'markup', 'styles']);

  gulp.watch(join(src, 'images', '**/*'), ['images']);
  gulp.watch(join(src, 'html', '**/*.ejs'), ['markup']);
  gulp.watch(join(src, 'styles', '**/*.{scss,sass}'), ['styles']);
});
