const API_URL = '/api';

// Coordenadas padrão de São José dos Pinhais
const SJP_CENTER = [-25.5317, -49.2921];

// LocationIQ API Key - obter em https://locationiq.com/
const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';

// Mapeamento de bairros para coordenadas (fallback)
const BAIRROS_COORDS = {
    'Academia': [-25.5189, -49.2321],
    'Afonso Pena': [-25.5423, -49.2756],
    'Águas Belas': [-25.5567, -49.3012],
    'Aristocrata': [-25.5298, -49.2654],
    'Arujá': [-25.5489, -49.3123],
    'Aviação': [-25.5084, -49.1755],
    'Barro Preto': [-25.4765, -49.2567],
    'Bom Jesus': [-25.5123, -49.3234],
    'Boneca do Iguaçu': [-25.5234, -49.2890],
    'Borda do Campo': [-25.4876, -49.3345],
    'Braga': [-25.4534, -49.3210],
    'Campo Largo da Roseira': [-25.4423, -49.3156],
    'Centro': [-25.5317, -49.2921],
    'Cidade Jardim': [-25.5456, -49.2789],
    'Contenda': [-25.4123, -49.3456],
    'Costeira': [-25.5567, -49.2432],
    'Cruzeiro': [-25.5234, -49.2345],
    'Del Rey': [-25.5345, -49.2567],
    'Dom Rodrigo': [-25.4678, -49.2890],
    'Guatupê': [-25.5234, -49.2234],
    'Iná': [-25.5098, -49.3123],
    'Inspetor Carvalho': [-25.4987, -49.3012],
    'Ipê': [-25.5489, -49.2789],
    'Itália': [-25.5378, -49.2654],
    'Jurema': [-25.5212, -49.2543],
    'Ouro Fino': [-25.5567, -49.2934],
    'Parque da Fonte': [-25.5623, -49.2890],
    'Pedro Moro': [-25.5156, -49.2765],
    'Quississana': [-25.4876, -49.2345],
    'Rio Pequeno': [-25.4987, -49.3345],
    'São Cristóvão': [-25.5156, -49.2543],
    'São Domingos': [-25.5234, -49.3089],
    'São Marcos': [-25.5098, -49.2234],
    'São Pedro': [-25.5567, -49.3089],
    'Silveira da Motta': [-25.5423, -49.2432],
    'Três Marias': [-25.4765, -49.2987],
    'Zacarias': [-25.5312, -49.2654],
    'Cachoeira': [-25.4234, -49.3567],
    'Cachoeira de São José': [-25.4123, -49.3456],
    'Campestre da Faxina': [-25.3987, -49.3678],
    'Campina': [-25.4534, -49.3123],
    'Campina do Miringuava': [-25.3898, -49.3789],
    'Campina do Taquaral': [-25.4123, -49.3567],
    'Campina dos Furtados': [-25.3765, -49.3890],
    'Carioca': [-25.4567, -49.3012],
    'Colônia Acioli': [-25.3678, -49.3956],
    'Colônia Castelhanos': [-25.3543, -49.4012],
    'Colônia Malhada': [-25.3456, -49.4123],
    'Colônia Marcelino': [-25.3345, -49.4234],
    'Colônia Murici': [-25.3234, -49.4345],
    'Colônia Rio Grande': [-25.4123, -49.3567],
    'Colônia Santos Andrade': [-25.3987, -49.3678],
    'Despique': [-25.3123, -49.4456],
    'Emboque': [-25.3012, -49.4567],
    'Faxina': [-25.2898, -49.4678],
    'Gamela': [-25.2789, -49.4789],
    'Marcelino': [-25.2678, -49.4890],
    'Morro Alto': [-25.2567, -49.5012],
    'Olho Agudo': [-25.2456, -49.5123],
    'Roça Velha': [-25.2345, -49.5234],
    'Roseira de São Sebastião': [-25.2234, -49.5345],
    'Santo Antônio': [-25.5321, -49.2765],
    'São Sebastião': [-25.2123, -49.5456]
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

function createIcon(preciso = true) {
    if (!preciso) {
        return L.divIcon({
            className: 'custom-marker impreciso',
            html: `<div class="marker-pulsante" style="background:#ff4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">!</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }
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
        
        if (apoiador.latitude && apoiador.longitude) {
            coords = [parseFloat(apoiador.latitude), parseFloat(apoiador.longitude)];
        } else {
            coords = getCoordsBairro(apoiador.bairro);
        }

        const preciso = apoiador.coordenadas_precisas !== 0;
        const marker = L.marker(coords, { icon: createIcon(preciso) }).addTo(map);
        marker.id = apoiador.id;

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
                ${!preciso ? '<p style="margin: 5px 0; color: #ff4444; font-size: 12px;"><strong>⚠️ Endereço estimado</strong></p>' : ''}
            </div>
        `);

        markers.push(marker);
    });
}

// Adicionar um único marker
function addSingleMarker(apoiador) {
    if (!map || !apoiador) return;
    
    let coords;
    if (apoiador.latitude && apoiador.longitude) {
        coords = [parseFloat(apoiador.latitude), parseFloat(apoiador.longitude)];
    } else {
        coords = getCoordsBairro(apoiador.bairro);
    }

    const preciso = apoiador.coordenadas_precisas !== 0;
    const marker = L.marker(coords, { icon: createIcon(preciso) }).addTo(map);
    marker.id = apoiador.id;

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
            ${!preciso ? '<p style="margin: 5px 0; color: #ff4444; font-size: 12px;"><strong>⚠️ Endereço estimado</strong></p>' : ''}
        </div>
    `);

    markers.push(marker);
}

// Atualizar um marker específico
function updateSingleMarker(id, apoiador) {
    if (!map) return;
    
    var markerIndex = markers.findIndex(m => m.id === id);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex]);
        markers.splice(markerIndex, 1);
    }
    
    if (apoiador) {
        addSingleMarker(apoiador);
    }
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
                apoiador.coordenadas_precisas = coords.preciso !== false ? 1 : 0;
                
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
    const endereco = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil, -25.5, -49.3`;
    
    // Normalizar bairro
    const bairroLower = bairro ? bairro.toLowerCase().trim() : '';
    
    // Função para normalizar texto (remover acentos, maiúsculas)
    function normalizar(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, ' ')
            .trim();
    }
    
    // Função para validar se o resultado corresponde ao endereço
    function validarEndereco(resultado, rua, numero, bairro) {
        if (!resultado || !resultado.address) return false;
        
        const addr = resultado.address;
        const ruaNormalizada = normalizar(rua);
        const bairroNormalizado = normalizar(bairro);
        
        // Verificar rua (pode estar em different, street, road, etc)
        const ruaResultado = normalizar(addr.road || addr.pedestrian || addr.path || '');
        const numeroResultado = addr.house_number || '';
        
        // Verificar bairro (pode estar em neighbourhood, suburb, quarter, etc)
        const bairroResultado = normalizar(
            addr.neighbourhood || addr.suburb || addr.quarter || addr.village || addr.town || addr.municipality || ''
        );
        
        // Comparar rua (pelo menos 60% de相似idade)
        const ruaMatch = ruaNormalizada.length > 3 && (
            ruaResultado.includes(ruaNormalizada) || 
            ruaNormalizada.includes(ruaResultado) ||
            similarity(ruaNormalizada, ruaResultado) > 0.6
        );
        
        // Comparar bairro (pelo menos 60% de相似idade)
        const bairroMatch = !bairroNormalizado || bairroNormalizado.length < 3 || (
            bairroResultado.includes(bairroNormalizado) || 
            bairroNormalizado.includes(bairroResultado) ||
            similarity(bairroNormalizado, bairroResultado) > 0.6
        );
        
        return ruaMatch && bairroMatch;
    }
    
    // Função para calcular similaridade entre strings
    function similarity(s1, s2) {
        if (!s1 || !s2) return 0;
        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);
        let matches = 0;
        for (const w1 of words1) {
            if (w1.length > 2 && words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
                matches++;
            }
        }
        return matches / Math.max(words1.length, words2.length);
    }
    
    // Usar LocationIQ se API key configurada
    if (LOCATIONIQ_KEY && !LOCATIONIQ_KEY.includes('YOUR_API_KEY')) {
        try {
            // Primeiro tenta com SJP
            const enderecoSJP = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
            const encodedAddr = encodeURIComponent(enderecoSJP);
            const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr}&format=json&limit=1&addressdetails=1&normalizecity=1`);
            
            const data = await response.json();
            
            if (data && data.length > 0 && data[0].lat && data[0].lon) {
                const valido = validarEndereco(data[0], rua, numero, bairro);
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    preciso: valido
                };
            }
            
            // Se não encontrar, tenta sem especificar cidade
            const enderecoGeral = `${rua}, ${numero}, ${bairro}, Paraná, Brasil`;
            const encodedAddr2 = encodeURIComponent(enderecoGeral);
            const response2 = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr2}&format=json&limit=1&addressdetails=1`);
            
            const data2 = await response2.json();
            
            if (data2 && data2.length > 0 && data2[0].lat && data2[0].lon) {
                const valido = validarEndereco(data2[0], rua, numero, bairro);
                return {
                    lat: parseFloat(data2[0].lat),
                    lng: parseFloat(data2[0].lon),
                    preciso: valido
                };
            }
        } catch (error) {
            console.error('Erro LocationIQ:', error);
        }
    }
    
    // Fallback para Nominatim
    try {
        // Primeiro tenta com SJP
        const enderecoSJP = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
        const encodedAddr = encodeURIComponent(enderecoSJP);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddr}&limit=1&addressdetails=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        let data = await response.json();
        
        if (data && data.length > 0) {
            const valido = validarEndereco(data[0], rua, numero, bairro);
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                preciso: valido
            };
        }
        
        // Se não encontrar, tenta sem especificar cidade
        const enderecoGeral = `${rua}, ${numero}, ${bairro}, Paraná, Brasil`;
        const encodedAddr2 = encodeURIComponent(enderecoGeral);
        const response2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddr2}&limit=1&addressdetails=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        data = await response2.json();
        
        if (data && data.length > 0) {
            const valido = validarEndereco(data[0], rua, numero, bairro);
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                preciso: valido
            };
        }
        
        // Não encontrou - usa fallback
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return { lat: coords[0], lng: coords[1], preciso: false };
        }
        
        return { lat: SJP_CENTER[0], lng: SJP_CENTER[1], preciso: false };
        
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return { lat: coords[0], lng: coords[1], preciso: false };
        }
        
        return { lat: SJP_CENTER[0], lng: SJP_CENTER[1], preciso: false };
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