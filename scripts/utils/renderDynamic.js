
import sendErr from './sendError';

export default function renderDynamic(response, templateName, options = {}) {
  return response.render(templateName, options, (err, html) => {
    if (err) { return sendErr(response, err); }
    return response.send(html);
  })
}
