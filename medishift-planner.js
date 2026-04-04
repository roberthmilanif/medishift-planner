// MediShift Planner - Core Logic
// Compatível com Google Apps Script API

// Configuration
// Keep the same Google Apps Script URL as the existing deployment.
const API_URL = 'https://script.google.com/macros/s/AKfycbxxnjPu5WUwZhfxtJLHVamI7h04wNUMXZPCcQ1G5UqWURyopFjqYla_RJj_KcoNXhkXKw/exec';

// State
let allPatients = [];
let filteredPatients = [];
let currentAntibiotics = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadPatients();
    setupEventListeners();
    setDefaultAdmissionDate();
}

function setupEventListeners() {
    // Header actions
    document.getElementById('addPatientBtn').addEventListener('click', () => openModal());
    document.getElementById('refreshBtn').addEventListener('click', () => loadPatients());
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterPriority').addEventListener('change', applyFilters);
    document.getElementById('filterAuthor').addEventListener('change', applyFilters);
    
    // Form
    document.getElementById('patientForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('addAntibioticBtn').addEventListener('click', addAntibioticField);
    document.getElementById('antibioticDate').addEventListener('change', updateAntibioticDays);
    
    // Admission date change
    document.getElementById('admissionDate').addEventListener('change', () => {
        const admissionDate = document.getElementById('admissionDate').value;
        if (admissionDate) {
            const dih = calculateDIH(admissionDate);
            console.log(`DIH: ${dih} dias`);
        }
    });
}

function setDefaultAdmissionDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('admissionDate').value = today;
}

