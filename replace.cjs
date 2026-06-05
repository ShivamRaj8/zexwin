const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  "const [walletTab, setWalletTab] = useState('deposit');",
  "const [walletTab, setWalletTab] = useState('deposit');\n  const [toastMessage, setToastMessage] = useState(null);\n  const showToast = (msg) => {\n    setToastMessage(msg);\n    setTimeout(() => setToastMessage(null), 3000);\n  };"
);

c = c.replace(/alert\(/g, "showToast(");

c = c.replace(
  "{currentRoute === 'lobby' && renderLobby()}",
  "{toastMessage && <div className=\"toast-notification\">{toastMessage}</div>}\n      {currentRoute === 'lobby' && renderLobby()}"
);

fs.writeFileSync('src/App.jsx', c);
