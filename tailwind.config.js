/** @type {import('tailwindcss').Config} */

// Paleta Meu Beta — as quatro cores saem da logo do app.
//
//   gold  #F8B600  amarelo — cor primária da marca e o TOP conquistado
//   zone  #13BFFF  azul    — a ZONA controlada
//   pass  #48EC57  verde   — quem está dentro do corte e avança de fase
//   alert #FE2D57  rosa    — DNS, remoções e os segundos finais do cronômetro
//
// O fundo é preto e as superfícies (cards, cabeçalhos) são cinza escuro,
// para que essas quatro cores sejam a única coisa saturada na tela — num
// telão isso deixa o resultado legível de longe só pela cor.
//
// O token continua chamado `gold` por compatibilidade com o código já
// escrito, mas o valor agora é o amarelo oficial da marca.

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#f8b600',
        zone: '#13bfff',
        pass: '#48ec57',
        alert: '#fe2d57',
        panel: '#000000',
        panel2: '#141417',
        panel3: '#1e1e24',
      },
    },
  },
  plugins: [],
};
