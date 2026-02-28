// import axios from "axios";

// export default function CSVUploader({ setContacts }) {
//   const handleUpload = async (e) => {
//     const formData = new FormData();
//     formData.append("file", e.target.files[0]);

//     const res = await axios.post(
//       "http://localhost:8000/api/outreach/upload",
//       formData
//     );

//     setContacts(res.data.contacts);
//   };

//   return <input type="file" accept=".csv" onChange={handleUpload} />;
// }