const CarrinhoDeCompras = require("../src/carrinhoDeCompras");

const criarProduto = (dados = {}) => ({
  id: 1,
  nome: "Teclado",
  preco: 50,
  estoque: 10,
  ...dados,
});

const criarCarrinhoComProduto = (dadosDoProduto = {}, quantidade = 1) => {
  const carrinho = new CarrinhoDeCompras();
  carrinho.adicionarProduto(criarProduto(dadosDoProduto), quantidade);
  return carrinho;
};

describe("CarrinhoDeCompras", () => {
  describe("gerenciamento de produtos", () => {
    test("adiciona um produto e acumula a quantidade de um produto repetido", () => {
      const carrinho = new CarrinhoDeCompras();
      const produto = criarProduto();

      expect(carrinho.adicionarProduto(produto, 2)).toBe(true);
      expect(carrinho.adicionarProduto(produto, 3)).toBe(true);
      expect(carrinho.quantidadeDeItensDiferentes()).toBe(1);
      expect(carrinho.quantidadeTotalDeProdutos()).toBe(5);
      expect(carrinho.buscarProduto(produto.id)).toEqual({
        produto,
        quantidade: 5,
      });
    });

    test.each([
      [null, 1, "Produto invalido"],
      [{ preco: 10, estoque: 1 }, 1, "Produto invalido"],
      [criarProduto({ preco: -1 }), 1, "Preco invalido"],
      [criarProduto({ estoque: -1 }), 1, "Estoque invalido"],
      [criarProduto(), 0, "Quantidade invalida"],
      [criarProduto(), 1.5, "Quantidade invalida"],
      [criarProduto({ estoque: 1 }), 2, "Quantidade maior que o estoque disponivel"],
    ])("rejeita produto ou quantidade invalida", (produto, quantidade, mensagem) => {
      const carrinho = new CarrinhoDeCompras();

      expect(() => carrinho.adicionarProduto(produto, quantidade)).toThrow(mensagem);
    });

    test("busca, lista e informa se um produto existe sem expor o estado interno", () => {
      const carrinho = criarCarrinhoComProduto();

      const itemListado = carrinho.listarProdutos()[0];
      itemListado.produto.nome = "Nome alterado";

      expect(carrinho.possuiProduto(1)).toBe(true);
      expect(carrinho.possuiProduto(999)).toBe(false);
      expect(carrinho.buscarProduto(999)).toBeNull();
      expect(carrinho.buscarProduto(1).produto.nome).toBe("Teclado");
    });

    test("altera a quantidade e remove o produto quando ela for zero", () => {
      const carrinho = criarCarrinhoComProduto({}, 2);

      expect(carrinho.alterarQuantidade(1, 4)).toBe(true);
      expect(carrinho.buscarProduto(1).quantidade).toBe(4);
      expect(carrinho.alterarQuantidade(1, 0)).toBe(true);
      expect(carrinho.estaVazio()).toBe(true);
    });

    test("rejeita alteracoes de quantidade invalidas", () => {
      const carrinho = criarCarrinhoComProduto({ estoque: 3 });

      expect(carrinho.alterarQuantidade(999, 1)).toBe(false);
      expect(() => carrinho.alterarQuantidade(1, -1)).toThrow("Quantidade invalida");
      expect(() => carrinho.alterarQuantidade(1, 4)).toThrow(
        "Quantidade maior que o estoque disponivel",
      );
    });

    test("remove somente produtos existentes", () => {
      const carrinho = criarCarrinhoComProduto();

      expect(carrinho.removerProduto(999)).toBe(false);
      expect(carrinho.removerProduto(1)).toBe(true);
      expect(carrinho.estaVazio()).toBe(true);
    });

    test("esvazia os produtos e remove o cupom", () => {
      const carrinho = criarCarrinhoComProduto();
      carrinho.aplicarCupom("DESC10");

      expect(carrinho.esvaziarCarrinho()).toBe(true);
      expect(carrinho.gerarResumo().cupom).toBeNull();
      expect(carrinho.estaVazio()).toBe(true);
    });
  });

  describe("valores e cupons", () => {
    test("calcula subtotal e arredonda valores monetarios", () => {
      const carrinho = criarCarrinhoComProduto({ preco: 10.155 }, 2);

      expect(carrinho.calcularSubtotal()).toBe(20.31);
    });

    test.each([
      ["desc10", 10],
      [" DESC20 ", 20],
      ["MENOS20", 20],
    ])("aplica o cupom %s", (codigo, descontoEsperado) => {
      const carrinho = criarCarrinhoComProduto({ preco: 100 });

      expect(carrinho.aplicarCupom(codigo)).toBe(true);
      expect(carrinho.calcularDesconto()).toBe(descontoEsperado);
    });

    test("limita desconto fixo ao subtotal", () => {
      const carrinho = criarCarrinhoComProduto({ preco: 10 });

      carrinho.aplicarCupom("MENOS20");

      expect(carrinho.calcularDesconto()).toBe(10);
    });

    test("rejeita cupom desconhecido e remove um cupom aplicado", () => {
      const carrinho = criarCarrinhoComProduto();

      expect(carrinho.calcularDesconto()).toBe(0);
      expect(carrinho.aplicarCupom("INVALIDO")).toBe(false);
      expect(carrinho.removerCupom()).toBe(false);
      carrinho.aplicarCupom("DESC10");
      expect(carrinho.removerCupom()).toBe(true);
      expect(carrinho.calcularDesconto()).toBe(0);
    });
  });

  describe("entrega e total", () => {
    test("calcula frete padrao de acordo com a regiao do CEP", () => {
      const carrinhoRegiaoUm = criarCarrinhoComProduto();
      const carrinhoRegiaoDois = criarCarrinhoComProduto();

      expect(carrinhoRegiaoUm.calcularFrete("12345-678")).toBe(15);
      expect(carrinhoRegiaoDois.calcularFrete("98765-432")).toBe(25);
    });

    test("dobra o frete para entrega expressa", () => {
      const carrinho = criarCarrinhoComProduto();

      expect(carrinho.definirFormaDeEntrega("expressa")).toBe(true);
      expect(carrinho.calcularFrete("12345-678")).toBe(30);
    });

    test("oferece frete gratis para retirada ou subtotal a partir de duzentos reais", () => {
      const retirada = criarCarrinhoComProduto();
      retirada.definirFormaDeEntrega("retirada");
      const compraComFreteGratis = criarCarrinhoComProduto({ preco: 200 });

      expect(retirada.calcularFrete()).toBe(0);
      expect(compraComFreteGratis.calcularFrete()).toBe(0);
    });

    test("rejeita CEP e forma de entrega invalidos", () => {
      const carrinho = criarCarrinhoComProduto();

      expect(() => carrinho.calcularFrete("123")).toThrow("CEP invalido");
      expect(() => carrinho.definirFormaDeEntrega("teletransporte")).toThrow(
        "Forma de entrega invalida",
      );
    });

    test("calcula o total com desconto e frete", () => {
      const carrinho = criarCarrinhoComProduto({ preco: 100 });
      carrinho.aplicarCupom("DESC10");
      carrinho.calcularFrete("12345-678");

      expect(carrinho.calcularTotal()).toBe(105);
    });

    test("retorna total zero para carrinho vazio", () => {
      expect(new CarrinhoDeCompras().calcularTotal()).toBe(0);
    });
  });

  describe("estoque, resumo e finalizacao", () => {
    test("valida o estoque dos itens", () => {
      const carrinho = criarCarrinhoComProduto({ estoque: 2 }, 2);

      expect(carrinho.validarEstoque()).toBe(true);
      carrinho.itens[0].quantidade = 3;
      expect(carrinho.validarEstoque()).toBe(false);
    });

    test("gera um resumo completo do carrinho", () => {
      const carrinho = criarCarrinhoComProduto({ preco: 100 }, 2);
      carrinho.aplicarCupom("DESC10");

      expect(carrinho.gerarResumo()).toMatchObject({
        quantidadeDeItensDiferentes: 1,
        quantidadeTotalDeProdutos: 2,
        subtotal: 200,
        desconto: 20,
        frete: 0,
        total: 180,
        cupom: "DESC10",
        formaDeEntrega: "padrao",
        finalizado: false,
      });
    });

    test("finaliza uma compra valida e devolve seu resumo", () => {
      const carrinho = criarCarrinhoComProduto({ preco: 200 });

      const compra = carrinho.finalizarCompra();

      expect(compra.status).toBe("finalizada");
      expect(compra.total).toBe(200);
      expect(carrinho.finalizado).toBe(true);
    });

    test("nao finaliza carrinho vazio ou com estoque insuficiente", () => {
      const vazio = new CarrinhoDeCompras();
      const semEstoque = criarCarrinhoComProduto({ estoque: 1 });
      semEstoque.itens[0].quantidade = 2;

      expect(() => vazio.finalizarCompra()).toThrow(
        "Nao e possivel finalizar um carrinho vazio",
      );
      expect(() => semEstoque.finalizarCompra()).toThrow("Estoque insuficiente");
    });

    test.each([
      ["adicionarProduto", () => [criarProduto(), 1]],
      ["removerProduto", () => [1]],
      ["alterarQuantidade", () => [1, 2]],
      ["aplicarCupom", () => ["DESC10"]],
      ["removerCupom", () => []],
      ["definirFormaDeEntrega", () => ["retirada"]],
      ["esvaziarCarrinho", () => []],
      ["finalizarCompra", () => []],
    ])("bloqueia %s depois da finalizacao", (metodo, criarArgumentos) => {
      const carrinho = criarCarrinhoComProduto({ preco: 200 });
      carrinho.finalizarCompra();

      expect(() => carrinho[metodo](...criarArgumentos())).toThrow(
        "O carrinho ja foi finalizado",
      );
    });
  });
});
