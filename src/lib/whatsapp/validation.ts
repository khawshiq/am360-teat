import { z } from "zod";

// The Connect / Update Credentials form. Deliberately permissive on exact formats
// (Meta's ids are opaque numeric strings whose length isn't publicly documented) —
// the real validation of these values is `testConnection()` actually calling Meta.
export const connectSchema = z.object({
  businessAccountId: z.string().trim().min(3, "Business Account ID is required"),
  phoneNumberId: z.string().trim().regex(/^\d+$/, "Phone Number ID must be numeric"),
  accessToken: z.string().trim().min(20, "That doesn't look like a valid access token"),
  verifyToken: z.string().trim().optional(),
  webhookSecret: z.string().trim().optional(),
  academyId: z.string().trim().optional(), // Super Admin only — ignored for a tenant caller
});

export type ConnectInput = z.infer<typeof connectSchema>;
