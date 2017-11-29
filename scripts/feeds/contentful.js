
import contentful from 'contentful';
import moment from 'moment';

export const client = contentful.createClient({
  space: '6gbpcssq1zr7',
  accessToken: '1f7ab23a605f4875dd900a008c6c2c5c68aea18e482ac44c243d07b48f53ac34'
})

function malformStream(stream) {
  return stream.map((obj) => {
    const { sys, fields } = obj;
    const date = new Date(sys.createdAt);

    return {
      type: 'magazine',
      title: fields.title,
      text: fields.content,
      slug: fields.slug,
      createdAt: date,
      createdAtFormatted: moment(date).format("MMM Do YYYY"),
      link: `/magazine/${fields.slug}`,
    };
  });
}

export function contentfulFeed() {
  return new Promise((resolve, reject) => {
    client.getEntries()
      .then(entries => malformStream(entries.items))
      .then(entries => resolve(entries))
      .catch(error => reject(error));
  });
}