// API Functions
async function loadPatients() {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}?action=getPatients`);
        const data = await response.json();
        
        if (data.success) {
            allPatients = data.patients || [];
            updateAuthorFilter();
            applyFilters();
        } else {
            showError('Erro ao carregar pacientes');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showError('Erro de conexão. Verifique a URL da API.');
    } finally {
        showLoading(false);
    }
}

async function savePatient(patientData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'savePatient',
                patient: patientData
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(patientData.id ? 'Paciente atualizado!' : 'Paciente adicionado!');
            closeModal();
            loadPatients();
        } else {
            showError('Erro ao salvar paciente');
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        showError('Erro ao salvar. Tente novamente.');
    }
}

async function deletePatient(patientId) {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) {
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deletePatient',
                id: patientId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Paciente excluído!');
            loadPatients();
        } else {
            showError('Erro ao excluir paciente');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        showError('Erro ao excluir. Tente novamente.');
    }
}

// Filter Functions
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const priorityFilter = document.getElementById('filterPriority').value;
    const authorFilter = document.getElementById('filterAuthor').value;
    
    filteredPatients = allPatients.filter(patient => {
        // Search filter
        const matchesSearch = !searchTerm || 
            patient.name?.toLowerCase().includes(searchTerm) ||
            patient.bedNumber?.toLowerCase().includes(searchTerm) ||
            patient.diagnosis?.toLowerCase().includes(searchTerm) ||
            patient.currentCondition?.toLowerCase().includes(searchTerm) ||
            patient.pendingActions?.toLowerCase().includes(searchTerm) ||
            patient.nextSteps?.toLowerCase().includes(searchTerm);
        
        // Priority filter
        const matchesPriority = !priorityFilter || patient.priority === priorityFilter;
        
        // Author filter
        const matchesAuthor = !authorFilter || patient.author === authorFilter;
        
        return matchesSearch && matchesPriority && matchesAuthor;
    });
    
    renderPatients();
}

function updateAuthorFilter() {
    const authors = [...new Set(allPatients.map(p => p.author).filter(Boolean))];
    const filterSelect = document.getElementById('filterAuthor');
    
    // Keep current selection
    const currentValue = filterSelect.value;
    
    // Clear and rebuild
    filterSelect.innerHTML = '<option value="">Todos Autores</option>';
    authors.sort().forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        filterSelect.appendChild(option);
    });
    
    // Restore selection if still valid
    if (authors.includes(currentValue)) {
        filterSelect.value = currentValue;
    }
}

// Render Functions
function renderPatients() {
    const grid = document.getElementById('patientsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredPatients.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Sort by priority (Alta > Média > Baixa)
    const priorityOrder = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    const sorted = [...filteredPatients].sort((a, b) => {
        return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
    });
    
    grid.innerHTML = sorted.map(patient => createPatientCard(patient)).join('');
}

function createPatientCard(patient) {
    const dih = calculateDIH(patient.admissionDate);
    const antibioticsHtml = renderAntibiotics(patient.antibiotics);
    const priorityClass = getPriorityClass(patient.priority);
    const lastUpdated = formatDateTime(patient.lastModified || patient.createdAt);
    
    return `
        <div class="patient-card" data-id="${patient.id}">
            <div class="card-header">
                <div class="card-title">
                    <h3>${escapeHtml(patient.name)}</h3>
                    <span class="bed-badge">${escapeHtml(patient.bedNumber)}</span>
                    ${dih !== null ? `<span class="dih-badge">DIH: ${dih}d</span>` : ''}
                </div>
                <div class="card-actions">
                    <span class="priority-badge priority-${priorityClass}">${patient.priority || 'Baixa'}</span>
                    <button class="btn-icon" onclick="editPatient('${patient.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deletePatient('${patient.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            ${patient.diagnosis ? `
                <div class="card-section">
                    <strong><i class="fas fa-stethoscope"></i> Diagnóstico:</strong>
                    <p>${escapeHtml(patient.diagnosis)}</p>
                </div>
            ` : ''}
            
            ${antibioticsHtml ? `
                <div class="card-section">
                    <strong><i class="fas fa-pills"></i> Antibioticoterapia:</strong>
                    ${antibioticsHtml}
                </div>
            ` : ''}
            
            ${patient.currentCondition ? `
                <div class="card-section">
                    <strong><i class="fas fa-heartbeat"></i> Condição Atual:</strong>
                    <p>${escapeHtml(patient.currentCondition)}</p>
                </div>
            ` : ''}
            
            ${patient.pendingActions ? `
                <div class="card-section">
                    <strong><i class="fas fa-tasks"></i> Pendências:</strong>
                    <p>${escapeHtml(patient.pendingActions)}</p>
                </div>
            ` : ''}
            
            ${patient.nextSteps ? `
                <div class="card-section">
                    <strong><i class="fas fa-route"></i> Próximos Passos:</strong>
                    <p>${escapeHtml(patient.nextSteps)}</p>
                </div>
            ` : ''}
            
            <div class="card-footer">
                <small>
                    <i class="fas fa-user"></i> ${escapeHtml(patient.author || 'Desconhecido')}
                    <i class="fas fa-clock"></i> ${lastUpdated}
                </small>
            </div>
        </div>
    `;
}

function normalizeAntibiotics(antibiotics) {
    if (!antibiotics) return [];
    if (Array.isArray(antibiotics)) return antibiotics.filter(Boolean).map(ab => {
        if (typeof ab === 'string') return { name: ab, startDate: '' };
        return { name: ab.name || ab.medicine || '', startDate: ab.startDate || ab.date || '' };
    });
    if (typeof antibiotics === 'string') {
        try {
            const parsed = JSON.parse(antibiotics);
            if (Array.isArray(parsed)) return normalizeAntibiotics(parsed);
        } catch (_) {
            return antibiotics.split(/\n|,|;/).map(s => s.trim()).filter(Boolean).map(name => ({ name, startDate: '' }));
        }
    }
    return [];
}

function renderAntibiotics(antibiotics) {
    const list = normalizeAntibiotics(antibiotics);
    if (!list.length) return '';
    
    return '<ul class="antibiotics-list">' + 
        list.map(ab => {
            const days = calculateAntibioticDays(ab.startDate);
            return `<li>${escapeHtml(ab.name)} ${days !== null ? `<span class="antibiotic-days">D${days}</span>` : ''}</li>`;
        }).join('') + 
        '</ul>';
}

