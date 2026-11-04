# Alex Brandow — Portfólio pessoal

Implementação local e independente, inspirada em `../SITE BOW 2`. Os arquivos do site da B0W Studio não são utilizados em tempo de execução nem modificados.

## Abrir

Abra `index.html` no navegador. Para servir por HTTP, execute na pasta deste projeto:

```powershell
node scripts/serve.mjs
```

Depois acesse `http://127.0.0.1:5173`. Encerre o servidor com `Ctrl+C`.

A página `identidade.html` apresenta a assinatura em fundos claro e escuro. Não há etapa de instalação ou compilação.

## Identidade e arquivos

- Nome: **Alex Brandow**, sempre com W.
- Assinatura HTML/CSS: `.signature`, Clash Display Medium, peso 500, espaçamento −0,055 em. O tamanho é controlado pela variável `--signature-size`.
- `.signature--light` é a versão clara para fundos escuros; `.signature--dark` é a versão escura para fundos claros. Na navbar, a cor acompanha a seção visível.
- O símbolo ™ é usado sem alegação de registro formal.
- A mesma estrutura tipográfica aparece na navbar, na assinatura da Hero, no rodapé, na abertura e no menu mobile.
- `ASSETS/ALEX.png` é o arquivo original da Hero. Sobre Mim apresenta as seis fotos originais em `ASSETS/FOTOS CAR`, sem editar os arquivos. A galeria adapta o AccordionGallery fornecido para HTML/CSS/GSAP, com terceira foto ativa, expansão de 52%, duração de 0,6 s, inclinação de 8° e parallax de 0,5. Hover, toque, foco e setas alternam as fotos. Até 520 px, os painéis se organizam verticalmente. Movimento reduzido elimina as transições; sem GSAP, a seleção continua funcionando; sem JavaScript, todas as fotos aparecem em uma grade.
- A logo original da B0W Studio é `ASSETS/LOGO BOW BRANCA.svg`. A versão preta e o símbolo fornecidos também foram preservados.
- Os nomes reais das pastas são `ASSETS` e `FONTS`. Preserve essa capitalização ao hospedar em sistemas que diferenciam maiúsculas e minúsculas.

## Fontes e animações

Na seção B0W Studio, o símbolo original aparece em prata polida, extrudado em 3D e inclinado a 45°. A geometria e os parâmetros de giro, arraste e salto foram adaptados de `../bow-site (1)/js/hero3d.js` e `symbol.js`, sem alterar a referência. Three.js 0.128.0 está em `js/vendor`, com licença MIT local. O mouse desacelera o giro, arrastar rotaciona e clicar faz o símbolo saltar. As setas e Enter oferecem controles por teclado. Movimento reduzido desativa o loop, e a renderização para fora da tela. Sem WebGL, o SVG original permanece visível. Os testes usam a geometria e o raycasting reais, mas simulam a GPU; não validam a aparência final dos reflexos.

