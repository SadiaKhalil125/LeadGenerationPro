import { FiMail } from "react-icons/fi";
export default function ProviderSelector({ value, onChange }) {
  const providers = [
    { label: 'SMTP', value: 'smtp' },
    { label: 'SendGrid', value: 'sendgrid' },
    { label: 'AWS SES', value: 'ses' },
    { label: 'HubSpot', value: 'hubspot' },
    { label: 'Twilio', value: 'twilio' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{
        display: 'block',
        marginBottom: '10px',
        fontWeight: '600',
        color: '#00364A',
        fontSize: '15px'
      }}>
        <FiMail style={{ marginRight: '8px', display: 'inline' }} />
        Email Provider
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '12px 15px',
          border: '2px solid rgba(0, 54, 74, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          outline: 'none',
          transition: 'all 0.3s'
        }}
        onFocus={e => {
          e.target.style.borderColor = '#49A3C4';
          e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
          e.target.style.boxShadow = 'none';
        }}
      >
        {providers.map(p => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}