// Modal Functions
function openModal(patientId = null) {
    const modal = document.getElementById('patientModal');
    const form = document.getElementById('patientForm');
    
    form.reset();
    currentAntibiotics = [];
    
    if (patientId) {
        const patient = allPatients.find(p => p.id === patientId);
        if (patient) {
            document.getElementById('modalTitle').textContent = 'Editar Paciente';
            fillFormWithPatient(patient);
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Adicionar Paciente';
        setDefaultAdmissionDate();
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('patientModal').style.display = 'none';
    document.getElementById('patientForm').reset();
    currentAntibiotics = [];
}

function fillFormWithPatient(patient) {
    document.getElementById('patientId').value = patient.id;
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('bedNumber').value = patient.bedNumber || '';
    document.getElementById('admissionDate').value = patient.admissionDate || '';
    document.getElementById('priority').value = patient.priority || 'Baixa';
    document.getElementById('diagnosis').value = patient.diagnosis || '';
    document.getElementById('currentCondition').value = patient.currentCondition || '';
    document.getElementById('pendingActions').value = patient.pendingActions || '';
    document.getElementById('nextSteps').value = patient.nextSteps || '';
    document.getElementById('author').value = patient.author || '';
    
    // Handle antibiotics
    currentAntibiotics = normalizeAntibiotics(patient.antibiotics);
    if (currentAntibiotics.length > 0) {
        document.getElementById('antibioticName').value = currentAntibiotics[0].name || '';
        document.getElementById('antibioticDate').value = currentAntibiotics[0].startDate || '';
        updateAntibioticDays();
    }
}

function editPatient(patientId) {
    openModal(patientId);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const patientData = {
        id: document.getElementById('patientId').value || generateId(),
        name: document.getElementById('patientName').value.trim(),
        bedNumber: document.getElementById('bedNumber').value.trim(),
        admissionDate: document.getElementById('admissionDate').value,
        priority: document.getElementById('priority').value,
        diagnosis: document.getElementById('diagnosis').value.trim(),
        currentCondition: document.getElementById('currentCondition').value.trim(),
        pendingActions: document.getElementById('pendingActions').value.trim(),
        nextSteps: document.getElementById('nextSteps').value.trim(),
        author: document.getElementById('author').value.trim(),
        antibiotics: collectAntibiotics(),
        lastModified: new Date().toISOString()
    };
    
    await savePatient(patientData);
}

// Antibiotic Functions
function addAntibioticField() {
    const name = document.getElementById('antibioticName').value.trim();
    const date = document.getElementById('antibioticDate').value;
    
    if (name && date) {
        currentAntibiotics.push({ name, startDate: date });
        document.getElementById('antibioticName').value = '';
        document.getElementById('antibioticDate').value = '';
        updateAntibioticDays();
        alert(`${name} adicionado!`);
    } else {
        alert('Preencha o nome do medicamento e a data de início');
    }
}

function collectAntibiotics() {
    const antibiotics = [...normalizeAntibiotics(currentAntibiotics)];
    
    const name = document.getElementById('antibioticName').value.trim();
    const date = document.getElementById('antibioticDate').value;
    
    if (name && date) {
        antibiotics.push({ name, startDate: date });
    }
    
    return antibiotics;
}

function updateAntibioticDays() {
    const dateInput = document.getElementById('antibioticDate');
    const daysLabel = document.querySelector('.antibiotic-days');
    
    if (dateInput.value) {
        const days = calculateAntibioticDays(dateInput.value);
        daysLabel.textContent = days !== null ? `(D${days})` : '';
    } else {
        daysLabel.textContent = '';
    }
}

// Calculation Functions
function calculateDIH(admissionDate) {
    if (!admissionDate) return null;
    
    const admission = new Date(admissionDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - admission;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : null;
}

function calculateAntibioticDays(startDate) {
    if (!startDate) return null;
    
    const start = new Date(startDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
    
    return diffDays >= 1 ? diffDays : null;
}

// Utility Functions
function generateId() {
    return 'pat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

function getPriorityClass(priority) {
    const map = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' };
    return map[priority] || 'low';
}

function formatDateTime(isoString) {
    if (!isoString) return 'Data desconhecida';
    
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
    document.getElementById('patientsGrid').style.display = show ? 'none' : 'grid';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('patientModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});
