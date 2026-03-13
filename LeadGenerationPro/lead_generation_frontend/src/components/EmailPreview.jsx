export default function EmailPreview({ content }) {
  if (!content) return null;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '25px',
        padding: '30px',
        boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)'
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#00364A',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}
      >
        <span
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
          👁️
        </span>
        Email Preview (using 1st contact)
      </div>

      <div
        style={{
          backgroundColor: '#F8FBFF',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(73, 163, 196, 0.2)',
          whiteSpace: 'pre-wrap'
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}