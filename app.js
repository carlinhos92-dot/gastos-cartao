// ===== APP: GASTOS NO CARTÃO (v4) =====

// COLE AQUI A URL DO SEU GOOGLE APPS SCRIPT (a mesma de antes)
const API_URL = 'https://script.google.com/macros/s/AKfycbwVjTKTl1tZ-21nmC1GpRqDrEBYz6VMq7iBcrGVAhaBTg6rYNjJw4X9TLa7g6xkoW-GfQ/exec';

// Faixas de alerta (sobre o Total Geral = À vista + Parcelado)
const FAIXAS = [6000, 6500, 7000, 7500, 8000, 8500];

// Config das categorias com barra de progresso
const CATEGORIAS = [
  { nome: 'Restaurante', max: 400 },
  { nome: 'Transporte', max: 1200 },
  { nome: 'Mercado', max: 1800 },
  { nome: 'Remédio', max: 600 }
];

// ELEMENTOS
const elTotalAvista = document.getElementById('totalAvista');
const elTotalParcelado = document.getElementById('totalParcelado');
const elTotalGeral = document.getElementById('totalGeral');
const elCategorias = document.getElementById('categoriasContainer');
const elLista = document.getElementById('listaCompras');
const elCount = document.getElementById('listaCount');
const elStatus = document.getElementById('status');
const elModal = document.getElementById('modal');
const elToast = document.getElementById('toast');
const elModalTitulo = document.getElementById('modalTitulo');
const elBtnSalvar = document.getElementById('btnSalvar');

// ESTADO
var totalGeralAtual = 0;
var linhaEditando = null;
var comprasCarregadas = [];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('data').valueAsDate = new Date();
  carregarCompras();
});

// CARREGAR COMPRAS
async function carregarCompras() {
  elStatus.textContent = 'Carregando…';
  try {
    const resp = await fetch(API_URL);
    const result = await resp.json();

    if (result.success) {
      elTotalAvista.textContent = formatarMoeda(result.totalAvista || 0);
      elTotalParcelado.textContent = formatarMoeda(result.totalParcelado || 0);
      elTotalGeral.textContent = formatarMoeda(result.totalGeral || 0);
      totalGeralAtual = result.totalGeral || 0;
      comprasCarregadas = result.data || [];
      renderizarCategorias(result.categorias || {});
      renderizarLista(comprasCarregadas);
    } else {
      elStatus.textContent = 'Erro ao carregar dados.';
    }
  } catch (err) {
    elStatus.textContent = 'Erro de conexão. Verifique sua internet.';
  }
}

// RENDERIZAR CATEGORIAS (barras de progresso)
function renderizarCategorias(categorias) {
  var html = '';
  for (var i = 0; i &lt; CATEGORIAS.length; i++) {
    var cat = CATEGORIAS[i];
    var gasto = categorias[cat.nome] || 0;
    var pct = Math.min((gasto / cat.max) * 100, 100);
    var cor = pct &lt; 60 ? '#16a34a' : (pct &lt; 80 ? '#d97706' : '#dc2626');

    html += '<div class="cat-item">' +
      '<div class="cat-row">' +
        '<span class="cat-nome">' + cat.nome + '</span>' +
        '<span class="cat-valores">' + formatarMoeda(gasto) + ' / ' + formatarMoeda(cat.max) + '</span>' +
      '</div>' +
      '<div class="cat-bar-bg">' +
        '<div class="cat-bar-fill" style="width:' + pct + '%; background:' + cor + '"></div>' +
      '</div>' +
    '</div>';
  }
  elCategorias.innerHTML = html;
}

// RENDERIZAR LISTA
function renderizarLista(compras) {
  elCount.textContent = compras.length;

  if (!compras || compras.length === 0) {
    elLista.innerHTML = '<div class="vazio">Nenhuma compra registrada.<br>Toque no + para começar.</div>';
    elStatus.textContent = '';
    return;
  }

  var ordenadas = compras.slice().reverse();

  elLista.innerHTML = ordenadas.map(function (c) {
    var parcela = c['Parcela'] || '';
    var parcelaBadge = parcela
      ? '<span class="badge ' + (parcela === 'À vista' ? 'badge-avista' : 'badge-parcelado') + '">' + escHTML(parcela) + '</span>'
      : '';

    return '<div class="item">' +
      '<div class="info">' +
        '<div class="produto">' + escHTML(c['Produto'] || '') + '</div>' +
        '<div class="meta">' +
          '<span class="badge badge-cat">' + escHTML(c['Categoria'] || '—') + '</span>' +
          '<span class="badge badge-user">' + escHTML(c['Usuário'] || '—') + '</span>' +
          parcelaBadge +
          '<span>' + formatarData(c['Data']) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="item-actions">' +
        '<div class="valor">' + formatarMoeda(c['Valor'] || 0) + '</div>' +
        '<button class="btn-editar" onclick="editarCompra(' + c._linha + ')">✏️</button>' +
        '<button class="btn-deletar" onclick="deletarCompra(' + c._linha + ')">🗑️</button>' +
      '</div>' +
    '</div>';
  }).join('');

  elStatus.textContent = '';
}

