window.MathJax = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['\\[', '\\]']],
    macros: {
      coloneqq: '\\mathrel{\\vcenter{:}}{=}',
      argmax: '\\operatorname*{arg\\,max}',
      argmin: '\\operatorname*{arg\\,min}'
    }
  },
  svg: { fontCache: 'global' }
};
