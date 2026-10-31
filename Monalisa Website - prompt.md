# Prompt — Monalisa Website

Crie um site de uma página para a **Monalisa**, um espaço de depilação a laser e serviços estéticos para pessoas LGBT+. Visual retrô/ilustrado, fundos chapados, contornos pretos (#161515), sem gradientes.

**Fontes**
- Delikaaat: logo e palavras do marquee
- Riccione Serial: textos corridos, botões, catálogo
- Ruda 900: "BEM VINDOS,"
- Markazi Text 700: "por favor tirem os sapatos."

**Paleta** (nunca repetir cores vizinhas): roxo #8650D8, vermelho #FF3B4E, cinza claro #EEEEEE, rosa #FF3D7F, azul #3A22E8, amarelo #F5B800, branco #FEFEFE.

**1. Navegação (fixa no topo)**
Barra fixa no topo da página com os botões cinza "About MonaLisa", "BOOK NOW" e "Catalogue" (hover do Catalogue em roxo). À direita, um círculo com um coração e o botão "Sign In".

**2. Header (75% da altura da tela, fundo #EEEEEE)**
O logo flutua e quica nas bordas como um protetor de tela de DVD (velocidade 0.8). Usa as 5 imagens de logo coloridas (rosa, azul, vermelho, amarelo, roxo) em tamanho original (~262px de largura). Toda vez que bate em uma borda, troca **instantaneamente** para a próxima cor, sem transição. As imagens são pré-carregadas para não piscar.

**3. Marquee (50% do tamanho padrão)**
Faixa que desliza na horizontal sem parar: "monalisa", "welcome" etc. em Delikaaat, intercalados com ilustrações de personagens (pin-up, fisiculturista, estrela). O fundo do marquee muda para a mesma cor do logo no momento em que o logo toca a borda.

**4. Boas-vindas (fundo branco)**
- "BEM VINDOS," (Ruda, preto, bem grande)
- "por favor tirem os sapatos." (Markazi Text, logo abaixo)
- "Monalisa é um espaço de depilação a laser e serviços estéticos para pessoas que se sentem mais confortáveis em espaços LGBT+." (Riccione Serial, 20px, largura ~660px)

**5. Catálogo (carrossel hexagonal 3D)**
Seis faces mostrando só as imagens (sem títulos nem borda superior), cada uma com uma foto preenchendo a face inteira (object-fit: cover). O anel fica levemente inclinado para frente (≈14°) e um pouco acima do centro, assim as imagens de trás aparecem espelhadas por cima das da frente. Navegação:
- **arrastar** (mouse ou toque): o anel gira acompanhando o movimento e, ao soltar, encaixa na face mais próxima
- **clique**: avança uma face
- setas ← → e pontos embaixo

A cada giro o fundo da seção muda de cor (transição suave). Ao lado ficam o nome do procedimento com um destaque marca-texto irregular (cada procedimento com sua cor fixa), a descrição e o preço. Aplicar textura de papel branca por cima.

Procedimentos e preços:
- Depilação a laser: a partir de R$ 189
- Remoção de tatuagem: a partir de R$ 350
- Criolipólise: a partir de R$ 490
- Ultrassom microfocado: a partir de R$ 1.200
- Clareamento: a partir de R$ 220
- Peeling de carbono: a partir de R$ 280

**Assets**: 5 logos coloridos, 6 fotos do carrossel, ilustração da mulher (lady-lines), fisiculturista, pin-up, estrela, textura de papel, coração.
