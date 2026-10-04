import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
export function publicAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (ip.includes(':')) {
    if (ip.startsWith('::ffff:')) return publicAddress(ip.slice(7));
    // Public unicast only; rejects loopback, private, mapped and link-local IPv6.
    return /^[23][0-9a-f]{3}:/.test(ip) && !ip.startsWith('2001:db8:');
  }
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 2) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  );
}
export function endpointUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    ['localhost', 'localhost.localdomain'].includes(url.hostname) ||
    (isIP(url.hostname.replace(/[\[\]]/g, '')) &&
      !publicAddress(url.hostname.replace(/[\[\]]/g, '')))
  )
    throw new Error(
      'Use a public HTTPS endpoint without embedded credentials.'
    );
  return url;
}
// DNS is validated and pinned to the same address used for the TLS connection.
// Redirects are rejected so credentials cannot travel to a different host.
export const pinnedFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init),
    url = endpointUrl(request.url);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error('Private or reserved network addresses are not supported.');
  const selected = addresses.find((a) => a.family === 4) || addresses[0];
  const dispatcher = new Agent({
    connect: {
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      },
    },
  });
  try {
    const response = await undiciFetch(url, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.text(),
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
      dispatcher,
    });
    if (response.status >= 300 && response.status < 400)
      throw new Error(
        'Endpoint redirects are not supported. Use its final HTTPS URL.'
      );
    if (!response.body) {
      await dispatcher.close();
      return new Response(null, {
        status: response.status,
        headers: Object.fromEntries(response.headers),
      });
    }
    const reader = response.body.getReader();
    let size = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = await reader.read();
          if (chunk.done) {
            controller.close();
            await dispatcher.close();
            return;
          }
          size += chunk.value.byteLength;
          if (size > 4 * 1024 * 1024)
            throw new Error(
              'The endpoint response exceeds the supported size. Narrow the query.'
            );
          controller.enqueue(chunk.value);
        } catch (error) {
          controller.error(error);
          await reader.cancel().catch(() => {});
          await dispatcher.destroy();
        }
      },
      async cancel() {
        await reader.cancel().catch(() => {});
        await dispatcher.destroy();
      },
    });
    return new Response(body, {
      status: response.status,
      headers: Object.fromEntries(response.headers),
    });
  } catch (error) {
    await dispatcher.destroy();
    throw error;
  }
};
