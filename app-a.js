const STATUS=[{id:'aguardando_orcamento',label:'Aguardando orçamento'},{id:'aprovado',label:'Aprovado'},{id:'aguardando_peca',label:'Aguardando peça'},{id:'em_reparo',label:'Em reparo'},{id:'pronto',label:'Pronto'},{id:'entregue',label:'Entregue'},{id:'recusado',label:'Recusado'}];
const CHECKS_PADRAO=['Tela / trinco','Arranhão na carcaça','Gaveta do chip','Bandeja / SIM','Biometria','Face ID','Câmera traseira','Câmera frontal','Botões','Alto-falante','Microfone','Carga / conector','Wi-Fi / Bluetooth','Sensor de proximidade'];
const KEY='elitecell_v2';
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);
const stLabel=id=>(STATUS.find(s=>s.id===id)||{}).label||id;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function load(){
  const raw=localStorage.getItem(KEY)||localStorage.getItem('elitecell_v1');
  const baseLoja={nome:'Elite Cell',garantiaPadrao:90,senhaLoja:'',whatsapp:'',endereco:'',cnpj:'56.184.927/0001-83',termo:''};
  if(!raw) return {clientes:[],os:[],produtos:[],caixa:[],tecnicos:[],vendedores:[],modelosOS:[],calculos:[],checklistItens:CHECKS_PADRAO.slice(),fechamentos:[],seq:1,loja:baseLoja};
  const d=JSON.parse(raw);
  d.tecnicos=(d.tecnicos||[]).map(t=>typeof t==='string'?{id:uid(),nome:t}:t);
  d.vendedores=d.vendedores||[]; d.modelosOS=d.modelosOS||[]; d.calculos=d.calculos||[];
  d.checklistItens=d.checklistItens&&d.checklistItens.length?d.checklistItens:CHECKS_PADRAO.slice();
  d.fechamentos=d.fechamentos||[]; d.loja=Object.assign({},baseLoja,d.loja||{});
  return d;
}
let DB=load(), TMP_FOTOS=[], TMP_PECAS=[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(DB));
const cliente=id=>DB.clientes.find(x=>x.id===id);
const nomesTec=()=>(DB.tecnicos||[]).map(t=>t.nome||t).filter(Boolean);
const nomesVend=()=>(DB.vendedores||[]).map(t=>t.nome||t).filter(Boolean);
const tecPadrao=()=>{const p=(DB.tecnicos||[]).find(t=>t.padrao);return p?.nome||nomesTec()[0]||'';};
const vendPadrao=()=>{const p=(DB.vendedores||[]).find(t=>t.padrao);return p?.nome||nomesVend()[0]||'';};
const itensCheck=()=>DB.checklistItens&&DB.checklistItens.length?DB.checklistItens:CHECKS_PADRAO;
function ckValor(map,item){if(!map)return 'nao';if(Array.isArray(map))return map.includes(item)?'dano':'ok';return map[item]||'nao';}
function makeCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='EC';for(let i=0;i<5;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function saldo(o){return Math.max(0,Number(o.valorOrcamento||0)-Number(o.sinal||0));}
function brWhats(tel){let n=String(tel||'').replace(/\D/g,'');if(!n)return '';return n.startsWith('55')?n:((n.length===10||n.length===11)?'55'+n:n);}
function toggleMenu(on){document.getElementById('sideNav')?.classList.toggle('open',!!on);document.getElementById('sideBg')?.classList.toggle('show',!!on);}
function go(view){
  ['dash','clientes','os','modelos','tecnicos','vendedores','estoque','lucro','fin','rel','whats','track'].forEach(v=>document.getElementById('view-'+v)?.classList.toggle('hidden',v!==view));
  document.querySelectorAll('nav.side button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  toggleMenu(false);
  ({dash:renderDash,clientes:renderClientes,os:renderOS,modelos:renderModelos,tecnicos:renderTecnicos,vendedores:renderVendedores,estoque:renderEstoque,lucro:renderLucro,fin:renderFin,rel:renderRel,whats:renderWhats}[view]||function(){})();
}
function closeModal(){document.getElementById('modalRoot').innerHTML='';}
function modal(title,html){document.getElementById('modalRoot').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 style="margin:0">${title}</h3><button class="btn ghost sm" onclick="closeModal()">Fechar</button></div>${html}</div></div>`;}
function renderDash(){
  const ab=DB.os.filter(o=>!['entregue','recusado'].includes(o.status));
  const pr=DB.os.filter(o=>o.status==='pronto');
  document.getElementById('view-dash').innerHTML=`${pr.length?`<div class="alert"><b>${pr.length}</b> aparelho(s) pronto(s).</div>`:''}<div class="grid cards-4"><div class="stat"><div class="k">Em andamento</div><div class="v">${ab.length}</div></div><div class="stat"><div class="k">Prontos</div><div class="v">${pr.length}</div></div><div class="stat"><div class="k">Clientes</div><div class="v">${DB.clientes.length}</div></div><div class="stat"><div class="k">OS</div><div class="v">${DB.os.length}</div></div></div><div class="row" style="margin:16px 0"><button class="btn" onclick="novaOS()">+ Nova OS</button><button class="btn ghost" onclick="formCliente()">+ Cliente</button></div><div class="card"><h3>Últimas ordens</h3>${tabelaOS(DB.os.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,10))}</div>`;
}
function tabelaOS(list){
  if(!list.length) return '<p class="muted">Nenhuma ordem ainda.</p>';
  return `<div style="overflow:auto"><table><tr><th>OS</th><th>Cliente</th><th>Aparelho</th><th>Status</th><th></th></tr>${list.map(o=>{const c=cliente(o.clienteId);return `<tr><td><b>${esc(o.numero)}</b></td><td>${esc(c?.nome||'—')}<div class="muted">${esc(c?.telefone||'')}</div></td><td>${esc(o.marca||'')} ${esc(o.modelo||'')}<div class="muted">${esc(o.imei||'')}</div></td><td><span class="badge s-${o.status}">${stLabel(o.status)}</span></td><td><button class="btn ghost sm" onclick="abrirOS('${o.id}')">Abrir</button></td></tr>`;}).join('')}</table></div>`;
}
function renderClientes(){
  const q=(document.getElementById('qcli')?.value||'').toLowerCase();
  const list=DB.clientes.filter(c=>!q||`${c.nome} ${c.telefone} ${c.cpf}`.toLowerCase().includes(q));
  document.getElementById('view-clientes').innerHTML=`<div class="row" style="margin-bottom:12px"><input id="qcli" class="search" placeholder="Buscar..." value="${esc(q)}" oninput="renderClientes()"><button class="btn" onclick="formCliente()">+ Cliente</button></div><div class="card">${list.length?`<table><tr><th>Nome</th><th>Contato</th><th></th></tr>${list.map(c=>`<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.telefone||'')}</td><td><button class="btn ghost sm" onclick="formCliente('${c.id}')">Editar</button></td></tr>`).join('')}</table>`:'<p class="muted">Nenhum cliente.</p>'}</div>`;
}
function formCliente(id){
  const c=cliente(id)||{nome:'',telefone:'',email:'',cpf:''};
  modal(id?'Editar cliente':'Novo cliente', `<div class="form-grid two"><div class="field"><label>Nome</label><input id="c_nome" value="${esc(c.nome)}"></div><div class="field"><label>Telefone</label><input id="c_tel" value="${esc(c.telefone)}" inputmode="tel"></div><div class="field"><label>E-mail</label><input id="c_email" value="${esc(c.email)}"></div><div class="field"><label>CPF</label><input id="c_cpf" value="${esc(c.cpf)}"></div></div><button class="btn" onclick="salvarCliente('${id||''}')">Salvar</button>`);
}
function salvarCliente(id){
  const data={nome:c_nome.value.trim(),telefone:c_tel.value.trim(),email:c_email.value.trim(),cpf:c_cpf.value.trim()};
  if(!data.nome) return alert('Informe o nome.');
  if(id) Object.assign(cliente(id),data); else DB.clientes.push({id:uid(),...data,aparelhos:[],createdAt:new Date().toISOString()});
  save(); closeModal(); renderClientes();
}
function renderOS(){
  const list=DB.os.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  document.getElementById('view-os').innerHTML=`<div class="row" style="margin-bottom:12px"><button class="btn" onclick="novaOS()">+ OS</button></div><div class="card">${tabelaOS(list)}</div>`;
}
function novaOS(){ if(!DB.clientes.length){alert('Cadastre um cliente.');return go('clientes');} modal('Nova OS', formOSHtml()); }
function formOSHtml(o={}){
  const tec=o.tecnico||tecPadrao(); const vend=o.vendedor||vendPadrao(); const ck=o.checklistDetalhe||{};
  return `<div class="form-grid two"><div class="field"><label>Cliente</label><select id="o_cli">${DB.clientes.map(c=>`<option value="${c.id}" ${o.clienteId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div><div class="field"><label>Status</label><select id="o_st">${STATUS.map(s=>`<option value="${s.id}" ${(o.status||'aguardando_orcamento')===s.id?'selected':''}>${s.label}</option>`).join('')}</select></div><div class="field"><label>Técnico</label><select id="o_tec">${nomesTec().length?nomesTec().map(t=>`<option ${tec===t?'selected':''}>${esc(t)}</option>`).join(''):'<option>Cadastre um técnico</option>'}</select></div><div class="field"><label>Vendedor</label><select id="o_vend"><option value="">—</option>${nomesVend().map(t=>`<option ${vend===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div class="field"><label>Marca</label><input id="o_marca" value="${esc(o.marca||'')}"></div><div class="field"><label>Modelo</label><input id="o_modelo" value="${esc(o.modelo||'')}"></div><div class="field"><label>IMEI</label><input id="o_imei" value="${esc(o.imei||'')}" inputmode="numeric"></div><div class="field"><label>Senha de tela</label><input id="o_senha" value="${esc(o.senha||'')}"></div><div class="field"><label>Orçamento</label><input id="o_valor" type="number" inputmode="decimal" value="${esc(o.valorOrcamento||'')}"></div><div class="field"><label>Sinal</label><input id="o_sinal" type="number" inputmode="decimal" value="${esc(o.sinal||0)}"></div><div class="field"><label>Prazo</label><input id="o_prazo" type="date" value="${esc(o.prazo||'')}"></div><div class="field"><label>Garantia (dias)</label><input id="o_gar" type="number" value="${o.garantiaDias??90}"></div></div><div class="field"><label>Checklist</label><div class="check">${itensCheck().map(x=>{const v=ckValor(ck,x);return `<div class="ck-row"><span>${esc(x)}</span><select class="ck-sel" data-item="${esc(x)}"><option value="ok" ${v==='ok'?'selected':''}>OK</option><option value="dano" ${v==='dano'?'selected':''}>Dano</option><option value="nao" ${v==='nao'?'selected':''}>N/A</option></select></div>`;}).join('')}</div></div><div class="field"><label>Defeito</label><textarea id="o_defeito">${esc(o.defeito||'')}</textarea></div><div class="field"><label>Serviço</label><textarea id="o_diag">${esc(o.diagnostico||'')}</textarea></div><input type="hidden" id="o_id" value="${o.id||''}"><button class="btn" onclick="salvarOS()">Salvar OS</button>`;
}
function salvarOS(){
  const id=o_id.value, prev=DB.os.find(x=>x.id===id);
  const det={}; document.querySelectorAll('.ck-sel').forEach(s=>det[s.dataset.item]=s.value);
  const data={clienteId:o_cli.value,status:o_st.value,tecnico:o_tec.value.trim(),vendedor:o_vend.value.trim(),marca:o_marca.value.trim(),modelo:o_modelo.value.trim(),imei:o_imei.value.trim(),senha:o_senha.value,valorOrcamento:Number(o_valor.value||0),sinal:Number(o_sinal.value||0),prazo:o_prazo.value,garantiaDias:Number(o_gar.value||0),defeito:o_defeito.value.trim(),diagnostico:o_diag.value.trim(),checklistDetalhe:det,pecas:TMP_PECAS,fotos:TMP_FOTOS};
  if(id) Object.assign(prev,data,{updatedAt:new Date().toISOString()});
  else DB.os.push({id:uid(),numero:'OS-'+new Date().getFullYear()+'-'+String(DB.seq++).padStart(4,'0'),trackCode:makeCode(),...data,timeline:[{status:data.status,at:new Date().toISOString()}],createdAt:new Date().toISOString()});
  save(); closeModal(); go('os');
}
function abrirOS(id){
  const o=DB.os.find(x=>x.id===id); const c=cliente(o.clienteId);
  modal(o.numero, `<div class="row" style="margin-bottom:10px"><span class="badge s-${o.status}">${stLabel(o.status)}</span><button class="btn ok sm" onclick="waOS('${o.id}')">WhatsApp</button><button class="btn danger sm" onclick="excluirOS('${o.id}')">Excluir</button></div>${formOSHtml(o)}<div class="row" style="margin-top:10px">${STATUS.map(s=>`<button class="btn ghost sm" onclick="mudarStatus('${o.id}','${s.id}')">${s.label}</button>`).join('')}</div><p class="muted">${esc(c?.nome||'')} · ${esc(c?.telefone||'')}</p>`);
}
function mudarStatus(id,st){const o=DB.os.find(x=>x.id===id);o.status=st;o.updatedAt=new Date().toISOString();o.timeline=o.timeline||[];o.timeline.push({status:st,at:new Date().toISOString()});if(st==='entregue'){const r=saldo(o);if(r>0)DB.caixa.push({id:uid(),tipo:'entrada',valor:r,descricao:'Saldo '+o.numero,data:today()});}save();closeModal();abrirOS(id);}
function excluirOS(id){if(!confirm('Excluir?'))return;DB.os=DB.os.filter(x=>x.id!==id);save();closeModal();go('os');}
function waOS(id){const o=DB.os.find(x=>x.id===id);const c=cliente(o.clienteId);const to=brWhats(c?.telefone);if(!to)return alert('Sem telefone');location.href='https://wa.me/'+to+'?text='+encodeURIComponent('Olá '+(c.nome||'').split(' ')[0]+', *Elite Cell*\n'+(o.marca||'')+' '+(o.modelo||'')+'\nOS '+o.numero+'\nStatus: *'+stLabel(o.status)+'*\nValor: '+money(o.valorOrcamento));}
function renderPessoas(tipo){
  const lista=tipo==='tecnicos'?DB.tecnicos:DB.vendedores;
  document.getElementById('view-'+tipo).innerHTML=`<div class="row" style="margin-bottom:12px"><button class="btn" onclick="formPessoa('${tipo}')">+ Cadastrar</button></div><div class="card">${lista.length?lista.map(p=>`<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:8px 0"><b>${esc(p.nome)}</b><button class="btn ghost sm" onclick="formPessoa('${tipo}','${p.id}')">Editar</button></div>`).join(''):'<p class="muted">Vazio.</p>'}</div>`;
}
function renderTecnicos(){renderPessoas('tecnicos');}
function renderVendedores(){renderPessoas('vendedores');}
function formPessoa(tipo,id){
  const arr=tipo==='tecnicos'?DB.tecnicos:DB.vendedores;
  const p=(arr||[]).find(x=>x.id===id)||{nome:'',telefone:''};
  modal('Cadastro', `<div class="field"><label>Nome</label><input id="pe_nome" value="${esc(p.nome)}"></div><div class="field"><label>Telefone</label><input id="pe_tel" value="${esc(p.telefone||'')}"></div><button class="btn" onclick="salvarPessoa('${tipo}','${id||''}')">Salvar</button>`);
}
function salvarPessoa(tipo,id){
  const nome=pe_nome.value.trim(); if(!nome) return alert('Nome');
  const arr=tipo==='tecnicos'?DB.tecnicos:DB.vendedores;
  if(id) Object.assign(arr.find(x=>x.id===id),{nome,telefone:pe_tel.value.trim()});
  else arr.push({id:uid(),nome,telefone:pe_tel.value.trim(),padrao:!arr.length});
  save(); closeModal(); renderPessoas(tipo);
}
function renderModelos(){
  document.getElementById('view-modelos').innerHTML=`<p class="muted">Modelos prontos de OS.</p><button class="btn" onclick="formModelo()">+ Modelo</button><div class="card" style="margin-top:12px">${(DB.modelosOS||[]).map(m=>`<div class="row" style="justify-content:space-between"><b>${esc(m.nome)}</b><button class="btn ghost sm" onclick="formModelo('${m.id}')">Editar</button></div>`).join('')||'<p class="muted">Nenhum.</p>'}</div>`;
}
function formModelo(id){
  const m=(DB.modelosOS||[]).find(x=>x.id===id)||{nome:'',defeito:'',diagnostico:'',valorOrcamento:''};
  modal('Modelo', `<div class="field"><label>Nome</label><input id="m_nome" value="${esc(m.nome)}"></div><div class="field"><label>Defeito</label><textarea id="m_def">${esc(m.defeito||'')}</textarea></div><div class="field"><label>Serviço</label><textarea id="m_diag">${esc(m.diagnostico||'')}</textarea></div><div class="field"><label>Valor</label><input id="m_val" type="number" value="${esc(m.valorOrcamento||'')}"></div><button class="btn" onclick="salvarModelo('${id||''}')">Salvar</button>`);
}
function salvarModelo(id){
  const data={nome:m_nome.value.trim(),defeito:m_def.value.trim(),diagnostico:m_diag.value.trim(),valorOrcamento:m_val.value};
  if(!data.nome) return alert('Nome');
  if(id) Object.assign(DB.modelosOS.find(x=>x.id===id),data); else DB.modelosOS.push({id:uid(),...data});
  save(); closeModal(); renderModelos();
}
function renderEstoque(){
  document.getElementById('view-estoque').innerHTML=`<button class="btn" onclick="formProduto()">+ Peça</button><div class="card" style="margin-top:12px">${DB.produtos.map(p=>`<div class="row" style="justify-content:space-between"><div><b>${esc(p.nome)}</b><div class="muted">Qtd ${p.qtd} · ${money(p.preco)}</div></div><button class="btn ghost sm" onclick="formProduto('${p.id}')">Editar</button></div>`).join('')||'<p class="muted">Vazio.</p>'}</div>`;
}
function formProduto(id){
  const p=DB.produtos.find(x=>x.id===id)||{nome:'',qtd:0,custo:0,preco:0};
  modal('Produto', `<div class="field"><label>Nome</label><input id="p_nome" value="${esc(p.nome)}"></div><div class="field"><label>Qtd</label><input id="p_qtd" type="number" value="${p.qtd}"></div><div class="field"><label>Custo</label><input id="p_custo" type="number" value="${p.custo||0}"></div><div class="field"><label>Venda</label><input id="p_preco" type="number" value="${p.preco||0}"></div><button class="btn" onclick="salvarProduto('${id||''}')">Salvar</button>`);
}
function salvarProduto(id){
  const data={nome:p_nome.value.trim(),qtd:Number(p_qtd.value||0),custo:Number(p_custo.value||0),preco:Number(p_preco.value||0)};
  if(!data.nome) return alert('Nome');
  if(id) Object.assign(DB.produtos.find(x=>x.id===id),data); else DB.produtos.push({id:uid(),...data});
  save(); closeModal(); renderEstoque();
}
function renderLucro(){
  document.getElementById('view-lucro').innerHTML=`<div class="card"><div class="field"><label>Custo da peça</label><input id="lc" type="number" inputmode="decimal" oninput="calcL()"></div><div class="field"><label>Mão de obra</label><input id="lm" type="number" inputmode="decimal" oninput="calcL()"></div><div class="field"><label>Brindes</label><input id="lb" type="number" inputmode="decimal" oninput="calcL()"></div><div id="lr" class="muted">Preencha os valores.</div></div>`;
}
function calcL(){const c=Number(lc.value||0)+Number(lb.value||0);const v=c+Number(lm.value||0);lr.innerHTML=`Custo ${money(c)} · Cobrar ${money(v)} · Lucro ${money(v-c)}`;}
function renderFin(){
  const dia=DB.caixa.filter(x=>x.data===today());
  const e=dia.filter(x=>x.tipo==='entrada').reduce((a,c)=>a+Number(c.valor),0);
  const s=dia.filter(x=>x.tipo==='saida').reduce((a,c)=>a+Number(c.valor),0);
  document.getElementById('view-fin').innerHTML=`<div class="grid cards-4"><div class="stat"><div class="k">Entradas hoje</div><div class="v money-in">${money(e)}</div></div><div class="stat"><div class="k">Saídas hoje</div><div class="v money-out">${money(s)}</div></div></div><div class="row" style="margin:12px 0"><button class="btn ok" onclick="formCaixa('entrada')">+ Entrada</button><button class="btn danger" onclick="formCaixa('saida')">+ Saída</button></div><div class="card">${DB.caixa.slice().reverse().slice(0,40).map(c=>`<div>${esc(c.data)} · ${esc(c.descricao)} · <b class="${c.tipo==='entrada'?'money-in':'money-out'}">${c.tipo==='entrada'?'+':'-'}${money(c.valor)}</b></div>`).join('')||'<p class="muted">Sem lançamentos.</p>'}</div>`;
}
function formCaixa(tipo){modal(tipo, `<div class="field"><label>Valor</label><input id="x_val" type="number" inputmode="decimal"></div><div class="field"><label>Descrição</label><input id="x_desc"></div><button class="btn" onclick="salvarCaixa('${tipo}')">Lançar</button>`);}
function salvarCaixa(tipo){DB.caixa.push({id:uid(),tipo,valor:Number(x_val.value||0),data:today(),descricao:x_desc.value});save();closeModal();renderFin();}
function renderRel(){
  document.getElementById('view-rel').innerHTML=`<div class="card"><h3>Loja</h3><div class="field"><label>WhatsApp</label><input id="l_wa" value="${esc(DB.loja.whatsapp||'')}" inputmode="tel"></div><div class="field"><label>Senha do app</label><input id="l_pin" type="password" value="${esc(DB.loja.senhaLoja||'')}"></div><div class="field"><label>CNPJ / PIX</label><input id="l_cnpj" value="${esc(DB.loja.cnpj||'')}"></div><button class="btn" onclick="salvarLoja()">Salvar</button></div>`;
}
function salvarLoja(){DB.loja.whatsapp=l_wa.value.replace(/\D/g,'');DB.loja.senhaLoja=l_pin.value;DB.loja.cnpj=l_cnpj.value;save();alert('Salvo');}
function renderWhats(){
  document.getElementById('view-whats').innerHTML=`<div class="card"><p class="muted">Na OS o botão WhatsApp abre a conversa com o texto pronto.</p><div class="field"><label>WhatsApp da loja</label><input id="w_loja" value="${esc(DB.loja.whatsapp||'')}"></div><button class="btn" onclick="DB.loja.whatsapp=w_loja.value.replace(/\\D/g,'');save();alert('Salvo');">Salvar</button></div>`;
}
function exportData(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(DB)],{type:'application/json'}));a.download='backup-elite-cell.json';a.click();}
function importData(){document.getElementById('impFile').click();}
function lerBackup(ev){const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.os||!d.clientes)return alert('Inválido');if(!confirm('Trocar os dados deste iPhone pelo backup?'))return;DB=d;save();go('dash');}catch(e){alert('Não leu');}};r.readAsText(f);}
function buscaGlobal(){const q=(qglobal.value||'').toLowerCase();if(!q)return;const o=DB.os.find(x=>`${x.numero} ${x.imei} ${x.modelo}`.toLowerCase().includes(q));if(o)return abrirOS(o.id);const c=DB.clientes.find(x=>`${x.nome} ${x.telefone}`.toLowerCase().includes(q));if(c){go('clientes');return formCliente(c.id);}alert('Nada encontrado');}
function unlock(){if(lockPin.value===DB.loja.senhaLoja)lockScreen.classList.add('hidden');else alert('Senha incorreta');}
function travar(){if(!DB.loja.senhaLoja)return alert('Defina a senha em Relatórios.');lockPin.value='';lockScreen.classList.remove('hidden');}
(function(){if(DB.loja.senhaLoja)lockScreen.classList.remove('hidden');go('dash');})();
