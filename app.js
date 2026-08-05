// ===== APP: GASTOS NO CARTAO (v6 - OTIMIZADO) =====

const API_URL = 'https://script.google.com/macros/s/AKfycbwVjTKTl1tZ-21nmC1GpRqDrEBYz6VMq7iBcrGVAhaBTg6rYNjJw4X9TLa7g6xkoW-GfQ/exec';

const FAIXAS = [6000, 6500, 7000, 7500, 8000, 8500];

const CATEGORIAS = [
  { nome: 'Restaurante', max: 400 },
  { nome: 'Transporte', max: 1200 },
  { nome: 'Mercado', max: 1800 },
  { nome: 'Remédio', max: 600 },
  { nome: 'Hollanda', max: 1100 },
  { nome: 'Fernanda', max: 1300 }
];

var elTotalAvista = document.getElementById('totalAvista');
var elTotalParcelado = document.getElementById('totalParcelado');
var elTotalGeral = document.getElementById('totalGeral');
var elCategorias = document.getElementById('categoriasContainer');
var elLista = document.getElementById('listaCompras');
var elCount = document.getElementById('listaCount');
var elStatus = document.getElementById('status');
var elModal = document.getElementById('modal');
var elToast = document.getElementById('toast');
var elModalTitulo = document.getElementById('modalTitulo');
var elBtnSalvar = document.getElementById('btnSalvar');

var totalGeralAtual = 0;
var linhaEditando = null;
var comprasCarregadas = [];

document.addEventListener('DOMContentLoaded', function () {
  var elData = document.getElementById('data');
  if (elData) elData.valueAsDate = new Date();
  carregarCompras();
});

// ===== CARREGAR (apenas na abertura do app) =====
async function carregarCompras() {
  if (elStatus) elStatus.textContent = 'Carregando...';
  try {
    var resp = await fetch(API_URL);
    var result = await resp.json();
    if (result.success) {
      comprasCarregadas = result.data || [];
      recalcularTotaisLocal();
      renderizarLista(comprasCarregadas);
    } else {
      if (elStatus) elStatus.textContent = 'Erro ao carregar dados.';
    }
  } catch (err) {
    if (elStatus) elStatus.textContent = 'ERRO: ' + err.message;
  }
}

// ===== RECALCULAR TOTAIS LOCALMENTE (sem ir ao servidor) =====
function recalcularTotaisLocal() {
  var totalAvista = 0;
  var totalParcelado = 0;
  var cats = { 'Restaurante': 0, 'Transporte': 0, 'Mercado': 0, 'Remédio': 0, 'Hollanda': 0, 'Fernanda': 0 };

  for (var i = 0; i < comprasCarregadas.length; i++) {
    var c = comprasCarregadas[i];
    var valor = parseFloat(c['Valor']) || 0;
    var parcela = c['Parcela'] || '';
    var cat = c['Categoria'] || '';

    if (parcela === 'À vista') totalAvista += valor;
    else if (parcela === 'Parcelado') totalParcelado += valor;
    if (cats.hasOwnProperty(cat)) cats[cat] += valor;
  }

  var totalGeral = totalAvista + totalParcelado;
  totalGeralAtual = totalGeral;

  if (elTotalAvista) elTotalAvista.textContent = formatarMoeda(totalAvista);
  if (elTotalParcelado) elTotalParcelado.textContent = formatarMoeda(totalParcelado);
  if (elTotalGeral) elTotalGeral.textContent = formatarMoeda(totalGeral);
  renderizarCategorias(cats);
}

// ===== RENDERIZAR CATEGORIAS =====
function renderizarCategorias(categorias) {
  if (!elCategorias) return;
  var html = '';
  for (var i = 0; i < CATEGORIAS.length; i++) {
    var cat = CATEGORIAS[i];
    var gasto = categorias[cat.nome] || 0;
    var pct = Math.min((gasto / cat.max) * 100, 100);
    var cor = pct < 60 ? '#16a34a' : (pct < 80 ? '#d97706' : '#dc2626');
    html += '<div class="cat-item"><div class="cat-row"><span class="cat-nome">' + cat.nome + '</span><span class="cat-valores">' + formatarMoeda(gasto) + ' / ' + formatarMoeda(cat.max) + '</span></div><div class="cat-bar-bg"><div class="cat-bar-fill" style="width:' + pct + '%; background:' + cor + '"></div></div></div>';
  }
  elCategorias.innerHTML = html;
}

