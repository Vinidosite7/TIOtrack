export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '60px 24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#E2E8F0', background: '#050810', minHeight: '100vh',
      lineHeight: 1.7,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 40 }}>Last updated: June 25, 2026</p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>1. Overview</h2>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          TioTrack ("we", "our", or "us") is a private marketing analytics dashboard that connects to advertising platforms such as Meta Ads and TikTok Ads to consolidate campaign performance data. This Privacy Policy explains how we collect, use, and protect information when you use our platform at tiotrack.vercel.app.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>2. Information We Collect</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 8 }}>We collect the following types of information:</p>
        <ul style={{ fontSize: 14, color: '#94A3B8', paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#CBD5E1' }}>Account credentials:</strong> Email address and password used to create your TioTrack account.</li>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#CBD5E1' }}>Ad platform tokens:</strong> Access tokens from Meta Ads and TikTok Ads, stored encrypted in our database, used solely to retrieve campaign performance data.</li>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#CBD5E1' }}>Campaign data:</strong> Spend, impressions, clicks, ROAS, and other performance metrics pulled from connected ad accounts.</li>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#CBD5E1' }}>Sales data:</strong> Transaction information received via webhook from payment platforms (e.g. SharkBot), including amount, status, and UTM parameters.</li>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#CBD5E1' }}>Usage data:</strong> Basic analytics about how you interact with the dashboard.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>3. How We Use Your Information</h2>
        <ul style={{ fontSize: 14, color: '#94A3B8', paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>To display advertising performance metrics in your dashboard</li>
          <li style={{ marginBottom: 6 }}>To calculate ROAS, profit margins, and other KPIs</li>
          <li style={{ marginBottom: 6 }}>To send low-balance alerts for connected ad accounts</li>
          <li style={{ marginBottom: 6 }}>To correlate sales data with advertising campaigns via UTM parameters</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>4. Meta Platform Data</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 8 }}>
          TioTrack uses the Meta Marketing API to access advertising data from connected Meta Business Manager accounts. Specifically:
        </p>
        <ul style={{ fontSize: 14, color: '#94A3B8', paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>We access ad account performance data (spend, impressions, clicks, conversions) using the <code style={{ background: '#1E293B', padding: '1px 6px', borderRadius: 3 }}>ads_read</code> and <code style={{ background: '#1E293B', padding: '1px 6px', borderRadius: 3 }}>ads_management</code> permissions</li>
          <li style={{ marginBottom: 6 }}>We access Business Manager information using the <code style={{ background: '#1E293B', padding: '1px 6px', borderRadius: 3 }}>business_management</code> permission</li>
          <li style={{ marginBottom: 6 }}>All Meta data is used exclusively for displaying analytics within the user's own dashboard</li>
          <li style={{ marginBottom: 6 }}>We do not share, sell, or use Meta platform data for advertising or any purpose other than providing the core analytics functionality</li>
          <li style={{ marginBottom: 6 }}>Meta data is stored securely and deleted upon user request or account deletion</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>5. Data Storage and Security</h2>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          All data is stored in Supabase (PostgreSQL) with row-level security (RLS) enabled, ensuring each user can only access their own data. Access tokens are stored encrypted. We use HTTPS for all data transmission. We do not store payment card information or sensitive personal data beyond what is necessary to provide the service.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>6. Data Sharing</h2>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          We do not sell, trade, or share your personal information or advertising data with third parties, except as required by law or as necessary to provide the service (e.g. Supabase for database hosting, Vercel for application hosting).
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>7. Data Deletion</h2>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          You may request deletion of your account and all associated data at any time by contacting us at the email below. Upon request, we will permanently delete all your data including connected ad account tokens, campaign data, and sales records within 30 days.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>8. Your Rights</h2>
        <ul style={{ fontSize: 14, color: '#94A3B8', paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Access and export your data at any time from the dashboard</li>
          <li style={{ marginBottom: 6 }}>Disconnect any ad platform integration at any time</li>
          <li style={{ marginBottom: 6 }}>Request complete account and data deletion</li>
          <li style={{ marginBottom: 6 }}>Revoke Meta API access at any time via your Meta Business Settings</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>9. Contact</h2>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          For privacy-related questions or data deletion requests, contact us at:<br />
          <a href="mailto:vnmktagencia@gmail.com" style={{ color: '#3B82F6' }}>vnmktagencia@gmail.com</a>
        </p>
      </section>

      <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, marginTop: 40 }}>
        <p style={{ fontSize: 12, color: '#475569' }}>
          © 2026 TioTrack. This privacy policy applies to the TioTrack platform at tiotrack.vercel.app.
        </p>
      </div>
    </div>
  )
}
