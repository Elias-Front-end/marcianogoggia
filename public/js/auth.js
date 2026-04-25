/**
 * auth.js — Módulo de autenticação compartilhado
 * Inclua este script ANTES do script principal de cada página protegida.
 */

const Auth = (() => {
    const TOKEN_KEY = 'mg_token';
    const USER_KEY  = 'mg_usuario';

    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function getUsuario() {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'login.html';
    }

    /** Verifica se o token ainda é válido junto ao server. Redireciona para login se não for. */
    async function requireAuth() {
        const token = getToken();
        if (!token) { window.location.href = 'login.html'; return null; }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) throw new Error('unauthorized');
            const user = await res.json();
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            return user;
        } catch {
            logout();
            return null;
        }
    }

    /** Retorna headers com Bearer token para fetch autenticado */
    function headers(extra = {}) {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), ...extra };
    }

    /** Injeta o nome do usuário e botão logout na navbar */
    function injectUserBar(navbarSelector = '.navbar') {
        const usuario = getUsuario();
        if (!usuario) return;

        const navbar = document.querySelector(navbarSelector);
        if (!navbar) return;

        const papel = { admin: '🛡️ Admin', editor: '✏️ Editor', visualizador: '👁️ Viewer' };

        const userBar = document.createElement('div');
        userBar.id = 'userBar';
        userBar.style.cssText = 'display:flex;align-items:center;gap:12px;';
        userBar.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:flex-end;">
                <span style="font-size:0.85rem;font-weight:700;color:#fff;">${usuario.nome}</span>
                <span style="font-size:0.7rem;color:rgba(255,255,255,0.4);letter-spacing:0.5px;">${papel[usuario.papel] || usuario.papel}</span>
            </div>
            <button onclick="Auth.logout()" title="Sair" style="
                display:flex;align-items:center;gap:6px;padding:0.5rem 1rem;
                background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);
                border-radius:10px;color:#ff6b6b;font-size:0.8rem;font-weight:700;
                cursor:pointer;transition:all 0.2s;font-family:inherit;
                text-transform:uppercase;letter-spacing:0.5px;
            " onmouseover="this.style.background='rgba(255,68,68,0.25)'" onmouseout="this.style.background='rgba(255,68,68,0.1)'">
                🚪 Sair
            </button>
        `;

        // Insere antes do último elemento da navbar (ou ao final)
        navbar.appendChild(userBar);
    }

    return { getToken, getUsuario, logout, requireAuth, headers, injectUserBar };
})();
