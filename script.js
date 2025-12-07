// Variables globales
let currentPalace = null;
let currentStation = null;
let stations = [];
let palaces = JSON.parse(localStorage.getItem('mentalPalaces')) || [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadPalaces();
    setupEventListeners();
});

function initializeApp() {
    // Mode sombre
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Mode Clair';
    }
    
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
            this.innerHTML = '<i class="fas fa-sun"></i> Mode Clair';
        } else {
            localStorage.setItem('darkMode', 'disabled');
            this.innerHTML = '<i class="fas fa-moon"></i> Mode Sombre';
        }
    });
    
    // Thèmes
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updatePalaceTheme(this.dataset.theme);
        });
    });
    
    // Upload d'image
    const imageUpload = document.getElementById('station-image');
    const imageName = document.getElementById('image-name');
    
    imageUpload.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            imageName.textContent = this.files[0].name;
            previewImage(this.files[0]);
        }
    });
}

function setupEventListeners() {
    // Outils du canvas
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Ajout/suppression de la classe 'active' pour un feedback visuel
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tool = this.title;
            handleToolClick(tool);
        });
    });
    
    // Canvas interaction
    const canvas = document.getElementById('palace-canvas');
    canvas.addEventListener('click', function(e) {
        // Ajout d'une pièce si l'outil "Ajouter une pièce" est actif ou si on clique sur le canvas vide
        const addRoomTool = document.querySelector('.tool-btn[data-tool="room"]').classList.contains('active');
        if (e.target === this || addRoomTool) {
            addRoomToCanvas(e.offsetX, e.offsetY);
            // Désactiver l'outil après usage pour revenir au mode "Déplacer" par défaut
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.tool-btn[data-tool="move"]').classList.add('active');
        }
    });
}

function createNewPalace() {
    const name = document.getElementById('palace-name').value;
    const type = document.getElementById('palace-type').value;
    
    if (!name) {
        alert('Veuillez donner un nom à votre palais');
        return;
    }
    
    currentPalace = {
        id: Date.now(),
        name: name,
        type: type,
        theme: document.querySelector('.theme-btn.active')?.dataset.theme || 'classic',
        rooms: [],
        stations: [],
        createdAt: new Date().toISOString()
    };
    
    palaces.push(currentPalace);
    localStorage.setItem('mentalPalaces', JSON.stringify(palaces));
    
    updatePalacePreview();
    loadPalaces(); // Mise à jour de la grille des palais
    
    alert(`Palais "${name}" créé avec succès !`);
    
    // Réinitialiser le formulaire
    // document.getElementById('palace-name').value = ''; // Laisser le nom si l'utilisateur veut continuer à éditer
}

function updatePalaceTheme(theme) {
    if (!currentPalace) return;
    
    currentPalace.theme = theme;
    updatePalacePreview();
}

function updatePalacePreview() {
    const canvas = document.getElementById('palace-canvas');
    canvas.innerHTML = '';
    
    if (!currentPalace) {
        canvas.innerHTML = '<p>Créez un palais pour voir l\'aperçu</p>';
        return;
    }
    
    // Créer une visualisation basique
    const visual = document.createElement('div');
    visual.className = 'palace-visual';
    visual.style.position = 'relative';
    visual.style.width = '100%';
    visual.style.height = '100%';
    
    // Ajouter des pièces
    currentPalace.rooms.forEach((room, index) => {
        const roomEl = document.createElement('div');
        roomEl.className = 'preview-room';
        roomEl.style.position = 'absolute';
        roomEl.style.left = room.x + 'px';
        roomEl.style.top = room.y + 'px';
        roomEl.style.width = '80px';
        roomEl.style.height = '80px';
        roomEl.style.backgroundColor = getThemeColor(currentPalace.theme);
        roomEl.style.border = '2px solid var(--primary-color)';
        roomEl.style.borderRadius = '8px';
        roomEl.style.cursor = 'pointer';
        roomEl.title = `${room.name} (${currentPalace.stations.filter(s => s.roomId === room.id).length} stations)`;
        
        // Afficher le nombre de stations dans la pièce
        const stationCount = currentPalace.stations.filter(s => s.roomId === room.id).length;
        if (stationCount > 0) {
            roomEl.innerHTML = `<span style="font-size: 1.5em;">${stationCount} <i class="fas fa-cube"></i></span>`;
            roomEl.style.color = 'white';
            roomEl.style.display = 'flex';
            roomEl.style.justifyContent = 'center';
            roomEl.style.alignItems = 'center';
        }
        
        roomEl.addEventListener('click', function(e) {
            e.stopPropagation(); // Empêche l'ajout d'une pièce si on clique sur une pièce existante
            editRoom(room);
        });
        
        visual.appendChild(roomEl);
    });
    
    // Bouton pour ajouter une pièce (seulement si l'outil n'est pas actif)
    // Désactivé pour forcer l'usage des outils en haut
    /*
    const addButton = document.createElement('button');
    addButton.innerHTML = '<i class="fas fa-plus"></i> Ajouter une pièce';
    addButton.className = 'add-room-btn';
    addButton.style.position = 'absolute';
    addButton.style.bottom = '10px';
    addButton.style.right = '10px';
    addButton.addEventListener('click', addDefaultRoom);
    visual.appendChild(addButton);
    */
    
    canvas.appendChild(visual);
}

