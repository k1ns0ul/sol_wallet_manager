const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const { Keypair, Connection, Transaction, PublicKey, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');

const LAMPORTS_PER_SOL = BigInt(1000000000); // 10^9 lamports per SOL

const solToLamports = (sol) => {
    return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
};

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('generate-wallets', (event, numWallets) => {
    const wallets = generateWallets(numWallets);
    const filename = dialog.showSaveDialogSync(mainWindow, {
        title: 'Save Solana Wallets',
        defaultPath: 'solana_wallets.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (filename) {
        writeWalletsToFile(wallets, filename);
    }
    event.reply('wallets-generated', wallets);
});

ipcMain.on('send-sol', async (event, senderPrivateKeyBase58, amount, wallets) => {
    try {
        console.log('Sending SOL...');
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const senderPrivateKey = bs58.decode(senderPrivateKeyBase58);
        const senderAccount = Keypair.fromSecretKey(senderPrivateKey);

        const balance = await connection.getBalance(senderAccount.publicKey);
        const lamports = solToLamports(amount); // Преобразование SOL в lamports

        if (BigInt(balance) < BigInt(lamports) + BigInt(5000)) {
            throw new Error('Insufficient funds');
        }

        const lamportsPerWallet = BigInt(lamports) / BigInt(wallets.length); 

        for (const wallet of wallets) {
            const recipientAccount = new PublicKey(wallet.publicKey);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderAccount.publicKey,
                    toPubkey: recipientAccount,
                    lamports: lamportsPerWallet
                })
            );

            await sendAndConfirmTransaction(connection, transaction, [senderAccount]);
        }

        event.reply('send-success');
    } catch (error) {
        console.error('Send SOL error:', error);
        event.reply('send-error', error.message);
    }
});

ipcMain.on('return-sol', async (event, senderPublicKey, wallets) => {
    try {
        console.log('Returning SOL...');
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const senderAccount = new PublicKey(senderPublicKey);

        for (const wallet of wallets) {
            const recipientPrivateKey = bs58.decode(wallet.privateKeyBase58);
            const recipientAccount = Keypair.fromSecretKey(recipientPrivateKey);

            const balance = await connection.getBalance(recipientAccount.publicKey);

            if (balance > 5000n) {
                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: recipientAccount.publicKey,
                        toPubkey: senderAccount,
                        lamports: balance - 5000n 
                    })
                );

                await sendAndConfirmTransaction(connection, transaction, [recipientAccount]);
            }
        }

        event.reply('return-success');
    } catch (error) {
        console.error('Return SOL error:', error);
        event.reply('return-error', error.message);
    }
});

function generateSolanaWallet() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    return { publicKey, privateKeyBase58 };
}

function writeWalletsToFile(wallets, filename) {
    let data = '';
    wallets.forEach(wallet => {
        data += `${wallet.publicKey} : ${wallet.privateKeyBase58}\n`;
    });

    fs.writeFileSync(filename, data, { encoding: 'utf-8' });
}

function generateWallets(numWallets) {
    const wallets = [];
    for (let i = 0; i < numWallets; i++) {
        wallets.push(generateSolanaWallet());
    }
    return wallets;
}
