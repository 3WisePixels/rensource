// Kreativgebiet GmbH
//
// Require all gulp tasks from the subfolder
// and let them call themselves

require('babel-register');
require('require-dir')('./tasks', { recurse: true });
