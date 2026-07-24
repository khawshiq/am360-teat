import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED, LEGAL_SERVICE_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Data Deletion — AM 360",
  description: "How to have your data deleted from AM 360, and what happens when you do.",
};

export default function DataDeletion() {
  return (
    <LegalPage title="Data Deletion" updated={LEGAL_UPDATED}>
      <p>
        This page explains how to have information deleted from {LEGAL_SERVICE_NAME}, and what
        happens when you ask. It is the deletion instructions URL referenced by our{" "}
        <a href="/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>If you are a student or a parent</h2>
      <p>
        Your record was created by the academy you are enrolled with, and that academy controls it.
        The fastest route is to ask the academy directly — an academy administrator can delete a
        student record from their console immediately.
      </p>
      <p>
        If you would rather come to us, email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> from the address or phone
        number on the record, with the student&apos;s name and the academy&apos;s name. We may need
        to confirm your identity, and we will normally confirm with the academy before deleting a
        record it relies on. We aim to complete verified requests within 30 days.
      </p>

      <h2>If you run an academy</h2>
      <ul>
        <li><strong>A single record</strong> — delete the student, trainer, branch or course from your admin console. It is removed immediately.</li>
        <li><strong>Your WhatsApp connection</strong> — open <em>Settings → Integrations → WhatsApp</em> and choose <strong>Disconnect</strong>. Your stored access token stops being used at once; to have it erased rather than deactivated, email us.</li>
        <li><strong>Your whole account</strong> — email us from the owner&apos;s registered address asking to close the academy. We will confirm, then delete the academy and everything under it: students, trainers, attendance, fees, payments, schedules, uploaded images, notification logs and audit records.</li>
      </ul>

      <h2>What deletion actually removes</h2>
      <p>When we delete an academy account, we remove:</p>
      <ul>
        <li>All student, parent and trainer records.</li>
        <li>Attendance history, including any attendance photographs.</li>
        <li>Fee, payment and receipt records.</li>
        <li>Uploaded images held with our image provider.</li>
        <li>Stored WhatsApp credentials and message logs.</li>
        <li>User accounts and their password hashes.</li>
      </ul>

      <h2>What we may keep, and why</h2>
      <ul>
        <li><strong>Encrypted backups</strong> — deleted data can persist in a backup until that backup rotates out on its normal schedule. It is not restored into the live service.</li>
        <li><strong>Payment records</strong> — we retain the reference, amount and date of subscription payments where tax or accounting law requires it. This concerns the academy&apos;s own billing, not student records.</li>
        <li><strong>Anonymous logs</strong> — server logs that no longer identify a person.</li>
      </ul>

      <h2>Deleting data held by WhatsApp</h2>
      <p>
        Messages already delivered through WhatsApp live on the recipient&apos;s device and on
        Meta&apos;s systems. Deleting your {LEGAL_SERVICE_NAME} data does not withdraw a message that
        was already sent. To remove data held by Meta, use the controls in your WhatsApp Business
        account.
      </p>

      <h2>Contact</h2>
      <p>
        Deletion requests and questions:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Please include the
        academy name so we can find the right account.
      </p>
    </LegalPage>
  );
}
