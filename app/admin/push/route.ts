import { NextResponse } from 'next/server';

const REPO = 'annaejemo-crm/anna-admin';

export async function POST(req: Request) {
  const body = await req.json();
  const { path, content, message, secret } = body as {
    path?: string;
    content?: string;
    message?: string;
    secret?: string;
  };

  if (!secret || secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!path || typeof content !== 'string') {
    return NextResponse.json({ error: 'missing path or content' }, { status: 400 });
  }

  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json({ error: 'no github pat' }, { status: 500 });
  }

  const ghBase = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'anna-admin-push',
  };

  // Hämta befintlig sha
  const getRes = await fetch(ghBase, { headers });
  const cur = getRes.ok ? (await getRes.json()) as { sha?: string } : null;
  const sha = cur?.sha;

  // Encoder utf-8 content till base64 server-side. Inga paste-issues.
  const b64 = Buffer.from(content, 'utf-8').toString('base64');

  const put = await fetch(ghBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: message || `Update ${path}`,
      content: b64,
      sha,
    }),
  });

  const putBody = await put.text();
  return NextResponse.json({ status: put.status, body: putBody });
}
