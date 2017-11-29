
export default function sendError(res, e) {
  return res.status(404).send(`${e} <a href="/">Back.</a>`);
}
