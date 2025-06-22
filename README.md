# Extrator de Texto com Análise

Esta aplicação web permite extrair texto de imagens e receber uma análise resumida por meio da Groq API.

## Configuração

1. Crie um site no Netlify e conecte este repositório.
2. No painel **Site settings > Environment variables**, adicione `GROQ_API_KEYS` com uma ou mais chaves da Groq API separadas por vírgula:
   
   ```
   GROQ_API_KEYS=chave1,chave2
   ```

## Deploy e uso

Depois de configurar as variáveis de ambiente, publique o site pelo Netlify. Ao abrir a página, escolha uma imagem ou tire uma foto, processe-a e copie os resultados.
O histórico das extrações fica salvo no navegador e você pode pesquisar pelo nome gerado ou pelo conteúdo extraído. Também é possível ordenar as miniaturas alfabeticamente ou por mais recentes. Use o botão **Limpar** para apagar todas as entradas.

Para desenvolvimento local, instale o [Netlify CLI](https://docs.netlify.com/cli/get-started/) e execute:

```bash
netlify dev
```

As funções serverless serão executadas localmente.
