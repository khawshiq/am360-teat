import { z } from "zod";

// The Connect / Update Credentials form. Deliberately permissive on exact formats
// (Meta's ids are opaque numeric strings whose length isn't publicly documented) —
// the real validation of these values is `testConnection()` actually calling Meta.
// A password field gives no visual feedback, so pasting into one that already had a
// value — appending instead of replacing — is invisible until Meta answers "Malformed
// access token". Catching the exact doubling here turns a round-trip to Meta plus a
// bewildering error into an instruction.
const isDoubledPaste = (s: string) =>
  s.length >= 40 && s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2);

export const connectSchema = z.object({
  businessAccountId: z.string().trim().min(3, "Business Account ID is required"),
  phoneNumberId: z.string().trim().regex(/^\d+$/, "Phone Number ID must be numeric"),
  accessToken: z.string()
    // No access token contains whitespace, so a space or newline is always paste
    // damage — strip it rather than bouncing the admin for something we can repair.
    .transform(s => s.replace(/\s+/g, ""))
    .refine(s => s.length >= 20, "That doesn't look like a valid access token")
    .refine(s => !isDoubledPaste(s), "That access token appears to be pasted twice. Clear the field completely, then paste it once."),
  verifyToken: z.string().trim().optional(),
  webhookSecret: z.string().trim().optional(),
  academyId: z.string().trim().optional(), // Super Admin only — ignored for a tenant caller
});

export type ConnectInput = z.infer<typeof connectSchema>;