// ===== RENDERIZAR LISTA =====
function renderizarLista(compras) {
  if (elCount) elCount.textContent = compras.length;
  if (!compras || compras.length === 0) {
    if (elLista) elLista.innerHTML = '<div class="vazio">Nenhuma compra registrada.<br>Toque no + para comecar.</div>';
    if (elStatus) elStatus.textContent = '';
    return;
  }
  var ordenadas = compras.slice().reverse();
  elLista.innerHTML = ordenadas.map(function (c) {
    var parcela = c['Parcela'] || '';
    var pBadge = parcela ? '<span class="badge ' + (parcela === 'À vista' ? 'badge-avista' : 'badge-parcelado') + '">' + escHTML(parcela) + '</span>' : '';
    return '<div class="item"><div class="info"><div class="produto">' + escHTML(c['Produto'] || '') + '</div><div class="meta"><span class="badge badge-cat">' + escHTML(c['Categoria'] || '—') + '</span><span class="badge badge-user">' + escHTML(c['Usuário'] || '—') + '</span>' + pBadge + '<span>' + formatarData(c['Data']) + '</span></div></div><div class="item-actions"><div class="valor">' + formatarMoeda(c['Valor'] || 0) + '</div><button class="btn-editar" onclick="editarCompra(' + c._linha + ')">✏️</button><button class="btn-deletar" onclick="deletarCompra(' + c._linha + ')">🗑️</button></div></div>';
  }).join('');
  if (elStatus) elStatus.textContent = '';
}

// ===== SALVAR OU EDITAR (otimizado: atualiza local sem recarregar) =====
async function salvarCompra() {
  var usuario = document.getElementById('usuario').value;
  var valor = document.getElementById('valor').value;
  var produto = document.getElementById('produto').value.trim();
  var data = document.getElementById('data').value;
  var categoria = document.getElementById('categoria').value;
  var parcela = document.getElementById('parcela').value;

  if (!usuario) { mostrarToast('Selecione quem esta registrando', true); return; }
  if (!valor || parseFloat(valor) <= 0) { mostrarToast('Digite o valor da compra', true); return; }
  if (!produto) { mostrarToast('Digite o nome do produto', true); return; }
  if (!data) { mostrarToast('Selecione a data', true); return; }
  if (!categoria) { mostrarToast('Selecione a categoria', true); return; }
  if (!parcela) { mostrarToast('Selecione o tipo de parcela', true); return; }

  localStorage.setItem('usuario', usuario);

  var dados = {
    acao: linhaEditando ? 'editar' : 'novo',
    linha: linhaEditando,
    valor: valor, produto: produto, data: data,
    categoria: categoria, usuario: usuario, parcela: parcela
  };

  // Feedback instantaneo: desabilita botao e mostra status
  elBtnSalvar.textContent = 'Salvando...';
  elBtnSalvar.disabled = true;

  try {
    var resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(dados),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    var result = await resp.json();

    if (result.success) {
      var totalNovo = result.totalGeral || 0;

      if (linhaEditando) {
        // EDITAR: atualiza item local
        for (var i = 0; i < comprasCarregadas.length; i++) {
          if (comprasCarregadas[i]._linha === linhaEditando) {
            comprasCarregadas[i]['Data'] = data;
            comprasCarregadas[i]['Valor'] = parseFloat(valor);
            comprasCarregadas[i]['Produto'] = produto;
            comprasCarregadas[i]['Categoria'] = categoria;
            comprasCarregadas[i]['Usuário'] = usuario;
            comprasCarregadas[i]['Parcela'] = parcela;
            break;
          }
        }
      } else {
        // NOVA: adiciona item local
        comprasCarregadas.push({
          _linha: result.novaLinha,
          'Data': data,
          'Valor': parseFloat(valor),
          'Produto': produto,
          'Categoria': categoria,
          'Usuário': usuario,
          'Parcela': parcela
        });
      }

      // Recalcula totais localmente (sem recarregar do servidor)
      recalcularTotaisLocal();
      renderizarLista(comprasCarregadas);

      // Alertas
      var cruzadas = obterFaixasCruzadas(totalGeralAtual, totalNovo);
      if (cruzadas.length > 0) {
        mostrarToast('Total ultrapassou ' + cruzadas.map(formatarMoeda).join(' e ') + '!', true, 5000);
      } else {
        mostrarToast(linhaEditando ? 'Compra atualizada!' : 'Compra registrada!');
      }

      fecharModal();
      limparForm();
    } else {
      mostrarToast('Erro ao salvar. Tente novamente.', true);
    }
  } catch (err) {
    mostrarToast('Erro: ' + err.message, true);
  } finally {
    elBtnSalvar.textContent = 'Salvar compra';
    elBtnSalvar.disabled = false;
  }
}

