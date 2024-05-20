const { ipcRenderer } = require('electron');
let wallets = [];

document.getElementById('generateBtn').addEventListener('click', () => {
    const numWallets = document.getElementById('numWallets').value;
    ipcRenderer.send('generate-wallets', numWallets);
});

ipcRenderer.on('wallets-generated', (event, generatedWallets) => {
    wallets = generatedWallets;
    const walletsList = document.getElementById('walletsList');
    walletsList.innerHTML = '<h3>Generated Wallets:</h3>';
    wallets.forEach(wallet => {
        walletsList.innerHTML += `<p>Public Key: ${wallet.publicKey} - Private Key (Base58): ${wallet.privateKeyBase58}</p>`;
    });
});

document.getElementById('sendSolBtn').addEventListener('click', () => {
    if (!wallets.length) {
        alert('Please generate wallets first.');
        return;
    }
    document.getElementById('modal').style.display = 'block';
});

document.getElementById('sendBtn').addEventListener('click', () => {
    const senderPrivateKeyBase58 = document.getElementById('senderPrivateKeyBase58').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!wallets.length) {
        alert('Please generate wallets first.');
        return;
    }

    if (senderPrivateKeyBase58 && amount > 0) {
        ipcRenderer.send('send-sol', senderPrivateKeyBase58, amount, wallets);
        document.getElementById('modal').style.display = 'none';
    } else {
        alert('Please enter valid details.');
    }
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});

ipcRenderer.on('send-success', () => {
    document.getElementById('transactionStatus').innerText = 'Transaction successful!';
});

ipcRenderer.on('send-error', (event, errorMessage) => {
    document.getElementById('transactionStatus').innerText = `Transaction failed: ${errorMessage}`;
});

document.getElementById('returnSolBtn').addEventListener('click', () => {
    const senderPublicKey = document.getElementById('senderPrivateKeyBase58').value.trim();
    ipcRenderer.send('return-sol', senderPublicKey, wallets);
});

ipcRenderer.on('return-success', () => {
    document.getElementById('returnStatus').innerText = 'Return successful!';
});

ipcRenderer.on('return-error', (event, errorMessage) => {
    document.getElementById('returnStatus').innerText = `Return failed: ${errorMessage}`;
});
