const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// Endpoint per aggiungere un nuovo turno
app.post('/aggiungiTurno', (req, res) => {
    const { numeroTreno, oraInizio, oraFine } = req.body;
    
    // Leggi il file turni.js
    const filePath = path.join(__dirname, 'turni.js');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Trova la definizione del dizionario turni
    const dizionarioRegex = /let turni = {([^}]*)}/;
    const match = content.match(dizionarioRegex);
    
    if (match) {
        // Prepara il nuovo turno
        const nuovoTurno = `    "${numeroTreno}": { inizio: "${oraInizio}", fine: "${oraFine}" },\n`;
        
        // Inserisci il nuovo turno dopo l'apertura del dizionario
        const nuovoContenuto = content.replace(
            'let turni = {',
            'let turni = {\n' + nuovoTurno
        );
        
        // Scrivi il file
        fs.writeFileSync(filePath, nuovoContenuto);
        
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Impossibile trovare il dizionario turni' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
}); 