// SALVAR OU EDITAR COMPRA
async function salvarCompra() {
  var usuario = document.getElementById('usuario').value;
  var valor = document.getElementById('valor').value;
  var produto = document.getElementById('produto').value.trim();
  var data = document.getElementById('data').value;
  var categoria = document.getElementById('categoria').value;
  var parcela = document.getElementById('parcela').value;

  if (!usuario) { mostrarToast('Selecione quem está registrando', true); return; }
  if (!valor || parseFloat(valor) &lt;= 0) { mostrarToast('Digite o valor da compra', true); return; }
  if (!produto) { mostrarToast('Digite o nome do produto', true); return; }
  if (!data) { mostrarToast('Selecione a data', true); return; }
  if (!categoria) { mostrarToast('Selecione a categoria', true); return; }
  if (!parcela) { mostrarToast('Selecione o tipo de parcela', true); return; }

  localStorage.setItem('usuario', usuario);

  var dados = {
    acao: linhaEditando ? 'editar' : 'novo',
    linha: linhaEditando,
    valor: valor,
    produto: produto,
    data: data,
    categoria: categoria,
    usuario: usuario,
    parcela: parcela
  };

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(dados),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await resp.json();

    if (result.success) {
      var totalNovo = result.totalGeral || 0;
      var cruzadas = obterFaixasCruzadas(totalGeralAtual, totalNovo);

      if (cruzadas.length > 0) {
        var msg = '⚠️ Total ultrapassou ' + cruzadas.map(formatarMoeda).join(' e ') + '!';
        mostrarToast(msg, true, 5000);
      } else {
        mostrarToast(linhaEditando ? 'Compra atualizada!' : 'Compra registrada!');
      }

      totalGeralAtual = totalNovo;
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

// EDITAR COMPRA
function editarCompra(linha) {
  var compra = null;
  for (var i = 0; i &lt; comprasCarregadas.length; i++) {
    if (comprasCarregadas[i]._linha === linha) {
      compra = comprasCarregadas[i];
      break;
    }
  }
  if (!compra) return;

  linhaEditando = linha;
  elModalTitulo.textContent = 'Editar compra';
  elBtnSalvar.textContent = 'Salvar alterações';

  document.getElementById('usuario').value = compra['Usuário'] || '';
  document.getElementById('valor').value = compra['Valor'] || '';
  document.getElementById('produto').value = compra['Produto'] || '';
  document.getElementById('data').value = formatDataParaInput(compra['Data']);
  document.getElementById('categoria').value = compra['Categoria'] || '';
  document.getElementById('parcela').value = compra['Parcela'] || '';

  elModal.classList.add('active');
}

// DELETAR COMPRA
async function deletarCompra(linha) {
  if (!confirm('Tem certeza que deseja excluir esta compra?')) return;

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ acao: 'deletar', linha: linha }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await resp.json();

    if (result.success) {
      totalGeralAtual = result.totalGeral || 0;
      mostrarToast('Compra excluída!');
      carregarCompras();
    } else {
      mostrarToast('Erro ao excluir. Tente novamente.', true);
    }
  } catch (err) {
    mostrarToast('Erro de conexão. Tente novamente.', true);
  }
}

// VERIFICAR FAIXAS DE ALERTA
function obterFaixasCruzadas(anterior, novo) {
  var cruzadas = [];
  for (var i = 0; i &lt; FAIXAS.length; i++) {
    if (anterior &lt; FAIXAS[i] && novo >= FAIXAS[i]) {
      cruzadas.push(FAIXAS[i]);
    }
  }
  return cruzadas;
}

// MODAL
function abrirModal() {
  linhaEditando = null;
  elModalTitulo.textContent = 'Registrar compra';
  elBtnSalvar.textContent = 'Salvar compra';
  document.getElementById('data').valueAsDate = new Date();

  var usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) document.getElementById('usuario').value = usuarioSalvo;

  elModal.classList.add('active');
}

function fecharModal() {
  elModal.classList.remove('active');
}

elModal.addEventListener('click', function (e) {
  if (e.target === elModal) fecharModal();
});

function limparForm() {
  linhaEditando = null;
  elModalTitulo.textContent = 'Registrar compra';
  elBtnSalvar.textContent = 'Salvar compra';
  document.getElementById('valor').value = '';
  document.getElementById('produto').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('parcela').value = '';
  document.getElementById('data').valueAsDate = new Date();
}

// HELPERS
function formatarMoeda(v) {
  return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(d) {
  if (!d) return '—';
  if (typeof d === 'string' && d.length === 10) {
    var partes = d.split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }
  var data = new Date(d);
  if (isNaN(data)) return '—';
  return data.toLocaleDateString('pt-BR');
}

function formatDataParaInput(d) {
  if (!d) return '';
  if (typeof d === 'string' && d.length === 10) return d;
  var data = new Date(d);
  if (isNaN(data)) return '';
  var ano = data.getFullYear();
  var mes = String(data.getMonth() + 1).padStart(2, '0');
  var dia = String(data.getDate()).padStart(2, '0');
  return ano + '-' + mes + '-' + dia;
}

function escHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mostrarToast(msg, erro, duracao) {
  elToast.textContent = msg;
  elToast.className = 'toast show' + (erro ? ' erro' : '');
  var tempo = duracao || 3000;
  clearTimeout(elToast._timer);
  elToast._timer = setTimeout(function () {
    elToast.className = 'toast' + (erro ? ' erro' : '');
  }, tempo);
}
