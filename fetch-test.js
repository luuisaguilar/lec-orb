fetch("http://localhost:3000/api/v1/audit-logs").then(r => r.text()).then(t => console.log(t)).catch(console.error);
