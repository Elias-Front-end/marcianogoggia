const API_URL = '/api';

// Coordenadas padrão de São José dos Pinhais
const SJP_CENTER = [-25.5317, -49.2921];

// Mapeamento de bairros para coordenadas mais precisas
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
        return BAIRROS_COORDS[bairro];
    }
    return SJP_CENTER;
}

function createIcon() {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:#4285F4;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">✓</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

let map = null;
let markers = [];

function initMap() {
    if (document.getElementById('map')) {
        map = L.map('map').setView(SJP_CENTER, 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        loadMarkers();
    }
}

async function loadMarkers() {
    const apoiadores = await getApoiadores();
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    apoiadores.forEach(apoiador => {
        let coords;
        
        // Usar coordenadas salvas se existirem
        if (apoiador.latitude && apoiador.longitude) {
            coords = [parseFloat(apoiador.latitude), parseFloat(apoiador.longitude)];
        } else {
            // Usar coordenadas do bairro
            coords = getCoordsBairro(apoiador.bairro);
        }

        const marker = L.marker(coords, { icon: createIcon() }).addTo(map);

        marker.bindPopup(`
            <div style="min-width: 200px; font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a2e; font-size: 16px;">${apoiador.nome}</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Endereço:</strong> ${apoiador.rua}, ${apoiador.numero}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Bairro:</strong> ${apoiador.bairro}</p>
                ${apoiador.telefone ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Telefone:</strong> ${apoiador.telefone}</p>` : ''}
                ${apoiador.email ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Email:</strong> ${apoiador.email}</p>` : ''}
                <p style="margin: 10px 0 5px 0; color: #999; font-size: 12px;">
                    <strong>Cadastrado:</strong> ${apoiador.data_cadastro} às ${apoiador.hora_cadastro}
                </p>
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
                // Buscar coordenadas automaticamente
                const coords = await buscarCoordenadas(apoiador.rua, apoiador.numero, apoiador.bairro);
                
                apoiador.latitude = coords.lat;
                apoiador.longitude = coords.lng;
                
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

// Função para buscar coordenadas (usada no admin)
async function buscarCoordenadas(rua, numero, bairro) {
    const endereco = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
    
    // Normalizar nome do bairro para busca
    const bairroLower = bairro.toLowerCase().trim();
    
    try {
        const encodedAddr = encodeURIComponent(endereco);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddr}&limit=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        
        // Se não encontrar pelo endereço específico, usa coordenadas do bairro
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return {
                lat: coords[0],
                lng: coords[1]
            };
        }
        
        // Se o bairro não existe no mapeamento, usa coordenadas padrão
        return {
            lat: SJP_CENTER[0],
            lng: SJP_CENTER[1]
        };
        
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        
        // Usa coordenadas do bairro se disponível
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return {
                lat: coords[0],
                lng: coords[1]
            };
        }
        
        return {
            lat: SJP_CENTER[0],
            lng: SJP_CENTER[1]
        };
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initCadastro();
    if (document.getElementById('map')) {
        initMap();
    }
});

// Torna a função disponível globalmente para o admin.html
window.buscarCoordenadas = buscarCoordenadas;