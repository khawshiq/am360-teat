import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED, LEGAL_SERVICE_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — AM 360",
  description: "The terms under which academies may use AM 360.",
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>
        These terms govern use of {LEGAL_SERVICE_NAME}, academy-management software for academies,
        schools and training institutes. By creating an account you agree to them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must give accurate registration details and keep your password confidential.</li>
        <li>You are responsible for everything done under your account, including by trainers and administrators you invite.</li>
        <li>Tell us promptly if you believe an account has been accessed without permission.</li>
      </ul>

      <h2>Your data, and what you may enter</h2>
      <p>
        The records you enter remain yours. You grant us only the permission needed to host, process
        and display them back to you. You are responsible for having a lawful basis to enter other
        people&apos;s information — in particular students, parents and minors — and for the accuracy
        of what you enter.
      </p>

      <h2>Messaging</h2>
      <p>
        WhatsApp messages are sent from <strong>your own</strong> connected WhatsApp Business
        account, and you are the sender. You agree to:
      </p>
      <ul>
        <li>Message only people who have a genuine relationship with your academy and who expect to hear from you.</li>
        <li>Comply with WhatsApp&apos;s Business Messaging Policy and applicable anti-spam law.</li>
        <li>Honour opt-out requests promptly.</li>
      </ul>
      <p>
        Meta may restrict or disable a WhatsApp Business account that breaches its policies. That is
        Meta&apos;s decision, not ours, and we cannot reverse it.
      </p>

      <h2>Subscriptions and payment</h2>
      <ul>
        <li>Paid plans unlock higher limits and additional features; the current plan and its limits are shown in your account.</li>
        <li>Prices are in Indian Rupees and are charged for the period you select. Payments are processed by Razorpay.</li>
        <li>Access to paid features ends when a subscription expires. Your data is not deleted merely because a plan lapses.</li>
        <li>Except where the law requires otherwise, payments already made are non-refundable.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to access another academy&apos;s data, or probe, scan or disrupt the service.</li>
        <li>Use the service to send unlawful, deceptive or harassing messages.</li>
        <li>Resell or redistribute the service without our written agreement.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        We work to keep {LEGAL_SERVICE_NAME} available and reliable, but we do not guarantee
        uninterrupted service. Maintenance, provider outages and events outside our control can
        interrupt it. The service is provided &ldquo;as is&rdquo;, without warranties beyond those
        that cannot lawfully be excluded.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential loss, or for
        loss of profit or data. Our total liability in connection with the service is limited to the
        amount you paid us in the twelve months before the claim arose. Nothing here excludes
        liability that cannot lawfully be excluded.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        You may stop using {LEGAL_SERVICE_NAME} at any time and ask us to close your account — see{" "}
        <a href="/data-deletion">Data Deletion</a>. We may suspend an account that breaches these
        terms or puts other users at risk, and we will tell you why where we lawfully can.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Material changes will be reflected in the date at the top of this
        page and notified to account owners by email where the change affects how you use the
        service.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
