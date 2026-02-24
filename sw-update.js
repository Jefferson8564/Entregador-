// ============================================================
//  SW-UPDATE.JS — Pop-up de atualização
//  Inclua no index.html:  <script src="./sw-update.js"></script>
//  Este arquivo detecta quando o Service Worker tem uma nova
//  versão disponível e exibe o pop-up roxo para o usuário.
// ============================================================

(function () {
  if (!('serviceWorker' in navigator)) return;

  // ── Injeta o CSS do pop-up ────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #sw-update-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(5, 0, 20, 0.75);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease;
    }
    #sw-update-overlay.visivel {
      opacity: 1;
      pointer-events: all;
    }

    #sw-update-card {
      width: 100%;
      max-width: 380px;
      background: linear-gradient(160deg, #1a0a3a 0%, #120828 50%, #0e0520 100%);
      border: 1px solid rgba(160, 80, 255, 0.45);
      border-radius: 28px;
      padding: 36px 24px 28px;
      box-shadow:
        0 0 0 1px rgba(160, 80, 255, 0.12),
        0 8px 40px rgba(120, 40, 220, 0.45),
        0 0 80px rgba(100, 20, 200, 0.2),
        inset 0 1px 0 rgba(255,255,255,0.07);
      transform: scale(0.88) translateY(30px);
      transition: transform 0.45s cubic-bezier(0.34, 1.5, 0.64, 1);
      position: relative;
      overflow: hidden;
      text-align: center;
    }
    #sw-update-overlay.visivel #sw-update-card {
      transform: scale(1) translateY(0);
    }

    /* brilho decorativo no topo */
    #sw-update-card::before {
      content: '';
      position: absolute;
      top: -60px; left: 50%;
      transform: translateX(-50%);
      width: 220px; height: 120px;
      background: radial-gradient(ellipse, rgba(160,80,255,0.35) 0%, transparent 70%);
      pointer-events: none;
    }

    #sw-update-card::after {
      content: '';
      position: absolute;
      bottom: -40px; right: -40px;
      width: 160px; height: 160px;
      background: radial-gradient(ellipse, rgba(80,20,180,0.25) 0%, transparent 70%);
      pointer-events: none;
    }

    .sw-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 20px;
      background: rgba(160, 80, 255, 0.15);
      border: 1px solid rgba(160, 80, 255, 0.4);
      font-size: 11px;
      font-weight: 700;
      color: #c084fc;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
      font-family: 'DM Sans', sans-serif;
    }
    .sw-badge-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #a855f7;
      animation: swDotPulse 1.2s ease-in-out infinite;
    }
    @keyframes swDotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.6); }
    }

    .sw-emoji {
      font-size: 58px;
      display: block;
      margin-bottom: 16px;
      filter: drop-shadow(0 0 18px rgba(160, 80, 255, 0.6));
      animation: swFloat 3s ease-in-out infinite;
    }
    @keyframes swFloat {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-8px); }
    }

    .sw-title {
      font-family: 'Syne', sans-serif;
      font-size: 24px;
      font-weight: 900;
      color: #f0e6ff;
      margin-bottom: 10px;
      line-height: 1.2;
    }

    .sw-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      color: rgba(200, 180, 240, 0.7);
      line-height: 1.65;
      margin-bottom: 24px;
    }

    .sw-version-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 28px;
    }
    .sw-ver-chip {
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Syne', sans-serif;
    }
    .sw-ver-old {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(200,180,240,0.5);
      text-decoration: line-through;
    }
    .sw-ver-arrow {
      font-size: 16px;
      color: #a855f7;
    }
    .sw-ver-new {
      background: rgba(160, 80, 255, 0.18);
      border: 1px solid rgba(160, 80, 255, 0.5);
      color: #c084fc;
    }

    .sw-btn-agora {
      width: 100%;
      padding: 17px;
      border: none;
      border-radius: 18px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg, #9333ea, #6d28d9);
      color: #fff;
      box-shadow:
        0 4px 24px rgba(147, 51, 234, 0.55),
        inset 0 1px 0 rgba(255,255,255,0.15);
      margin-bottom: 10px;
      transition: transform 0.15s, box-shadow 0.15s;
      position: relative;
      overflow: hidden;
    }
    .sw-btn-agora::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
      border-radius: inherit;
    }
    .sw-btn-agora:active {
      transform: scale(0.96);
      box-shadow: 0 2px 12px rgba(147, 51, 234, 0.4);
    }

    .sw-btn-depois {
      width: 100%;
      padding: 14px;
      border: 1px solid rgba(160, 80, 255, 0.2);
      border-radius: 18px;
      background: transparent;
      color: rgba(200, 180, 240, 0.5);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: color 0.2s, border-color 0.2s;
    }
    .sw-btn-depois:active {
      color: rgba(200, 180, 240, 0.8);
      border-color: rgba(160, 80, 255, 0.4);
    }
  `;
  document.head.appendChild(style);

  // ── Cria o HTML do pop-up ─────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'sw-update-overlay';
  overlay.innerHTML = `
    <div id="sw-update-card">
      <div class="sw-badge"><span class="sw-badge-dot"></span> Atualização disponível</div>
      <span class="sw-emoji">🚀</span>
      <div class="sw-title">Nova versão do app!</div>
      <div class="sw-desc">
        Uma atualização foi lançada com melhorias e correções.<br>
        Quer atualizar agora ou continuar e atualizar depois?
      </div>
      <div class="sw-version-row">
        <span class="sw-ver-chip sw-ver-old" id="sw-ver-old">v—</span>
        <span class="sw-ver-arrow">→</span>
        <span class="sw-ver-chip sw-ver-new" id="sw-ver-new">v—</span>
      </div>
      <button class="sw-btn-agora" id="sw-btn-agora">⬇️ Atualizar agora</button>
      <button class="sw-btn-depois" id="sw-btn-depois">Agora não, atualizar depois</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Referências aos elementos ─────────────────────────────
  let pendingWorker = null;

  function mostrarPopup(oldVer, newVer) {
    document.getElementById('sw-ver-old').textContent = oldVer ? `v${oldVer}` : 'atual';
    document.getElementById('sw-ver-new').textContent = newVer ? `v${newVer}` : 'nova';
    overlay.classList.add('visivel');
  }

  function fecharPopup() {
    overlay.classList.remove('visivel');
  }

  // ── Botão: Atualizar agora ────────────────────────────────
  document.getElementById('sw-btn-agora').addEventListener('click', async () => {
    const btn = document.getElementById('sw-btn-agora');
    btn.textContent = '⏳ Atualizando...';
    btn.disabled = true;

    if (pendingWorker) {
      pendingWorker.postMessage('SKIP_WAITING');
    }

    // Aguarda o novo SW tomar controle e recarrega
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Fallback: recarrega após 1.5s mesmo assim
    setTimeout(() => window.location.reload(), 1500);
  });

  // ── Botão: Depois ─────────────────────────────────────────
  document.getElementById('sw-btn-depois').addEventListener('click', () => {
    fecharPopup();
    // Lembra que o usuário adiou — mostra de novo na próxima visita
    sessionStorage.setItem('sw-update-adiado', '1');
  });

  // ── Registra e monitora o Service Worker ─────────────────
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // Detecta versão atual (lê do SW ativo se existir)
      const currentVer = reg.active
        ? await getSwVersion(reg.active)
        : null;

      function onUpdateFound() {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', async () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Há um novo SW instalado aguardando
            pendingWorker = newWorker;
            const newVer = await getSwVersion(newWorker);

            // Só mostra se o usuário não adiou nessa sessão
            if (!sessionStorage.getItem('sw-update-adiado')) {
              mostrarPopup(currentVer, newVer);
            }
          }
        });
      }

      reg.addEventListener('updatefound', onUpdateFound);

      // Verifica atualização agora e a cada 5 minutos
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);

    } catch (err) {
      console.warn('[SW-Update] Erro ao registrar Service Worker:', err);
    }
  });

  // ── Lê a versão do SW via postMessage ────────────────────
  function getSwVersion(worker) {
    return new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = e => resolve(e.data?.version || null);
      try {
        worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
      } catch {
        resolve(null);
      }
      setTimeout(() => resolve(null), 500);
    });
  }

})();
