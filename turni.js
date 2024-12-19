// Definiamo il dizionario come fonte primaria dei dati
let turni = {
    "32/21": { inizio: "15:15", fine: "23:15", giornoSuccessivo: false },
    "33/32/46": { inizio: "12:15", fine: "20:30", giornoSuccessivo: false },
    "233/232": { inizio: "13:20", fine: "07:00", giornoSuccessivo: true },
    "41/46": { inizio: "10:00", fine: "18:30", giornoSuccessivo: false },
    "611/610": { inizio: "12:45", fine: "19:20", giornoSuccessivo: false },
    "232/14/33": { inizio: "04:50", fine: "14:30", giornoSuccessivo: false },
    "596/10/31": { inizio: "14:50", fine: "15:00", giornoSuccessivo: true },
    "770/771": { inizio: "14:20", fine: "12:30", giornoSuccessivo: true },
    "235/234": { inizio: "15:50", fine: "16:30", giornoSuccessivo: true },
    "Riposo": { inizio: "00:00", fine: "23:59", giornoSuccessivo: false },
    "Intervallo": { inizio: "00:00", fine: "23:59", giornoSuccessivo: false },
    "Ferie": { inizio: "00:00", fine: "23:59", giornoSuccessivo: false },
    "Scuola": { inizio: "07:50", fine: "17:00", giornoSuccessivo: false },
    "Visita": { inizio: "07:50", fine: "13:00", giornoSuccessivo: false }
};

// All'inizio del file, definiamo i colori delle celle come costanti
const COLORI_CELLE = {
    VERDE: 'rgba(9, 236, 16, 1)',    // #09ec10 con opacità 1
    GIALLO: 'rgba(241, 234, 15, 1)', // #f1ea0f con opacità 1
    ROSSO: 'rgba(241, 11, 34, 1)'    // #f10b22 con opacità 1
};

// Definiamo i colori di default all'inizio del file
const COLORI_DEFAULT = {
    MATTEO: {
        background: '#ADD8E6',
        font: '#FFFFFF'
    },
    SARA: {
        background: '#FFB6C1',
        font: '#000000'
    }
};

// Definizione della configurazione di default
const CONFIG_DEFAULT = {
    logicaColori: {
        sovrapposizione: "#f10b22",
        scartoMinore2: "#f10b22",
        scartoTra2e3: "#f1ea0f",
        scartoMaggiore3: "#09ec10"
    },
    stiliDefault: {
        cellePadding: "2px",
        labelPadding: "6px 8px",
        labelRadius: "12px",
        labelHeight: "20px"
    }
};

let calendarInstance;
let eventi = JSON.parse(localStorage.getItem('eventi')) || {};
let selectedDate = null;
let coloreMatteo = localStorage.getItem('coloreMatteo') || COLORI_DEFAULT.MATTEO.background;
let coloreSara = localStorage.getItem('coloreSara') || COLORI_DEFAULT.SARA.background;
let coloreFontMatteo = localStorage.getItem('coloreFontMatteo') || COLORI_DEFAULT.MATTEO.font;
let coloreFontSara = localStorage.getItem('coloreFontSara') || COLORI_DEFAULT.SARA.font;

// Definiamo lo stato di Emma come fonte primaria
let emmaScuolaStato = {
    // Qui possiamo definire gli stati predefiniti per date specifiche
    // "2024-01-15": true,  // esempio: Emma a scuola il 15 gennaio
    // "2024-01-16": false  // esempio: Emma non a scuola il 16 gennaio
};

// Recuperiamo gli stati salvati dal localStorage solo se non sono già definiti nel codice
const emmaScuolaStorageStati = JSON.parse(localStorage.getItem('emmaScuolaStati')) || {};
Object.keys(emmaScuolaStorageStati).forEach(data => {
    if (!(data in emmaScuolaStato)) {
        emmaScuolaStato[data] = emmaScuolaStorageStati[data];
    }
});

function parseTime(timeStr, giornoSuccessivo = false) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Se il turno finisce il giorno dopo, aggiungiamo 24 ore
    return (giornoSuccessivo ? hours + 24 : hours) * 60 + minutes;
}

function siSovrappongono(inizio1, fine1, inizio2, fine2) {
    return (inizio1 < fine2 && fine1 > inizio2);
}

