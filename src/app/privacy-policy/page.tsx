import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED, LEGAL_SERVICE_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — AM 360",
  description: "How AM 360 collects, uses, stores and deletes personal information.",
};

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        This policy explains what personal information {LEGAL_SERVICE_NAME} collects, why we collect
        it, who we share it with, and how you can have it deleted. It applies to the
        {" "}{LEGAL_SERVICE_NAME} web application and its Android app.
      </p>

      <h2>Who is responsible for your data</h2>
      <p>
        {LEGAL_SERVICE_NAME} is academy-management software sold to academies, schools and training
        institutes. Each academy that subscribes decides what information to enter about its own
        students, parents and staff, and is the <strong>data controller</strong> for that
        information. {LEGAL_SERVICE_NAME} operates the software and stores that information on the
        academy&apos;s behalf, as a <strong>data processor</strong>.
      </p>
      <p>
        In practice: if you are a student or a parent, the academy you are enrolled with holds your
        record and decides what goes in it. Contact them first for corrections or deletion — we act
        on their instruction, and we will also act directly on a request sent to us at the address
        at the bottom of this page.
      </p>

      <h2>Information we collect</h2>
      <p><strong>Account information</strong> — for the people who sign in to run an academy:</p>
      <ul>
        <li>Name, email address and role (owner, admin or trainer).</li>
        <li>A password, stored only as a one-way bcrypt hash. We never store it in readable form and cannot recover it.</li>
        <li>If you sign in with Google, your name, email address and Google account identifier, as provided by Google.</li>
        <li>Academy details: name, logo, description, branches and their addresses.</li>
      </ul>

      <p><strong>Student and parent records</strong> — entered by the academy, not by us:</p>
      <ul>
        <li>Student name, parent or guardian name, date of birth, gender and address.</li>
        <li>Phone numbers (student, alternate and emergency contact) and email address.</li>
        <li>Enrolment details: branch, course, batch, admission date and status.</li>
        <li>Optional photograph, and optional medical notes recorded by the academy for safety.</li>
        <li>Attendance records, including class photographs where an academy uses that feature.</li>
        <li>Fee amounts, due dates, payment records and receipts.</li>
      </ul>

      <p><strong>Technical information</strong> — created automatically as the service runs:</p>
      <ul>
        <li>An audit log of actions taken inside an academy&apos;s account (who changed what, and when), including the IP address of the person who sent a WhatsApp broadcast.</li>
        <li>Standard server logs kept by our hosting provider for security and reliability.</li>
      </ul>
      <p>
        We do not use advertising cookies, we do not track you across other websites, and we do not
        build advertising profiles. The only cookie-equivalent we set is the session token that keeps
        you signed in.
      </p>

      <h2>Children&apos;s information</h2>
      <p>
        Academies using {LEGAL_SERVICE_NAME} frequently teach children, so records held here often
        describe minors. Those records are created by the academy under its own relationship with the
        family, and are used only to deliver the academy&apos;s services — attendance, fees,
        schedules and communication with a parent or guardian. We do not use children&apos;s
        information for marketing, profiling or advertising of any kind, and we do not sell it.
      </p>

      <h2>How we use the information</h2>
      <ul>
        <li>To provide the service: enrolment, attendance, fee tracking, schedules and reports.</li>
        <li>To authenticate users and keep accounts secure.</li>
        <li>To send transactional email, such as a password-reset link.</li>
        <li>To send WhatsApp messages that the academy chooses to send — announcements, fee reminders and, where the academy switches it on, birthday wishes.</li>
        <li>To take subscription payments from the academy.</li>
        <li>To investigate misuse, and to meet a legal obligation where one applies.</li>
      </ul>
      <p><strong>We do not sell personal information, and we do not share it for advertising.</strong></p>

      <h2>WhatsApp messaging</h2>
      <p>
        Messages are sent through the WhatsApp Business Platform (Cloud API), operated by Meta. Each
        academy connects <strong>its own</strong> WhatsApp Business account and its own phone number
        — {LEGAL_SERVICE_NAME} does not send from a shared number, and one academy cannot message
        another academy&apos;s contacts.
      </p>
      <ul>
        <li>Recipients are only the phone numbers the academy has entered in its own student records.</li>
        <li>The academy&apos;s WhatsApp access token is encrypted at rest (AES-256-GCM) and is never displayed back, exported, or shared.</li>
        <li>The message content and the recipient&apos;s number are transmitted to Meta in order to deliver the message, and Meta&apos;s own terms and privacy policy apply to that delivery.</li>
        <li>We keep a log of each broadcast — who sent it, when, the message, and how many recipients succeeded or failed — so an academy can audit what went out in its name.</li>
      </ul>

      <h2>Service providers we use</h2>
      <p>
        We use a small number of established providers to run the service. Each receives only what it
        needs to perform its function:
      </p>
      <ul>
        <li><strong>Vercel</strong> — application hosting and server logs.</li>
        <li><strong>Neon</strong> — the managed PostgreSQL database where records are stored.</li>
        <li><strong>Cloudinary</strong> — storage and delivery of uploaded images (student photos, academy logos, attendance photos).</li>
        <li><strong>Meta Platforms</strong> — delivery of WhatsApp messages, as described above.</li>
        <li><strong>Razorpay</strong> — subscription payments made by the academy. Card and banking details are entered on Razorpay&apos;s systems and are never seen or stored by us; we retain only the payment reference, amount and status.</li>
        <li><strong>Resend</strong> — delivery of transactional email such as password resets.</li>
        <li><strong>Google</strong> — optional &ldquo;Sign in with Google&rdquo; authentication.</li>
      </ul>

      <h2>Security</h2>
      <ul>
        <li>All traffic is encrypted in transit with HTTPS/TLS.</li>
        <li>Passwords are stored as bcrypt hashes, never in readable form.</li>
        <li>Stored third-party access tokens are encrypted at rest with AES-256-GCM.</li>
        <li>Every academy&apos;s data is scoped to that academy at the database-query level, so one academy&apos;s account cannot read another&apos;s.</li>
        <li>Changes to records are recorded in an audit log attributable to the user who made them.</li>
      </ul>
      <p>
        No system is perfectly secure. If we become aware of a breach affecting personal information,
        we will notify affected academies without undue delay.
      </p>

      <h2>How long we keep information</h2>
      <p>
        We keep an academy&apos;s data for as long as its account is active, because the academy
        needs its own historical attendance and fee records. When an account is closed, or when an
        academy asks us to delete a record, we delete it as described on our{" "}
        <a href="/data-deletion">Data Deletion</a> page. Backups are cycled out on a rolling basis,
        so a deleted record may persist in an encrypted backup for a short period after deletion.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access the information held about you,
        correct it, have it deleted, or object to how it is used. Ask the academy that holds your
        record, or write to us at the address below and we will help — we may need to confirm your
        identity, or confirm with the academy, before acting on a request about a student&apos;s
        record.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes materially, we will update the date at the top of this page and, where
        the change affects how academies must operate, notify account owners by email.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy, or a request about your information:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
