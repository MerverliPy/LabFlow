export interface Env {}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>LabFlow</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 40px auto; max-width: 760px; padding: 0 16px; line-height: 1.5; }
      code { background: #f4f4f4; padding: 0.15rem 0.3rem; border-radius: 4px; }
      a { text-decoration: none; }
    </style>
  </head>
  <body>
    <h1>LabFlow</h1>
    <p>Claude Code-native orchestration toolkit with a verified terminal-first core.</p>
    <ul>
      <li><a href="https://github.com/MerverliPy/LabFlow">GitHub repository</a></li>
      <li><a href="https://github.com/MerverliPy/LabFlow/issues">Issue tracker</a></li>
      <li><a href="/healthz">Health endpoint</a></li>
    </ul>
    <p>Stable core: <code>init</code>, <code>task</code>, <code>session</code>, <code>memory</code>, <code>status</code>, <code>doctor</code>.</p>
  </body>
</html>`;

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/healthz") {
      return Response.json({
        ok: true,
        product: "LabFlow",
        package: "labflow",
        cli: "labflow",
        repo: "https://github.com/MerverliPy/LabFlow",
      });
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
};