function calcolaScarto(fine1, inizio2, giornoSuccessivo = false) {
    // Se il turno finisce il giorno dopo, consideriamo le ore aggiuntive
    const fineEffettiva = giornoSuccessivo ? fine1 + (24 * 60) : fine1;
    return Math.abs(inizio2 - fineEffettiva) / 60;
}

// Aggiungiamo la funzione per verificare la compatibilità con gli orari di scuola
function verificaOrariScuola(turno) {
    const inizioTurno = parseTime(turni[turno].inizio);
    const fineTurno = parseTime(turni[turno].fine, turni[turno].giornoSuccessivo);
    
    // Per portare Emma a scuola, il turno deve iniziare dopo le 11:00
    // Per prenderla, il turno deve finire entro le 15:00 o iniziare dopo le 16:00
    return inizioTurno >= parseTime("11:00") || 
           (fineTurno <= parseTime("15:00") || inizioTurno >= parseTime("16:00"));
}

function calcolaColoreGiornata(turnoMatteo, turnoSara) {
    // Se uno dei due è in Riposo, Intervallo o Ferie OGGI, la cella è verde
    if (turnoMatteo === "Riposo" || turnoMatteo === "Intervallo" || turnoMatteo === "Ferie" || 
        turnoSara === "Riposo" || turnoSara === "Intervallo" || turnoSara === "Ferie") {
        return COLORI_CELLE.VERDE;
    }

    // Se uno dei due è in Scuola o Visita, trattiamolo come un turno normale
    // perché dobbiamo verificare la copertura degli orari

    const dataInput = document.getElementById('data-turno');
    // Se non c'è un elemento data-turno o non ha un valore, usa la data corrente
    const dataCorrente = dataInput && dataInput.value ? dataInput.value : new Date().toISOString().split('T')[0];
    
    // Verifica che la data sia valida
    const dataCorrenteObj = new Date(dataCorrente);
    if (isNaN(dataCorrenteObj.getTime())) {
        console.error('Data non valida:', dataCorrente);
        return COLORI_CELLE.VERDE; // Default a verde in caso di errore
    }

    const ieri = new Date(dataCorrenteObj);
    ieri.setDate(ieri.getDate() - 1);
    const dataIeri = ieri.toISOString().split('T')[0];
    
    // Controlliamo i turni di ieri
    const turniIeri = eventi[dataIeri] || {};
    const turnoIeriMatteo = turniIeri.matteo;
    const turnoIeriSara = turniIeri.sara;
    
    // Verifichiamo se c'è un turno notturno che finisce oggi
    const fineTurnoNotturnoMatteo = turnoIeriMatteo && turni[turnoIeriMatteo]?.giornoSuccessivo;
    const fineTurnoNotturnoSara = turnoIeriSara && turni[turnoIeriSara]?.giornoSuccessivo;

    // Aggiungiamo automaticamente "Rientro" per chi torna oggi
    if (fineTurnoNotturnoMatteo && !eventi[dataCorrente]?.matteo) {
        if (!eventi[dataCorrente]) {
            eventi[dataCorrente] = {};
        }
        eventi[dataCorrente].matteo = "Rientro";
        localStorage.setItem('eventi', JSON.stringify(eventi));
        calendarInstance.refetchEvents();
    }

    if (fineTurnoNotturnoSara && !eventi[dataCorrente]?.sara) {
        if (!eventi[dataCorrente]) {
            eventi[dataCorrente] = {};
        }
        eventi[dataCorrente].sara = "Rientro";
        localStorage.setItem('eventi', JSON.stringify(eventi));
        calendarInstance.refetchEvents();
    }

    // Aggiungiamo "Rientro" al dizionario dei turni se non esiste già
    if (!turni["Rientro"]) {
        turni["Rientro"] = { inizio: "00:00", fine: "23:59", giornoSuccessivo: false };
    }

    // Se uno dei due non ha turno, cella verde
    if (!turnoMatteo || !turnoSara || !turni[turnoMatteo] || !turni[turnoSara]) {
        return COLORI_CELLE.VERDE;
    }

    const inizioMatteo = parseTime(turni[turnoMatteo].inizio);
    const fineMatteo = parseTime(turni[turnoMatteo].fine, turni[turnoMatteo].giornoSuccessivo);
    const inizioSara = parseTime(turni[turnoSara].inizio);
    const fineSara = parseTime(turni[turnoSara].fine, turni[turnoSara].giornoSuccessivo);

    // Se c'è un turno notturno che finisce oggi, verifichiamo la sovrapposizione
    if (fineTurnoNotturnoMatteo || fineTurnoNotturnoSara) {
        const fineNotturnoMatteo = fineTurnoNotturnoMatteo ? parseTime(turni[turnoIeriMatteo].fine) : 0;
        const fineNotturnoSara = fineTurnoNotturnoSara ? parseTime(turni[turnoIeriSara].fine) : 0;
        
        // Se chi ha fatto il turno notturno finisce dopo che l'altro deve iniziare
        if ((fineTurnoNotturnoMatteo && fineNotturnoMatteo > inizioSara) || 
            (fineTurnoNotturnoSara && fineNotturnoSara > inizioMatteo)) {
            return COLORI_CELLE.ROSSO;
        }
    }

    // Verifica se Emma è a scuola per questa data
    const emmaAScuola = emmaScuolaStato[dataCorrente] ?? eventi[dataCorrente]?.emmaScuola;

    // Se Emma è a scuola
    if (emmaAScuola) {
        // Verifica gestione mattina (qualcuno deve essere a casa o iniziare dopo le 11:00)
        const mattinaCoperta = 
            inizioMatteo >= parseTime("11:00") || 
            inizioSara >= parseTime("11:00") ||
            fineMatteo <= parseTime("08:00") ||
            fineSara <= parseTime("08:00");

        // Verifica gestione pomeriggio (qualcuno deve essere a casa o finire entro le 15:00 o iniziare dopo le 18:00)
        const pomeriggioCoperto = 
            fineMatteo <= parseTime("15:00") || 
            fineSara <= parseTime("15:00") ||
            inizioMatteo >= parseTime("18:00") ||
            inizioSara >= parseTime("18:00");

        // La giornata è verde solo se sia mattina che pomeriggio sono coperti
        return (mattinaCoperta && pomeriggioCoperto) ? COLORI_CELLE.VERDE : COLORI_CELLE.ROSSO;
    } 
    // Se Emma non è a scuola
    else {
        // Calcola lo scarto in entrambe le direzioni considerando i turni notturni
        const scartoMatteoPrima = calcolaScarto(fineMatteo, inizioSara, turni[turnoMatteo].giornoSuccessivo);
        const scartoSaraPrima = calcolaScarto(fineSara, inizioMatteo, turni[turnoSara].giornoSuccessivo);
        
        // Usa lo scarto maggiore tra i due
        const scarto = Math.max(scartoMatteoPrima, scartoSaraPrima);
        
        if (scarto >= 3) {
            return COLORI_CELLE.VERDE;
        } else if (scarto >= 2) {
            return COLORI_CELLE.GIALLO;
        } else {
            return COLORI_CELLE.ROSSO;
        }
    }
}

