// CloudFront Function (viewer-request) for the Movezy static host.
//
// One bucket serves two apps:
//   /            the marketing site — every route is prerendered as
//                <route>/index.html, so "/about" → "/about/index.html"
//   /admin/*     the admin panel, a single-page app whose deep links
//                ("/admin/orders") must all resolve to /admin/index.html
//
// Attach it to the distribution's default behaviour as a viewer-request
// function. Requests for real files (anything with an extension) pass through.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  var isFile = last.indexOf('.') !== -1;

  if (uri === '/admin' || uri.indexOf('/admin/') === 0) {
    if (!isFile) request.uri = '/admin/index.html';
    return request;
  }
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  } else if (!isFile) {
    request.uri = uri + '/index.html';
  }
  return request;
}
