import { createHash } from 'node:crypto';
import { config } from '../../config.js';

/**
 * Simulated payment-authorisation adapter boundary.
 *
 * The prototype never contacts a PSP. Implementations must return an opaque,
 * simulated evidence reference and fail closed for any unrecognised provider.
 * A future real adapter must be separately licensed, audited and activated
 * through the public-launch gate before this boundary can be replaced.
 */
export interface PaymentAuthorizationRequest {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId: string;
  readonly jurisdiction: string;
  readonly evaluatedAt: Date;
}

export interface PaymentAuthorizationDecision {
  readonly result: 'simulated_clear' | 'declined' | 'unknown';
  readonly evidenceRef: string;
  readonly evaluatedAt: string;
}

export interface PaymentAuthorizationAdapter {
  readonly name: string;
  authorize(request: PaymentAuthorizationRequest): PaymentAuthorizationDecision;
}

function opaqueRef(request: PaymentAuthorizationRequest): string {
  const digest = createHash('sha256')
    .update(`${request.tenantId}:${request.userId}:${request.correlationId}:payment`)
    .digest('hex')
    .slice(0, 16);
  return `simulated:payment:${digest}`;
}

export const simulatedPaymentAdapter: PaymentAuthorizationAdapter = {
  name: 'simulated',
  authorize(request) {
    return {
      result: 'simulated_clear',
      evidenceRef: opaqueRef(request),
      evaluatedAt: request.evaluatedAt.toISOString(),
    };
  },
};

function failClosedAdapter(name: string): PaymentAuthorizationAdapter {
  return {
    name,
    authorize(request) {
      return {
        result: 'unknown',
        evidenceRef: opaqueRef(request),
        evaluatedAt: request.evaluatedAt.toISOString(),
      };
    },
  };
}

/** Resolve the configured adapter; anything other than `simulated` fails closed. */
export function paymentAdapterFor(name: string = config.PAYMENT_PROVIDER): PaymentAuthorizationAdapter {
  return name === simulatedPaymentAdapter.name ? simulatedPaymentAdapter : failClosedAdapter(name);
}