function creaEventoPersona(persona, numeroTreno, data) {
    const coloreLabel = persona === 'matteo' ? coloreMatteo : coloreSara;
    const coloreTesto = persona === 'matteo' ? coloreFontMatteo : coloreFontSara;
    
    // Se è un rientro, modifichiamo il testo visualizzato
    const titolo = numeroTreno === 'Rientro' ? 
        `${persona.charAt(0).toUpperCase() + persona.slice(1)}: Rientro` :
        `${persona.charAt(0).toUpperCase() + persona.slice(1)}: ${numeroTreno}`;
    
    return {
        title: titolo,
        start: data,
        backgroundColor: coloreLabel,
        borderColor: coloreLabel,
        textColor: coloreTesto,
        classNames: ['turno-label'],
        display: 'block',
        extendedProps: {
            persona: persona,
            numeroTreno: numeroTreno
        }
    };
}

// Aggiungiamo una funzione per aggiornare il checkbox quando si seleziona una data
function aggiornaCheckboxEmma(data) {
    const checkbox = document.getElementById('emma-scuola');
    // Prima controlla nel dizionario del codice, poi nel localStorage
    const statoEmma = emmaScuolaStato[data] ?? eventi[data]?.emmaScuola;
    checkbox.checked = statoEmma || false;
}

// Aggiungiamo variabili per lo stato corrente
let currentSelection = {
    data: localStorage.getItem('currentData') || '',
    persona: localStorage.getItem('currentPersona') || 'matteo',
    treno: localStorage.getItem('currentTreno') || '',
};

