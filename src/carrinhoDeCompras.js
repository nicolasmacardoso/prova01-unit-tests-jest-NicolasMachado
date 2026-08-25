class CarrinhoDeCompras {
  constructor() {
    this.itens = [];
    this.cupom = null;
    this.formaDeEntrega = "padrao";
    this.cep = null;
    this.finalizado = false;
  }

  adicionarProduto(produto, quantidade = 1) {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    if (!produto || produto.id === undefined || !produto.nome) {
      throw new Error("Produto invalido");
    }
    if (typeof produto.preco !== "number" || produto.preco < 0) {
      throw new Error("Preco invalido");
    }
    if (!Number.isInteger(produto.estoque) || produto.estoque < 0) {
      throw new Error("Estoque invalido");
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("Quantidade invalida");
    }

    const itemExistente = this.itens.find((item) => item.produto.id === produto.id);
    const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;

    if (quantidadeAtual + quantidade > produto.estoque) {
      throw new Error("Quantidade maior que o estoque disponivel");
    }

    if (itemExistente) {
      itemExistente.quantidade += quantidade;
      itemExistente.produto = { ...produto };
    } else {
      this.itens.push({ produto: { ...produto }, quantidade });
    }

    return true;
  }

  removerProduto(id) {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    const indice = this.itens.findIndex((item) => item.produto.id === id);
    if (indice === -1) return false;
    this.itens.splice(indice, 1);
    return true;
  }

  alterarQuantidade(id, quantidade) {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      throw new Error("Quantidade invalida");
    }

    const item = this.itens.find((itemAtual) => itemAtual.produto.id === id);
    if (!item) return false;
    if (quantidade === 0) return this.removerProduto(id);
    if (quantidade > item.produto.estoque) {
      throw new Error("Quantidade maior que o estoque disponivel");
    }

    item.quantidade = quantidade;
    return true;
  }

  buscarProduto(id) {
    const item = this.itens.find((itemAtual) => itemAtual.produto.id === id);
    return item ? { produto: { ...item.produto }, quantidade: item.quantidade } : null;
  }

  listarProdutos() {
    return this.itens.map((item) => ({
      produto: { ...item.produto },
      quantidade: item.quantidade,
    }));
  }

  possuiProduto(id) {
    return this.itens.some((item) => item.produto.id === id);
  }

  quantidadeDeItensDiferentes() {
    return this.itens.length;
  }

  quantidadeTotalDeProdutos() {
    return this.itens.reduce((total, item) => total + item.quantidade, 0);
  }

  calcularSubtotal() {
    const subtotal = this.itens.reduce(
      (total, item) => total + item.produto.preco * item.quantidade,
      0,
    );
    return Math.round((subtotal + Number.EPSILON) * 100) / 100;
  }

  aplicarCupom(cupom) {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    const cuponsValidos = {
      DESC10: { tipo: "percentual", valor: 10 },
      DESC20: { tipo: "percentual", valor: 20 },
      MENOS20: { tipo: "fixo", valor: 20 },
    };
    const codigo = typeof cupom === "string" ? cupom.trim().toUpperCase() : "";
    if (!cuponsValidos[codigo]) return false;
    this.cupom = { codigo, ...cuponsValidos[codigo] };
    return true;
  }

  removerCupom() {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    if (!this.cupom) return false;
    this.cupom = null;
    return true;
  }

  calcularDesconto() {
    if (!this.cupom) return 0;
    const subtotal = this.calcularSubtotal();
    const desconto = this.cupom.tipo === "percentual"
      ? subtotal * (this.cupom.valor / 100)
      : this.cupom.valor;
    return Math.round((Math.min(desconto, subtotal) + Number.EPSILON) * 100) / 100;
  }

  calcularFrete(cep = this.cep) {
    if (this.formaDeEntrega === "retirada" || this.calcularSubtotal() >= 200) return 0;
    const cepLimpo = String(cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8) throw new Error("CEP invalido");
    this.cep = cepLimpo;

    const freteBase = Number(cepLimpo[0]) <= 3 ? 15 : 25;
    const multiplicador = this.formaDeEntrega === "expressa" ? 2 : 1;
    return freteBase * multiplicador;
  }

  definirFormaDeEntrega(tipo) {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    if (!["padrao", "expressa", "retirada"].includes(tipo)) {
      throw new Error("Forma de entrega invalida");
    }
    this.formaDeEntrega = tipo;
    return true;
  }

  calcularTotal() {
    const valorProdutos = this.calcularSubtotal() - this.calcularDesconto();
    const frete = this.formaDeEntrega === "retirada" || valorProdutos === 0
      ? 0
      : this.calcularFrete();
    return Math.round((valorProdutos + frete + Number.EPSILON) * 100) / 100;
  }

  esvaziarCarrinho() {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    this.itens = [];
    this.cupom = null;
    return true;
  }

  estaVazio() {
    return this.itens.length === 0;
  }

  validarEstoque() {
    return this.itens.every(
      (item) => Number.isInteger(item.quantidade)
        && item.quantidade > 0
        && item.quantidade <= item.produto.estoque,
    );
  }

  finalizarCompra() {
    if (this.finalizado) throw new Error("O carrinho ja foi finalizado");
    if (this.estaVazio()) throw new Error("Nao e possivel finalizar um carrinho vazio");
    if (!this.validarEstoque()) throw new Error("Estoque insuficiente");

    const resumo = this.gerarResumo();
    this.finalizado = true;
    return { ...resumo, status: "finalizada" };
  }

  gerarResumo() {
    return {
      itens: this.listarProdutos(),
      quantidadeDeItensDiferentes: this.quantidadeDeItensDiferentes(),
      quantidadeTotalDeProdutos: this.quantidadeTotalDeProdutos(),
      subtotal: this.calcularSubtotal(),
      desconto: this.calcularDesconto(),
      frete: this.estaVazio() || this.formaDeEntrega === "retirada"
        ? 0
        : this.calcularFrete(),
      total: this.calcularTotal(),
      cupom: this.cupom ? this.cupom.codigo : null,
      formaDeEntrega: this.formaDeEntrega,
      finalizado: this.finalizado,
    };
  }
}

module.exports = CarrinhoDeCompras;