Clash Display e Figtree são carregadas de `FONTS` por `@font-face`, sem requisições a serviços de fontes. A Figtree não estava presente na pasta inicial e foi adicionada a partir do [repositório oficial](https://github.com/erikdkennedy/figtree), com sua licença em `FONTS/OFL-Figtree.txt`.

GSAP, ScrollTrigger e SplitText 3.15.0 estão em `js/vendor`, na versão utilizada pela referência. Os avisos de licença estão preservados nos arquivos. Documentação: [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) e [SplitText](https://gsap.com/docs/v3/Plugins/SplitText/).

Os parâmetros de movimento foram extraídos de `SITE BOW 2/js/main.js`, funções `initHero`, `initReveals` e revelação de `.contact-panel`:

- Hero: caracteres sobem de 105%, com rotação X de −65° e desfoque de 16 px; duração de 0,82 s, intervalo de 0,025 s e `power4.out`. As quebras de linha já existentes são preservadas.
- Textos no scroll: palavras partem de y −42 px e blur 10 px, passam por y 5 px/blur 5 px e chegam a y 0/blur 0 em duas etapas de 0,35 s; intervalo de 0,075 s nos títulos e 0,035 s nos parágrafos.
- ScrollTrigger: `top 88%` até `bottom 12%`, com `play reverse play reverse`.
- Formulário: deslocamento lateral de 42 px no desktop ou vertical de 32 px no mobile, escala inicial 0,975 e duração de 1,05 s com `power3.out`.

SplitText mantém os textos acessíveis e é revertido ao ativar movimento reduzido. A assinatura não é fragmentada. Não há divisão de linhas calculadas pelo plugin: as palavras se reorganizam naturalmente com a largura da tela e as fontes locais.

O preloader desenha os contornos de “Alex Brandow” em sequência com uma timeline GSAP, preenche as letras de branco e retorna à assinatura HTML antes de abrir a Hero. Os paths SVG são extraídos da Clash Display Medium local por `scripts/render-intro.mjs` (OpenType.js somente em desenvolvimento); `npm run intro` regenera o trecho no HTML. A abertura dura aproximadamente 3,2 segundos e pode ser pulada com teclado, roda do mouse ou toque. A Hero aguarda o nome ficar completo para iniciar. Movimento reduzido, links para seções e ausência de GSAP dispensam a intro; existe um limite de segurança de 4,5 segundos. A linha inferior acompanha a sequência visual, sem representar progresso de downloads.

As revelações respeitam `prefers-reduced-motion`. O conteúdo permanece visível se GSAP não estiver disponível. O preloader tem tempo limite e pode ser dispensado com interação. O menu usa um diálogo nativo, com Escape e foco modal. As especialidades aparecem em linhas curtas, com destaque para Web Design.

## Conteúdo e contato

O cargo de CEO & Head de Criação, o Instagram e o endereço de e-mail da B0W Studio foram obtidos de `SITE BOW 2/index.html`. As duas formações e o texto atualizado de Sobre Mim foram fornecidos por Alex. O nome da empresa usa o número zero: **B0W Studio**. Nomes de arquivos, URLs, imagens e logotipos originais permanecem intactos.

O contato usa o painel claro da referência, com campos sublinhados, nome e empresa lado a lado no desktop, seleção múltipla de serviços, mensagem e botão arredondado. Foi acrescentado um campo obrigatório de e-mail. Behance permanece na galeria, mas foi removido da seção de contato.

### Integração de envio

O formulário reaproveita o FormSubmit da referência. O destinatário atual é `bowstudiorioclaro@gmail.com`, definido uma única vez no atributo `action` do formulário em `index.html`. `js/contact.js` deriva a URL AJAX dessa configuração. Não há credenciais no frontend.

Antes de disponibilizar o formulário ao público, o proprietário dessa caixa deve conferir a ativação do FormSubmit. Se o serviço enviar uma confirmação de ativação, ela precisa ser concluída nessa caixa. Para alterar o destinatário, edite o `action` e ative o novo endereço. Consulte a [documentação oficial](https://formsubmit.co/documentation) e a [orientação de ativação](https://formsubmit.co/help).

O envio real requer internet; para testar o site localmente, use o servidor HTTP indicado acima. A entrega na caixa e a ativação do destinatário não foram verificadas: os testes usam transporte simulado e não enviam e-mails reais.

O formulário valida campos obrigatórios, espaços vazios, e-mail, comprimentos e pelo menos um serviço. Ele apresenta erros associados aos campos, foca o primeiro erro, bloqueia envios simultâneos e mantém o rascunho nas falhas. Há um honeypot local e o campo `_honey` do FormSubmit; trata-se de proteção básica, não de um bloqueio completo de spam. A configuração `_captcha=false` foi mantida da referência.

Sucesso só aparece após HTTP válido e `success: true` ou `"true"` no retorno. Respostas desconhecidas, falhas de rede, timeout de 15 segundos e ativação pendente não mostram sucesso. Não há retentativa automática. Sem JavaScript, o POST convencional e a validação nativa dos campos continuam disponíveis; a validação de seleção múltipla é feita pelo JavaScript.

O portfólio apresenta os dez projetos públicos encontrados no perfil oficial de Alex Brandow no Behance em 03/11/2026. A resposta pública do perfil indicava `hasMore: false` e `hasNextPage: false`; não foram encontrados projetos adicionais nessa consulta. As dez capas foram baixadas diretamente dos endereços publicados pelo Behance e estão em `ASSETS/portfolio`, em WebP, totalizando aproximadamente 880 KiB.

VOID, Agência Múnco e Coleção Mustang 60 Anos estão identificados como projetos fictícios. Web Design aparece primeiro. Os filtros cobrem Todos, Web Design (2), Identidade Visual (3), Social Media (4) e Outros (1).

Os cards levam à apresentação original no Behance. Foram importadas as capas, não uma cópia das páginas completas. Algumas páginas individuais bloquearam a leitura automatizada; os títulos, autores, links e capas foram conferidos no perfil público. Não há imagens substitutas de outros designers.

## Manutenção da galeria

O catálogo editável é `data/projects.json`. Cada registro contém título, categoria, indicação de projeto fictício, link original, caminho da capa local e URL de origem da imagem. Após adicionar ou alterar um projeto:

```powershell
node scripts/render-portfolio.mjs
```

Esse comando atualiza apenas o trecho marcado `PORTFOLIO:START` / `PORTFOLIO:END` no HTML existente. Os cards são HTML estático e continuam acessíveis sem JavaScript ou internet. JavaScript habilita filtros com `aria-pressed`, anúncios acessíveis e transições GSAP. Uma capa ausente ou com erro exibe um fallback tipográfico, mantendo o link do projeto. Para um novo projeto, adicione a capa real em `ASSETS/portfolio` antes de atualizar o catálogo.

## Refinamento de conteúdo

A ordem atual é Início, Portfólio, Sobre Mim, Expertise, B0W Studio e Contato. Foram removidos números decorativos, `AB / 01`, slogans repetitivos, legendas sem informação e a seção genérica de processo. A Hero apresenta a especialidade e dois CTAs; Sobre Mim usa os três parágrafos fornecidos; Expertise e B0W Studio foram encurtadas. A fotografia, assinatura, fontes, paleta e animações de revelação foram preservadas.

## Verificação

```powershell
npm ci
npm test
```

O verificador confere recursos locais, referências a seções, fontes, identidade, compartilhamento da foto original e os hashes registrados dos arquivos de referência. Os testes JSDOM executam os filtros, trocas rápidas com GSAP real, SplitText real e sua reversão, redução de movimento, ausência de GSAP, fallback de imagem, navegação do menu e estrutura acessível. Também verificam validação do formulário, honeypot, bloqueio de duplicidade, payload enviado, confirmação positiva, rejeição, JSON inválido, ativação pendente e falha de rede. Não fazem chamadas reais ao FormSubmit.

JSDOM não renderiza layout: os testes não substituem revisão visual em dispositivos. O host de acesso ao navegador permaneceu indisponível nesta sessão, impedindo a revisão visual de desktop/mobile.

Os manifestos em `scripts` são registros locais de integridade e não precisam ser publicados. JSDOM é uma dependência apenas de desenvolvimento; o site não precisa de Node, npm ou JSDOM em produção.

Para publicação estática futura, envie somente `index.html`, `identidade.html`, `css`, `js`, `ASSETS` e `FONTS`. Nenhuma publicação foi realizada nesta implementação local.
#   a l e x b r a n d o w  
 #   a l e x b r a n d o w  
 