// ===== EDITAR COMPRA =====
function editarCompra(linha) {
  var compra = null;
  for (var i = 0; i < comprasCarregadas.length; i++) {
    if (comprasCarregadas[i]._linha === linha) { compra = comprasCarregadas[i]; break; }
  }
  if (!compra) return;

  linhaEditando = linha;
  elModalTitulo.textContent = 'Editar compra';
  elBtnSalvar.textContent = 'Salvar alteracoes';
  document.getElementById('usuario').value = compra['Usuário'] || '';
  document.getElementById('valor').value = compra['Valor'] || '';
  document.getElementById('produto').value = compra['Produto'] || '';
  document.getElementById('data').value = formatDataParaInput(compra['Data']);
  document.getElementById('categoria').value = compra['Categoria'] || '';
  document.getElementById('parcela').value = compra['Parcela'] || '';
  elModal.classList.add('active');
}

// ===== DELETAR (otimizado: remove local sem recarregar) =====
async function deletarCompra(linha) {
  if (!confirm('Tem certeza que deseja excluir esta compra?')) return;

  try {
    var resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ acao: 'deletar', linha: linha }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    var result = await resp.json();

    if (result.success) {
      // Remove do array local
      for (var i = 0; i < comprasCarregadas.length; i++) {
        if (comprasCarregadas[i]._linha === linha) {
          comprasCarregadas.splice(i, 1);
          break;
        }
      }
      // Recalcula e renderiza localmente (sem recarregar)
      recalcularTotaisLocal();
      renderizarLista(comprasCarregadas);
      mostrarToast('Compra excluida!');
    } else {
      mostrarToast('Erro ao excluir. Tente novamente.', true);
    }
  } catch (err) {
    mostrarToast('Erro: ' + err.message, true);
  }
}

// ===== FAIXAS DE ALERTA =====
function obterFaixasCruzadas(anterior, novo) {
  var cruzadas = [];
  for (var i = 0; i < FAIXAS.length; i++) {
    if (anterior < FAIXAS[i] && novo >= FAIXAS[i]) cruzadas.push(FAIXAS[i]);
  }
  return cruzadas;
}

// ===== MODAL =====
function abrirModal() {
  linhaEditando = null;
  elModalTitulo.textContent = 'Registrar compra';
  elBtnSalvar.textContent = 'Salvar compra';
  document.getElementById('data').valueAsDate = new Date();
  var u = localStorage.getItem('usuario');
  if (u) document.getElementById('usuario').value = u;
  elModal.classList.add('active');
}

function fecharModal() { elModal.classList.remove('active'); }

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

// ===== HELPERS =====
function formatarMoeda(v) {
  return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(d) {
  if (!d) return '—';
  if (typeof d === 'string' && d.length === 10) {
    var p = d.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  var dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('pt-BR');
}

function formatDataParaInput(d) {
  if (!d) return '';
  if (typeof d === 'string' && d.length === 10) return d;
  var dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function escHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mostrarToast(msg, erro, duracao) {
  elToast.textContent = msg;
  elToast.className = 'toast show' + (erro ? ' erro' : '');
  var t = duracao || 3000;
  clearTimeout(elToast._timer);
  elToast._timer = setTimeout(function () {
    elToast.className = 'toast' + (erro ? ' erro' : '');
  }, t);
}
