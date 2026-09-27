/**
 * Typed errors for the Digital Twin API. Every failure the client can see is a
 * TwinError with a stable machine-readable `code` and a safe human `message`.
 * Provider details (status bodies, keys, URLs) never go in `message`.
 */
export class TwinError extends Error {
  /**
   * @param {string} code
   * @param {number} status HTTP status returned to the client
   * @param {string} message safe to show to end users
   * @param {{ retryAfterSeconds?: number }} [options]
   */
  constructor(code, status, message, options = {}) {
    super(message)
    this.name = 'TwinError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

const PROVIDER_TROUBLE = 'The AI service is having trouble right now. Please try again in a moment.'

export const errors = {
  invalidRequest: (detail) => new TwinError('invalid_request', 400, detail),
  invalidJson: () => new TwinError('invalid_json', 400, 'The request body must be a JSON object, for example {"message": "..."}.'),
  emptyMessage: () => new TwinError('empty_message', 400, 'Please type a question first.'),
  messageTooLong: (max) =>
    new TwinError('message_too_long', 400, `Please keep the question under ${max} characters.`),
  payloadTooLarge: () => new TwinError('payload_too_large', 413, 'The request is too large.'),
  rateLimited: (retryAfterSeconds) =>
    new TwinError('rate_limited', 429, 'Too many questions in a short time. Please wait a moment.', {
      retryAfterSeconds,
    }),
  notConfigured: () =>
    new TwinError(
      'twin_not_configured',
      503,
      'The Digital Twin is not configured on this server (no API key). The rest of the site works normally.',
    ),
  providerAuth: () =>
    new TwinError('provider_auth_error', 502, 'The Digital Twin is misconfigured on the server right now.'),
  providerMisconfigured: () =>
    new TwinError('provider_misconfigured', 502, 'The Digital Twin is misconfigured on the server right now.'),
  clientClosed: () => new TwinError('client_closed', 499, 'The request was cancelled.'),
  providerRateLimited: (retryAfterSeconds) =>
    new TwinError('provider_rate_limited', 503, PROVIDER_TROUBLE, { retryAfterSeconds }),
  providerTimeout: () =>
    new TwinError('provider_timeout', 504, 'The AI service took too long to answer. Please try again.'),
  providerUnavailable: () => new TwinError('provider_unavailable', 502, PROVIDER_TROUBLE),
  providerBadResponse: () =>
    new TwinError('provider_bad_response', 502, 'The AI service returned an unusable answer. Please try again.'),
}
