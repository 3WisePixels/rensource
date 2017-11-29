
import Twitter from 'twitter';

const client = new Twitter({
  consumer_key: 'RGSBzqmD1B8yKJEndLAp6OP2Y',
  consumer_secret: 'sIihnif160vvLFiBWXZeKTejdpYBurGpGHAOFqhyOuePtVhA07',
  access_token_key: '129433615-sJCQpejLvg9ix7eWKVtxDpc8oMF6zCQmZg31Z1o2',
  access_token_secret: 'e2zVdBVcEqKTZafopUADx8gB565pLNWQjQ9romqakGFUp',
});


export const screenName = 'rensourceenergy'; // eslint-disable-line

function malformStream(stream) {
  return stream.map(obj => ({
    type: 'twitter',
    text: obj.text,
    createdAt: new Date(obj.created_at),
    link: `https://twitter.com/${screenName}/status/${obj.id_str}`,
    // origin: obj,
  }));
}

export function twitterFeed() {
  return new Promise((resolve, reject) => {
    client.get('statuses/user_timeline', { screen_name: screenName }, (error, tweets, response) => {
      if (error) reject(error);

      const parsedBody = JSON.parse(response.body);
      const resp = malformStream(parsedBody);
      resolve(resp);
    });
  });
}
