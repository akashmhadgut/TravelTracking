import { z } from 'zod';

export const ProblemDetailsSchema = z.object({
  type: z.string().url().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string(), // Stable machine-readable error code (e.g. 'trip.invalid_transition', 'auth.locked')
  invalidParams: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export class ProblemException extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly title: string;
  public readonly invalidParams?: { name: string; reason: string }[];

  constructor(params: {
    status: number;
    code: string;
    title: string;
    detail: string;
    invalidParams?: { name: string; reason: string }[];
  }) {
    super(params.detail);
    this.name = 'ProblemException';
    this.status = params.status;
    this.code = params.code;
    this.title = params.title;
    this.detail = params.detail;
    this.invalidParams = params.invalidParams;
  }

  toJSON(): ProblemDetails {
    return {
      type: `urn:fleet:error:${this.code}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      code: this.code,
      invalidParams: this.invalidParams,
    };
  }
}
