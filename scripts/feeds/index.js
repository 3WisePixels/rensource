
import union from 'lodash/union'
import flatten from 'lodash/flatten'
import sortBy from 'lodash/sortBy'

import { countries } from 'country-data';

import { twitterFeed } from './twitter';
import { facebookFeed } from './facebook';
import { contentfulFeed } from './contentful';
import { instagramFeed } from './instagram';

export default (page = 'index') => {
  const codes = countries.all.map((country) => {
    if (Array.isArray(country.countryCallingCodes)) {
      return country.countryCallingCodes[0];
    } else { // eslint-disable-line
      return country.countryCallingCodes;
    }
  }).sort().filter((value, index, self) => self.indexOf(value) === index);

  codes.unshift('+23');

  if (page === 'magazine') {
    return Promise.all([facebookFeed(), twitterFeed(), contentfulFeed(), instagramFeed()])
      .then(feeds => union(...feeds))
      .then(feeds => flatten(feeds))
      .then(feeds => sortBy(feeds, 'createdAt').reverse())
      .then(feeds => ({ feeds, codes }));
  } else { // eslint-disable-line
    return Promise.resolve({ codes });
  }
}
