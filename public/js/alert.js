const Alert = {
    show: function(message, type = 'info') {
        const overlay = document.createElement('div');
        overlay.className = 'alert-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        overlay.innerHTML = `
            <div class="alert-box alert-${type}" style="
                background: linear-gradient(145deg, #1e2433, #2a3142);
                border-radius: 16px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                transform: scale(0.9);
                transition: transform 0.3s ease;
                position: relative;
            ">
                <div class="alert-icon" style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    margin: 0 auto 1rem;
                    ${type === 'success' ? 'background: rgba(0, 255, 136, 0.2); color: #00ff88;' : ''}
                    ${type === 'error' ? 'background: rgba(255, 68, 68, 0.2); color: #ff4444;' : ''}
                    ${type === 'warning' ? 'background: rgba(255, 193, 7, 0.2); color: #ffc107;' : ''}
                    ${type === 'info' ? 'background: rgba(0, 212, 255, 0.2); color: #00d4ff;' : ''}
                ">${iconMap[type]}</div>
                <div class="alert-message" style="
                    font-size: 1rem;
                    color: #fff;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                ">${message}</div>
                <button class="alert-btn" style="
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    border: none;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    ${type === 'success' ? 'background: #00ff88; color: #1a1a2e;' : ''}
                    ${type === 'error' ? 'background: #ff4444; color: #fff;' : ''}
                    ${type === 'warning' ? 'background: #ffc107; color: #1a1a2e;' : ''}
                    ${type === 'info' ? 'background: #00d4ff; color: #1a1a2e;' : ''}
                " onclick="this.closest('.alert-overlay').remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.alert-box').style.transform = 'scale(1)';
        }, 10);
        
        return new Promise((resolve) => {
            overlay.querySelector('.alert-btn').onclick = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    resolve();
                }, 300);
            };
        });
    },
    
    success: function(message) {
        return this.show(message, 'success');
    },
    
    error: function(message) {
        return this.show(message, 'error');
    },
    
    warning: function(message) {
        return this.show(message, 'warning');
    },
    
    info: function(message) {
        return this.show(message, 'info');
    },
    
    confirm: function(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'alert-overlay';
            overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 999999 !important;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            overlay.innerHTML = `
                <div class="alert-box alert-confirm" style="
                    background: linear-gradient(145deg, #1e2433, #2a3142);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    position: relative;
                ">
                    <div class="alert-icon" style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                        margin: 0 auto 1rem;
                        background: rgba(255, 193, 7, 0.2);
                        color: #ffc107;
                    ">⚠</div>
                    <div class="alert-message" style="
                        font-size: 1rem;
                        color: #fff;
                        margin-bottom: 1.5rem;
                        line-height: 1.5;
                    ">${message}</div>
                    <div class="alert-buttons" style="
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                    ">
                        <button id="alertCancel" style="
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            border: none;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            background: rgba(255, 255, 255, 0.1);
                            color: #fff;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                        ">Cancelar</button>
                        <button id="alertConfirm" style="
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            border: none;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            background: #ff4444;
                            color: #fff;
                        ">Confirmar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
            
            overlay.querySelector('#alertCancel').onclick = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    resolve(false);
                }, 300);
            };
            
            overlay.querySelector('#alertConfirm').onclick = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    resolve(true);
                }, 300);
            };
        });
    }
};

if (typeof window !== 'undefined') {
    window.Alert = Alert;
}
