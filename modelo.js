/* =========================================================
   MODELO DO CHECKLIST — edite aqui para mudar setores/itens.
   Cada auditoria guarda uma cópia do modelo no momento da criação,
   então mudar o modelo não altera auditorias antigas.
   ========================================================= */
const INST = [
 'As paredes são lisas e constituídas de materiais que permitem limpeza?',
 'O piso é constituído de material que permite limpeza (liso) e foi projetado para prevenção à água parada?',
 'O sistema de drenagem é de fácil limpeza e projetado para evitar o refluxo de odores e o acesso de pragas?',
 'Os forros/estruturas de sustentação foram projetados para minimizar o acúmulo de pó e a condensação, e são constituídos de materiais que permitem limpeza?',
 'As portas e as janelas são constituídas de materiais que permitem limpeza e estão ajustadas aos batentes?',
 'As portas e as janelas são mantidas fechadas quando não se encontram em uso? Em caso negativo, as mesmas possuem telas milimetradas?',
 'Os vidros possuem insulfilme para proteção contra estilhaçamento?',
 'As luminárias possuem proteção contra estilhaçamento ou lâmpadas de LED?',
 'A iluminação possui intensidade apropriada?',
 'As instalações elétricas são embutidas ou protegidas?',
 'As instalações do setor estão em boas condições de manutenção (ausência de furos, rachaduras, infiltrações, bolores, etc.)?'
];
const EQ_BASE = [
 'Os equipamentos e os utensílios são constituídos de materiais apropriados?',
 'O layout do processo produtivo está adequado?',
 'Ausência de pontos onde o produto esteja exposto à contaminação?',
 'Ausência de vazamentos (ar, água, produto, etc.) no setor?'
];
const LIMPEZA = 'O setor está em estado adequado de limpeza e organização (ausência de material em desuso ou alheio ao ambiente)?';
const MODELO = [
 { nome:'FUNCIONÁRIOS', curto:'Funcionários', subs:[{ nome:null, itens:[
  'Todos os funcionários estão utilizando uniformes limpos e em boas condições (sem aberturas, rasgos ou materiais desgastados)?',
  'Existe sistema de identificação para verificação da troca dos uniformes?',
  'Os cabelos estão totalmente protegidos por touca?',
  'Os funcionários que possuem barba e bigode utilizam máscara?',
  'Os calçados são inteiramente cobertos e feitos de materiais não-absorventes?',
  'Ausência de adornos?',
  'Os funcionários utilizam Equipamentos de Proteção Individual (EPIs)? Os mesmos se encontram em boas condições de higiene?',
  'Os funcionários seguem todos os requisitos de conduta?'
 ]}]},
 { nome:'INSTALAÇÕES PARA FUNCIONÁRIOS', curto:'Inst. funcionários', subs:[
  { nome:'Sanitários e vestiários', itens:[
   'Ausência de abertura direta dos sanitários/vestiários para as áreas de produção, de embalagem ou de armazenamento?',
   'O sanitário está identificado?',
   'Os sanitários/vestiários são separados por sexo (feminino e masculino)?',
   'Os sanitários/vestiários possuem porta com fechamento automático? Em caso negativo, existe placa com aviso para manter a mesma fechada?',
   'Os sanitários/vestiários estão dimensionados conforme número de funcionários por turno?',
   'Os vestiários possuem armários individuais? Os mesmos estão identificados (nome, numeração, etc.)?',
   'Os funcionários armazenam seus pertences pessoais nos armários?',
   'Os chuveiros e bacias sanitárias possuem divisórias para uso individual (box)? As mesmas possuem porta com tranca?',
   'Os vasos sanitários possuem tampa?',
   'Os boxes possuem suporte para papel higiênico e lixeira com tampa?',
   'As janelas estão protegidas por telas milimetradas para evitar a entrada de pragas?',
   'Os lavatórios possuem torneira sem fechamento manual, sabonete líquido bactericida ou sabonete (sem odor) e álcool em gel, papel toalha não reciclado ou secador de mãos?',
   'Os produtos utilizados na higienização estão identificados?',
   'As lixeiras para descarte de papel toalha possuem tampa e acionamento não manual?',
   'Existe placa com procedimento de higienização das mãos afixada em local visível e próximo ao lavatório?',
   'Todos os equipamentos dos sanitários/vestiários são mantidos funcionando adequadamente?',
   'Os sanitários/vestiários estão em estado adequado de limpeza e organização (ausência de material em desuso ou alheio ao ambiente)?',
   'Os sanitários/vestiários estão em boas condições de manutenção (ausência de infiltrações e bolores, bem ventilados e iluminados, etc.)?'
  ]},
  { nome:'Refeitório', itens:[
   'Ausência de abertura direta do refeitório para as áreas de produção, de embalagem ou de armazenamento?',
   'O refeitório está identificado?',
   'O refeitório possui mesas e cadeiras em quantidade suficiente para todos os funcionários do turno?',
   'Existe eletrodoméstico para aquecimento dos alimentos (ex.: micro-ondas, fogão, etc.)?',
   'O refeitório possui pia com torneira, sabão e esponja para higienização dos utensílios?',
   'Existe lixeira com tampa?',
   'O refeitório possui disponibilidade de água fresca para os funcionários (ex.: bebedouro)?',
   'As janelas estão protegidas por telas milimetradas para evitar a entrada de pragas?',
   'Todos os equipamentos do refeitório são mantidos funcionando adequadamente?',
   'O refeitório está em estado adequado de limpeza e organização (ausência de material em desuso ou alheio ao ambiente)?',
   'O refeitório está em boas condições de manutenção (ausência de infiltrações e bolores, bem ventilado e iluminado, etc.)?'
  ]},
  { nome:'Barreira sanitária / câmara de higienização', itens:[
   'A barreira sanitária está identificada (obs.: a empresa deve possuir uma barreira sanitária antes da entrada para as áreas de produção, de embalagem ou de armazenamento)?',
   'A barreira sanitária possui porta com fechamento automático?',
   'A barreira sanitária está dimensionada conforme número de funcionários por turno?',
   'Os lavatórios possuem torneira sem fechamento manual, sabonete líquido bactericida ou sabonete (sem odor) e álcool em gel, papel toalha não reciclado ou secador de mãos?',
   'Os produtos utilizados na higienização estão identificados?',
   'As lixeiras para descarte de papel toalha possuem tampa e acionamento não manual?',
   'Existe placa com procedimento de higienização das mãos afixada em local visível e próximo ao lavatório?',
   'Todos os equipamentos da barreira sanitária são mantidos funcionando adequadamente?',
   'A barreira sanitária está em estado adequado de limpeza e organização (ausência de material em desuso ou alheio ao ambiente)?',
   'A barreira sanitária está em boas condições de manutenção (ausência de infiltrações e bolores, bem ventilada e iluminada, etc.)?',
   'Os funcionários higienizam as mãos antes de entrarem nas áreas produtivas?'
  ]}
 ]},
 { nome:'RECEBIMENTO E ARMAZENAMENTO DE MATÉRIAS-PRIMAS', curto:'Recebimento MP', subs:[
  { nome:'Instalações', itens: INST.map((t,i)=> i===5 ? 'As portas e as janelas são mantidas fechadas quando não se encontram em uso? Em caso negativo, as mesmas possuem telas milimetradas? (se a empresa possuir moega, durante e após o descarregamento as portas/telas devem ser mantidas fechadas)' : t) },
  { nome:'Equipamentos e utensílios', itens:[ ...EQ_BASE,
   'Existem lixeiras para coleta seletiva no setor?',
   'O setor possui extintores identificados e de fácil acesso?',
   'Os equipamentos estão identificados e numerados?',
   'Os equipamentos e utensílios do setor estão em boas condições de manutenção?',
   'As caixas/silos encontram-se fechados?',
   'A geração de pó no setor está controlada?',
   'O setor possui local identificado para armazenamento dos materiais de limpeza?',
   'Os sacos ou bags encontram-se organizados e identificados?',
   'Os pallets estão afastados das paredes, em bom estado de conservação e organizados?'
  ]},
  { nome:'Geral', itens:[
   'O ambiente térmico é adequado para as questões ergonômicas?',
   'Existe controle de temperatura, umidade e outras condições ambientais durante o recebimento e o armazenamento das matérias-primas?',
   'As pessoas podem se movimentar com segurança pelo setor?',
   LIMPEZA,
   'O setor possui uma central de apoio à gestão de controle do processo com mesa e cadeira?',
   'Ausência de pragas no setor?'
  ]}
 ]},
 { nome:'PRODUÇÃO', curto:'Produção', subs:[
  { nome:'Instalações', itens: INST },
  { nome:'Processo, equipamentos e utensílios', itens:[ ...EQ_BASE,
   'Existem lixeiras para coleta seletiva no setor?',
   'O setor possui extintores identificados e de fácil acesso?',
   'Os equipamentos estão identificados e numerados?',
   'Os equipamentos e utensílios do setor estão em boas condições de manutenção?',
   'As caixas/silos encontram-se fechados?',
   'A geração de pó no setor está controlada?',
   'Os roletes novos estão armazenados em local adequado e protegidos?',
   'Existe local para descarte de roletes?',
   'O setor possui local identificado para armazenamento dos materiais de limpeza?',
   'Os sacos ou bags encontram-se organizados e identificados?',
   'Os pallets estão afastados das paredes, em bom estado de conservação e organizados?'
  ]},
  { nome:'Geral', itens:[
   'Ausência de pragas no setor?',
   'O ambiente térmico é adequado para as questões ergonômicas?',
   'Existe medição de produtividade no setor?',
   'São realizadas análises (controle) do processo produtivo durante a operação?',
   'As pessoas podem se movimentar com segurança pelo setor?',
   LIMPEZA
  ]}
 ]},
 { nome:'DEPÓSITO DE EMBALAGENS E EMPACOTAMENTO', curto:'Embalagens', subs:[
  { nome:'Instalações', itens: INST },
  { nome:'Equipamentos e utensílios', itens:[ ...EQ_BASE,
   'Existem barreiras para contaminação física?',
   'Existe ímã na máquina de empacotar?',
   'Existe detector de metal?',
   'Existe local definido para armazenamento de pallets?',
   'As embalagens estão armazenadas de forma organizada e que não sofram danos estruturais?',
   'As embalagens estão armazenadas envolvidas com plástico de proteção?',
   'As embalagens estão armazenadas e identificadas?',
   'Existem lixeiras para coleta seletiva no setor?',
   'O setor possui extintores identificados e de fácil acesso?',
   'Os equipamentos estão identificados e numerados?',
   'Os equipamentos e utensílios do setor estão em boas condições de manutenção?',
   'Existe controle do estoque de embalagem?',
   'Existe controle de descarte de embalagem?',
   'A máquina de empacotar possui controle de peso?',
   'O setor possui uma central de apoio à gestão de controle do processo com mesa e cadeira?',
   'As embalagens utilizadas pelos empacotadores não tocam o chão?'
  ]},
  { nome:'Geral', itens:[
   'Ausência de pragas no setor?',
   'O ambiente térmico é adequado para as questões ergonômicas?',
   'Existe controle do estoque de produtos e de expedição?',
   'As pessoas podem se movimentar com segurança pelo setor?',
   LIMPEZA,
   'Os rótulos dos produtos estão de acordo com a legislação vigente?'
  ]}
 ]},
 { nome:'DEPÓSITO DE PRODUTOS ACABADOS E EXPEDIÇÃO', curto:'Expedição', subs:[
  { nome:'Instalações', itens:[ ...INST, 'A área de expedição é coberta e protege a carga durante o carregamento?' ] },
  { nome:'Equipamentos e utensílios', itens:[ ...EQ_BASE,
   'Existe local definido para armazenamento de pallets? Os pallets estão afastados das paredes, em bom estado de conservação e organizados?',
   'Os produtos estão armazenados de forma organizada e que não sofram danos estruturais?',
   'Os produtos estão armazenados identificados?',
   'Existem lixeiras para coleta seletiva no setor?',
   'O setor possui extintores identificados e de fácil acesso?',
   'Os equipamentos estão identificados e numerados?',
   'Os equipamentos e utensílios do setor estão em boas condições de manutenção?'
  ]},
  { nome:'Geral', itens:[
   'Ausência de pragas no setor?',
   'O ambiente térmico é adequado para as questões ergonômicas?',
   'Existe controle do estoque de produtos e de expedição?',
   'As pessoas podem se movimentar com segurança pelo setor?',
   LIMPEZA,
   'Os rótulos dos produtos estão de acordo com a legislação vigente?'
  ]}
 ]},
 { nome:'OFICINA', curto:'Oficina', subs:[
  { nome:'Instalações', itens:[ INST[8], INST[9], INST[10] ] },
  { nome:'Equipamentos e utensílios', itens:[
   'Ausência de vazamentos (ar, água, produto, etc.) no setor?',
   'Existem lixeiras para coleta seletiva no setor?',
   'O setor possui extintores identificados e de fácil acesso?',
   'Os equipamentos e utensílios do setor estão em boas condições de manutenção?'
  ]},
  { nome:'Geral', itens:[
   'Ausência de pragas no setor?',
   'O ambiente térmico é adequado para as questões ergonômicas?',
   'Existe controle do estoque de materiais?',
   'As pessoas podem se movimentar com segurança pelo setor?',
   LIMPEZA
  ]}
 ]},
 { nome:'ÁREA EXTERNA & COMPRESSOR', curto:'Área externa', subs:[
  { nome:'Área externa', itens:[
   'A área externa possui barreiras para controle de acesso de animais e pessoas estranhas à empresa?',
   'As vias de acesso e estacionamentos são pavimentados? Em caso negativo, existe alguma medida que evite o pó e o barro?',
   'A vegetação está aparada?',
   'Existem lixeiras para coleta seletiva na área?',
   'Existe central de transbordo para armazenamento temporário dos resíduos gerados na empresa?',
   'Ausência de foco de pragas?',
   'Existem iscas ao redor das instalações? As mesmas se encontram no local indicado?',
   'A área está em estado adequado de limpeza e organização (ausência de material em desuso ou alheio ao ambiente)?'
  ]},
  { nome:'Compressor', itens:[
   'O compressor possui filtro?',
   'Em caso de óleo nas tubulações, as linhas possuem purga?',
   'Existe uma área separada para o compressor e ela está delimitada?',
   'Ausência de vazamentos ao redor do compressor?',
   'Em caso de vazamento de óleo, possui barreiras de contenção?',
   'A manutenção do equipamento está em dia?'
  ]}
 ]}
];
