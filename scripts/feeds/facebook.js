
import { Facebook } from 'fb';

export const client = new Facebook({
  version: 'v2.8',
  appId: '237903663330575',
  appSecret: '7f1bd716371355156e755beee0ef7854',
});

function prepareMessage(obj) {
  let message = '';

  if (obj.message) {
    const preparedMessage = obj.message.split(' ').slice(0, 10).join(' ');
    message = `${preparedMessage} ...`;
  } else if (obj.story) {
    message = obj.story;
  }

  return message.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
}

// client.setAccessToken('EAADYX0NX9Q8BADQIw76HXdmoPg8DVmPvItl004vs6J9S4ttyWNVrZC57YrBqfABU4TUkEvrZAmLZC7fVFNWbKBAXFH7yPCPIDZBlD104jYOLTcM1y3gbW2fVysmA5Nv2AxNxwj630lB4ER7Tq4LMqtwft1kA4hsZD');

function malformStream(stream) {
  return stream.map(obj => ({
    type: 'facebook',
    text: prepareMessage(obj),
    createdAt: new Date(obj.created_time),
    link: `https://facebook.com/${obj.id}`,
    origin: obj,
  }));
}

export function facebookFeed() {
  return new Promise((resolve, reject) => {
    client.api('rensource/feed', {
      access_token: '1421693634736130|BDbt6t0Y6bsHX4jdsmjMfz97Olg'
    }, (res) => {
      if (!res || res.error) { return reject(res.error); }

      const preparedStream = malformStream(res.data);
      return resolve(preparedStream);
    });
  });
}

// 1421693634736130|BDbt6t0Y6bsHX4jdsmjMfz97Olg
