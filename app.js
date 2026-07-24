// ===== COLE AQUI A URL DO SEU GOOGLE APPS SCRIPT =====
const API_URL = 'https://script.google.com/macros/s/AKfycbwVjTKTl1tZ-21nmC1GpRqDrEBYz6VMq7iBcrGVAhaBTg6rYNjJw4X9TLa7g6xkoW-GfQ/exec';

// ===== ELEMENTOS =====
const elTotalMes = document.getElementById('totalMes');
const elLista = document.getElementById('listaCompras');
const elStatus = document.getElementById('status');
const elModal = document.getElementById('modal');
const elToast = document.getElementById('toast');
const elUsuario = document.getElementById('usuario');

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function () {
  // Data de hoje no campo
  document.getElementById('data').valueAsDate = new Date();

  // Lembra o usuário selecionado
  const usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) elUsuario.value = usuarioSalvo;

  elUsuario.addEventListener('change', function () {
    localStorage.setItem('usuario', elUsuario.value);
  });

  carregarCompras();
});

// ===== CARREGAR COMPRAS =====
async function carregarCompras() {
  elStatus.textContent = 'Carregando…';
  try {
    const resp = await fetch(API_URL);
    const result = await resp.json();

    if (result.success) {
      elTotalMes.textContent = formatarMoeda(result.totalMes);
      renderizarLista(result.data);
    } else {
      elStatus.textContent = 'Erro ao carregar dados.';
    }
  } catch (err) {
    elStatus.textContent = 'Erro de conexão. Verifique sua internet.';
  }
}

// ===== RENDERIZAR LISTA =====
function renderizarLista(compras) {
  if (!compras || compras.length === 0) {
    elLista.innerHTML = '<div class="vazio">Nenhuma compra registrada ainda.<br>Toque no + para começar.</div>';
    elStatus.textContent = '';
    return;
  }

  // Mais recente primeiro
  const ordenadas = compras.slice().reverse();

  elLista.innerHTML = ordenadas.map(function (c) {
    return '' +
      '<div class="item">' +
        '<div class="info">' +
          '<div class="produto">' + escHTML(c['Produto'] || '') + '</div>' +
          '<div class="meta">' +
            '<span class="badge">' + (c['Usuário'] || '—') + '</span>' +
            formatarData(c['Data']) +
            ' • Cartão: ' + (c['Cartão'] || '—') +
          '</div>' +
        '</div>' +
        '<div class="valor">' + formatarMoeda(c['Valor'] || 0) + '</div>' +
      '</div>';
  }).join('');

  elStatus.textContent = '';
}

// ===== SALVAR COMPRA =====
async function salvarCompra() {
  const valor = document.getElementById('valor').value;
  const produto = document.getElementById('produto').value.trim();
  const data = document.getElementById('data').value;
  const cartao = document.getElementById('cartao').value.trim();
  const usuario = elUsuario.value;

  // Validações
  if (!usuario) { mostrarToast('Selecione quem está registrando', true); return; }
  if (!valor || parseFloat(valor) <= 0) { mostrarToast('Digite o valor da compra', true); return; }
  if (!produto) { mostrarToast('Digite o nome do produto', true); return; }
  if (!data) { mostrarToast('Selecione a data', true); return; }

  const dados = {
    valor: valor,
    produto: produto,
    data: data,
    cartao: cartao,
    usuario: usuario
  };

  mostrarToast('Salvando…');

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(dados),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await resp.json();

    if (result.success) {
      mostrarToast('Compra registrada!');
      fecharModal();
      limparForm();
      carregarCompras();
    } else {
      mostrarToast('Erro ao salvar. Tente novamente.', true);
    }
  } catch (err) {
    mostrarToast('Erro de conexão. Tente novamente.', true);
  }
}

// ===== MODAL =====
function abrirModal() { elModal.classList.add('active'); }
function fecharModal() { elModal.classList.remove('active'); }
elModal.addEventListener('click', function (e) {
  if (e.target === elModal) fecharModal();
});

function limparForm() {
  document.getElementById('valor').value = '';
  document.getElementById('produto').value = '';
  document.getElementById('cartao').value = '';
  document.getElementById('data').valueAsDate = new Date();
}

// ===== HELPERS =====
function formatarMoeda(v) {
  return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(d) {
  if (!d) return '—';
  const data = new Date(d);
  if (isNaN(data)) return '—';
  return data.toLocaleDateString('pt-BR');
}

function escHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mostrarToast(msg, erro) {
  elToast.textContent = msg;
  elToast.className = 'toast show' + (erro ? ' erro' : '');
  setTimeout(function () { elToast.className = 'toast' + (erro ? ' erro' : ''); }, 3000);
}