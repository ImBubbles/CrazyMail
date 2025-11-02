export async function POST(req: Request) {
  const startTime = process.hrtime.bigint();
	const { CLOUDFLARE_API_TOKEN: authToken } = process.env;

	if (!authToken)
		return Response.json(
			{ error: 'No Cloudflare auth token provided' },
			{ status: 500 }
		);

	const headers = {
		'Authorization': `Bearer ${authToken}`,
		'Content-Type': 'application/octet-stream',
	};

	const data = await req.formData();
	const file = data.get('file');

	if (!file || typeof file === 'string')
		return Response.json({ error: 'No file provided' }, { status: 400 });

	const buffer = Buffer.from(await file.arrayBuffer());

	const url = 'https://api.cloudflare.com/client/v4/accounts/023e105f4ecef8ad9ca31a8372d0c353/ai/inference/models/openai/whisper';
	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: buffer,
	});
	const result = await response.json();
  const endTime = process.hrtime.bigint();
  const timeTaken = Number(endTime - startTime) / 1e6;
  result.timeTaken = timeTaken;
	return Response.json(result);
}