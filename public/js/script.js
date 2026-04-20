const API_URL = '/api';

const BAIRROS_COORDS = {
    'Centro': [-25.5317, -49.2921],
    'Aeroporto': [-25.5084, -49.1755],
    'Alto da Boa Vista': [-25.5521, -49.3210],
    'Barra do João José': [-25.4898, -49.2456],
    'Bela Vista': [-25.5456, -49.2567],
    'Boa Vista': [-25.5378, -49.2234],
    'Brasil': [-25.5212, -49.2634],
    'Cachoeirinha': [-25.5678, -49.3123],
    'Campo Largo': [-25.4534, -49.3456],
    'Campus': [-25.5123, -49.3234],
    'Cidade Industrial': [-25.4834, -49.2834],
    'Colônia Rio Grande': [-25.4123, -49.3567],
    'Cruzeiro': [-25.5234, -49.2345],
    'Eucaliptos': [-25.5567, -49.2934],
    'Guabirotuba': [-25.5234, -49.3456],
    'Inocência': [-25.4789, -49.2567],
    'Ipê': [-25.5489, -49.2789],
    'Jardim': [-25.5345, -49.3012],
    'Jardim dos Eucaliptos': [-25.5623, -49.2901],
    'Jardim Kennedy': [-25.5012, -49.2678],
    'Jardim Maria Helena': [-25.5156, -49.2890],
    'Muricy': [-25.4876, -49.2345],
    'Oliveira': [-25.5432, -49.3123],
    'Parque Industrial': [-25.4765, -49.2765],
    'Parque São Pedro': [-25.5234, -49.3512],
    'Pedra Grande': [-25.5765, -49.3345],
    'Pineville': [-25.5578, -49.2654],
    'Ponta Grossa': [-25.4654, -49.3456],
    'Portão': [-25.5098, -49.2543],
    'Possidônio': [-25.4567, -49.3234],
    'Rio Pequeno': [-25.4987, -49.3345],
    'Santo Antônio': [-25.5321, -49.2765],
    'São Cristóvão': [-25.5156, -49.2543],
    'São Francisco': [-25.5467, -49.2432],
    'São João': [-25.5234, -49.2890],
    'São Pedro': [-25.5567, -49.3089],
    'Seara': [-25.4876, -49.2987],
    'Taboão': [-25.5123, -49.3345],
    'Tancredo': [-25.5423, -49.2543],
    'Vila Formosa': [-25.4765, -49.2345],
    'Vila Guarani': [-25.5098, -49.3123],
    'Vila Izabel': [-25.5234, -49.2654],
    'Vila Residencial': [-25.4987, -49.2543],
    'Vila Velha': [-25.5312, -49.3089],
    'Xaxim': [-25.4876, -49.3210]
};

async function getApoiadores() {
    try {
        const response = await fetch(`${API_URL}/apoiadores`);
        if (!response.ok) throw new Error('Erro ao buscar dados');
        return await response.json();
    } catch (error) {
        console.error('Erro:', error);
        return [];
    }
}

async function getEstatisticas() {
    try {
        const response = await fetch(`${API_URL}/estatisticas`);
        if (!response.ok) throw new Error('Erro ao buscar estatísticas');
        return await response.json();
    } catch (error) {
        console.error('Erro:', error);
        return null;
    }
}

async function cadastrarApoiador(apoiador) {
    try {
        const response = await fetch(`${API_URL}/apoiadores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apoiador)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao cadastrar');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

function getCoordsBairro(bairro) {
    if (BAIRROS_COORDS[bairro]) {
        const [lat, lng] = BAIRROS_COORDS[bairro];
        const randomOffset = () => (Math.random() - 0.5) * 0.002;
        return [lat + randomOffset(), lng + randomOffset()];
    }
    return [-25.5317, -49.2921];
}

let map = null;
let markers = [];

function initMap() {
    if (document.getElementById('map')) {
        map = L.map('map').setView([-25.5317, -49.2921], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        loadMarkers();
    }
}

function createIcon(isVoluntario) {
    const color = isVoluntario ? '#00d4ff' : '#00ff88';
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

async function loadMarkers() {
    const apoiadores = await getApoiadores();
    
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    apoiadores.forEach(apoiador => {
        const coords = getCoordsBairro(apoiador.bairro);
        const marker = L.marker(coords).addTo(map);

        marker.bindPopup(`
            <div style="min-width:150px;">
                <strong>${apoiador.nome}</strong><br>
                <small>Rua: ${apoiador.rua}, ${apoiador.numero}</small><br>
                <small>Bairro: ${apoiador.bairro}</small><br>
                ${apoiador.telefone ? `<small>Tel: ${apoiador.telefone}</small><br>` : ''}
                ${apoiador.email ? `<small>Email: ${apoiador.email}</small><br>` : ''}
            </div>
        `);

        markers.push(marker);
    });
}

async function updateCounter() {
    const stats = await getEstatisticas();
    const element = document.getElementById('totalApoiadores');
    if (element && stats) {
        element.textContent = stats.total;
    }
}

function initCadastro() {
    const form = document.getElementById('cadastroForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const apoiador = {
                nome: document.getElementById('nome').value,
                rua: document.getElementById('rua').value,
                numero: document.getElementById('numero').value,
                bairro: document.getElementById('bairro').value,
                telefone: document.getElementById('telefone').value,
                email: document.getElementById('email').value
            };

            try {
                await cadastrarApoiador(apoiador);
                
                Alert.success('Cadastro realizado com sucesso!');
                
                updateCounter();
                form.reset();

            } catch (error) {
                Alert.error('Erro ao cadastrar. Tente novamente.');
            }
        });

        updateCounter();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initCadastro();
    if (document.getElementById('map')) {
        initMap();
    }
    
    // Demonstração dos alertas (remover em produção)
    // Alert.success('Sistema de alertas configurado com sucesso!');
    // Alert.info('Esta é uma mensagem informativa.');
    // Alert.warning('Esta é uma mensagem de aviso.');
    // Alert.error('Esta é uma mensagem de erro.');
});