// server.js - mini servidor HTTP só para Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Rota principal
app.get('/', (req, res) => {
    res.send('Bot rodando! 🚀');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Mini servidor ouvindo na porta ${PORT}`);
});
