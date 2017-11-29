
import express from 'express';
import { join } from 'path';
import find from 'lodash/find';

import getFeeds from './feeds';
import sendErr from './utils/sendError';
import renderDynamic from './utils/renderDynamic';
import { contentfulFeed } from './feeds/contentful';

const app = express();
const PORT = process.env.PORT || 3002;

app.set('views', join(__dirname, '..', '..', 'source', 'html'));
app.set('view engine', 'ejs');

app.use(express.static(join(__dirname, '..', '..', 'dist')));

app.get('/', (req, res) => {
  getFeeds('index')
    .then(options => renderDynamic(res, 'index', options))
    .catch(error => sendErr(res, error));
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/feed', (req, res) => {
    getFeeds().then(feeds => res.send(feeds)).catch(error => sendErr(res, error));
  });
}

app.get('/magazine/:slug', (req, res) => {
  contentfulFeed()
    .then(response => find(response, { slug: req.params.slug }))
    .then(response => res.render('magazine-show', response));
})

app.get('/(:page)', (req, res) => {
  const { page = 'index' } = req.params;

  getFeeds(page)
    .then(options => renderDynamic(res, page, options))
    .catch(error => sendErr(res, error));
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`)); // eslint-disable-line
