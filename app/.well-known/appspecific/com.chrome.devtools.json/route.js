// Chrome DevTools configuration file
// This prevents 404 errors in the console
export async function GET() {
  return new Response(JSON.stringify({}), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