function getThemeColor(theme) {
    const colors = {
        classic: '#e0e7ff',
        modern: '#f1f5f9',
        fantasy: '#fce7f3',
        minimal: '#ffffff'
    };
    return colors[theme] || '#e0e7ff';
}

function addDefaultRoom() {
    if (!currentPalace) return;
    
    const room = {
        id: Date.now(),
        name: `Pièce ${currentPalace.rooms.length + 1}`,
        x: Math.random() * 300,
        y: Math.random() * 300
    };
    
    currentPalace.rooms.push(room);
    updatePalacePreview();
    generateRoomSelector(); // Mettre à jour le sélecteur dans l'éditeur de station
}

function addRoomToCanvas(x, y) {
    if (!currentPalace) {
        alert('Veuillez d\'abord créer un palais');
        return;
    }
    
    const roomName = prompt('Nom de la pièce :', `Pièce ${currentPalace.rooms.length + 1}`);
    if (!roomName) return;
    
    // Positionnement au centre du clic (40px est la moitié de la taille de la pièce (80px))
    const room = {
        id: Date.now(),
        name: roomName,
        x: x - 40,
        y: y - 40
    };
    
    currentPalace.rooms.push(room);
    updatePalacePreview();
    generateRoomSelector(); // Mettre à jour le sélecteur dans l'éditeur de station
}

function editRoom(room) {
    const newName = prompt('Nouveau nom de la pièce :', room.name);
    if (newName) {
        room.name = newName;
        updatePalacePreview();
        generateRoomSelector(); // Si le nom change, mettre à jour le sélecteur
    }
}

function handleToolClick(tool) {
    switch(tool) {
        case 'Ajouter une pièce':
            // Laissez l'utilisateur cliquer sur le canvas (géré dans setupEventListeners)
            alert('Cliquez sur la carte ci-dessus pour ajouter une pièce !');
            break;
        case 'Ajouter un objet':
            addStation();
            break;
        case 'Déplacer':
             alert('Fonctionnalité "Déplacer" à venir !');
             break;
        case 'Supprimer':
            if (confirm('Supprimer la sélection ?')) {
                // Logique de suppression
                alert('Sélection supprimée.');
            }
            break;
    }
}

function addStation() {
    if (!currentPalace) {
        alert('Veuillez d\'abord créer un palais');
        return;
    }
    
    const station = {
        id: Date.now(),
        name: 'Nouvel objet',
        content: '',
        image: null,
        roomId: null // ID de la pièce associée
    };
    
    // Utiliser currentPalace.stations directement pour la liste principale
    currentPalace.stations.push(station);
    stations = currentPalace.stations; 
    currentStation = station;
    updateStationForm();
    updateStationsList();
    
    // Mettre en surbrillance l'éditeur
    document.querySelector('.station-editor').scrollIntoView({ behavior: 'smooth' });
}

