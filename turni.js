// Sostituiamo la definizione costante con una let
let turni = JSON.parse(localStorage.getItem('turniDizionario')) || {

    
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

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function siSovrappongono(inizio1, fine1, inizio2, fine2) {
    return (inizio1 < fine2 && fine1 > inizio2);
}

function calcolaScarto(fine1, inizio2) {
    return Math.abs(inizio2 - fine1) / 60;
}

function calcolaColoreGiornata(turnoMatteo, turnoSara) {
    // Se uno dei due turni non esiste nel dizionario, ritorna verde
    if (!turnoMatteo || !turnoSara || !turni[turnoMatteo] || !turni[turnoSara]) {
        return COLORI_CELLE.VERDE;
    }

    const inizioMatteo = parseTime(turni[turnoMatteo].inizio);
    const fineMatteo = parseTime(turni[turnoMatteo].fine);
    const inizioSara = parseTime(turni[turnoSara].inizio);
    const fineSara = parseTime(turni[turnoSara].fine);

    if (siSovrappongono(inizioMatteo, fineMatteo, inizioSara, fineSara)) {
        return COLORI_CELLE.ROSSO;
    }

    const scarto = calcolaScarto(fineMatteo, inizioSara);
    
    if (scarto > 3) {
        return COLORI_CELLE.VERDE;
    } else if (scarto >= 2 && scarto <= 3) {
        return COLORI_CELLE.GIALLO;
    } else {
        return COLORI_CELLE.ROSSO;
    }
}

function creaEventoPersona(persona, numeroTreno, data) {
    const coloreLabel = persona === 'matteo' ? coloreMatteo : coloreSara;
    const coloreTesto = persona === 'matteo' ? coloreFontMatteo : coloreFontSara;
    
    return {
        title: `${persona.charAt(0).toUpperCase() + persona.slice(1)}: ${numeroTreno}`,
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

document.addEventListener('DOMContentLoaded', function() {
    // Popola il select dei treni
    const selectTreni = document.getElementById('numero-treno');
    Object.keys(turni).forEach(numeroTreno => {
        const option = document.createElement('option');
        option.value = numeroTreno;
        option.textContent = `${numeroTreno} (${turni[numeroTreno].inizio}-${turni[numeroTreno].fine})`;
        selectTreni.appendChild(option);
    });

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
        eventDidMount: function(info) {
            if (info.event.display !== 'background') {
                info.el.style.margin = '2px';
                info.el.style.padding = '4px 8px';
                info.el.style.borderRadius = '4px';
                info.el.style.fontSize = '1em';
                info.el.style.fontWeight = '500';
            }
            if (info.event.display === 'background') {
                info.el.style.opacity = '1';
            }
        },
        dateClick: function(info) {
            // Rimuovi la classe selected-day da tutte le celle
            document.querySelectorAll('.selected-day').forEach(el => {
                el.classList.remove('selected-day');
            });
            
            // Aggiungi la classe alla cella cliccata
            info.dayEl.classList.add('selected-day');
            
            // Salva la data selezionata
            selectedDate = info.dateStr;
            
            // Aggiorna il campo data nel form
            document.getElementById('data-turno').value = selectedDate;
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

    eventi[data][persona] = numeroTreno;
    localStorage.setItem('eventi', JSON.stringify(eventi));
    
    calendarInstance.refetchEvents();
    
    // Reset form
    document.getElementById('numero-treno').value = '';
}

function ripulisciGiorno() {
    const data = selectedDate || document.getElementById('data-turno').value;
    
    if (!data) {
        alert('Seleziona una data da ripulire');
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare tutti i turni del giorno ${data}?`)) {
        if (eventi[data]) {
            delete eventi[data];
            localStorage.setItem('eventi', JSON.stringify(eventi));
            calendarInstance.refetchEvents();
            
            // Rimuovi la selezione visiva
            document.querySelectorAll('.selected-day').forEach(el => {
                el.classList.remove('selected-day');
            });
            
            // Reset variabili e form
            selectedDate = null;
            document.getElementById('numero-treno').value = '';
            document.getElementById('data-turno').value = '';
            
            alert('Giorno ripulito con successo!');
        } else {
            alert('Nessun turno trovato per questa data');
        }
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

// Modifichiamo la funzione aggiungiTurnoStraordinario per salvare nel localStorage
function aggiungiTurnoStraordinario() {
    const numeroTreno = document.getElementById('nuovo-treno').value;
    const oraInizio = document.getElementById('ora-inizio').value;
    const oraFine = document.getElementById('ora-fine').value;

    if (!numeroTreno || !oraInizio || !oraFine) {
        alert('Inserisci tutti i dati richiesti');
        return;
    }

    if (turni[numeroTreno]) {
        alert('Questo numero treno esiste già nel dizionario');
        return;
    }

    // Aggiungi il nuovo turno al dizionario
    turni[numeroTreno] = {
        inizio: oraInizio,
        fine: oraFine
    };

    // Salva nel localStorage
    localStorage.setItem('turniDizionario', JSON.stringify(turni));

    // Aggiorna il select dei treni
    const selectTreni = document.getElementById('numero-treno');
    const option = document.createElement('option');
    option.value = numeroTreno;
    option.textContent = `${numeroTreno} (${oraInizio}-${oraFine})`;
    selectTreni.appendChild(option);

    // Reset form
    document.getElementById('nuovo-treno').value = '';
    document.getElementById('ora-inizio').value = '';
    document.getElementById('ora-fine').value = '';

    alert('Turno straordinario aggiunto con successo!');
} 