// A signed upload token is not a user session. Supabase only accepts it on
// the /sign resumable endpoint, in the x-signature header.

export function resumableEndpoint(projectUrl: string) {
  const base = projectUrl.replace(/\/+$/, "").replace(".supabase.co", ".storage.supabase.co")
  return `${base}/storage/v1/upload/resumable/sign`
}

export function resumableHeaders(token: string, apikey: string) {
  return {
    apikey,
    "x-signature": token,
    "x-upsert": "true",
  }
}
