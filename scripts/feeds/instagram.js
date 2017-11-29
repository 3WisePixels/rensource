
import axios from 'axios';

/**
 * When the integration is failing, please check for a valid accessToken or
 * generate a new one on the following url: http://instagram.pixelunion.net/
 */

const apiRoot = 'https://api.instagram.com/v1';
export const userId = '4185757212';
export const accessToken = '4185757212.1677ed0.bd0cbc99e48946d48b9f5c479deb25d8';

function generateDate(secs) {
  const t = new Date(1970, 0, 1);
  t.setSeconds(secs);
  return t;
}

function malformStream(str) {
  return str.map((obj) => ({
    type: 'instagram',
    image: obj.images.standard_resolution.url,
    text: obj.caption ? obj.caption.text : '',
    createdAt: generateDate(obj.created_time),
    link: obj.link,
  }));
}

export function instagramFeed() {
  return new Promise((resolve, reject) => {
    axios.get(`${apiRoot}/users/${userId}/media/recent?access_token=${accessToken}`)
      .then(res => res.data)
      .then(res => malformStream(res.data))
      .then(res => resolve(res))
      .catch(err => reject(err));
  });
}
