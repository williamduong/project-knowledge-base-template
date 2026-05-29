export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

async function extractErrorMessage(response: Response): Promise<string> {
  let text = ''
  try {
    text = await response.text()
    const body = text ? JSON.parse(text) : null
    if (body && typeof body.error === 'string' && body.error) {
      return body.error
    }
    if (body && typeof body.message === 'string' && body.message) {
      return body.message
    }
  } catch {
    // response body is not JSON — fall back to plain text
  }
  if (text) return text
  return `Request failed: ${response.status} ${response.statusText}`
}