document.addEventListener('DOMContentLoaded', function() {
    // Popola il select dei treni
    const selectTreni = document.getElementById('numero-treno');
    Object.keys(turni).forEach(numeroTreno => {
        const option = document.createElement('option');
        option.value = numeroTreno;
        option.textContent = `${numeroTreno} (${turni[numeroTreno].inizio}-${turni[numeroTreno].fine}${turni[numeroTreno].giornoSuccessivo ? ' +1' : ''})`;
        selectTreni.appendChild(option);
    });

    // Ripristina lo stato precedente
    document.getElementById('data-turno').value = currentSelection.data;
    document.getElementById('persona').value = currentSelection.persona;
    document.getElementById('numero-treno').value = currentSelection.treno;
    
    // Se c'è una data selezionata, aggiorna il checkbox di Emma e seleziona la cella
    if (currentSelection.data) {
        selectedDate = currentSelection.data;
        aggiornaCheckboxEmma(currentSelection.data);
        
        // Attendi che il calendario sia renderizzato prima di selezionare la cella
        setTimeout(() => {
            const cells = document.querySelectorAll('.fc-day');
            cells.forEach(cell => {
                if (cell.dataset.date === currentSelection.data) {
                    cell.classList.add('selected-day');
                }
            });
        }, 100);
    }

    const calendarEl = document.getElementById('calendario');
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'it',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: function(info, successCallback) {
            const eventiFormattati = [];
            
            Object.entries(eventi).forEach(([data, turniGiorno]) => {
                // Aggiungi eventi separati per Matteo e Sara
                if (turniGiorno.matteo) {
                    eventiFormattati.push(creaEventoPersona('matteo', turniGiorno.matteo, data));
                }
                if (turniGiorno.sara) {
                    eventiFormattati.push(creaEventoPersona('sara', turniGiorno.sara, data));
                }

                // Aggiungi l'evento di background per il colore della giornata
                const coloreGiornata = calcolaColoreGiornata(turniGiorno.matteo, turniGiorno.sara);
                eventiFormattati.push({
                    start: data,
                    display: 'background',
                    backgroundColor: coloreGiornata,
                    classNames: ['giorno-background']
                });
            });
            
            successCallback(eventiFormattati);
        },
        dateClick: function(info) {
            document.querySelectorAll('.selected-day').forEach(el => {
                el.classList.remove('selected-day');
            });
            
            info.dayEl.classList.add('selected-day');
            selectedDate = info.dateStr;
            
            // Aggiorna e salva la selezione corrente
            currentSelection.data = selectedDate;
            localStorage.setItem('currentData', currentSelection.data);
            
            document.getElementById('data-turno').value = selectedDate;
            aggiornaCheckboxEmma(selectedDate);
        }
    });
    calendarInstance.render();

    // Recupera i colori salvati o usa i default
    coloreMatteo = localStorage.getItem('coloreMatteo') || COLORI_DEFAULT.MATTEO.background;
    coloreSara = localStorage.getItem('coloreSara') || COLORI_DEFAULT.SARA.background;
    coloreFontMatteo = localStorage.getItem('coloreFontMatteo') || COLORI_DEFAULT.MATTEO.font;
    coloreFontSara = localStorage.getItem('coloreFontSara') || COLORI_DEFAULT.SARA.font;
    
    // Imposta i valori dei color picker
    document.getElementById('coloreMatteo').value = coloreMatteo;
    document.getElementById('coloreSara').value = coloreSara;
    document.getElementById('coloreFontMatteo').value = coloreFontMatteo;
    document.getElementById('coloreFontSara').value = coloreFontSara;
});

function aggiungiTurno() {
    const data = document.getElementById('data-turno').value;
    const persona = document.getElementById('persona').value;
    const numeroTreno = document.getElementById('numero-treno').value;
    const emmaScuola = document.getElementById('emma-scuola').checked;

    if (!data || !numeroTreno) {
        alert('Inserisci tutti i dati richiesti');
        return;
    }

    if (!turni[numeroTreno]) {
        alert('Numero treno non valido');
        return;
    }

    if (!eventi[data]) {
        eventi[data] = {};
    }

    // Aggiorna prima lo stato nel codice
    emmaScuolaStato[data] = emmaScuola;
    
    // Poi salva nel localStorage
    eventi[data].emmaScuola = emmaScuola;
    eventi[data][persona] = numeroTreno;
    
    localStorage.setItem('eventi', JSON.stringify(eventi));
    localStorage.setItem('emmaScuolaStati', JSON.stringify(emmaScuolaStato));
    
    calendarInstance.refetchEvents();
}