function generateRoomSelector() {
    const selector = document.getElementById('station-room-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">(Non attribué)</option>'; // Option par défaut

    if (currentPalace && currentPalace.rooms.length > 0) {
        currentPalace.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            if (currentStation && currentStation.roomId === room.id) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }
}

function updateStationForm() {
    // Réinitialiser le formulaire
    document.getElementById('station-name').value = '';
    document.getElementById('station-content').value = '';
    document.getElementById('image-name').textContent = 'Aucune image sélectionnée';
    
    if (!currentStation) return;
    
    // Remplir avec les données de la station actuelle
    document.getElementById('station-name').value = currentStation.name;
    document.getElementById('station-content').value = currentStation.content;
    
    // Mettre à jour la liste des pièces dans le sélecteur
    generateRoomSelector(); 
}

function saveStation() {
    if (!currentStation) {
        alert('Veuillez créer une station d\'abord');
        return;
    }
    
    currentStation.name = document.getElementById('station-name').value;
    currentStation.content = document.getElementById('station-content').value;
    
    // NOUVEAU: Mettre à jour la roomId
    const selectedRoomId = document.getElementById('station-room-selector')?.value;
    currentStation.roomId = selectedRoomId ? parseInt(selectedRoomId) : null;
    
    // Sauvegarder dans le palais actuel
    if (currentPalace) {
        const existingIndex = currentPalace.stations.findIndex(s => s.id === currentStation.id);
        if (existingIndex >= 0) {
            currentPalace.stations[existingIndex] = currentStation;
        } else {
            // Ceci ne devrait pas arriver si on utilise addStation() correctement
            currentPalace.stations.push(currentStation);
        }
        
        localStorage.setItem('mentalPalaces', JSON.stringify(palaces));
    }
    
    // Mise à jour de l'affichage
    updateStationsList();
    updatePalacePreview(); // Pour mettre à jour le compteur de stations sur les pièces
    
    alert('Station sauvegardée !');
    
    // Réinitialisation de la station après sauvegarde (UX améliorée)
    currentStation = null; 
    updateStationForm();
}

function updateStationsList() {
    const list = document.getElementById('stations-list');
    list.innerHTML = '<h3>Stations Actuelles</h3>';
    
    if (!currentPalace || currentPalace.stations.length === 0) {
        list.innerHTML += '<p class="placeholder-text">Ce palais ne contient aucune station.</p>';
        return;
    }
    
    currentPalace.stations.forEach(station => {
        const stationEl = document.createElement('div');
        stationEl.className = 'station-item';
        
        // Trouver le nom de la pièce pour l'affichage
        const room = currentPalace.rooms.find(r => r.id === station.roomId);
        const roomName = room ? room.name : 'Non assignée';
        
        stationEl.innerHTML = `
            <div class="station-header">
                <h4>${station.name}</h4>
                <div class="station-actions">
                    <button title="Éditer" onclick="event.stopPropagation(); selectStation(${station.id})"><i class="fas fa-edit"></i></button>
                    <button title="Supprimer" onclick="event.stopPropagation(); deleteStation(${station.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <p><strong>Locum:</strong> ${roomName}</p>
            <p>${station.content.substring(0, 70)}${station.content.length > 70 ? '...' : ''}</p>
        `;
        
        stationEl.addEventListener('click', function() {
            selectStation(station.id);
        });
        
        list.appendChild(stationEl);
    });
}

function selectStation(id) {
    // Trouver la station et mettre à jour la variable globale et le formulaire
    currentStation = currentPalace.stations.find(s => s.id === id);
    updateStationForm();
    
    // Mettre en surbrillance la station sélectionnée dans la liste
    document.querySelectorAll('.station-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.station-item[data-id="${id}"]`)?.classList.add('active');
}

function editStation(id) {
    // Remplacé par selectStation pour utiliser l'éditeur complet
    selectStation(id);
}

function deleteStation(id) {
    if (confirm('Supprimer cette station ?')) {
        // Supprimer du palais
        currentPalace.stations = currentPalace.stations.filter(s => s.id !== id);
        localStorage.setItem('mentalPalaces', JSON.stringify(palaces));
        
        // Réinitialiser currentStation si c'était celle qui était éditée
        if (currentStation && currentStation.id === id) {
            currentStation = null;
            updateStationForm();
        }
        
        updateStationsList();
        updatePalacePreview(); // Mettre à jour le canvas
    }
}

function loadPalaces() {
    const grid = document.getElementById('palaces-grid');
    grid.innerHTML = '';
    
    if (palaces.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Aucun palais créé. Commencez la construction ci-dessus !</p>';
        return;
    }
    
    palaces.forEach(palace => {
        const palaceCard = document.createElement('div');
        palaceCard.className = 'palace-card';
        palaceCard.setAttribute('data-id', palace.id);
        palaceCard.innerHTML = `
            <div class="palace-image">
                <div class="palace-type">${getTypeIcon(palace.type)}</div>
            </div>
            <div class="palace-info">
                <h3>${palace.name}</h3>
                <p>Type: ${getTypeName(palace.type)}</p>
                <div class="palace-stats">
                    <span><i class="fas fa-door-open"></i> ${palace.rooms.length} pièces</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${palace.stations.length} stations</span>
                </div>
                <button onclick="loadPalace(${palace.id})" class="palace-btn">
                    <i class="fas fa-eye"></i> Visualiser
                </button>
            </div>
        `;
        grid.appendChild(palaceCard);
    });
}

function getTypeIcon(type) {
    const icons = {
        house: '🏠',
        park: '🌳',
        street: '🛣️',
        building: '🏛️',
        imaginary: '🧠'
    };
    return icons[type] || '🏠';
}

function getTypeName(type) {
    const names = {
        house: 'Maison/Appartement',
        park: 'Parc/Jardin',
        street: 'Rue/Chemin',
        building: 'Bâtiment Public',
        imaginary: 'Lieu Imaginaire'
    };
    return names[type] || 'Personnalisé';
}

function loadPalace(id) {
    const palace = palaces.find(p => p.id === id);
    if (palace) {
        currentPalace = palace;
        stations = palace.stations; // S'assurer que la variable globale stations est mise à jour
        
        updatePalacePreview();
        updateStationsList();
        
        // Mettre à jour le formulaire de création de palais (pour l'édition)
        document.getElementById('palace-name').value = palace.name;
        document.getElementById('palace-type').value = palace.type;
        
        // Mettre à jour les boutons de thème
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.theme-btn[data-theme="${palace.theme}"]`)?.classList.add('active');

        // Réinitialiser la station actuelle pour un nouveau contexte d'édition
        currentStation = null;
        updateStationForm();
        
        // Scroll vers l'éditeur
        document.querySelector('#create').scrollIntoView({ behavior: 'smooth' });
    }
}

// Tutoriel
let tutorialStep = 0;

function startTutorial() {
    tutorialStep = 0;
    document.getElementById('tutorial-modal').style.display = 'block';
    updateTutorialStep();
}

function closeTutorial() {
    document.getElementById('tutorial-modal').style.display = 'none';
}

function nextTutorialStep() {
    tutorialStep++;
    if (tutorialStep >= 4) {
        closeTutorial();
        return;
    }
    updateTutorialStep();
}

function updateTutorialStep() {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => step.classList.remove('active'));
    steps[tutorialStep].classList.add('active');
    
    // Mettre à jour le bouton
    const nextBtn = document.querySelector('.next-step');
    if (tutorialStep === 3) {
        nextBtn.textContent = 'Terminer';
    } else {
        nextBtn.textContent = 'Suivant';
    }
}

// Prévisualisation d'image
function previewImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (currentStation) {
            currentStation.image = e.target.result;
            // Forcer la sauvegarde immédiate si une image est sélectionnée
            // saveStation(); 
        }
    };
    reader.readAsDataURL(file);
}

// Exemple de palais par défaut
if (palaces.length === 0) {
    const examplePalace = {
        id: 1,
        name: 'Maison d\'enfance',
        type: 'house',
        theme: 'classic',
        rooms: [
            { id: 1, name: 'Entrée', x: 50, y: 150 },
            { id: 2, name: 'Salon', x: 200, y: 150 },
            { id: 3, name: 'Cuisine', x: 350, y: 150 }
        ],
        stations: [
            {
                id: 1,
                name: 'Porte rouge',
                content: 'Premier mot de vocabulaire: "Liberté"',
                image: null,
                roomId: 1
            },
            {
                id: 2,
                name: 'Horloge grand-père',
                content: 'Deuxième mot: "Temps"',
                image: null,
                roomId: 2
            }
        ],
        createdAt: new Date().toISOString()
    };
    
    palaces.push(examplePalace);
    localStorage.setItem('mentalPalaces', JSON.stringify(palaces));
}

// S'assurer que la grille est chargée au démarrage (même si le LS est vide)
// loadPalaces() est déjà appelé dans le DOMContentLoaded