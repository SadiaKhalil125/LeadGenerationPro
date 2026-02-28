export default function CampaignResults({ results }) {
  if (!results) return null;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '25px',
        padding: '30px',
        boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
        marginBottom: '40px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#E0EFFF',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✉️
        </div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#00364A'
          }}
        >
          Campaign Results
        </h3>
      </div>

      <div style={{ marginBottom: '15px', color: '#00364A' }}>
        Total: {results.total} | Success: {results.success} | Failed: {results.failed}
      </div>

      <div
        style={{
          maxHeight: '160px',
          overflowY: 'auto',
          border: '1px solid rgba(0, 54, 74, 0.1)',
          borderRadius: '8px'
        }}
      >
        {results.details.map((r, i) => (
          <div
            key={i}
            style={{
              padding: '12px',
              fontSize: '14px',
              color: r.status === 'sent' ? '#10B981' : '#EF4444'
            }}
          >
            {r.contact} - {r.status}
          </div>
        ))}
      </div>
    </div>
  );
}