function ripulisciGiorno() {
    const data = selectedDate || document.getElementById('data-turno').value;
    
    if (!data) {
        alert('Seleziona una data da ripulire');
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare tutti i turni del giorno ${data}?`)) {
        // Rimuovi dal dizionario degli stati di Emma
        delete emmaScuolaStato[data];
        
        // Rimuovi dagli eventi
        if (eventi[data]) {
            delete eventi[data];
        }
        
        // Salva le modifiche nel localStorage
        localStorage.setItem('eventi', JSON.stringify(eventi));
        localStorage.setItem('emmaScuolaStati', JSON.stringify(emmaScuolaStato));
        
        // Pulisci la selezione corrente
        currentSelection = { data: '', persona: 'matteo', treno: '' };
        localStorage.removeItem('currentData');
        localStorage.removeItem('currentPersona');
        localStorage.removeItem('currentTreno');
        
        // Pulisci i campi del form
        document.getElementById('numero-treno').value = '';
        document.getElementById('data-turno').value = '';
        document.getElementById('emma-scuola').checked = false;
        document.getElementById('persona').value = 'matteo';
        
        // Rimuovi la selezione visiva dalla cella
        document.querySelectorAll('.selected-day').forEach(el => {
            el.classList.remove('selected-day');
        });
        
        // Resetta la data selezionata
        selectedDate = null;
        
        // Aggiorna il calendario
        if (calendarInstance) {
            calendarInstance.refetchEvents();
            
            // Forza il re-render del calendario
            const calendarEl = document.getElementById('calendario');
            if (calendarEl) {
                calendarInstance.render();
            }
        }
        
        alert('Giorno ripulito con successo!');
    }
}

function cambiaColore(persona, colore, tipo) {
    if (persona === 'matteo') {
        if (tipo === 'background') {
            coloreMatteo = colore;
            localStorage.setItem('coloreMatteo', colore);
        } else {
            coloreFontMatteo = colore;
            localStorage.setItem('coloreFontMatteo', colore);
        }
    } else {
        if (tipo === 'background') {
            coloreSara = colore;
            localStorage.setItem('coloreSara', colore);
        } else {
            coloreFontSara = colore;
            localStorage.setItem('coloreFontSara', colore);
        }
    }
    calendarInstance.refetchEvents();
}

// Funzione per esportare la configurazione
function esportaConfig() {
    const config = {
        ...CONFIG_DEFAULT,
        timestamp: new Date().toISOString()
    };

    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const dataOra = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `calendario_config_${dataOra}.json`;
    
    a.href = url;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Funzione per importare la configurazione
function importaConfig(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const configImportata = JSON.parse(e.target.result);
                
                // Verifica che il file contenga i dati necessari
                if (!configImportata.logicaColori || !configImportata.stiliDefault) {
                    throw new Error('File di configurazione non valido');
                }

                if (confirm('Questa operazione sovrascriverà la configurazione esistente. Continuare?')) {
                    // Aggiorna gli stili CSS dinamicamente
                    const root = document.documentElement;
                    Object.entries(configImportata.stiliDefault).forEach(([key, value]) => {
                        root.style.setProperty(`--${key}`, value);
                    });
                    
                    // Aggiorna i colori della logica
                    Object.assign(COLORI_CELLE, {
                        ROSSO: configImportata.logicaColori.scartoMinore2,
                        GIALLO: configImportata.logicaColori.scartoTra2e3,
                        VERDE: configImportata.logicaColori.scartoMaggiore3
                    });
                    
                    // Aggiorna il calendario
                    calendarInstance.refetchEvents();
                    
                    alert('Configurazione importata con successo!');
                }
            } catch (error) {
                alert('Errore durante l\'importazione della configurazione: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
    
    input.value = '';
}

// Modifica la funzione esportaDati esistente per esportare solo i dati
function esportaDati() {
    const datiDaEsportare = {
        eventi: eventi,
        coloreMatteo: coloreMatteo,
        coloreSara: coloreSara,
        coloreFontMatteo: coloreFontMatteo,
        coloreFontSara: coloreFontSara,
        timestamp: new Date().toISOString()
    };

    const jsonString = JSON.stringify(datiDaEsportare, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const dataOra = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `calendario_dati_${dataOra}.json`;
    
    a.href = url;
    a.click();
    window.URL.revokeObjectURL(url);
}

function importaDati(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const datiImportati = JSON.parse(e.target.result);
                
                // Verifica che il file contenga i dati necessari
                if (!datiImportati.eventi || !datiImportati.coloreMatteo || !datiImportati.coloreSara ||
                    !datiImportati.coloreFontMatteo || !datiImportati.coloreFontSara) {
                    throw new Error('File non valido');
                }

                // Chiedi conferma prima di sovrascrivere
                if (confirm('Questa operazione sovrascriverà tutti i dati esistenti. Continuare?')) {
                    // Aggiorna tutti i dati
                    eventi = datiImportati.eventi;
                    coloreMatteo = datiImportati.coloreMatteo;
                    coloreSara = datiImportati.coloreSara;
                    coloreFontMatteo = datiImportati.coloreFontMatteo;
                    coloreFontSara = datiImportati.coloreFontSara;
                    
                    // Salva nel localStorage
                    localStorage.setItem('eventi', JSON.stringify(eventi));
                    localStorage.setItem('coloreMatteo', coloreMatteo);
                    localStorage.setItem('coloreSara', coloreSara);
                    localStorage.setItem('coloreFontMatteo', coloreFontMatteo);
                    localStorage.setItem('coloreFontSara', coloreFontSara);
                    
                    // Aggiorna i color picker
                    document.getElementById('coloreMatteo').value = coloreMatteo;
                    document.getElementById('coloreSara').value = coloreSara;
                    document.getElementById('coloreFontMatteo').value = coloreFontMatteo;
                    document.getElementById('coloreFontSara').value = coloreFontSara;
                    
                    // Aggiorna il calendario
                    calendarInstance.refetchEvents();
                    
                    alert('Dati importati con successo!');
                }
            } catch (error) {
                alert('Errore durante l\'importazione: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
    
    // Reset input file
    input.value = '';
}

// La funzione aggiungiTurnoStraordinario ora non salva più nel localStorage
async function aggiungiTurnoStraordinario() {
    const numeroTreno = document.getElementById('nuovo-treno').value;
    const oraInizio = document.getElementById('ora-inizio').value;
    const oraFine = document.getElementById('ora-fine').value;
    const giornoSuccessivo = document.getElementById('turno-notturno').checked;

    if (!numeroTreno || !oraInizio || !oraFine) {
        alert('Inserisci tutti i dati richiesti');
        return;
    }

    if (turni[numeroTreno]) {
        alert('Questo numero treno esiste già nel dizionario');
        return;
    }

    try {
        // Invia i dati al server
        const response = await fetch('http://localhost:3000/aggiungiTurno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                numeroTreno,
                oraInizio,
                oraFine,
                giornoSuccessivo
            })
        });

        if (!response.ok) {
            throw new Error('Errore durante il salvataggio');
        }

        // Aggiungi il nuovo turno al dizionario in memoria
        turni[numeroTreno] = {
            inizio: oraInizio,
            fine: oraFine,
            giornoSuccessivo: giornoSuccessivo
        };

        // Aggiorna il select dei treni
        const selectTreni = document.getElementById('numero-treno');
        const option = document.createElement('option');
        option.value = numeroTreno;
        option.textContent = `${numeroTreno} (${oraInizio}-${oraFine}${giornoSuccessivo ? ' +1' : ''})`;
        selectTreni.appendChild(option);

        // Reset form
        document.getElementById('nuovo-treno').value = '';
        document.getElementById('ora-inizio').value = '';
        document.getElementById('ora-fine').value = '';
        document.getElementById('turno-notturno').checked = false;

        alert('Turno straordinario aggiunto con successo!');
        
    } catch (error) {
        alert('Errore durante l\'aggiunta del turno: ' + error.message);
    }
}

// Aggiungiamo listener per salvare le selezioni
document.getElementById('persona').addEventListener('change', function(e) {
    currentSelection.persona = e.target.value;
    localStorage.setItem('currentPersona', currentSelection.persona);
});

document.getElementById('numero-treno').addEventListener('change', function(e) {
    currentSelection.treno = e.target.value;
    localStorage.setItem('currentTreno', currentSelection.treno);
});
 